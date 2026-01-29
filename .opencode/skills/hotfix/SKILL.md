---
name: hotfix
description: Create and manage urgent hotfix branches in a git worktree with stricter guardrails and PR checklist (squash merge).
---
## What I do
- Turn a short task title into a deterministic `hotfix/<slug>` branch name.
- Create a git worktree at `../.worktrees/pluto/<branch_sanitized>`.
- Enforce a tighter scope mindset (minimize change surface).
- Guide sync with `origin/main`.
- Guide PR creation with hotfix-specific template (Impact/Risk/Rollback/Test plan).
- Guide safe cleanup (remove worktree only).

## Naming
- Base branch: `origin/main`
- Branch: `hotfix/<slug>`
- Slug rules: same as `feature` (max 60).
- Worktree path: same as `feature`.

## Start workflow (create worktree)
Same as `feature`, but ask one extra question up front:
- What is the user-visible impact / severity and what is the rollback plan?

## Sync workflow
Same as `feature` (prefer rebase on `origin/main`).

## PR workflow (GitHub, squash merge)
- Push branch: `git push -u origin HEAD`
- Create PR with a stricter body template:
  - Impact
  - Root cause (if known)
  - Fix approach
  - Risk assessment
  - Rollback plan
  - Testing performed
- Remind: do not merge automatically; reviewers are required.
- Recommend PR title uses Conventional Commits (often `fix(...)` or `perf(...)`).

## Cleanup workflow (worktree only)
Same as `feature`.
