#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

ssh_cmd "echo '=== board.md ===';
  cat '${COLLAB_BASE_DIR}/board.md';
  echo;
  echo '=== active locks ===';
  ls -1 '${COLLAB_BASE_DIR}/locks' 2>/dev/null || true"

