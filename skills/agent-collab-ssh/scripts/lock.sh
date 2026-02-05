#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <task_id> <file_path> [ttl_minutes]" >&2
  exit 1
fi

task_id="$1"
file_path="$2"
ttl_minutes="${3:-15}"
lock_name="$(normalize_path "$file_path").lock"
now="$(utc_now)"

if date -u -v+1M >/dev/null 2>&1; then
  expires="$(date -u -v+"${ttl_minutes}"M +"%Y-%m-%dT%H:%M:%SZ")"
else
  expires="$(date -u -d "+${ttl_minutes} minutes" +"%Y-%m-%dT%H:%M:%SZ")"
fi

ssh_cmd "TASK_ID='$task_id' FILE_PATH='$file_path' LOCK_NAME='$lock_name' AGENT='$AGENT_NAME' NOW='$now' EXPIRES='$expires' BASE='${COLLAB_BASE_DIR}' bash -s" <<'REMOTE'
set -euo pipefail
lock_path="$BASE/locks/$LOCK_NAME"

to_epoch() {
  date -u -d "$1" +%s 2>/dev/null || date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$1" +%s
}

exec 9>"$BASE/.board.lock"
flock -x 9

if [ -f "$lock_path" ]; then
  existing_owner=$(awk -F= '$1=="owner"{print $2}' "$lock_path")
  expires_at=$(awk -F= '$1=="expires_at_utc"{print $2}' "$lock_path")
  now_epoch=$(to_epoch "$NOW")
  exp_epoch=$(to_epoch "$expires_at")
  if [ "$exp_epoch" -gt "$now_epoch" ] && [ "$existing_owner" != "$AGENT" ]; then
    echo "Lock held by $existing_owner until $expires_at" >&2
    exit 2
  fi
fi

cat > "$lock_path" <<EOF
owner=$AGENT
task_id=$TASK_ID
file=$FILE_PATH
created_at_utc=$NOW
expires_at_utc=$EXPIRES
EOF
REMOTE

echo "Locked ${file_path} until ${expires}"
