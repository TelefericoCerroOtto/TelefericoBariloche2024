---
name: sdd-slice-transition
description: "Trigger: automatic native SDD apply boundary only. Offer candidate-scoped sequential publication and next-local-slice continuation."
license: Apache-2.0
metadata:
  author: "manuelffernandez"
  version: "1.0"
---

# SDD Slice Transition

## Activation Contract

Load automatically only when native SDD is in implementation/apply, one bounded work unit is complete and verified or reviewed, implementation remains, and sequential chained delivery is recorded. Do not load for ordinary interaction, planning, incomplete work, final SDD completion, or strict-TDD decisions; TDD is orthogonal.

## Hard Rules

- Read the current local Git state directly when evaluating a slice boundary. Decide eligibility here; do not delegate fact gathering or infer authorization from recommendations.
- Fail closed on every ambiguity, stale predecessor, changed parent branch/SHA, uncertain candidate, candidate exceeding its recorded hard budget, or missing evidence.
- Resolve size authority from the active change's prospective change-local instructions first, including any explicit maintainer-approved exception applicable to that change. For TB-113, the current README and prospective tasks section define a standing limit of 6,000 authored additions plus deletions per logical PR; historical `apply-progress.md` snapshots do not set current limits. Otherwise, use the active change's `review_budget_lines` as its size declaration, inherited by every slice.
- Without an applicable change-local exception or recorded change-level budget, the general 400 authored changed-line threshold applies. Above it, require an honest split or an explicitly maintainer-approved `size:exception` before publication. Never infer an exception or permission from historical records.
- If a candidate exceeds an explicitly approved change-level cap, stop and report the honest count; split or rethink scope rather than silently enlarging the cap. For TB-113, do not prompt again within the standing 6,000-line cap, and stop above it. Never code-golf, remove tests/docs, or compress code to fit.
- Never duplicate `implementation-pr` or SDD apply internals. `implementation-pr` owns completed-slice publication; SDD apply owns next-slice implementation.
- Never auto merge, rebase, cherry-pick, force-push, mark ready for review, delete branches, or repair ancestry. A pre-merge child may be published only as a validated draft `stacked-to-main` preview against its immediate parent branch.

## Decision Gate

At an eligible boundary, present exactly one closed single-select decision with two choices: the exact available transition or `Keep the current state unchanged`. The available transition is one of:

- Publish the completed slice through `implementation-pr` using the default standalone plan to `development`.
- Publish it as a draft `stacked-to-main` preview to the exact open immediate-parent branch using a validated typed plan.
- After the exact parent is confirmed merged into `development`, retarget the existing preview PR to `development` and rerun normal implementation governance from scratch.

Name the candidate branch/head SHA, base branch/SHA, parent PR/branch/head SHA when applicable, draft state, proposed next work unit, authorized GitHub session, exact mutations, and consequences. A decline performs no mutation.

Consent is candidate-scoped and invokes `implementation-pr`; it is not reusable. Require a fresh action decision at every later boundary without reopening the change-level size declaration.

## Execution Steps

1. Inspect the local branch, `HEAD`, Git status, candidate paths, changed-line count, predecessor state, recorded evidence, remaining work, and inherited change-level review budget once. Do not repeat discovery to recapture a candidate.
2. Ask the single-select decision and stop. Do not mutate before the user's selection.
3. On decline, return unchanged state. On consent, invoke `implementation-pr` with the exact candidate plus explicit destination, operation, and credential/session authorization from the decision.
4. After publication, minimally revalidate branch, published `HEAD`, clean candidate/worktree state, selected remote, remote head, PR base, base SHA, and draft state. Stop if any differs.
5. Create or continue only the named next local branch when it is unambiguous and rooted at the exact published commit. An existing child must match the expected ancestry and publication state; otherwise stop.
6. Invoke the native SDD apply actor only for that next work unit. Functional checks for the parent may continue concurrently.
7. Before any later publication or retarget prompt, obtain fresh candidate-scoped authorization for remote read/fetch observation; prior consent is non-reusable. Use `authorized-publication-preflight` to prove exact parent and child identities. Retarget the existing child only after the parent PR is merged into `development` at the expected SHA. Never create a duplicate PR or repair stale ancestry automatically.
8. Retargeting authorizes only the existing PR base change to `development`, required metadata normalization, and a fresh default governance observation. It does not authorize commit, push, rebase, force-push, merge, ready-for-review, branch deletion, or functional-CI repair.

## Output Contract

Report eligibility, exact candidate, user decision, publication result, next local branch/work unit, parent-check status, and blocker. Facts authorize no action; every publication requires the fresh authorization defined by `implementation-pr`.

## References

- `../../../AGENTS.md`
- `../implementation-pr/SKILL.md`
- `../../../openspec/config.yaml`
