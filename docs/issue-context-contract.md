# GitHub Issue Context Contract (Canonical)

This document defines the canonical issue body contract for work items promoted from the Notion backlog to GitHub.

The contract is **AI-ready** and **human-readable**: one stable skeleton across issue types, predictable section order, and explicit artifact links.

## Purpose

- Keep issue creation consistent across humans and automation.
- Preserve traceability between Notion (`Work ID`) and GitHub execution artifacts.
- Give agents a deterministic structure they can parse and enrich.

## Quick path

1. Start from the stable section skeleton in this document.
2. Fill required sections first; use explicit placeholders when data is missing.
3. Include related artifacts (at minimum `Work ID` and Notion row URL, plus related PRs when available).

## Stable issue skeleton

Use this exact heading order for all issue types.

### Required sections

1. `## Summary`
2. `## Problem`
3. `## Desired Outcome`
4. `## Scope`
5. `## Context`
6. `## Repo Surfaces to Inspect`
7. `## Acceptance Signals`
8. `## Related Artifacts`

### Optional sections

9. `## Metadata`
10. `## Out of Scope`
11. `## Risks / Constraints`
12. `## Automation Metadata`

## Required vs optional content rules

- Required sections must always exist, even when concise.
- Optional sections may be omitted when they add no value.
- `## Related Artifacts` is always required and must reference cross-artifact links.

## Placeholder rules

When data is unknown, do not remove required structure. Use explicit placeholders:

- `TBD` → expected to be completed later.
- `Unknown` → currently not discoverable.
- `N/A` → intentionally not applicable.

Never leave empty required sections.

## Canonical section intent

| Section | Intent | Minimum expected content |
| --- | --- | --- |
| `## Summary` | Short work-item statement | One paragraph or short bullets |
| `## Problem` | Current pain/failure | What is broken or missing |
| `## Desired Outcome` | Expected final state | What done looks like |
| `## Scope` | Bounded implementation surface | In-scope bullets |
| `## Context` | Supporting detail | Background, evidence, constraints |
| `## Repo Surfaces to Inspect` | Technical starting points | Paths, modules, APIs, boundaries |
| `## Acceptance Signals` | Verifiable completion conditions | Checklist or bullet criteria |
| `## Related Artifacts` | Cross-system traceability | `Work ID`, Notion URL, related issues/PRs |
| `## Metadata` (optional) | Lightweight classification | `Tipo`, `Área`, `Prioridad`, `Fuente`, `Estado`, `Branch` |
| `## Out of Scope` (optional) | Explicit non-goals | Bullets |
| `## Risks / Constraints` (optional) | Delivery caveats | Risks, blockers, dependencies |
| `## Automation Metadata` (optional) | Machine-origin traceability | Source workflow/mode notes |

## Mapping from Notion backlog fields to issue sections

| Notion field | Issue section | Rule |
| --- | --- | --- |
| `Tarea` | `## Summary` | Base statement for the issue title/summary |
| `Notas` | `## Problem` and `## Context` | Main source for pain/context details |
| `Work ID` | `## Related Artifacts` | Required, stable identifier |
| `Enlace formal` | `## Related Artifacts` | Backlink when present |
| `Contexto` | `## Repo Surfaces to Inspect` | Candidate paths/domains to inspect |
| `Tipo` | `## Metadata` | Keep as metadata classification, not as heading selector |
| `Área` | `## Metadata` | Optional metadata |
| `Prioridad` | `## Metadata` | Optional metadata |
| `Fuente` | `## Metadata` | Optional metadata |
| `Estado` | `## Metadata` | Optional metadata snapshot |
| `Branch` | `## Metadata` or `## Related Artifacts` | Optional; include when branch exists |

## Treatment of `Tipo`

`Tipo` (Bug, Feature, Refactor, Content, Infra, Docs, Security) classifies the work item but does **not** change the body skeleton.

All issue types share the same stable section contract. `Tipo` lives in metadata.

## Relation to PRs

- Related PRs are part of `## Related Artifacts` whenever known.
- Do not duplicate full PR-writing conventions in the issue body.
- Keep PR linkage minimal and explicit (for example: `- Related PRs: #123, #124` or `N/A`).

## Agent artifact-resolution behavior

When a user message includes any of the following references, agents should resolve context automatically:

- `TB-###` (`Work ID`)
- `#123` (GitHub issue number)
- Notion backlog row URL
- GitHub issue URL
- Governed branch containing `tb-###`

### Default behavior (silent lookup)

Agents should fetch and reconcile linked context silently by default while performing the requested task.

### Explicit recap behavior

Agents should emit a structured context recap only when the user explicitly requests a summary/context snapshot.

## Canonical body template

```md
## Summary
<required>

## Problem
<required>

## Desired Outcome
<required>

## Scope
- <required>

## Context
<required>

## Repo Surfaces to Inspect
- <required>

## Acceptance Signals
- [ ] <required>

## Related Artifacts
- Work ID: TB-###
- Notion: <url | TBD>
- Related Issues: <#123 | N/A>
- Related PRs: <#456 | N/A>

## Metadata
- Tipo: <Bug|Feature|Refactor|Content|Infra|Docs|Security|Unknown>
- Área: <optional>
- Prioridad: <P1|P2|P3|Unknown>
- Fuente: <optional>
- Estado: <optional>
- Branch: <optional>

## Out of Scope
- <optional>

## Risks / Constraints
- <optional>

## Automation Metadata
- Source: <optional>
```
