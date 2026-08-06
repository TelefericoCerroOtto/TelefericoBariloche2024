---
name: change-intake-preflight
description: "Trigger: implement, change request, feature request, fix request, follow-up, regression. Prepare tracking and a safe branch before edits."
license: Apache-2.0
metadata:
  author: manual
  version: "1.0"
---

## Activation Contract

Load this skill for concrete change proposals, explicit implementation requests, follow-ups, regressions, or delivery work already in progress. Do not activate backlog intake for informational questions or change-free exploration.

## Hard Rules

- Treat `docs/change-intake-preflight.md` as canonical.
- Load and compose `../notion-todo-governance/SKILL.md` and `../issue-context-harness/SKILL.md`.
- For implementation, finish intake and establish the correct branch before editing.
- Never require every code change to have a GitHub issue.
- Never auto-commit, merge or close PRs, delete branches, or alter a dirty tree to enable a branch switch.
- Keep external mutations with the authorized actor. Prefer one subagent for normalized cross-system read-only discovery when available.

## Decision Gates

| Intent or state | Action |
| --- | --- |
| Informational or exploratory | Stay read-only; create no tracking |
| Concrete proposal | Run read-only intake; recommend only |
| Explicit implementation | Run full preflight; prepare tracking and branch before edits |
| Existing branch or PR delivery | Resolve and continue from current delivery context |
| Ambiguous evidence, unavailable required tracking, or unsafe dirty tree | Ask one consolidated question and stop |

## Execution Steps

1. Classify intent.
2. Search only the canonical `Backlog unificado`; deduplicate through `notion-todo-governance`.
3. Resolve issue, PR, branch, and delivery history through `issue-context-harness`.
4. Inspect the current branch and working tree.
5. Apply the canonical decision matrix; create or reuse tracking only when appropriate and authorized.
6. Establish a safe branch from current `origin/development` by default, or record the user's safe override.
7. Edit only after the preflight passes.

## Output Contract

Return at most five short lines in the user's current conversation language: intent, tracking, evidence/state, next action, and blocker or continuation. Use simple vocabulary. Do not emit a full context snapshot unless requested. Continue in the same turn when unblocked; ask one question and stop when blocked.

## References

- `../../../docs/change-intake-preflight.md`
- `../../../docs/todo-workflow.md`
- `../../../docs/issue-context-contract.md`
- `../../../docs/backlog-branch-pr-policy.md`
