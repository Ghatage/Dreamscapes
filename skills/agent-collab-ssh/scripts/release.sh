#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <file_path> [file_path...]" >&2
  exit 1
fi

for file_path in "$@"; do
  lock_name="$(normalize_path "$file_path").lock"
  ssh_cmd "LOCK_NAME='$lock_name' AGENT='$AGENT_NAME' BASE='${COLLAB_BASE_DIR}' bash -s" <<'REMOTE'
set -euo pipefail
lock_path="$BASE/locks/$LOCK_NAME"

exec 9>"$BASE/.board.lock"
flock -x 9

if [ ! -f "$lock_path" ]; then
  exit 0
fi
existing_owner=$(awk -F= '$1=="owner"{print $2}' "$lock_path")
if [ "$existing_owner" != "$AGENT" ]; then
  echo "Refusing release: lock owned by $existing_owner" >&2
  exit 2
fi
rm -f "$lock_path"
REMOTE
  echo "Released ${file_path}"
done
