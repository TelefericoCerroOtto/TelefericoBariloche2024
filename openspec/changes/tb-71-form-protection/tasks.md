# Tasks: Production-safe Public Form Protection

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1300 |
| Review budget mode | Unlimited (`size:exception` approved) |
| Delivery mode | Single PR to `development` |
| Chained PRs recommended | No |
| Main risk | Cross-package correction: app groundwork exists, but Redis + Strapi layers are still missing |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: not_applicable
400-line budget risk: Accepted by maintainer

### Corrective Work Units

| Unit | Goal | Status | Notes |
|------|------|--------|-------|
| 1 | Valid groundwork already landed in app | Done | Vitest harness, structured guard events, safer IP fallback, baseline docs/tests |
| 2 | Replace app-local limiter with environment-aware Redis-backed contract | Done | Local dev uses local Redis container path; shared Redis contract restored for staging/prod |
| 3 | Add Strapi business-rule collection and app ↔ CMS integration | Done | Enforces email thresholds + duplicate blocking through one Strapi collection |
| 4 | Extend tests/docs/verify for the restored two-layer architecture | Done | Covers Redis fail-open and Strapi fail-closed |

## Phase 1: teleferico-app Foundation & Test Harness

- [x] 1.1 Add `teleferico-app/vitest.config.ts` and update `teleferico-app/package.json` (+ lockfile) with a `test` script and Vitest deps.
- [x] 1.2 Create `teleferico-app/src/lib/http/guards/form-protection-policy.ts` with typed per-form env parsing (`CONTACT_*`, `POSTULATION_*`) and defaults.
- [x] 1.3 Extend `teleferico-app/src/types/api/form-guards.d.ts` for form names, decision reasons, and structured event payload contracts.

## Phase 2: teleferico-app Guard Flow + Observability

- [x] 2.1 Create `teleferico-app/src/lib/http/guards/form-guard-events.ts` to emit non-PII `allow|block|error|degraded` JSON events.
- [x] 2.2 Update `teleferico-app/src/lib/http/guards/ip.ts` with trusted fallback chain (`x-client-ip` internal-only → `x-forwarded-for` → `x-real-ip` → unknown key).
- [x] 2.3 Update `teleferico-app/src/lib/http/guards/rate-limit.ts` + `form-guards.ts` to carry form/reason metadata, fail-open degraded mode on backend outage, and hash identity for logs.
- [x] 2.4 Wire shared policy in `teleferico-app/src/app/api/contact/route.ts` and `teleferico-app/src/app/api/postulation/route.ts`, keeping rollback flags per form without weakening non-rate guards.

## Phase 3: Corrective App Refactor for Shared Redis Layer

- [x] 3.1 Replace the in-memory `Map` limiter contract with an async Redis-compatible store in `teleferico-app/src/lib/http/guards/rate-limit.ts`, while keeping a local adapter usable by tests and local development.
- [x] 3.2 Refactor `teleferico-app/src/lib/http/guards/form-protection-policy.ts` to express both IP thresholds and email/business-rule thresholds per form (`contact`, `postulation`) with environment-safe defaults.
- [x] 3.3 Add server-only Redis configuration/bootstrap in `teleferico-app/src/lib/http/guards` or `src/lib/services` and wire environment separation: local uses local Redis URL/container, staging/production use managed/shared Redis URL.
- [x] 3.4 Update `teleferico-app/src/lib/http/guards/form-guards.ts` and route wiring so missing IP still skips only the IP layer, Redis failures fail open with critical/degraded events, and downstream business checks can still execute.

## Phase 4: Strapi Collection and App ↔ CMS Business Rules

- [x] 4.1 Create one Strapi collection under `teleferico-cms/src/api/form-protection-submission/` (content-type, controllers, routes, services) for email/business-rule decisions, duplicate checks, review/bans, notes, and fingerprint signals.
- [x] 4.2 Add any required CMS component/schema support files and generated type updates needed for the new collection without weakening existing postulation contracts.
- [x] 4.3 Implement app-side Strapi business-rule client/service in `teleferico-app` to enforce: postulation `2/30d`, postulation duplicate same email+`sectorDocumentId` hard block (current selected sector identifier), contact `5/24h`, and fingerprint signal-only logging.
- [x] 4.4 Ensure Strapi business-layer failure is fail-closed with stable UI-safe response codes/messages and critical observability in `contact` and `postulation` routes.

## Phase 5: Contract Boundaries and Permission Evidence

- [x] 5.1 Re-verify `teleferico-cms/src/api/postulation/content-types/postulation/schema.json` and existing roles stay compatible after adding the new collection; document exact delta/no-delta boundaries.
- [x] 5.2 Update `docs/STRAPI_PERMISSIONS.md` for the new collection and token expectations, or explicitly record why the existing token scope remains sufficient.
- [x] 5.3 Confirm `teleferico-app/src/lib/services/{contact,postulation}.ts` continue using only server-side internal headers (`Origin`, `x-internal-api-key`, optional `x-client-ip`) and never expose Strapi access client-side.

## Phase 6: Two-Layer Regression Coverage + Verification

- [x] 6.1 Extend `teleferico-app/src/lib/http/guards/__tests__/ip.test.ts` and `form-guards.test.ts` to cover Redis-backed IP decisions, missing-IP skip, fallback-source logging, and Redis failure fail-open behavior.
- [x] 6.2 Add business-rule tests (with MSW or server-side mocks) for contact `5/24h`, postulation `2/30d`, and duplicate same email+`sectorDocumentId` blocking.
- [x] 6.3 Add route smoke/integration tests proving Strapi business-layer failure is fail-closed while core guards still run.
- [x] 6.4 Execute `pnpm --dir teleferico-app run check` and `pnpm --dir teleferico-app run test`; record outputs, new coverage evidence, and any remaining harness caveats in verification notes.

## Phase 7: Operations Docs, Local Redis Workflow, and GCP Alerting Notes

- [x] 7.1 Update `docs/form-protection.md` for the restored architecture: local Redis container workflow, managed Redis expectations, Strapi collection behavior, rollout toggles, and log query examples.
- [x] 7.2 Update `docs/infra/cloud-build/app-staging.yaml` and `docs/infra/cloud-build/app-production.yaml` env documentation for Redis connection settings, per-form thresholds, and safe defaults by environment.
- [x] 7.3 Update `docs/INFRA.md` with the approved infra execution path: managed Redis/Memorystore provisioning and alerting changes must go through the Docker MCP path using the running `google-cloud-sdk` container, with preview/dry-run first where available and approval-sensitive commands grouped explicitly.
