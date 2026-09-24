---
name: issue-context-harness
description: "Trigger: TB-###, #123, Notion URL, GitHub issue URL, governed branch, follow-up, regression, context snapshot. Resolve linked artifacts silently."
license: Apache-2.0
metadata:
  author: manual
  version: "1.0"
---

## Activation Contract

Use this skill when a user references issue/backlog identifiers or URLs, or describes a follow-up/regression without IDs, and the agent must recover cross-artifact context before acting.

This skill complements `notion-todo-governance`: it resolves context for execution; it does not replace backlog triage or promotion decisions.

## Hard Rules

- **LANGUAGE POLICY: All artifacts created in GitHub Issues and Notion items MUST be written in English. Only the interactive chat with the user can be in Spanish.**

- Treat `docs/issue-context-contract.md` as canonical for issue structure and artifact expectations.
- Resolve references silently by default; do not emit unsolicited context dumps.
- Emit a structured recap only when the user explicitly asks for summary/context snapshot/recap.
- Use the supplied reference as the first reliable anchor. For informational or read-only questions, follow only the links needed for an accurate answer.
- Reconcile `Work ID` ↔ Notion row ↔ GitHub issue ↔ PR ↔ governed branch deterministically for implementation, follow-up/regression decisions, tracking mutations, delivery operations, ambiguous identity, or an explicit recap.
- Treat a unique valid `Work ID` as primary identity. A different or empty Notion `Branch` is metadata, not a linkage conflict.
- For mutation-sensitive work, continue only when one identity remains uniquely supported. Otherwise fail closed and report the ambiguity without reopening issues or correcting tracking.

## Decision Gates

| Signal | Action |
| --- | --- |
| Informational/read-only request with an anchor | Read that anchor; follow related artifacts only when needed for accuracy |
| Implementation, tracking mutation, or delivery operation | Reconcile the full deterministic artifact chain before acting |
| `TB-###`, issue/Notion URL, or governed branch | Use the supplied artifact as the first anchor |
| Follow-up/regression without IDs | Search canonical Notion, GitHub issues/PRs, and branch history semantically; reuse only on unique evidence |
| User asks “summary/recap/context snapshot” | Reconcile the full chain and return a structured recap |
| User does not ask summary | Keep lookup silent and continue task |

## Execution Steps

1. Classify the task and detect references or follow-up/regression intent (`TB-###`, `#123`, Notion URL, issue URL, governed branch).
2. Resolve the first reliable anchor artifact.
3. For informational/read-only work, follow related links only as needed. For implementation, follow-up/regression decisions, mutations, delivery, ambiguous identity, or a recap, complete the deterministic linkage graph.
4. Validate consistency to the required depth without allowing `Branch` to veto a unique Work ID association. Fail closed on mutation-sensitive ambiguity.
5. Use resolved context during task execution without additional chatter.
6. Only if explicitly requested, return a concise structured snapshot with: Work ID, Notion URL, issue URL, PR URL, branch, status, and open gaps.

## Output Contract

Return one of two modes:

- **Silent mode (default):** no dedicated context section; proceed with requested task.
- **Summary mode (explicit request only):** emit a structured snapshot of resolved artifacts and mismatches.

In summary mode, include unresolved links as `Unknown` rather than guessing.

## References

- `docs/issue-context-contract.md`
- `docs/todo-workflow.md`
- `docs/backlog-branch-pr-policy.md`
- `docs/change-intake-preflight.md`
- `AGENTS.md`
- `.agents/skills/notion-todo-governance/SKILL.md`
