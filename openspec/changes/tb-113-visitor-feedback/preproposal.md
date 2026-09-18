# SDD Pre-Proposal State

schema: gentle-ai.sdd-preproposal/v1
revision: 2
change: tb-113-visitor-feedback
artifact_store: hybrid

## Exploration

- outcome: completed
- OpenSpec reference: `openspec/changes/tb-113-visitor-feedback/exploration.md`
- Engram reference: `sdd/tb-113-visitor-feedback/explore` (observation `#9167`)

## Current Research Selection

- selected: false
- requested source classes: `[]` (not applicable)
- human resolution: The optional research selection was explicitly withdrawn after the supported OpenCode documentation grants were shown to be unavailable. Continue without research.

## Product Decisions

- status: confirmed
- QR-only access is closed: only a valid active QR `publicCode` permits access.
- No public navigation or hidden `public_unverified` alternative is permitted.

## Proposal Readiness

- proposal_ready: true
- rationale: Research is unselected, product decisions are confirmed, exploration and historical evidence references are valid, and the hybrid pre-proposal state is reconciled at revision 2.
- blocker: none

## Historical Research Attempt

This section preserves the blocked revision 1 research attempt as historical evidence. It is not a current research selection or active blocker.

- prior requested source classes: `documentation`
- prior questions:
  1. Official Strapi documentation for schema, extension, authorization, migration, and seed contracts.
  2. Official Google Cloud and Vertex AI documentation for model availability and semantics, private task-to-worker invocation, least privilege, storage lifecycle, logging, and usage metadata.
  3. Official Playwright, Chromium, Apache ECharts 6.1, and narrowly required Recharts documentation for the renderer-neutral proof-of-concept boundary.
  4. Current official limits and guarantees affecting retries, idempotency, payload size, timeouts, regional compatibility, and output validation.
- capability declaration: `gentle-ai.sdd-research-capability/v1: documentation=[]; open-web=[]`
- observed exact grants:
  - `documentation=[]`
  - `open-web=[]`
- admission: denied
- outcome: blocked
- source claims emitted: false
- code: `sdd_research_capability_denied`
- denied source classes: `documentation`
- evidence references:
  - OpenSpec: `openspec/changes/tb-113-visitor-feedback/research.md`
  - Engram: `sdd/tb-113-visitor-feedback/research` (observation `#9177`)
