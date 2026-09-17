---
description: Finalize the current implementation branch through one explicit commit, push, PR, and bounded governance-check authorization.
---

# Implementation PR Command

Read `.agents/skills/implementation-pr/SKILL.md` FIRST. Follow it as the controlling workflow for this invocation.

The shortcut may be invoked with `/implementation-pr` or with an explicit natural-language request that names the `implementation-pr` shortcut or workflow and asks to run its mutation scope; slash syntax is not required. Vague or anaphoric follow-ups such as `do it again`, `go again`, `hazlo de vuelta`, or `dale de nuevo` do not invoke this workflow or reuse prior authorization unless they unambiguously identify the shortcut and mutation scope.

This command explicitly authorizes only these three mutation classes for the current invocation snapshot: commit through the active `commit-planner` auto contract, non-force-push `HEAD` to `origin`, and create one implementation PR through the active `branch-pr` create contract, including required PR metadata. The default typed plan targets `development`; a draft `stacked-to-main` preview requires a validated typed plan and never accepts an arbitrary base string.

After PR creation, invoke `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. Add `--mode stacked-preview` only for the validated draft preview path. It is the sole polling and filtering implementation. Preview mode observes governance only; functional and Cloud Build checks are deferred until retargeting to `development`.

Do not carry this authorization to later work. Do not force-push, switch branches, rebase, merge, close issues, delete branches, create or regenerate promotion PRs, or perform release actions.
