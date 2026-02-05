# SSH Collaboration Protocol

## Board Format (`board.md`)

Use a markdown table:

```markdown
| task_id | title | owner | status | files | updated_at_utc |
|---|---|---|---|---|---|
| TASK-001 | Add debounce | alice-agent | in_progress | webui/src/modules/api.js | 2026-02-05T20:00:00Z |
```

Allowed status values: `todo`, `in_progress`, `blocked`, `done`.

## Lock Format (`locks/<normalized>.lock`)

Each lock file contains key-value lines:

```text
owner=alice-agent
task_id=TASK-001
file=webui/src/modules/api.js
created_at_utc=2026-02-05T20:00:00Z
expires_at_utc=2026-02-05T20:15:00Z
```

## Handoff Format (`handoffs/YYYY-MM-DD.log`)

Append one markdown block per handoff:

```markdown
## 2026-02-05T20:11:00Z TASK-001
- owner: alice-agent
- status: done
- summary: Added 900ms debounce for live preview updates.
- tests: npm run build
```

## Conflict Rules

1. Never edit a file without owning its lock.
2. Treat unexpired lock as authoritative.
3. Allow takeover only when lock is expired.
4. Use UTC timestamps everywhere.
5. Run board updates under `flock .board.lock`.
