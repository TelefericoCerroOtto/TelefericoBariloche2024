# GitHub Issue Context Contract (Canonical)

**LANGUAGE POLICY: ALL GitHub issues MUST be written in English. This includes all sections, comments, and metadata.**

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

9. `## Delivery Phases`
10. `## Metadata`
11. `## Out of Scope`
12. `## Risks / Constraints`
13. `## Automation Metadata`

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
| `## Delivery Phases` (optional) | Sequential production delivery | Ordered checklist of completed and pending phases |
| `## Metadata` (optional) | Lightweight classification | `Type`, `Area`, `Priority`, `Source`, `Status`, `Branch` |
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
| `Tipo` | `## Metadata` → `Type` | Keep as metadata classification, not as heading selector. Translate Spanish field name to English (`Type`) |
| `Área` | `## Metadata` → `Area` | Optional metadata. Translate Spanish field name to English (`Area`) |
| `Prioridad` | `## Metadata` → `Priority` | Optional metadata. Translate Spanish field name to English (`Priority`) |
| `Fuente` | `## Metadata` → `Source` | Optional metadata. Translate Spanish field name to English (`Source`) |
| `Estado` | `## Metadata` → `Status` | Optional metadata snapshot. Translate Spanish field name to English (`Status`) |
| `Branch` | `## Metadata` or `## Related Artifacts` | Optional; include when branch exists |

## Treatment of `Tipo` (translated to `Type` in issues)

The Notion field `Tipo` (Bug, Feature, Refactor, Content, Infra, Docs, Security) classifies the work item but does **not** change the body skeleton. In GitHub issues, this field must be translated to English as `Type`.

All issue types share the same stable section contract. `Type` lives in metadata.

## Phased delivery

Use the optional `## Delivery Phases` section when one issue must reach production through sequentially validated phases. Intermediate promotion PRs declare `Advances #N`, which records delivery while leaving the issue and its Notion backlog row open. The final promotion drops `Advances` and declares `Closes #N`.

This is distinct from review slicing or chained PRs. Review slices ship together in one release and do not require phased-delivery intent.

| Combination | Result |
| --- | --- |
| `Advances #N` alone | Valid |
| `Advances #N` + `Closes #M` for different issues | Valid |
| `Advances #N` + `Closes #N` for the same issue | Invalid |
| `Advances #N` + `Formal issues: none` | Invalid |
| `Closes #N` + `Formal issues: none` | Invalid |
| No declaration | Invalid |

## Relation to PRs

The `## Related Artifacts` section is human-authored. New automated PR traceability is recorded as append-only issue comments, so automation never rewrites the issue body.

### Automation-managed comments

The `Backlog governance` GitHub Action adds one concise English comment for each issue/PR/relation combination after its GitHub and Notion preflight succeeds. Each comment has a deterministic hidden marker containing the issue number, PR number, and one relation role:

```md
Related PR: #456

<!-- backlog-governance:issue=123:pr=456:role=Related PR -->
```

#### Comment lifecycle

| Trigger | Comment role |
| --- | --- | --- |
| Implementation PR opened / edited / synchronized to `development` | `Related PR` |
| Promotion PR opened / edited | `Promotion PR` |
| Promotion PR merged to `main` with `Advances #N` | `Advanced by` for issue `#N` |
| Promotion PR merged to `main` without `Advances #N` | `Shipped by` |

- The action lists all issue-comment pages before posting and no-ops when the exact marker exists.
- Different PRs append independent comments; automation does not modify a shared issue-body block.
- Legacy body blocks may remain as historical content, but managed comments are the authoritative mechanism for new synchronization.

### Static PR linkage (human-authored)

The human-authored line `- Related PRs: <#456 | N/A>` is optional context only. For automation-created traceability, use the managed issue comments.

## Agent artifact-resolution behavior

When a user message includes any of the following references, agents should resolve context automatically:

- `TB-###` (`Work ID`)
- `#123` (GitHub issue number)
- Notion backlog row URL
- GitHub issue URL
- Governed branch containing `tb-###`
- Follow-up or regression language without an identifier

For identifier-free follow-ups or regressions, search the canonical Notion backlog, GitHub issues and PRs, and branch history semantically. Reuse an artifact only when the outcome, scope, and delivery evidence identify it uniquely. Do not reopen issues or repair tracking contradictions automatically when evidence is ambiguous.

### Default behavior (silent lookup)

Agents should use the supplied reference as the first reliable anchor and keep lookup silent while performing the requested task. For informational or read-only questions, follow related links only when needed for an accurate answer; full cross-system traversal is not the default.

Reconcile `Work ID` ↔ Notion row ↔ GitHub issue ↔ PR ↔ governed branch deterministically for implementation, follow-up/regression decisions, tracking mutations, delivery operations, ambiguous identity, or an explicit recap/context snapshot. Fail closed when mutation-sensitive identity remains ambiguous. For change intake, follow the decision and working-tree contract in `docs/change-intake-preflight.md`.

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

## Delivery Phases
- [ ] 1. <optional phase and production validation outcome>
- [ ] 2. <optional phase and production validation outcome>

## Metadata
- Type: <Bug|Feature|Refactor|Content|Infra|Docs|Security|Unknown>
- Area: <optional>
- Priority: <P1|P2|P3|Unknown>
- Source: <optional>
- Status: <optional>
- Branch: <optional>

## Out of Scope
- <optional>

## Risks / Constraints
- <optional>

## Automation Metadata
- Source: <optional>
```
