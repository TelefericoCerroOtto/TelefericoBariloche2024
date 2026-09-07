---
description: Finalize the current implementation branch through one explicit commit, push, PR, and CI-watch authorization.
---

# Implementation PR Command

Read `.agents/skills/implementation-pr/SKILL.md` FIRST. Follow it as the controlling workflow for this invocation.

This command explicitly authorizes only these three mutation classes for the current invocation snapshot: commit through the active `commit-planner` auto contract, non-force-push `HEAD` to `origin`, and create one implementation PR to `development` through the active `branch-pr` create contract, including required PR metadata and `gh pr checks --watch`.

Do not carry this authorization to later work. Do not force-push, switch branches, rebase, merge, close issues, delete branches, create or regenerate promotion PRs, or perform release actions.
