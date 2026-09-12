# Design: TB-113 Visitor Feedback

## Authority and Technical Approach

This index and appendices form one normative design. Strapi owns state; Next.js mediates browsers; a pure core computes metrics; a private worker validates, analyzes, renders, and stores. Evidence gates block unverified behavior; D93 blocks apply until tasks exist.

## Normative Manifest

Read in this deterministic order:

1. [`design.md`](./design.md)
2. [`design/01-persistence-contracts.md`](./design/01-persistence-contracts.md)
3. [`design/02-http-contracts.md`](./design/02-http-contracts.md)
4. [`design/03-metrics-snapshot-contracts.md`](./design/03-metrics-snapshot-contracts.md)
5. [`design/04-ai-worker-infrastructure.md`](./design/04-ai-worker-infrastructure.md)
6. [`design/05-pdf-renderer-poc.md`](./design/05-pdf-renderer-poc.md)
7. [`design/06-migration-testing-rollout.md`](./design/06-migration-testing-rollout.md)
8. [`design/07-threat-matrix.md`](./design/07-threat-matrix.md)
9. [`design/08-d01-d93-traceability.md`](./design/08-d01-d93-traceability.md)

Appendices win over summaries; specs remain behavior authority. Code blocks are **Normative** or **Illustrative**.

## Architecture Decisions

| Choice | Tradeoff | Decision |
|---|---|---|
| Next.js mediation | More hops | Required to keep CMS/GCP credentials server-only |
| Pure app-local core | New workspace package | Required for one deterministic metric authority |
| Separate private worker | Additional deployment/IAM | Required to isolate AI/render/runtime dependencies |
| Single product-project topology | Product quota and operations share one boundary | Cloud Run, Cloud Tasks, storage, Vertex, billing, and telemetry remain in `teleferico-bariloche-2024`; local OpenCode identities are excluded |
| Immutable canonical snapshot | Storage overhead | Required for reproducibility and worker validation |
| Conditional renderer adoption | POC delays dependencies | Required because research produced zero source claims |

## Data Flow

`QR browser → Next.js public route → bounded CMS command → PostgreSQL`

`Admin browser → Next.js auth/capability route → core snapshot → CMS generation → product-project Cloud Tasks → private worker service identity → CMS checkpoints → explicit product-project Vertex gate → renderer gate → private GCS → mediated download`

## File Changes

- CMS creates listed survey APIs/components/migration/tests.
- App creates feedback UI/API/types/core/worker and modifies only listed workspace/manifest/lock/env/deployment/permission docs. Delete nothing.

## Testing, Threats, and Rollout

Appendix 06 owns RED-first verification; Appendix 07 cases enter `tasks.md` unchanged. Disabled rollout: CMS→core/app→worker→approved infra→read-only UI→intake→reporting→generation.

## Open Questions

None. Gates and explicit design/spec revision handle uncertainty; silent substitutes are forbidden.
