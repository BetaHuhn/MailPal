#!/usr/bin/env bash
set -euo pipefail

REPO="betahuhn/mailpal"

download_text() {
  local url="$1"
  if command -v curl &>/dev/null; then
    curl -fsSL "${url}"
  elif command -v wget &>/dev/null; then
    wget -qO- "${url}"
  else
    echo "Neither curl nor wget found. Please install one and try again." >&2
    exit 1
  fi
}

LATEST_RELEASE_TAG="$(download_text "https://api.github.com/repos/${REPO}/releases/latest" | tr -d '\n' | sed -n 's/.*"tag_name":"\([^"]*\)".*/\1/p')"
if [ -z "${LATEST_RELEASE_TAG}" ]; then
  echo "Failed to resolve latest MailPal release tag." >&2
  exit 1
fi

SETUP_TS_URL="https://raw.githubusercontent.com/${REPO}/${LATEST_RELEASE_TAG}/scripts/setup.ts"

# ── Ensure Bun is available ───────────────────────────────────────────────────

if command -v bun &>/dev/null; then
  BUN_BIN="$(command -v bun)"
else
  echo "Bun not found, installing..."
  if command -v curl &>/dev/null; then
    curl -fsSL https://bun.sh/install | bash
  elif command -v wget &>/dev/null; then
    wget -qO- https://bun.sh/install | bash
  else
    echo "Neither curl nor wget found. Please install one and try again." >&2
    exit 1
  fi

  if command -v bun &>/dev/null; then
    BUN_BIN="$(command -v bun)"
  else
    BUN_INSTALL_DIR="${BUN_INSTALL:-${HOME}/.bun}"
    BUN_BIN="${BUN_INSTALL_DIR}/bin/bun"
  fi
fi

if [ ! -x "${BUN_BIN}" ] && [ "${BUN_BIN}" != "bun" ]; then
  echo "Bun installation was not detected. Please ensure Bun is installed and available in PATH or BUN_INSTALL." >&2
  exit 1
fi

# ── Download and run setup script ─────────────────────────────────────────────

SETUP_TS="$(mktemp "${TMPDIR:-/tmp}/mailpal-setup.XXXXXX.ts")"
trap 'rm -f "${SETUP_TS}"' EXIT

if command -v curl &>/dev/null; then
  curl -fsSL "${SETUP_TS_URL}" -o "${SETUP_TS}"
elif command -v wget &>/dev/null; then
  wget -qO "${SETUP_TS}" "${SETUP_TS_URL}"
else
  echo "Neither curl nor wget found. Please install one and try again." >&2
  exit 1
fi

"${BUN_BIN}" run "${SETUP_TS}" "$@"
