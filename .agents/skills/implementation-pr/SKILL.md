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

Load only for an explicit `/implementation-pr` invocation or an equally explicit request to use this project shortcut. Authorization applies only to the current invocation and its captured snapshot.

## Hard Rules

- Own orchestration only. Resolve and defer to `change-intake-preflight`, `commit-planner`, `commit-guard`, `work-unit-commits`, and `branch-pr`; do not copy their internals.
- The three explicit mutation authorizations are: commit the snapshot, non-force-push `HEAD` to `origin`, and create one implementation PR to `development`, including required PR metadata.
- Never authorize later fixes or commits, force pushes, branch switches, rebases, merges, issue closure, branch deletion, promotion PRs, or release actions.
- Stop at the failed phase. Never create a PR after a commit or push failure.

## Decision Gates

| Condition | Action |
| --- | --- |
| Detached, integration, promotion, invalid, or ambiguous branch | Stop before mutation. |
| Open PR for the head branch | Stop; do not create a duplicate. |
| Clean tree with no committed diff from `origin/development` | Stop. |
| Commit, push, or PR outcome is ambiguous | Read back state before any retry. |
| CI reports a code failure | Stop; require a new implementation/finalization invocation. |

## Execution Steps

1. Resolve the active contracts and capture the complete invocation snapshot before mutation.
2. Run the complete read-only preflight: repository identity; clean/dirty state; non-detached governed implementation branch; `origin` and `origin/development`; GitHub CLI availability and authentication; `git fetch origin`; behind/diverged state; exact tracked Work ID or explicit no-backlog mode; open head PR; secrets, unrelated files, and checks required by affected surfaces.
3. Reject `main`, `development`, `staging`, promotion flows, and invalid or ambiguous tracking. For a clean tree, skip the commit only when a non-empty committed diff against `origin/development` exists.
4. When changes exist, invoke `commit-planner` auto mode for only the captured snapshot. Require a clean tree and verify the commit matches that snapshot before continuing.
5. Push only with `git push -u origin HEAD`. Verify the remote head SHA equals local `HEAD`.
6. Invoke `branch-pr` create mode only after that verification, with `remote=origin` and `base=development`. If creation is ambiguous, read back the PR state before retrying.
7. Apply only repository-required PR metadata, then run `gh pr checks --watch`. Inspect failures; repair metadata only within this authorization and repeat. Do not repair code failures.

## Output Contract

Report the resolved contracts, preflight result, snapshot decision, completed phase, PR URL when created, CI result, and any blocker. State explicitly that authorization has expired.

## References

- `AGENTS.md`
- `docs/change-intake-preflight.md`
- `docs/backlog-branch-pr-policy.md`
- `docs/CONVENTIONS.md`
- `~/.config/opencode/skills/commit-planner/SKILL.md`
- `~/.config/opencode/skills/branch-pr/SKILL.md`
- `.agents/skills/commit-guard/SKILL.md`
