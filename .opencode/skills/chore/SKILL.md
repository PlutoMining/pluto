---
name: chore
description: Create and manage maintenance/refactor branches in a git worktree with consistent naming and PR workflow (squash merge).
---
## What I do
- Turn a short task title into a deterministic `chore/<slug>` branch name.
- Create a git worktree at `../.worktrees/pluto/<branch_sanitized>`.
- Guide sync with `origin/main`.
- Guide PR creation (GitHub, squash merge; do not merge automatically).
- Guide safe cleanup (remove worktree only).

## Naming
- Base branch: `origin/main`
- Branch: `chore/<slug>`
- Slug rules: same as `feature` (max 60).
- Worktree path: same as `feature`.

## Workflows
Use the same steps as `feature`.
- PR title should still be Conventional Commit (often `chore(...)` or `refactor(...)`).
