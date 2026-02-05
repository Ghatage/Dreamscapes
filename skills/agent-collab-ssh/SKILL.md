---
name: agent-collab-ssh
description: Coordinate multiple Codex agents across different machines through a shared SSH host using a markdown task board and lock files. Use when collaborators run agents independently and need conflict-free task claiming, per-file locking, handoff notes, and status visibility without Git-based coordination.
---

# Agent Collab SSH

Use this skill to coordinate distributed agents through one shared remote directory.

## Quick Start

1. Ensure SSH access to the shared host works.
2. Bootstrap the remote workspace once:
```bash
scripts/bootstrap.sh
```
3. Check current state:
```bash
scripts/status.sh
```
4. Claim a task:
```bash
scripts/claim.sh TASK-001 "Add debounce to live preview" "webui/src/modules/api.js,webui/src/modules/workflow.js"
```
5. Lock files before edits:
```bash
scripts/lock.sh TASK-001 "webui/src/modules/api.js" 15
```
6. Post handoff note after work:
```bash
scripts/handoff.sh TASK-001 done "Debounce added and tested" "npm run build"
```
7. Release lock(s):
```bash
scripts/release.sh "webui/src/modules/api.js"
```

## Environment Variables

Set these only when overriding defaults:

- `COLLAB_SSH_ALIAS` (default: `awesome-gpu-name`)
- `COLLAB_SSH_USER` (default: `shadeform`)
- `COLLAB_SSH_HOST` (default: `204.12.169.26`)
- `COLLAB_SSH_KEY` (default: `/Users/bsubramaniam/.brev/brev.pem`)
- `COLLAB_BASE_DIR` (default: `~/agent-collab`)
- `AGENT_NAME` (default: local `$USER`)

Scripts prefer `COLLAB_SSH_ALIAS` if set; otherwise they use `user@host` with key.

## Remote Layout

- `${COLLAB_BASE_DIR}/board.md` - task state table
- `${COLLAB_BASE_DIR}/locks/` - file lock records
- `${COLLAB_BASE_DIR}/handoffs/` - append-only handoff log files
- `${COLLAB_BASE_DIR}/.board.lock` - global lock for atomic board updates

## Workflow Rules

1. Claim task first (`claim.sh`) before touching files.
2. Lock each target file (`lock.sh`) before editing.
3. Respect lock TTL and ownership.
4. Write explicit handoff notes (`handoff.sh`) with tests run.
5. Release locks (`release.sh`) immediately after completion.

## Notes

- Task state updates are serialized with `flock` on the server.
- Lock filenames normalize paths to safe names so cross-platform clients can interoperate.
- If a lock is expired, a new agent can reacquire it.

See `references/protocol.md` for markdown formats and conflict handling rules.
