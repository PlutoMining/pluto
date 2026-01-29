---
description: Push branch and open a PR to main (squash merge workflow; no auto-merge).
agent: build
---
Create a PR for the current branch.

Rules:
- Base branch: `main`
- Preferred merge strategy: squash-and-merge
- Do not merge automatically.
- PR title should follow Conventional Commits (important for changelog generation in this repo).

Steps:
1) Show current branch, upstream tracking, and status.
2) Push:
   - `git push -u origin HEAD`
3) Create PR with GitHub CLI:
   - Use `gh pr create --base main --head <branch>`
   - If possible, infer a good Conventional Commit style title from the changes (ask if unsure).
   - Use a body template:

## Summary
- 

## Testing
- 

## Notes
- 

If the branch looks like `hotfix/<slug>`, include extra sections:

## Impact

## Risk

## Rollback plan

Use bash for git/gh commands.
