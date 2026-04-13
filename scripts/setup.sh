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

if [ "${OS}" = "Darwin" ]; then
  if command -v xattr &>/dev/null; then
    xattr -d com.apple.quarantine "${DEST}" &>/dev/null || true
  fi

  if command -v codesign &>/dev/null; then
    codesign --force --sign - "${DEST}" &>/dev/null || true
  fi
fi

# ── Run ───────────────────────────────────────────────────────────────────────

set +e
"${DEST}" "$@"
STATUS=$?
set -e

if [ "${STATUS}" -eq 0 ]; then
  exit 0
fi

if [ "${OS}" = "Darwin" ] && { [ "${STATUS}" -eq 137 ] || [ "${STATUS}" -eq 9 ]; }; then
  echo "The downloaded setup binary was blocked by macOS (exit ${STATUS})." >&2
  echo "Falling back to the source installer (scripts/setup.ts) via Bun..." >&2

  if command -v bun &>/dev/null; then
    exec bun run "https://raw.githubusercontent.com/${REPO}/main/scripts/setup.ts" "$@"
  fi

  echo "Bun is required for fallback mode but was not found." >&2
  echo "Install Bun and run:" >&2
  echo "  bun run https://raw.githubusercontent.com/${REPO}/main/scripts/setup.ts" >&2
  exit 1
fi

exit "${STATUS}"
