---
description: Start a feature worktree (alias of flow-start feature).
agent: build
---
Run the `flow-start` workflow with type `feature`.

Input: $ARGUMENTS

Do:
- Treat $ARGUMENTS as the feature title/slug.
- Create branch `feature/<slug>` and worktree under `../.worktrees/pluto/feature__<slug>`.

Follow the same guardrails and rules described in the `feature` skill.
