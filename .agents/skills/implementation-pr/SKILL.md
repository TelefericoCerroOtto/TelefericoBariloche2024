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

Load only when the user explicitly invokes `/implementation-pr`, explicitly names the `implementation-pr` shortcut or workflow in a natural-language request to run it, or selects the candidate-scoped publication choice presented by `sdd-slice-transition`; slash syntax is optional. The transition choice must state this workflow's exact three mutations, destination, and credential/session authorization. Authorization applies only to the current invocation and its captured snapshot and cannot be reused for later mutations. Vague or anaphoric follow-ups such as `do it again`, `go again`, `hazlo de vuelta`, or `dale de nuevo` are not new invocations unless they unambiguously identify this shortcut and its mutation scope.

## Hard Rules

- Own orchestration only. Resolve and defer to `change-intake-preflight`, `commit-planner`, `commit-guard`, `work-unit-commits`, and `branch-pr`; do not copy their internals.
- Delegate mechanical repository, delivery, and native SDD discovery to the project `delivery-state-mapper`. Give it an explicit publication authorization envelope and consume only its compact snapshot; do not request raw logs or diffs.
- The mapper discovers facts only. Keep policy, authorization, candidate capture, ambiguity handling, commit/push/PR ownership, and mutation decisions here.
- The three explicit mutation authorizations are: commit the snapshot, non-force-push `HEAD` to `origin`, and create one implementation PR to `development`, including required PR metadata.
- Never authorize later fixes or commits, force pushes, branch switches, rebases, merges, issue closure, branch deletion, promotion PRs, or release actions.
- Stop at the failed phase. Never create a PR after a commit or push failure.
- Treat mapper output as stale immediately. Revalidate branch, `HEAD`, worktree/candidate identity, selected remote, and the relevant remote head just before each mutation.

## Decision Gates

| Condition | Action |
| --- | --- |
| Detached, integration, promotion, invalid, or ambiguous branch | Stop before mutation. |
| Full candidate classification is not `complete`, sensitive/credential-like or unrelated counts are nonzero, findings are truncated, or inventory digest is missing | Stop before mutation. |
| Open PR for the head branch | Stop; do not create a duplicate. |
| Clean tree with no committed diff from `origin/development` | Stop. |
| Commit, push, or PR outcome is ambiguous | Read back state before any retry. |
| Governance observation reports a code failure | Stop; require a new implementation/finalization invocation. |
| Functional or Cloud Build checks are pending or failed after governance passes | Report them separately; do not wait, repair, or change the governance outcome. |

## Execution Steps

1. Resolve the active contracts and capture the complete candidate-scoped invocation snapshot before mutation. Explicitly record the GitHub destination, fetch/read/publication operation, and credential/session authorization.
2. Invoke `delivery-state-mapper` with `scope=authorized-publication-preflight`, `remote=origin`, and `base=development`. It owns repository identity, worktree/base/tracking facts, `git fetch origin`, safe GitHub capability, open head PR, remote head, PR/check state, and native SDD discovery. Accept only `delivery-state-snapshot.v1`.
3. Apply this workflow's policy to the snapshot. Require complete full-inventory classification and its SHA-256 fingerprint; reject `main`, `development`, `staging`, promotion flows, stale/ambiguous facts, invalid tracking, an open head PR, any sensitive/unrelated count, truncated findings, or unmet checks required by affected surfaces. For a clean tree, skip the commit only when a non-empty committed diff against `origin/development` exists.
4. Immediately revalidate branch, `HEAD`, worktree/candidate identity including the full-inventory fingerprint, and selected `origin` before commit. When changes exist, invoke `commit-planner` auto mode for only the captured snapshot. Require a clean tree and verify the commit matches that snapshot before continuing.
5. Revalidate branch, `HEAD`, clean candidate identity, selected `origin`, and the relevant remote head. Push only with `git push -u origin HEAD`, then verify the remote head SHA equals local `HEAD`.
6. Revalidate local and remote head identity again. Invoke `branch-pr` create mode only after that verification, with `remote=origin` and `base=development`. If creation is ambiguous, read back the PR state before retrying.
7. Apply only repository-required PR metadata, then run `node .github/scripts/wait-for-implementation-governance.js <pr-number-or-url>`. This helper is the sole polling and classification implementation: do not reproduce its check names, filtering, timeout, or duplicate-run rules in the skill. Inspect governance failures; repair metadata only within this authorization and invoke the helper again. Do not repair code failures or wait for functional and Cloud Build checks.

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
