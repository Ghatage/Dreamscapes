# Agent Collab SSH Setup

Use this guide to install the skill on a collaborator machine and connect both agents to the same SSH coordination workspace.

## 1) Copy The Skill

Copy this folder to the collaborator machine:

`/Users/bsubramaniam/.codex/skills/agent-collab-ssh`

Target location on collaborator machine:

`~/.codex/skills/agent-collab-ssh`

Example:

```bash
scp -r /Users/bsubramaniam/.codex/skills/agent-collab-ssh <friend-user>@<friend-host>:~/.codex/skills/
```

## 2) Configure SSH Access

The scripts default to:

- alias: `awesome-gpu-name`
- user: `shadeform`
- host: `204.12.169.26`
- key path: `/Users/bsubramaniam/.brev/brev.pem`

Collaborators should define their own alias and key in `~/.ssh/config`:

```sshconfig
Host awesome-gpu-name
  HostName 204.12.169.26
  User shadeform
  IdentityFile /absolute/path/to/their/key.pem
  IdentitiesOnly yes
```

Verify:

```bash
ssh awesome-gpu-name 'echo ok'
```

## 3) First Run

On collaborator machine:

```bash
cd ~/.codex/skills/agent-collab-ssh
scripts/status.sh
```

If board is missing (first user only), run:

```bash
scripts/bootstrap.sh
```

Default remote directory is `~/agent-collab` on the SSH host.

## 4) Daily Workflow

Claim task:

```bash
scripts/claim.sh TASK-123 "Short task title" "path/a.js,path/b.js"
```

Lock file(s) before editing:

```bash
scripts/lock.sh TASK-123 "path/a.js" 15
```

Post handoff:

```bash
scripts/handoff.sh TASK-123 done "What changed" "tests/commands run"
```

Release lock(s):

```bash
scripts/release.sh "path/a.js" "path/b.js"
```

Check state:

```bash
scripts/status.sh
```

## 5) Optional Overrides

Set these only when defaults differ:

```bash
export COLLAB_SSH_ALIAS=awesome-gpu-name
export COLLAB_SSH_USER=shadeform
export COLLAB_SSH_HOST=204.12.169.26
export COLLAB_SSH_KEY=/absolute/path/to/key.pem
export COLLAB_BASE_DIR=~/agent-collab
export AGENT_NAME=my-agent-name
```

