#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

ssh_cmd "mkdir -p '${COLLAB_BASE_DIR}/locks' '${COLLAB_BASE_DIR}/handoffs';
  touch '${COLLAB_BASE_DIR}/.board.lock';
  if [ ! -f '${COLLAB_BASE_DIR}/board.md' ]; then
    printf '| task_id | title | owner | status | files | updated_at_utc |\n|---|---|---|---|---|---|\n' > '${COLLAB_BASE_DIR}/board.md';
  fi"

echo "Bootstrapped ${COLLAB_BASE_DIR}"

