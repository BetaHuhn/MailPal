#!/usr/bin/env bash
set -euo pipefail

REPO="betahuhn/mailpal"
SETUP_TS_URL="https://raw.githubusercontent.com/${REPO}/main/scripts/setup.ts"

# ── Ensure Bun is available ───────────────────────────────────────────────────

if command -v bun &>/dev/null; then
  BUN_BIN="bun"
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
  BUN_BIN="${HOME}/.bun/bin/bun"
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
