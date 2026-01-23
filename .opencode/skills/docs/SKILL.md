---
name: docs
description: Create and manage documentation-only branches in a git worktree with consistent naming and PR workflow (squash merge).
---
## What I do
- Turn a short task title into a deterministic `docs/<slug>` branch name.
- Create a git worktree at `../.worktrees/pluto/<branch_sanitized>`.
- Guide sync with `origin/main`.
- Guide PR creation (GitHub, squash merge; do not merge automatically).
- Guide safe cleanup (remove worktree only).

## Naming
- Base branch: `origin/main`
- Branch: `docs/<slug>`
- Slug rules: same as `feature` (max 60).
- Worktree path: same as `feature`.

## Workflows
Use the same steps as `feature`.
- PR title should be Conventional Commit (often `docs(...)`).
