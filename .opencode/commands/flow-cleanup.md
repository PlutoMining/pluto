---
description: Remove the current (or selected) git worktree safely (worktree only).
agent: build
---
Safely remove a git worktree. Do not delete branches.

Steps:
1) Determine the current worktree path and list all worktrees.
2) Ask which worktree path to remove if ambiguous (especially if running from the main repo worktree).
3) For the selected worktree, check for uncommitted changes:
   - run `git -C <path> status --porcelain`
   - if non-empty, ask for explicit confirmation before removal
4) Remove:
   - `git worktree remove <path>`
5) Optional hygiene:
   - `git worktree prune`

Use bash for git commands.
