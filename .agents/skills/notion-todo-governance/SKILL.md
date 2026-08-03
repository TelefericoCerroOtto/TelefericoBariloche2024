---
name: notion-todo-governance
description: "Trigger: add todo, backlog item, notion task, triage todo, convert todo to issue. Create or update the Notion backlog, dedupe items, and choose the correct formal channel before promotion."
license: Apache-2.0
metadata:
  author: manual
  version: "1.0"
---

## Activation Contract

Use this skill when the request is about creating, cleaning up, deduplicating, triaging, or promoting backlog items between Notion and their formal execution artifact.

## Hard Rules

- **LANGUAGE POLICY: All artifacts created in GitHub Issues and Notion items MUST be written in English. Only the interactive chat with the user can be in Spanish.**

- The pre-issue source of truth is the Notion database **Backlog unificado**.
- Never add new work items to `TODO.md` or ad-hoc legacy checklists.
- Search Notion first and prefer updating an existing row over creating a near-duplicate.
- Keep one row per work unit; use `Notas` for subtasks or extra acceptance details unless they need independent tracking.
- Use `Clarificar` for ambiguous items, `Listo para formalizar` when the work is ready for a formal artifact, and `Formalizado` only after that artifact exists and is linked.
- Set `Canal formal` explicitly before promoting work out of Notion.
- Treat `Work ID` as the stable backlog identifier. `Branch` is optional metadata for one active or representative branch and must not override a unique Work ID association.

## Decision Gates

| Situation | Action |
| --- | --- |
| Same work, better detail | Update existing row |
| Similar but narrower subtask | Add note unless it needs its own tracking |
| Ambiguous request | Create or move to `Clarificar` |
| Clear work but artifact still undecided | Use `Listo para formalizar` and choose `Canal formal` |
| Formal GitHub tracking needed | Set `Canal formal = GitHub Issue`, create issue, paste URL, move to `Formalizado` |
| Operational change outside the repo | Set `Canal formal = Cambio operativo` |
| Architecture/policy/design first | Set `Canal formal = Documento / ADR` |

## Execution Steps

1. Search the Notion backlog by title keywords, area, and context.
2. Inspect likely matches before deciding to create anything new.
3. Create, merge, or update the row using the schema in `docs/todo-workflow.md`.
4. Choose `Canal formal` before promotion; do not default everything to GitHub.
5. If the request deserves a GitHub issue, confirm `Canal formal = GitHub Issue`, then create/link the issue and update the row state.
6. If the request includes branch work, prefer the branch format `<type>/<dir>-<work-id>-<slug>` and record one active or representative branch in `Branch` when useful. Keep additional sequential branches in `Notas` rather than treating `Branch` as identity.
7. Return the row URL, what changed, which formal channel was chosen, and whether a formal artifact was created.

## Output Contract

Return: created vs updated vs merged, final Notion row URL, final state, `Work ID`, chosen `Canal formal`, duplicate handling decision, branch name when applicable, and formal artifact URL when applicable.

## References

- `docs/todo-workflow.md`
- `docs/backlog-branch-pr-policy.md`
- `AGENTS.md`
