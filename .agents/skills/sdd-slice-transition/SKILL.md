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

- Delegate local facts to `delivery-state-mapper` with `scope=local-boundary`. Decide eligibility here; the mapper never decides policy.
- Fail closed on every ambiguity, stale predecessor, changed parent branch/SHA, uncertain candidate, over-budget candidate, or missing evidence.
- Preserve the 400 authored changed-line ceiling unless a fresh candidate-specific exception exists. Slice by work unit; never code-golf, remove tests/docs, or compress code to fit.
- Never duplicate `implementation-pr` or SDD apply internals. `implementation-pr` owns completed-slice publication; SDD apply owns next-slice implementation.
- Never auto merge, rebase, cherry-pick, force-push, or publish a child before its parent merges into `development`.

## Decision Gate

At an eligible boundary, present exactly one closed single-select decision with two choices: `Publish this slice and prepare the next local slice` or `Keep the current state unchanged`. Name the exact candidate branch/SHA, target `origin/development`, proposed next work unit/branch, authorized GitHub session, and consequences: commit, non-force push, one PR, bounded governance observation, then local child preparation from the published SHA. State that the child stays unpushed and has no PR until the parent merges. A decline performs no mutation.

Consent is candidate-scoped and invokes `implementation-pr`; it is not reusable. Require a fresh decision at every later boundary.

## Execution Steps

1. Consume one local mapper snapshot. Verify the activation contract, candidate identity, authored changed-line count, predecessor state, recorded evidence, remaining work, and review budget.
2. Ask the single-select decision and stop. Do not mutate before the user's selection.
3. On decline, return unchanged state. On consent, invoke `implementation-pr` with the exact candidate plus explicit destination, operation, and credential/session authorization from the decision.
4. After publication, minimally revalidate branch, published `HEAD`, clean candidate identity, selected remote, and remote head. Stop if any differs.
5. Create or continue only the named next local branch when it is unambiguous and rooted at the exact published commit. An existing child must already match that commit, remain unpushed, and have no PR; otherwise stop.
6. Invoke the native SDD apply actor only for that next work unit. Functional checks for the parent may continue concurrently.
7. Before any later publication prompt, obtain fresh candidate-scoped authorization for remote read/fetch observation; prior publication consent is non-reusable. Use `authorized-publication-preflight` to prove the prior PR merged into `development` with the expected parent SHA. If not, wait or stop; never repair ancestry automatically.

## Output Contract

Report eligibility, exact candidate, user decision, publication result, next local branch/work unit, parent-check status, and blocker. Never imply that mapper recommendations authorize action.

## References

- `../../../AGENTS.md`
- `../implementation-pr/SKILL.md`
- `../../../openspec/config.yaml`
