---
description: Sync the current worktree branch with origin/main (prefer rebase).
agent: build
---
Sync the current branch with `origin/main`.

Steps:
1) Show current branch + status.
2) `git fetch origin`
3) Prefer `git rebase origin/main`.
4) If conflicts happen:
   - stop
   - explain what files are conflicted
   - ask the user whether to resolve and continue, or abort the rebase

Do not force anything.
Use bash for git commands.
