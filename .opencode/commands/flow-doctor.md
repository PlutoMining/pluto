---
description: Diagnose current git-flow worktree state and suggest next action.
agent: build
---
Diagnose the current git state for our worktree-based flow and suggest the next best action.

Steps:
1) Print:
   - repo root
   - current branch
   - upstream tracking status
   - dirty state (`git status --porcelain`)
   - last 5 commits (`git log --oneline -5`)
2) Print worktrees:
   - `git worktree list --porcelain`
3) Check if current branch matches one of:
   - `feature/*`, `hotfix/*`, `bugfix/*`, `chore/*`, `docs/*`, `spike/*`, `release/*`
4) Suggest next action:
   - if behind origin/main: suggest `/flow-sync`
   - if ahead and no PR: suggest `/flow-pr`
   - if merged and worktree not needed: suggest `/flow-cleanup`

Use bash for git commands.
