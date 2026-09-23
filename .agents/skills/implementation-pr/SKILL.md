---
name: implementation-pr
description: "Trigger: /implementation-pr, finalize implementation branch. Orchestrate one authorized commit, push, implementation PR, and CI-watch flow."
license: Apache-2.0
metadata:
  author: "manuelffernandez"
  version: "1.0"
---

# Implementation PR

## Activation Contract

Load only when the user explicitly invokes `/implementation-pr`, explicitly names the `implementation-pr` shortcut or workflow in a natural-language request to run it, or selects the candidate-scoped publication choice presented by `sdd-slice-transition`; slash syntax is optional. Parse the complete invocation before intake: an empty argument list is strict, and the only accepted override form is `/implementation-pr --allow-mixed-scope "<reason>"` with one non-blank, single-line reason and no other arguments. The transition choice must state this workflow's exact three mutations, destination, and credential/session authorization. Authorization applies only to the current invocation and its captured snapshot and cannot be reused for later mutations. Vague or anaphoric follow-ups such as `do it again`, `go again`, `hazlo de vuelta`, or `dale de nuevo` are not new invocations unless they unambiguously identify this shortcut and its mutation scope.

## Hard Rules

- Own orchestration only. Resolve and defer to `change-intake-preflight`, `commit-planner`, `commit-guard`, `work-unit-commits`, and `branch-pr`; do not copy their internals.
- Delegate mechanical repository, delivery, and native SDD discovery to the project `delivery-state-mapper`. Give it an explicit publication authorization envelope and consume only its compact snapshot; do not request raw logs or diffs.
- The mapper discovers facts only. Keep policy, authorization, candidate capture, ambiguity handling, commit/push/PR ownership, and mutation decisions here.
- The three explicit mutation authorizations are: commit the snapshot, non-force-push `HEAD` to `origin`, and create one implementation PR from a validated publication plan, including required PR metadata.
- Reject a missing or blank `--allow-mixed-scope` reason and every unknown or extra argument. Never infer, remember, or silently activate the override.
- When active, bind the override to the complete exact invocation snapshot, selected `origin`, typed base plan, destination, and current authenticated Git/GitHub session authorization. A same-invocation clarification may resume only when every binding remains unchanged and no terminal mutation or failure ended the invocation; a later generic follow-up is non-authorizing.
- The override permits only non-sensitive paths that the mapper classifies as otherwise unrelated after it captures their complete exact sorted inventory. Sensitive or credential-like paths, ambiguity, truncation, candidate changes, and binding mismatches remain unconditional blockers.
- Default to a typed standalone plan with `strategy=standalone`, `remote=origin`, and `base=development`. Accept `strategy=stacked-to-main` only from a `chained-pr`-validated plan that binds the immediate parent PR, parent branch, parent head SHA, runtime base SHA, and draft creation. Never accept an arbitrary base string.
- Never authorize later fixes or commits, force pushes, branch switches, rebases, merges, issue closure, branch deletion, promotion PRs, or release actions.
- Stop at the failed phase. Never create a PR after a commit or push failure.
- Capture exactly one complete delivery-state snapshot before mutation. Do not repeat mapper discovery during this invocation.
- Keep the snapshot's exact candidate path inventory, branch, `HEAD`, selected `origin`, typed target/base plan, destination, and credential/session authorization as the immutable authorization envelope. Bind candidate content with Git tree/index blob IDs and file modes; for classified non-sensitive working-tree deltas, use Git-produced content identity without printing or directly reading file contents. Never inspect suspected credential content. Any change or uncertainty stops the invocation.
- Before commit, prove the captured candidate path set and bytes are unchanged and verify the commit contains only that candidate. Before push, prove the active branch still equals the branch captured in the snapshot, the local head is the verified commit, and the target remote/base SHA still matches the captured plan; after push, prove the remote head equals local `HEAD`. Before PR creation, prove the PR binds the exact published head and authorized base/draft plan. Use only these operation-specific proofs; do not repeat full repository, PR, or SDD discovery. Ambiguous mutation results require a read-back of that operation's state before retrying.

## Decision Gates

| Condition | Action |
| --- | --- |
| Detached, integration, promotion, invalid, or ambiguous branch | Stop before mutation. |
| Full candidate classification is not `complete`, the exact candidate path list is missing or truncated, sensitive/credential-like counts are nonzero, or findings are truncated | Stop before mutation. |
| `unrelated_count` is nonzero and the exact valid override binding is not active and unchanged | Stop before mutation. |
| Open PR for the head branch | Stop; do not create a duplicate. |
| Stacked plan lacks exact parent PR/branch/head SHA, same-repository proof, open parent PR into `development`, focused non-truncated parent diff, or draft creation | Stop before mutation. |
| Clean tree with no committed diff from `origin/development` | Stop. |
| Commit, push, or PR outcome is ambiguous | Read back state before any retry. |
| Governance observation reports failure, timeout, or observer error | Do not repair, retry, or recreate the PR in this invocation; still run the post-creation app Vitest once, then report both results. |
| Functional or Cloud Build checks are pending or failed after governance passes | Report them separately; do not wait, repair, or change the governance outcome. |
| Broad app Vitest fails after PR creation | Preserve the created PR; report the machine-readable failure result. Treat attribution as unknown unless evidence proves the failure unrelated or candidate-caused; never call an unknown or candidate-caused failure unrelated or validated. |

## Execution Steps

1. Resolve the active contracts, parse the arguments, and capture the complete candidate-scoped invocation snapshot before mutation. Explicitly record the GitHub destination, fetch/read/publication operation, typed base plan, candidate path/byte binding, and credential/session authorization. If the override is active, capture its non-empty reason and immutable binding at this point.
2. Invoke `delivery-state-mapper` with `scope=authorized-publication-preflight`, `remote=origin`, the typed publication plan, and the optional exact mixed-scope override envelope. It owns repository identity, worktree/base/tracking facts, the specifically authorized `git fetch origin`, safe GitHub capability, open head PR, remote head, PR/check state, parent facts, focused diff facts, and native SDD discovery. Accept only `delivery-state-snapshot.v2`.
3. Apply this workflow's policy to the snapshot. Require `classification.status=complete`, a complete non-truncated exact candidate path list, and zero sensitive/credential-like paths. With no override, require zero unrelated paths and omit `## Scope Exception` from generated content. With a valid override, preserve the real `unrelated_count`, consume the mapper's `mixed_scope_override_reason` and complete exact sorted `mixed_scope_exceptional_paths` evidence, and permit only that non-sensitive unrelated inventory. Reject `main`, `development`, `staging`, promotion flows, stale/ambiguous facts, invalid tracking, an open head PR, truncated findings, or unmet checks required by affected surfaces.
4. Immediately before commit, prove the candidate path set and bytes match the captured snapshot, and revalidate only branch, `HEAD`, and the invocation authorization binding needed for this operation. When changes exist, invoke `commit-planner` auto mode for only the captured snapshot. Require a clean tree and verify the commit matches the captured candidate before continuing.
5. Before push, prove the active branch still equals the branch captured in the snapshot, local `HEAD` is that verified commit, and the selected `origin` and exact target/base SHA still match the captured typed plan. Push only with `git push -u origin HEAD`, then verify remote head SHA equals local `HEAD`.
6. Before PR creation, prove the local and remote heads still equal the verified published SHA and the typed base/draft plan remains unchanged. Pass the exact override reason and exceptional path inventory to active `branch-pr` create content. A standalone plan creates one PR to `development`. A stacked plan creates one draft PR to the exact immediate parent branch and appends the deterministic visible `## Chain Context` contract, including `Parent head SHA: [<full SHA>](https://github.com/<owner>/<repo>/commit/<full SHA>)`; the Markdown link label must be the exact full SHA. When the override is active, the generated English PR body must contain exactly one visible `## Scope Exception` section with the exact reason and every exact exceptional `Path: <path> | Work unit: <work unit>` entry from the mapper inventory and commit plan. Strict invocations omit the section entirely. If creation is ambiguous, stop and read back the PR state before retrying.
7. After PR creation, read back the PR identity, title, body, and current metadata. Confirm the exact published head/base/draft plan. Compare the exact reason and exceptional path/work-unit list with the captured override disclosure. A mismatch is terminal; do not blindly edit or retry unless separately authorized.
8. Apply any required PR metadata resolved by the active `branch-pr` contract and repository policy, then read it back to confirm it is applied. Do this before governance observation; do not invent metadata requirements or change the approved PR content.
9. Immediately after metadata verification, run `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`; add `--mode stacked-preview` only for a validated draft preview. Preserve the helper's governance exit semantics. It remains the sole polling/classification implementation. Do not run Vitest before this governance observation.
10. After the governance helper returns, invoke `.github/scripts/implementation-pr-vitest.js` exactly once regardless of the governance helper's exit code. Set `--pr-created` only when the step-7 read-back confirms the intended PR and exact plan. Pass every path from the accepted complete candidate inventory, bound to that PR head/base, as a repeated `--candidate-path <repo-relative-path>` argument; these caller-provided paths are not independently verified by the helper. The helper runs Vitest when any `teleferico-app/**` candidate path is not Markdown documentation (`.md` or `.mdx`), including config, tests, assets, and unknown file types. It skips when the inventory is CMS/root-only or every app path is Markdown documentation, including `teleferico-app/README.md`. The Vitest subprocess has a 15-minute timeout; a timeout is an infrastructure error (`status=error`), and the suite is never retried. A completed test run emits process exit `0` for either JSON status `passed` or `failed`; parse the JSON `status` and `exit_code`, not the helper process exit, to assess Vitest. Failure JSON contains only safe status fields and a note that process output was withheld; argument or execution infrastructure errors emit `status=error` and nonzero exit. Never rerun after a failure. A failure does not undo, delay, or block the created PR. Attribute it as unrelated only when evidence proves no candidate relationship; otherwise report candidate-caused or unknown, never as validated. This local Vitest result does not alter governance status or functional/Cloud Build state. When required PR CI adopts the full app suite, retire this local run rule and helper in the same policy change.

## Output Contract

Report the PR URL first after creation, then governance result, post-creation Vitest JSON status, and functional/Cloud Build status separately. Do not call a PR fully validated when Vitest failed or attribution is unknown, or when CI checks remain pending. A Vitest failure is advisory to the already-completed publication phase, never a reason to ask a blocking question or initiate another PR/issue. Normal successful output should end with useful operational facts rather than authorization boilerplate.

## References

- `AGENTS.md`
- `docs/change-intake-preflight.md`
- `docs/backlog-branch-pr-policy.md`
- `docs/CONVENTIONS.md`
- `~/.config/opencode/skills/commit-planner/SKILL.md`
- `~/.config/opencode/skills/branch-pr/SKILL.md`
- `.agents/skills/commit-guard/SKILL.md`
- `.opencode/agents/delivery-state-mapper.md`
- `.github/scripts/wait-for-implementation-governance.js`
