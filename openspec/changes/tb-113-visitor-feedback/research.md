# SDD Research Evidence

schema: gentle-ai.sdd-research/v1
revision: 1
change: tb-113-visitor-feedback
outcome: blocked
selected: true
artifact_store: hybrid

## Questions

1. Official Strapi documentation for content-type and component schema constraints, custom routes, controllers, and services, Users & Permissions role and capability enforcement, migrations, and seed-safe patterns.
2. Official Google Cloud and Vertex AI documentation for `gemini-3.8-flash` availability and CountTokens and generation semantics, private Cloud Run invoked by Cloud Tasks OIDC, service-account and IAM least privilege, GCS lifecycle and prefix behavior, structured logging, and usage metadata.
3. Official Playwright, Chromium, and Apache ECharts 6.1 documentation for deterministic HTML, CSS, and SVG PDF rendering and SVG SSR constraints; official Recharts guidance only where required for the renderer-neutral proof-of-concept boundary.
4. Current official limits or guarantees that materially affect implementable contracts for retries, idempotency, payload size, timeouts, region compatibility, or output validation.

## Admission

- Requested source classes: `documentation`
- Capability declaration: `gentle-ai.sdd-research-capability/v1: documentation=[]; open-web=[]`
- Observed exact grants:
  - `documentation=[]`
  - `open-web=[]`
- Decision: denied
- Reason: The requested `documentation` source class has no exact declared grant.

## Sources

[]

## Validated Claims

[]

## Contradictions

[]

## Uncertainty

- Evidence was not collected or evaluated because admission was denied before source access.

## Freshness

- No source freshness assessment was performed because admission was denied.

## Product Choices (Non-Authoritative)

- Product decisions are confirmed in the supplied change context.
- Visitor feedback remains QR-only: only a valid active QR `publicCode` permits access, with no public navigation and no hidden `public_unverified` alternative.

## Blocking Envelope

- code: `sdd_research_capability_denied`
- status: `blocked`
- requested_source_classes: `[documentation]`
- capability_declaration: `gentle-ai.sdd-research-capability/v1: documentation=[]; open-web=[]`
- denied_source_classes: `[documentation]`
- source_claims_emitted: `false`
- recovery: Re-run the selected research request only after the authoritative executor declaration provides exact `documentation` grants. Preserve the same questions, confirmed product decisions, and hybrid artifact-store mode.
