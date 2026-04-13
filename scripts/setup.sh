#!/usr/bin/env bash
set -euo pipefail

REPO="betahuhn/mailpal"
BASE_URL="https://github.com/${REPO}/releases/latest/download"

# ── Detect OS and arch ────────────────────────────────────────────────────────

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)
    case "${ARCH}" in
      x86_64)  BINARY="mailpal-setup-linux-x64" ;;
      aarch64) BINARY="mailpal-setup-linux-arm64" ;;
      *)
        echo "Unsupported architecture: ${ARCH}" >&2
        exit 1
        ;;
    esac
    ;;
  Darwin)
    case "${ARCH}" in
      x86_64)  BINARY="mailpal-setup-macos-x64" ;;
      arm64)   BINARY="mailpal-setup-macos-arm64" ;;
      *)
        echo "Unsupported architecture: ${ARCH}" >&2
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Unsupported OS: ${OS}" >&2
    echo "For Windows, download the setup executable manually from:" >&2
    echo "  https://github.com/${REPO}/releases/latest" >&2
    exit 1
    ;;
esac

# ── Download ──────────────────────────────────────────────────────────────────

DEST="$(mktemp "${TMPDIR:-/tmp}/mailpal-setup.XXXXXX")"
CHECKSUM_FILE="$(mktemp "${TMPDIR:-/tmp}/mailpal-setup-checksums.XXXXXX")"
trap 'rm -f "${DEST}" "${CHECKSUM_FILE}"' EXIT

echo "Downloading ${BINARY}..."

if command -v curl &>/dev/null; then
  curl -fsSL "${BASE_URL}/${BINARY}" -o "${DEST}"
  curl -fsSL "${BASE_URL}/mailpal-setup-checksums.txt" -o "${CHECKSUM_FILE}"
elif command -v wget &>/dev/null; then
  wget -qO "${DEST}" "${BASE_URL}/${BINARY}"
  wget -qO "${CHECKSUM_FILE}" "${BASE_URL}/mailpal-setup-checksums.txt"
else
  echo "Neither curl nor wget found. Please install one and try again." >&2
  exit 1
fi

# ── Verify checksum ───────────────────────────────────────────────────────────

echo "Verifying checksum..."

EXPECTED="$(grep "${BINARY}" "${CHECKSUM_FILE}" | awk '{print $1}')"
if [ -z "${EXPECTED}" ]; then
  echo "Checksum for ${BINARY} not found in checksums file." >&2
  exit 1
fi

if command -v sha256sum &>/dev/null; then
  ACTUAL="$(sha256sum "${DEST}" | awk '{print $1}')"
elif command -v shasum &>/dev/null; then
  ACTUAL="$(shasum -a 256 "${DEST}" | awk '{print $1}')"
else
  echo "Neither sha256sum nor shasum found. Cannot verify checksum." >&2
  exit 1
fi

if [ "${ACTUAL}" != "${EXPECTED}" ]; then
  echo "Checksum mismatch for ${BINARY}!" >&2
  echo "  expected: ${EXPECTED}" >&2
  echo "  actual:   ${ACTUAL}" >&2
  exit 1
fi

chmod +x "${DEST}"

# ── Run ───────────────────────────────────────────────────────────────────────

exec "${DEST}" "$@"
