# Normative Migration, Testing, and Rollout

## Files and Migration

CMS creates `src/api/survey-{version,qr-point,submission,report-generation,report}/**`, `src/api/survey-settings/**`, `src/components/survey/{aspect-definition,aspect-rating}.json`, `database/migrations/2026.09.11T0001-tb113-constraints.js`, `scripts/{seed-surveys,bootstrap-feedback-permissions}.js`, and `test/feedback/**`; regenerate, never hand-edit, `types/generated/{contentTypes,components}.d.ts`.

App creates the QR page, Appendix-02 API routes, admin UI, `src/{types,lib}/feedback/**`, `packages/survey-reporting-core/**`, and `services/survey-report-worker/**`; auth changes capabilities, never JWT. Sensitive changes: manifests/locks/env examples, worker pinned image, permissions/infra docs. No dependency before POC; pnpm remains 10.33.0, installs frozen, build scripts reviewed before `allowBuilds`.

Migration order:

1. Build isolated PostgreSQL harness and RED schema/auth/race tests; reject nonlocal host, non-`tb113_test_` database, or staging/production marker.
2. Add disabled schemas/custom routes; catalog proves exactly five collections, one single type, two components, zero excluded types.
3. One transaction asserts physical names, applies Appendix-01 SQL, creates the locked disabled singleton, verifies catalog, and rolls back any failure.
4. Permission bootstrap plan→review→transaction: Public/Authenticated no survey routes; intake/worker tokens only exact actions; application `Administrator` all five D31 capabilities, others none by default; Super Admin unchanged. Future grants require explicit change; update permissions docs now.
5. Regenerate types; fail unexpected files/contract mismatch.
6. Seed local/test `tb113-fixture-v1` with deterministic IDs. Parent-first create and children-first cleanup are transactional; cleanup requires marker, exact manifest IDs, and expected count or aborts.
7. Release compatible disabled readers. Absent settings creates one disabled row; invent no active version/point, touch no unrelated data, perform no destructive backfill.

## Access and Compatibility

| Principal | Read | Write |
|---|---|---|
| Public/Authenticated | None | None |
| Intake token | Active survey/point | Validated submission |
| User JWT | Capability-selected data | Generate/retry and server-mediated dispatch-failure compensation under generate capability |
| Worker token | Run snapshot/checkpoints | Claim/checkpoint/complete/fail CAS |
| Super Admin | Standard panel | Standard panel |
| Browser | Next.js only | Next.js only |

Contracts: browser→app→CMS public/admin v1; app dispatcher→CMS dispatch-command v1; core→app/CMS snapshot v1; app/CMS→worker command v1; worker→CMS worker-CMS/checkpoint v1; renderer→CMS published-analysis/chart/render v1. Unknown fields/versions fail before effects. CMS v1 precedes app emission; worker v1 precedes generation. Rollback retains additive CMS/readers and disables enqueue/generation.

## RED-First Tests

- **CMS Node** `teleferico-cms/test/feedback/**`: catalog/SQL, permissions, lifecycle, `otherAspect` normalization/total cardinality, replay/digest, singleton, overlap/races/lineage, exact worker responses/replays, CAS, queued enqueue failure, atomic terminals, cleanup.
- **Core Vitest** `packages/survey-reporting-core/src/**`: periods/cutoff, formulas/null/order, thresholds, canonical JSON/digests, snapshots, compatibility, dependency graph.
- **App Vitest** route/domain tests: separate `otherAspect`, combined 1..3, resolver 410, schemas/statuses/guard order, capabilities, token/grace, idempotency, Redis degradation, draft/locale, streaming, secret exclusion, deterministic task-create retry/AlreadyExists/exhaustion compensation.
- **Worker Vitest** `services/survey-report-worker/src/**`: exact CMS/Cloud Run bodies/statuses, explicit `vertexProjectId`/`vertexLocation`, fail-closed project/location mismatch, routing/budget/schema/redaction/validators, stage keys/indexes/digests/dependencies, partial retry, checkpoint privacy/retention, duplicate delivery, OIDC, costs, enqueue-versus-delivery, alerts.
- **POC/PDF** worker tests: Appendix 05, structure/goldens/prohibited content, fail-closed no-substitute adoption.
- **E2E** `tests/e2e/{visitor-feedback,feedback-administration}.spec.ts`: synthetic QR-only/no-nav, locale/draft/guard, every capability, async/retry/download; no production bypass/GCP.
- **Infra** worker OIDC/task tests plus `docs/infra/survey-reporting/verify-config.test.mjs`: product-project ownership, four required APIs, Cloud Tasks `southamerica-east1`, explicit Vertex project/location, distinct task-invoker and worker-runtime identities, worker service-identity attachment, least-privilege bindings, no service-account JSON key, absent `GOOGLE_APPLICATION_CREDENTIALS`, prefixes, lifecycle, labels, per-generation costs, and alerts from redacted config.

Blocking execution order is isolated CMS PostgreSQL suite and cleanup, core/app/worker/POC tests, app typecheck/lint, E2E, then traceability lint. These commands are planned, not run during design. Appendix-07 RED cases propagate unchanged. The harness uses fixed argument arrays, `finally` cleanup, and explicit volume removal; never arbitrary paths/remote databases.

## Rollout and Rollback

S01 records reviewed pass/fail evidence before provider-dependent work: operational, Vertex consumer/quota, billing, and telemetry project are `teleferico-bariloche-2024`; required APIs are enabled; Cloud Tasks supports `southamerica-east1`; model and approved Vertex location are probed; model/deployment project and location match explicitly; the dedicated user-managed worker identity is attached; the distinct OIDC invoker has only invoke duty; deployment contains no service-account JSON key or `GOOGLE_APPLICATION_CREDENTIALS`. Any failed or missing gate disables generation and blocks dependent slices without a local OpenCode identity, alternate model, or implicit fallback.

Order: CMS schema/index/capabilities→fixture proof→core/app readers→worker→approved product-project queue/OIDC/IAM/storage/lifecycle/alerts→read-only dashboard→QR intake→report UI→generation. Staging proves exact revisions/config, project/location checks, keyless identities, quota/cost attribution, and synthetic flow before production promotion. Rollback pauses generation/dispatch first; intake may remain; preserve submissions/runs/reports/objects/readers; repoint version; restore compatible revisions; retain the worker identity while any revision needs it, then remove only unused TB-113 bindings after consumers stop. No deployment/deletion/operational mutation is authorized here.
