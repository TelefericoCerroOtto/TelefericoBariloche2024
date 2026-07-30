---
name: issue-context-harness
description: "Trigger: TB-###, #123, Notion URL, GitHub issue URL, governed branch context, context snapshot. Resolve linked backlog artifacts silently and summarize only on explicit request."
license: Apache-2.0
metadata:
  author: manual
  version: "1.0"
---

## Activation Contract

Use this skill when a user references issue/backlog identifiers or URLs and the agent must recover cross-artifact context before acting.

This skill complements `notion-todo-governance`: it resolves context for execution; it does not replace backlog triage or promotion decisions.

## Hard Rules

- **LANGUAGE POLICY: All artifacts created in GitHub Issues and Notion items MUST be written in English. Only the interactive chat with the user can be in Spanish.**

- Treat `docs/issue-context-contract.md` as canonical for issue structure and artifact expectations.
- Resolve references silently by default; do not emit unsolicited context dumps.
- Emit a structured recap only when the user explicitly asks for summary/context snapshot/recap.
- Prefer deterministic links: `Work ID` ↔ Notion row ↔ GitHub issue ↔ governed branch.
- Treat a unique valid `Work ID` as primary identity. A different or empty Notion `Branch` is metadata, not a linkage conflict.
- If evidence conflicts, report the conflict and continue with the most reliable linked artifact.

## Decision Gates

| Signal | Action |
| --- | --- |
| `TB-###` present | Resolve Notion row by `Work ID`; then fetch linked issue/branch if available |
| `#123` or GitHub issue URL | Resolve issue first; backtrack to Notion row and `Work ID` |
| Notion row URL | Fetch row, then resolve linked issue and branch |
| Governed branch with `tb-###` | Extract Work ID from branch, then resolve Notion and issue |
| User asks “summary/recap/context snapshot” | Return structured recap of resolved artifacts |
| User does not ask summary | Keep lookup silent and continue task |

## Execution Steps

1. Detect references in the user request (`TB-###`, `#123`, Notion URL, issue URL, governed branch).
2. Resolve the first reliable anchor artifact.
3. Traverse related artifacts to complete linkage graph.
4. Validate consistency (`Work ID`, URLs, and branch metadata) without allowing `Branch` to veto a unique Work ID association.
5. Use resolved context during task execution without additional chatter.
6. Only if explicitly requested, return a concise structured snapshot with: Work ID, Notion URL, issue URL, branch, status, and open gaps.

## Output Contract

Return one of two modes:

- **Silent mode (default):** no dedicated context section; proceed with requested task.
- **Summary mode (explicit request only):** emit a structured snapshot of resolved artifacts and mismatches.

Always include unresolved links as `Unknown` rather than guessing.

## References

- `docs/issue-context-contract.md`
- `docs/todo-workflow.md`
- `docs/backlog-branch-pr-policy.md`
- `AGENTS.md`
- `.agents/skills/notion-todo-governance/SKILL.md`
