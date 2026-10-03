# Design: TB-113 Visitor Feedback

## Authority and Technical Approach

This index and appendices form one normative design. Strapi owns state; Next.js mediates browsers; a pure core computes metrics; a private worker validates, analyzes, renders, and stores. Local implementation uses fake-provider and synthetic boundaries; external evidence gates govern live operations and enablement, not offline coding. D93's planning prerequisite remains historical and does not override the repository's direct-implementation route.

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
| Pure shared reporting core | Root `packages/survey-reporting-core` package | Required for one deterministic metric authority used by app and worker |
| Separate private worker | Additional deployment/IAM | Required to isolate AI/render/runtime dependencies |
| Single product-project topology | Product quota and operations share one boundary | Cloud Run, Cloud Tasks, storage, Vertex, billing, and telemetry remain in `teleferico-bariloche-2024`; local OpenCode identities are excluded |
| Immutable canonical snapshot | Storage overhead | Required for reproducibility and worker validation |
| Conditional renderer adoption | POC delays dependencies | Required because research produced zero source claims |

## Data Flow

`QR browser → Next.js public route → bounded CMS command → PostgreSQL`

`Admin browser → Next.js auth/capability route → core snapshot → CMS generation → product-project Cloud Tasks → private worker service identity → CMS checkpoints → explicit product-project Vertex gate → renderer gate → private GCS → mediated download`

In `NODE_ENV=development`, task dispatch may replace only the Cloud Tasks transport with the worker package's in-memory loopback task API. It uses the existing worker URL/queue settings and delivers the unchanged command over HTTP to the real worker handler with an ephemeral signed local identity. This L1 boundary does not provide CMS/model/report dependencies, persistent task state, or an end-to-end report journey; production stays on the Cloud Tasks flow above.

## File Changes

- CMS creates listed survey APIs/components/migration/tests.
- App creates feedback UI/API/types and app-owned adapters; shared reporting and TB-113 contracts live under root `packages/`, and the private worker process lives under root `services/survey-report-worker/`. App modifies only listed workspace/manifest/lock/env/deployment/permission docs. Delete nothing.

## Testing, Threats, and Rollout

Appendix 06 owns RED-first verification; Appendix 07 cases enter `tasks.md` unchanged. The remaining local worker behavior is delivered as a cohesive disabled code path with fake-provider and synthetic app–CMS–worker coverage. Integrated development acceptance uses existing PR CI and broad synthetic/local validation. Google configuration, credentials, Vertex, Cloud Tasks, Cloud Run, GCS, and bounded staging smoke remain separately approved post-development operational gates; keep generation disabled until those gates pass. See the prospective execution plan in `tasks.md`.

## Open Questions

None. Gates and explicit design/spec revision handle uncertainty; silent substitutes are forbidden.
