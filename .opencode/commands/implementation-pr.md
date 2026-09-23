---
description: Finalize the current implementation branch through one explicit commit, push, PR, and bounded governance-check authorization.
---

# Implementation PR Command

Read `.agents/skills/implementation-pr/SKILL.md` FIRST. Follow it as the controlling workflow for this invocation.

The shortcut may be invoked with `/implementation-pr` or with an explicit natural-language request that names the `implementation-pr` shortcut or workflow and asks to run its mutation scope; slash syntax is not required. Vague or anaphoric follow-ups such as `do it again`, `go again`, `hazlo de vuelta`, or `dale de nuevo` do not invoke this workflow or reuse prior authorization unless they unambiguously identify the shortcut and mutation scope.

## Argument contract

Parse the complete invocation before any discovery or mutation:

- `/implementation-pr` has strict scope behavior.
- The only accepted override is `/implementation-pr --allow-mixed-scope "<reason>"`.
- The reason must be one non-blank, single-line value. Reject a missing reason, blank quotes, unknown options, extra arguments, and alternate spellings.
- The override is not a general authorization. Bind it to the exact candidate snapshot, selected `origin`, typed base plan, destination, and current authenticated Git/GitHub session authorization.

This command explicitly authorizes only these three mutation classes for the current invocation snapshot: commit through the active `commit-planner` auto contract, non-force-push `HEAD` to `origin`, and create one implementation PR through the active `branch-pr` create contract, including required PR metadata. The default typed plan targets `development`; a draft `stacked-to-main` preview requires a validated typed plan and never accepts an arbitrary base string.

With the valid override, the mapper may authorize inclusion of all non-sensitive paths it classifies as otherwise unrelated only after recording their complete exact sorted inventory. It must continue to report the real `unrelated_count` and examples, but must not emit `UNRELATED_CANDIDATE_PATHS` as a blocker for that unchanged binding. Sensitive or credential-like paths, ambiguity, truncation, candidate changes, and binding changes still block. `implementation-pr` passes the exact reason and path inventory to active `branch-pr` create content, which must include one visible English `## Scope Exception` section with the exact reason and exact exceptional `Path: <path> | Work unit: <work unit>` list. After creation, `implementation-pr` reads back the title/body and stops terminally on any disclosure mismatch before governance observation. Strict invocations omit the section.

For stacked previews, render `Parent head SHA` as a visible Markdown commit link with the exact full SHA as its label: `Parent head SHA: [<full SHA>](https://github.com/<owner>/<repo>/commit/<full SHA>)`. Preserve the exact same-repository binding and visible `Parent PR: #<number>` field required by the Chain Context contract.

After confirming the PR identity, exact plan, and scope-exception disclosure by read-back, apply any required PR metadata resolved by the active `branch-pr` contract and repository policy, then read it back to confirm it is applied. Do not invent metadata requirements. Only after metadata verification, immediately invoke `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. Add `--mode stacked-preview` only for the validated draft preview path. This remains the sole governance polling and filtering implementation. Preserve its exit code and do not replace, suppress, or retry the observation.

After that helper returns, run `.github/scripts/implementation-pr-vitest.js` exactly once regardless of governance pass, failure, timeout, or observer error. `--pr-created` attests that the PR read-back confirmed the intended head/base/draft plan. Pass the full accepted candidate path inventory, bound to that PR, as repeated `--candidate-path <repo-relative-path>` arguments. The helper runs Vitest if any app path is not `.md`/`.mdx`, including config, tests, assets, and unknown file types; it skips CMS/root-only inventories and app Markdown-only changes such as `teleferico-app/README.md`. The helper does not independently verify the PR read-back or completeness of the supplied inventory. The Vitest subprocess has a 15-minute timeout; timeout is an infrastructure error, emits `status=error`, and is not retried. A completed test run exits `0` even when JSON `status` is `failed`; interpret `status` and safe `failure_evidence`, not raw process output. Argument or execution infrastructure errors produce `status=error` and nonzero exit. Do not run the broad suite during implementation or rerun it after failure. A failure never blocks the existing PR; attribute it as unrelated only with evidence, otherwise report candidate-caused or unknown and do not mark validated. When required PR CI adopts the full app suite, retire the local run rule and helper in the same policy change.

Preview mode observes governance only; functional and Cloud Build checks are deferred until retargeting to `development`. Report the PR URL first, then governance, Vitest, and functional/Cloud Build status independently.

Do not carry this authorization to later work. A same-invocation clarification may resume only when the exact snapshot, destination, plan, and credential/session binding remain unchanged and no terminal mutation or failure ended the invocation. Generic later follow-ups remain non-authorizing. Do not force-push, switch branches, rebase, merge, close issues, delete branches, create or regenerate promotion PRs, or perform release actions.
