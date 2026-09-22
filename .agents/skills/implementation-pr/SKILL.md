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
- Treat mapper output as stale immediately. Revalidate branch, `HEAD`, the exact sorted candidate path set, selected remote, and the relevant remote head just before each mutation.

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
| Governance observation reports a code failure | Stop; require a new implementation/finalization invocation. |
| Functional or Cloud Build checks are pending or failed after governance passes | Report them separately; do not wait, repair, or change the governance outcome. |

## Execution Steps

1. Resolve the active contracts, parse the arguments, and capture the complete candidate-scoped invocation snapshot before mutation. Explicitly record the GitHub destination, fetch/read/publication operation, typed base plan, and credential/session authorization. If the override is active, capture its non-empty reason and immutable binding at this point.
2. Invoke `delivery-state-mapper` with `scope=authorized-publication-preflight`, `remote=origin`, the typed publication plan, and the optional exact mixed-scope override envelope. It owns repository identity, worktree/base/tracking facts, the specifically authorized `git fetch origin`, safe GitHub capability, open head PR, remote head, PR/check state, parent facts, focused diff facts, and native SDD discovery. Accept only `delivery-state-snapshot.v2`.
3. Apply this workflow's policy to the snapshot. Require `classification.status=complete`, a complete non-truncated exact candidate path list, and zero sensitive/credential-like paths. With no override, require zero unrelated paths and omit `## Scope Exception` from generated content. With a valid override, preserve the real `unrelated_count`, consume the mapper's `mixed_scope_override_reason` and complete exact sorted `mixed_scope_exceptional_paths` evidence, and permit only that non-sensitive unrelated inventory. Reject `main`, `development`, `staging`, promotion flows, stale/ambiguous facts, invalid tracking, an open head PR, truncated findings, or unmet checks required by affected surfaces.
4. Immediately before commit, re-read the complete sorted candidate path set and require exact set equality with the mapper evidence while revalidating branch, `HEAD`, selected `origin`, typed base plan, destination, target, and credential/session binding. When changes exist, invoke `commit-planner` auto mode for only the captured snapshot. Require a clean tree and verify the commit matches that snapshot before continuing.
5. Revalidate branch, `HEAD`, the exact candidate path set, selected `origin`, and the plan's exact remote base head. Push only with `git push -u origin HEAD`, then verify the remote head SHA equals local `HEAD`.
6. Revalidate local head, remote head, the complete typed plan, and the override binding again. Pass the exact override reason and exceptional path inventory to active `branch-pr` create content. A standalone plan creates one PR to `development`. A stacked plan creates one draft PR to the exact immediate parent branch and appends the deterministic visible `## Chain Context` contract. When the override is active, the generated English PR body must contain exactly one visible `## Scope Exception` section with the exact reason and every exact exceptional `Path: <path> | Work unit: <work unit>` entry from the mapper inventory and commit plan. Strict invocations omit the section entirely. If creation is ambiguous, stop and read back the PR state before retrying.
7. After PR creation, read back the PR title and body. Compare the exact reason and exact exceptional path/work-unit list with the captured override disclosure before any governance observation. A mismatch is terminal for this invocation; do not blindly edit or retry unless separately authorized. Only after an exact match, apply repository-required PR metadata and run `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>` for standalone delivery or add `--mode stacked-preview` for a validated draft preview. The helper remains the sole polling and classification implementation. Preview success covers governance only; functional and Cloud Build checks remain deferred until retargeting to `development`.

## Output Contract

Report the resolved contracts, preflight result, snapshot decision, completed phase, PR URL when created, governance result, separately observed functional/Cloud Build status, and any blocker. Never describe the PR as fully validated while application tests remain nonterminal. Normal successful output should end with useful operational facts rather than authorization boilerplate. Mention authorization boundaries only when they explain a blocker or excluded action, answer the user, or prevent ambiguity.

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
