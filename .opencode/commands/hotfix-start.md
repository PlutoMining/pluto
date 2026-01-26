---
description: Start a hotfix worktree (alias of flow-start hotfix).
agent: build
---
Run the `flow-start` workflow with type `hotfix`.

Input: $ARGUMENTS

Do:
- Treat $ARGUMENTS as the hotfix title/slug.
- Create branch `hotfix/<slug>` and worktree under `../.worktrees/pluto/hotfix__<slug>`.
- Ask for impact/severity and rollback plan early.

Follow the same guardrails and rules described in the `hotfix` skill.
