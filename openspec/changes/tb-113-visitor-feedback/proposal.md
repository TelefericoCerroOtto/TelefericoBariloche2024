# Proposal: TB-113 Visitor Feedback

## Intent

Deliver QR-only anonymous feedback, administration, and AI-assisted PDF reports while preserving D01-D93 and separating deterministic evidence from model interpretation.

## Scope

### In Scope
- Versioned ES/EN/PT surveys, permanent QR points, anonymous intake, drafts, guards, and anti-abuse.
- Capability-mediated administration, deterministic evidence, immutable reports, and asynchronous generation.
- Isolated AI/PDF worker, private storage, migration, testing, and controlled rollout.

### Out of Scope
- Visitor identity, public discovery, hidden alternatives, and `public_unverified` submissions.
- Implementation before proposal, specs, design, and tasks are complete (D93).

## Capabilities

### New Capabilities
- `survey-definition-qr-access`: Multilingual versions, activation, permanent QR identity, and active-`publicCode` resolution.
- `anonymous-feedback-intake`: Validation, signed context, immutable answers, drafts, guards, idempotency, and degradable anti-abuse.
- `feedback-administration`: Capability-mediated analytics, comments, generation, retry, report, and download APIs.
- `authoritative-survey-metrics`: Buenos Aires periods, populations, deterministic metrics, thresholds, and cutoff-bound immutable snapshots.
- `report-generation-lifecycle`: Atomic concurrency, overlaps, overrides, states, checkpoints, retries, lineage, history, and success-only reports.
- `vertex-feedback-analysis`: Redaction, CountTokens routing, map/reduce, evidence, validation, retries, and Spanish narrative.
- `deterministic-report-delivery`: Renderer-neutral POC, fixed PDF/charts, pinned rendering, private storage, and mediated downloads.
- `survey-worker-operations`: Cloud Tasks, private Cloud Run/OIDC, IAM, Vertex/storage, observability, cost, retention, and deployment.
- `survey-platform-evolution`: Strapi migrations, seeds, permissions, generated types, compatibility, tests, rollout, and rollback.

### Modified Capabilities
None.

## Approach

Use contract-first slices: versioned contracts and pure reporting core; additive Strapi persistence; QR intake; administration; renderer POC; then isolated worker and infrastructure. Dashboard and reports share accepted valid-QR snapshots; workers validate rather than recalculate metrics.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `teleferico-app/src/**` | New/Modified | QR, admin, mediation, capabilities, tests |
| `teleferico-app/{packages,services}/**` | New | Core and isolated worker |
| `teleferico-cms/{src,database,scripts,types}/**` | New/Modified | Sensitive schema/auth/generated-type evolution |
| `teleferico-app/{package.json,pnpm-lock.yaml,pnpm-workspace.yaml}` | Modified | Sensitive dependencies/workspace |
| `docs/infra/**`, `docs/{INFRA,STRAPI_PERMISSIONS}.md`, `.env.example` files | Modified | Sensitive infrastructure, IAM, environment, deployment |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Permission or state breach | High | Deny-by-default capabilities; transactional tests |
| AI/PDF instability | High | Exact routing, validation, pinned POC |
| Infrastructure/IAM drift | High | Staged approvals; dedicated identities |

## Rollback Plan

Disable intake/generation independently; pause dispatch; restore compatible revisions; repoint the active version; remove only unused grants. Preserve accepted submissions and immutable artifacts.

## Dependencies

- Approved dependency, Strapi, GCP/IAM, environment, and deployment changes; none are authorized here.

## Success Criteria

- [ ] Dedicated specs map D01-D93 without loss.
- [ ] QR-only access and accepted-valid-QR analytics remain closed and testable.
- [ ] Metrics, reports, isolation, compatibility, rollout, and rollback are enforceable.
- [ ] Implementation remains blocked until proposal, specs, design, and tasks are complete.
