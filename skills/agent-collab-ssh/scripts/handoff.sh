#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <task_id> <status> <summary> <tests>" >&2
  exit 1
fi

task_id="$1"
status="$2"
summary="$3"
tests="$4"
now="$(utc_now)"
day="$(date -u +%F)"

ssh_cmd "TASK_ID='$task_id' STATUS='$status' SUMMARY='$summary' TESTS='$tests' AGENT='$AGENT_NAME' NOW='$now' DAY='$day' BASE='${COLLAB_BASE_DIR}' bash -s" <<'REMOTE'
set -euo pipefail
log_path="$BASE/handoffs/$DAY.log"

exec 9>"$BASE/.board.lock"
flock -x 9

{
  echo "## $NOW $TASK_ID"
  echo "- owner: $AGENT"
  echo "- status: $STATUS"
  echo "- summary: $SUMMARY"
  echo "- tests: $TESTS"
  echo
} >> "$log_path"

awk -F"|" -v OFS="|" -v id="$TASK_ID" -v s="$STATUS" -v now="$NOW" '
  {
    if ($0 ~ "^\\| " id " \\|") {
      print $1, $2, $3, $4, " " s " ", $6, " " now " ", $8;
    } else {
      print $0;
    }
  }
' "$BASE/board.md" > "$BASE/board.md.tmp"
mv "$BASE/board.md.tmp" "$BASE/board.md"
REMOTE

echo "Posted handoff for ${task_id}"
