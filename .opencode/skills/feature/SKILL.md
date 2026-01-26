---
name: feature
description: Create and manage feature branches in a git worktree with consistent naming and PR workflow (squash merge).
---
## What I do
- Turn a short task title into a deterministic `feature/<slug>` branch name.
- Create a git worktree at `../.worktrees/pluto/<branch_sanitized>`.
- Guide sync with `origin/main` (prefer rebase for clean history).
- Guide PR creation (GitHub, squash merge; do not merge automatically).
- Guide safe cleanup (remove worktree only).

## Naming
- Base branch: `origin/main`
- Branch: `feature/<slug>`
- Slug rules:
  - lowercase
  - replace non-alphanumeric with `-`
  - collapse consecutive `-`
  - trim leading/trailing `-`
  - max length: 60 characters
  - if the user already provides a valid slug, keep it
- Worktree path:
  - base: `../.worktrees/pluto`
  - `branch_sanitized`: replace `/` with `__`
  - full: `../.worktrees/pluto/<branch_sanitized>`

## Start workflow (create worktree)
1) Ask for the task title (or slug) if missing.
2) Compute `<slug>`, branch `feature/<slug>`, and worktree path.
3) Guardrails:
   - If the branch is already checked out in another worktree, stop and report the existing worktree path.
   - If the worktree path already exists, stop and ask whether to reuse it or choose a different slug.
4) Run:
   - `git fetch origin`
   - If branch exists locally: `git worktree add <path> <branch>`
   - Else: `git worktree add -b <branch> <path> origin/main`
5) Print the worktree path and the next suggested steps (install/test) based on the repo docs.

## Sync workflow (keep up to date)
- Prefer: `git fetch origin` then `git rebase origin/main`
- If rebase conflicts:
  - stop, explain conflict resolution, and do not force anything

## PR workflow (GitHub, squash merge)
- Push branch:
  - `git push -u origin HEAD`
- Create PR using `gh pr create`:
  - base: `main`
  - head: current branch
  - remind: squash merge is preferred; do not merge automatically
- Recommend PR title uses Conventional Commits (important for changelog/semantic-release in this repo).

## Cleanup workflow (worktree only)
- Confirm the target path.
- If `git status --porcelain` is not empty, ask for confirmation before removal.
- Remove:
  - `git worktree remove <path>`
  - optional: `git worktree prune`
