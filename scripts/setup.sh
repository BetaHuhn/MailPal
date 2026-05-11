#!/usr/bin/env bash
set -euo pipefail

REPO="betahuhn/mailpal"
SETUP_ASSET_NAME="mailpal-setup.ts"
CHECKSUM_ASSET_NAME="mailpal-setup-checksums.txt"

download_text() {
  local url="$1"
  local context="$2"
  local response
  if command -v curl &>/dev/null; then
    if ! response="$(curl -fsSL "${url}")"; then
      echo "Failed to ${context} from ${url}." >&2
      exit 1
    fi
  elif command -v wget &>/dev/null; then
    if ! response="$(wget -qO- "${url}")"; then
      echo "Failed to ${context} from ${url}." >&2
      exit 1
    fi
  else
    echo "Neither curl nor wget found. Please install one and try again." >&2
    exit 1
  fi

  printf '%s' "${response}"
}

download_file() {
  local url="$1"
  local output="$2"
  local context="$3"
  if command -v curl &>/dev/null; then
    if ! curl -fsSL "${url}" -o "${output}"; then
      echo "Failed to ${context} from ${url}." >&2
      exit 1
    fi
  elif command -v wget &>/dev/null; then
    if ! wget -qO "${output}" "${url}"; then
      echo "Failed to ${context} from ${url}." >&2
      exit 1
    fi
  else
    echo "Neither curl nor wget found. Please install one and try again." >&2
    exit 1
  fi
}

if [ -n "${MAILPAL_RELEASE_TAG:-}" ]; then
  LATEST_RELEASE_TAG="${MAILPAL_RELEASE_TAG}"
else
  LATEST_RELEASE_JSON="$(download_text "https://api.github.com/repos/${REPO}/releases/latest" "fetch latest MailPal release metadata")"
  if command -v jq &>/dev/null; then
    LATEST_RELEASE_TAG="$(printf '%s' "${LATEST_RELEASE_JSON}" | jq -r '.tag_name // empty')"
  else
    LATEST_RELEASE_TAG="$(printf '%s' "${LATEST_RELEASE_JSON}" | tr -d '\n' | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
  fi
fi

if [ -z "${LATEST_RELEASE_TAG}" ]; then
  echo "Failed to resolve latest MailPal release tag." >&2
  exit 1
fi

SETUP_TS_URL="https://github.com/${REPO}/releases/download/${LATEST_RELEASE_TAG}/${SETUP_ASSET_NAME}"
CHECKSUMS_URL="https://github.com/${REPO}/releases/download/${LATEST_RELEASE_TAG}/${CHECKSUM_ASSET_NAME}"

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

if [ ! -x "${BUN_BIN}" ]; then
  echo "Bun installation was not detected. Please ensure Bun is installed and available in PATH or BUN_INSTALL." >&2
  exit 1
fi

# ── Download and run setup script ─────────────────────────────────────────────

SETUP_TS="$(mktemp "${TMPDIR:-/tmp}/mailpal-setup.XXXXXX.ts")"
CHECKSUMS_FILE="$(mktemp "${TMPDIR:-/tmp}/mailpal-setup-checksums.XXXXXX.txt")"
trap 'rm -f "${SETUP_TS}" "${CHECKSUMS_FILE}"' EXIT

download_file "${SETUP_TS_URL}" "${SETUP_TS}" "download MailPal setup asset (if unavailable, set MAILPAL_RELEASE_TAG to a release that includes setup assets)"
download_file "${CHECKSUMS_URL}" "${CHECKSUMS_FILE}" "download MailPal setup checksums (if unavailable, set MAILPAL_RELEASE_TAG to a release that includes setup assets)"

EXPECTED_SHA256="$(awk -v name="${SETUP_ASSET_NAME}" '{hash=$1; $1=""; sub(/^[[:space:]]+/, "", $0); if ($0 == name) { print hash; exit }}' "${CHECKSUMS_FILE}")"
if [ -z "${EXPECTED_SHA256}" ]; then
  echo "Failed to find checksum for ${SETUP_ASSET_NAME} in ${CHECKSUM_ASSET_NAME}." >&2
  exit 1
fi

if command -v sha256sum &>/dev/null; then
  ACTUAL_SHA256="$(sha256sum "${SETUP_TS}" | awk '{print $1}')"
elif command -v shasum &>/dev/null; then
  ACTUAL_SHA256="$(shasum -a 256 "${SETUP_TS}" | awk '{print $1}')"
else
  echo "Neither sha256sum nor shasum found. Please install one and try again." >&2
  exit 1
fi

if [ "${EXPECTED_SHA256}" != "${ACTUAL_SHA256}" ]; then
  echo "Checksum verification failed for ${SETUP_ASSET_NAME}." >&2
  exit 1
fi

"${BUN_BIN}" run "${SETUP_TS}" "$@"
