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
- For continuation or follow-up work with a concrete existing-change anchor, resolve the anchor and inspect its change-local entrypoint or routing instructions before selecting a route or invoking any generic workflow preflight.
- Let change-local routing select direct implementation, delegated direct work, or explicit formal SDD. OpenSpec or SDD artifacts and historical SDD work never select SDD by presence alone; only an explicit current request for a formal SDD lifecycle operation overrides a change-local direct route.
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
| Existing-change continuation or follow-up | Resolve and apply change-local routing before any generic workflow preflight |
| Existing branch or PR delivery | Resolve and continue from current delivery context |
| Missing or contradictory route instructions when route choice changes execution | Ask one concise clarification and stop |
| Ambiguous evidence, unavailable required tracking, or unsafe dirty tree | Ask one consolidated question and stop |

## Execution Steps

1. Classify intent.
2. For continuation or follow-up work with a concrete existing-change anchor, resolve it and apply its change-local routing instructions.
3. Search only the canonical `Backlog unificado`; deduplicate through `notion-todo-governance`.
4. Resolve issue, PR, branch, and delivery history through `issue-context-harness`.
5. Inspect the current branch and working tree.
6. Apply the canonical decision matrix; create or reuse tracking only when appropriate and authorized.
7. Establish a safe branch from current `origin/development` by default, or record the user's safe override.
8. Edit only after the preflight passes.

## Output Contract

Return at most five short lines in the user's current conversation language: intent, tracking, evidence/state, next action, and blocker or continuation. Use simple vocabulary. Do not emit a full context snapshot unless requested. Continue in the same turn when unblocked; ask one question and stop when blocked.

## References

- `../../../docs/change-intake-preflight.md`
- `../../../docs/todo-workflow.md`
- `../../../docs/issue-context-contract.md`
- `../../../docs/backlog-branch-pr-policy.md`
