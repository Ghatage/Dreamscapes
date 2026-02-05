#!/usr/bin/env bash
set -euo pipefail

COLLAB_SSH_ALIAS="${COLLAB_SSH_ALIAS:-awesome-gpu-name}"
COLLAB_SSH_USER="${COLLAB_SSH_USER:-shadeform}"
COLLAB_SSH_HOST="${COLLAB_SSH_HOST:-204.12.169.26}"
COLLAB_SSH_KEY="${COLLAB_SSH_KEY:-/Users/bsubramaniam/.brev/brev.pem}"
COLLAB_BASE_DIR="${COLLAB_BASE_DIR:-~/agent-collab}"
AGENT_NAME="${AGENT_NAME:-${USER:-unknown-agent}}"

utc_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

to_epoch_utc() {
  local ts="$1"
  date -u -d "$ts" +%s 2>/dev/null || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$ts" +%s
}

ssh_cmd() {
  if [[ -n "${COLLAB_SSH_ALIAS}" ]]; then
    ssh "${COLLAB_SSH_ALIAS}" "$@"
  else
    ssh -i "${COLLAB_SSH_KEY}" "${COLLAB_SSH_USER}@${COLLAB_SSH_HOST}" "$@"
  fi
}

normalize_path() {
  local p="$1"
  p="${p//\//_}"
  p="${p// /_}"
  printf "%s" "$p"
}
