---
name: release
description: Guide a two-phase release workflow using git worktrees: run scripts on main, then commit changes on release/<version> via PR.
---
## What I do
- Provide a safe, two-phase release workflow compatible with this repo's release scripts.
- Phase A: prepare release artifacts on a worktree based on `main` (required by scripts).
- Phase B: move the resulting changes onto `release/<version>`, commit, and open a PR.
- Never merges automatically; reviewers decide.

## Naming
- Base branch: `origin/main`
- Branch (phase B): `release/<version>`
- Version format: prefer `X.Y.Z` (semver) for stable release prep.
- Worktree path: `../.worktrees/pluto/<branch_sanitized>` where `/` -> `__`.

## Phase A (run scripts on main)
1) Ensure you are on a worktree whose branch is `main`.
2) Run the appropriate script (per repo docs), e.g. `scripts/release.sh ...`.
3) Do not commit directly on `main`. Leave changes uncommitted.

## Phase B (PR changes via release/<version>)
1) Create branch `release/<version>` from `origin/main`.
2) Create a dedicated worktree for it.
3) Bring the uncommitted changes from Phase A into this worktree (e.g., by stashing/applying or by repeating deterministic script steps inside the release worktree).
4) Commit with Conventional Commits, then open PR to `main`.

## Notes
- This repo uses squash-and-merge; PR title becomes the squashed commit on `main`.
- For changelog/semantic-release, PR title should follow Conventional Commits.
