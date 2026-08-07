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

- The only canonical backlog is **Backlog unificado**: database `adf69803-af21-49a1-a98f-e5afa6f95be5`, data source `c0734f69-87ea-43ca-a757-3bb80a41cbbc`. Never write to suffixed copies such as `Backlog unificado (1)`.
- Never add new work items to `TODO.md` or ad-hoc legacy checklists.
- Search Notion first and prefer updating an existing row over creating a near-duplicate.
- Keep one row per work unit; use `Notas` for subtasks or extra acceptance details unless they need independent tracking.
- Use `Clarificar` for ambiguous items, `Listo para formalizar` when the work is ready for a formal artifact, and `Formalizado` only after that artifact exists and is linked.
- Set `Canal formal` explicitly before promoting work out of Notion.
- Treat `Work ID` as the stable backlog identifier. `Branch` is optional metadata for one active or representative branch and must not override a unique Work ID association.
- Keep branch creation, naming, switching, and lifecycle decisions outside this skill. Only record branch metadata supplied by the calling actor.

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
6. If the caller supplies branch metadata, keep one active or representative branch in `Branch` and record additional fresh follow-up branches in `Notas`.
7. Return the backlog and tracking result to the calling actor or preflight. Do not invoke branch governance from this skill.

## Output Contract

Return: created vs updated vs merged, final Notion row URL, final state, `Work ID`, chosen `Canal formal`, duplicate handling decision, branch name when applicable, and formal artifact URL when applicable.

## References

- `docs/todo-workflow.md`
- `docs/backlog-branch-pr-policy.md`
- `AGENTS.md`
