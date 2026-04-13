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

DEST="$(mktemp)"
trap 'rm -f "${DEST}"' EXIT

echo "Downloading ${BINARY}..."

if command -v curl &>/dev/null; then
  curl -fsSL "${BASE_URL}/${BINARY}" -o "${DEST}"
elif command -v wget &>/dev/null; then
  wget -qO "${DEST}" "${BASE_URL}/${BINARY}"
else
  echo "Neither curl nor wget found. Please install one and try again." >&2
  exit 1
fi

chmod +x "${DEST}"

# ── Run ───────────────────────────────────────────────────────────────────────

exec "${DEST}" "$@"
