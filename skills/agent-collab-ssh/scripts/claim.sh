#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/common.sh"

if [[ $# -lt 3 ]]; then
  echo "Usage: $0 <task_id> <title> <csv_files>" >&2
  exit 1
fi

task_id="$1"
title="$2"
files="$3"
now="$(utc_now)"

ssh_cmd "TASK_ID='$task_id' TITLE='$title' AGENT='$AGENT_NAME' FILES='$files' NOW='$now' BASE='${COLLAB_BASE_DIR}' bash -s" <<'REMOTE'
set -euo pipefail

exec 9>"$BASE/.board.lock"
flock -x 9

if grep -q "^| $TASK_ID |" "$BASE/board.md"; then
  awk -F"|" -v OFS="|" -v id="$TASK_ID" -v t="$TITLE" -v o="$AGENT" -v f="$FILES" -v now="$NOW" '
    {
      if ($0 ~ "^\\| " id " \\|") {
        print "| " id " | " t " | " o " | in_progress | " f " | " now " |";
      } else {
        print $0;
      }
    }
  ' "$BASE/board.md" > "$BASE/board.md.tmp"
  mv "$BASE/board.md.tmp" "$BASE/board.md"
else
  printf '| %s | %s | %s | in_progress | %s | %s |\n' "$TASK_ID" "$TITLE" "$AGENT" "$FILES" "$NOW" >> "$BASE/board.md"
fi
REMOTE

echo "Claimed ${task_id}"
