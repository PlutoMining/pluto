---
name: spike
description: Create and manage exploratory spike branches in a git worktree; PR optional, cleanup removes worktree only.
---
## What I do
- Turn a short task title into a deterministic `spike/<slug>` branch name.
- Create a git worktree at `../.worktrees/pluto/<branch_sanitized>`.
- Encourage timeboxing and documentation of findings.
- PR is optional (but supported).
- Guide safe cleanup (remove worktree only).

## Naming
- Base branch: `origin/main`
- Branch: `spike/<slug>`
- Slug rules: same as `feature` (max 60).
- Worktree path: same as `feature`.

## Workflows
- Start/sync/cleanup are the same as `feature`.
- For PR:
  - Ask if the spike should be shared.
  - If yes, create PR; if no, skip.
