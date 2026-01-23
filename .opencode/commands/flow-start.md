---
description: Start a git-flow worktree (feature/hotfix/bugfix/chore/docs/spike/release).
agent: build
---
You are managing worktrees for this repo.

Goal: create (or attach) a git worktree using our conventions.

Inputs:
- flow type: one of `feature`, `hotfix`, `bugfix`, `chore`, `docs`, `spike`, `release`
- title or slug: $ARGUMENTS

Rules:
- Base branch is `origin/main`.
- Branch name must be `<type>/<slug>` except `release` which is special (two-phase).
- Slugify rules:
  - lowercase
  - replace non-alphanumeric with `-`
  - collapse `--`
  - trim `-`
  - max length 60
  - if the user already provides a valid slug, keep it
- Worktree base dir: `../.worktrees/pluto`
- Worktree dir for a branch: `../.worktrees/pluto/<branch_sanitized>` where `/` -> `__`.

Process:
1) Parse $ARGUMENTS. If it includes a leading type word, use it, otherwise ask for the type.
2) If type is `release`, ask whether the user is in Phase A (run scripts on main) or Phase B (PR on `release/<version>`):
   - Phase A: create a worktree for `main` under `../.worktrees/pluto/main` (or a safe equivalent), do NOT create `release/<version>` yet.
   - Phase B: require a version (e.g. `1.2.3`), then proceed with branch `release/<version>`.
3) Compute branch and worktree path.
4) Guardrails:
   - If branch is already checked out in another worktree, stop and print where.
   - If worktree path exists, stop and ask to reuse or pick a different slug.
5) Execute:
   - `git fetch origin`
   - Ensure `../.worktrees/pluto` exists.
   - If branch exists: `git worktree add <path> <branch>`
   - Else: `git worktree add -b <branch> <path> origin/main`
6) Print:
   - the created worktree path
   - the branch name
   - recommended next steps (run tests/lint as appropriate)

Use bash to run the git commands.
