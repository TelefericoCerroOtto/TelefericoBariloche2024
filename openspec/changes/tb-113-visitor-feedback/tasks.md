# Tasks: TB-113 Visitor Feedback

## Review Workload Forecast

Estimate: **9,000–12,000 lines** (confidence: medium). The total exceeds both budgets; every planned slice remains below 800 lines.

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High
800-line budget risk: High
Delivery strategy: ask-on-risk — resolved to chained/sequential delivery
delivery_strategy: ask-on-risk — resolved to chained/sequential delivery
chain_strategy: stacked-to-main
size:exception: not granted/not used

The review-workload/topology decision is resolved. `stacked-to-main` is adapted to repository governance as sequential PRs targeting `development`: P00/#282 must merge before a planning-finalization PR is prepared, and every later planning or implementation slice waits for the prior PR to merge before it targets `development`. Remaining planning artifacts stay uncommitted until P00 merges. Agents never merge; every subsequent finalization requires fresh explicit authorization. Runtime, provider, dependency, schema/auth, environment, IAM, deployment, and operational approvals remain per-slice blockers. No implementation starts in this session.

## Sequential-to-Development Chain Plan

P00/#282 is the planning baseline and already targets `development`. After it merges, the next planning-finalization PR targets `development`; S01 follows only after that PR merges. S02-S24 each target `development` only after the preceding slice merges. Never open simultaneous slice PRs against intermediate bases under current governance. No `size:exception` is granted or used.

| Slice → target | Units; prerequisites | Start → finish | Verification; runtime harness | Rollback; review focus | LOC |
|---|---|---|---|---|---:|
| S01 → `development` after planning-finalization merge | U1; sensitive-probe approval | confirmed product topology → reviewed identity/API/model gates | document review; safe readback; redacted provider probes | evidence only; gates | 150 |
| S02 → `development` after S01 merge | U2 | no safe DB runner → isolated harness | CMS harness tests; local PostgreSQL | harness only; process boundary | 450 |
| S03 → `development` after S02 merge | U3; S01 | candidates → reviewed POC result | worker Vitest; local/staging-equivalent POC | POC/deps absent; adoption gate | 700 |
| S04 → `development` after S03 merge | U4; S02, schema approval | RED catalog → disabled schemas | CMS Node; local PostgreSQL | additive models; catalog | 500 |
| S05 → `development` after S04 merge | U4; S04 | schemas → migration/lifecycle/types GREEN | CMS Node; local PostgreSQL | migration/routes/types; invariants | 500 |
| S06 → `development` after S05 merge | U5; S05, permission approval | no fixtures/grants → idempotent scripts/docs | CMS Node; local PostgreSQL | fixtures/unused grants; bootstrap | 500 |
| S07 → `development` after S06 merge | U6; S05 | no core → contracts/canonical periods | core Vitest; N/A pure library | package subset; contracts | 400 |
| S08 → `development` after S07 merge | U6; S07 | contracts → metrics/thresholds GREEN | core Vitest; N/A pure library | metric modules; formulas | 400 |
| S09 → `development` after S08 merge | U6; S08 | metrics → snapshots/charts GREEN | core Vitest/graph; N/A pure library | snapshot/chart modules; handoff | 400 |
| S10 → `development` after S09 merge | U7; S05,S09 | no entry → resolver/token GREEN | app Vitest; synthetic QR | resolver flag/routes; QR boundary | 350 |
| S11 → `development` after S10 merge | U7; S10, secret approval | resolver → intake/idempotency/guards GREEN | app Vitest; Redis-failure scenario | submission route/guards; security | 400 |
| S12 → `development` after S11 merge | U7; S11 | API → locale/draft UI and QR E2E | app Vitest/E2E; synthetic QR browser | UI/draft; visitor journey | 350 |
| S13 → `development` after S12 merge | U8; S05,S09 | no admin reads → analytics APIs GREEN | app Vitest; authenticated synthetic data | read APIs; reconciliation | 400 |
| S14 → `development` after S13 merge | U8; S13 | reads → report/generation APIs GREEN | app Vitest; authenticated API | command/download APIs; capabilities | 350 |
| S15 → `development` after S14 merge | U8; passed S03,S14 | APIs → dashboard/admin E2E | app Vitest/E2E; authenticated browser | UI/readers; admin journey | 350 |
| S16 → `development` after S15 merge | U9; S05,S09 | basic runs → overlap/CAS/atomic GREEN | CMS/app tests; concurrent PostgreSQL | generation behavior; transaction | 700 |
| S17 → `development` after S16 merge | U10; S03,S05,S09 | no worker → authenticated resumable worker | worker/CMS-fake Vitest; private server | worker/routes/image; execution | 600 |
| S18 → `development` after S17 merge | U11; S01,S17, provider approval | snapshot → redaction/tokens/routing GREEN | worker Vitest; fake provider | adapter routing; model boundary | 400 |
| S19 → `development` after S18 merge | U11; S18, approved staging probe | routed calls → validated analysis/cost GREEN | worker Vitest; approved probe | validation/provider layer; evidence | 400 |
| S20 → `development` after S19 merge | U12; passed S03,S17-S19, storage approval | validated JSON → deterministic private PDF | golden Vitest; pinned renderer | renderer/objects; delivery | 700 |
| S21 → `development` after S20 merge | U13; S01,S17-S20, operational approvals | plans → approved config GREEN | config test/dry-runs; redacted probes | named resources/grants; operations | 700 |
| S22 → `development` after S21 merge | U14; S01-S21 | components → compatibility/rollback rehearsal | focused package suites; synthetic stack | compatibility/readers; release contract | 450 |
| S23 → `development` after S22 merge | U14; S22, deployment approval | rehearsal → full E2E/staging proof | full suites; approved staging smoke | flags/rollout only; release proof | 450 |
| S24 → `development` after S23 merge | U15; S23 | implementation evidence → complete audit | traceability lint; evidence audit | verify report; closure proof | 400 |

Failed S03 POC stops S15 and S20-S23; failed provider/platform gates stop their dependent slices. Tests/docs remain with behavior. Capability ownership remains: definition U4; intake U7; administration U8; metrics U6; lifecycle U9; AI U11; delivery U3/U12; worker U10/U13; evolution U1/U2/U5/U14/U15. Audit retains nine specs, eight appendices, and D01-D93 ownership.

## Phase 1: Gates and foundations

- [x] 1.1 U1 Verify official facts in `docs/infra/survey-reporting/verification-gates.md`: product operational/Vertex/quota/billing/telemetry project, four enabled APIs, Cloud Tasks `southamerica-east1`, explicit `vertexProjectId`/`vertexLocation`, exact model/settings availability, dedicated attached keyless worker identity, distinct least-privilege OIDC invoker, no service-account JSON key, and absent `GOOGLE_APPLICATION_CREDENTIALS`; D:none; RED/implementation/GREEN:owner-evidence-pass-fail-no-fallback+safe-readback+redacted-probes; E:document-review/safe-readback/provider-probes; R:D35,D57-D58,D70,D75-D79,D92,operations; B:evidence; A:sensitive-probes; L:150,root/CMS/worker. Keep unchecked until S01 apply evidence exists.
- [ ] 1.2 U2 RED remote/staging/production database; metacharacters; alternate compose path; child failure/signal; stale container/volume, then fixed-array/local-`tb113_test_` harness+cleanup in `teleferico-cms/test/feedback/harness/**`; D:none; E:`npm --prefix teleferico-cms test -- feedback/harness`/PostgreSQL; R:D92,Threat-Shell,platform; B:harness; A:none; L:450,CMS.
- [ ] 1.3 U3 RED→POC→GREEN Appendix-05 criteria in `teleferico-app/services/survey-report-worker/poc/**` and `teleferico-app/src/components/administration/feedback/__tests__/chart-parity.fixture.ts`; D:U1; E:worker-Vitest/local+staging-equivalent; R:D80-D84,D89,delivery; B:POC/dependencies; A:manifest/lock/build-scripts; L:700,app/worker. STOP on failure before Recharts/ECharts/Chromium or `teleferico-app/{package.json,pnpm-lock.yaml,pnpm-workspace.yaml}`.

## Phase 2: CMS and core

- [ ] 2.1 U4 RED→implement→GREEN exact Strapi models/services/routes, constraints/migration/generated-types in `teleferico-cms/{src,database/migrations,types/generated}/**`; D:U1-U2; E:CMS-Node/PostgreSQL catalog/auth/lifecycle/transaction; R:D04-D20,D36-D44,D69,D71,definition+lifecycle; B:additive-schema/data-preserving; A:schema/auth/migration; L:1,000,CMS.
- [ ] 2.2 U5 RED→implement→GREEN idempotent `teleferico-cms/scripts/{bootstrap-feedback-permissions,seed-surveys}.js` and `docs/STRAPI_PERMISSIONS.md`; D:U4; E:CMS plan/transaction/marker-cleanup; R:D27-D31,D92,admin+platform; B:fixtures/unused-grants; A:permissions; L:500,CMS/docs.
- [ ] 2.3 U6 RED→implement→GREEN contracts/canonicalization/periods/populations/metrics/snapshots/thresholds/chart-models in `teleferico-app/packages/survey-reporting-core/**`; D:U4; E:core-Vitest/dependency-graph; R:D03,D41-D43,D49-D51,D64-D67,D85,D87,metrics; B:package; A:none; L:1,200,app/core.

## Phase 3: App and lifecycle

- [ ] 3.1 U7 RED encoded/malformed/overlong code or ID; dot/extra segment; wrong method/media/size; unknown fields/query; direct CMS/worker browser call; missing origin/session/CSRF/capability; download enumeration, then fail-safe QR-only intake/token/draft/receipt/guard/Redis in `teleferico-app/src/{app,components,lib,types}/feedback/**`; D:U4,U6; E:app-Vitest+`tests/e2e/visitor-feedback.spec.ts`; R:D01-D26,D33,Threat-HTTP,access+intake; B:intake-flag/routes; A:env-secret; L:1,100,app.
- [ ] 3.2 U8 RED→implement→GREEN summary/aspects/QR/comments/report APIs+dashboard in `teleferico-app/src/{app,components,lib,types}/**/feedback/**`; D:U3,U4,U6; E:app-Vitest+`tests/e2e/feedback-administration.spec.ts`; R:D27-D34,D49,administration; B:readers/UI; A:none; L:1,100,app.
- [ ] 3.3 U9 RED browser direct access; token used across route families; under-capable JWT; upstream leak; same nonce/key with different digest; concurrent range; incomplete completion, then deny/rollback-safe overlap/retry/history/cutoff/CAS/compensation in `teleferico-{app,cms}/**/feedback/**`; D:U4,U6; E:CMS-PostgreSQL/app-Vitest; R:D23,D27-D32,D40,D43-D48,D69-D71,Threat-AppCMS+lifecycle; B:generation; A:none; L:700,app/CMS.

## Phase 4: Worker and operations

- [ ] 4.1 U10 RED create transient/auth/config/exhaustion; duplicate name same/different run; invalid OIDC issuer/audience/principal; wrong route/method; duplicate/altered delivery; stale CAS; timeout/redelivery; post-create delivery exhaustion; terminal replay, then auth-first/deduplicated worker/image/CMS APIs/checkpoints in `teleferico-app/services/survey-report-worker/**`; D:U3,U4,U6; E:worker/CMS-fake-Vitest/private-server; R:D35,D48,D61,D70,D86,D89,Threat-Tasks+worker; B:worker/image/routes; A:deps/image/env; L:600,app/CMS/worker.
- [ ] 4.2 U11 Fake-provider RED→implement→GREEN explicit product-project/location Vertex initialization, fail-closed config, direct/map/reduce/redaction/validation/CountTokens/cost in `teleferico-app/services/survey-report-worker/src/**`; D:U1,U10; E:worker-Vitest/approved-staging-probe; R:D26,D51-D68,D75-D77,AI; B:adapter; A:provider/secrets; L:800,worker.
- [ ] 4.3 U12 RED→implement→GREEN PDF/accessibility/eight-sections/five-charts/diagnostics/private-GCS in `teleferico-app/services/survey-report-worker/src/**`; D:passed-U3,U10-U11; E:golden/prohibited-content-Vitest+pinned-renderer; R:D78-D84,D89,delivery; B:renderer/objects; A:storage-lifecycle; L:700,worker.
- [ ] 4.4 U13 Plan→approve→apply→GREEN product-project Tasks/private-Run/IAM, distinct task-invoker/worker-runtime service accounts, keyless service-identity attachment, explicit Vertex config, secrets/env/logging/alerts/labels in `teleferico-app/{cloudbuild.yaml,.env.example}`, `teleferico-cms/.env.example`, `docs/{INFRA.md,infra/survey-reporting/**}`; D:U1,U10-U12; E:`node docs/infra/survey-reporting/verify-config.test.mjs`+dry-runs; R:D35,D70,D72-D79,D89,operations; B:named-resources/grants; A:separate-staging/production; L:700,root/app/CMS/infra.

## Phase 5: Rollout and proof

- [ ] 5.1 U14 RED→rehearse→GREEN compatibility/migration/seed/parity/full-E2E/rollout/staging-smoke/rollback in `docs/infra/survey-reporting/**` and package tests; D:U1-U13; E:CMS→core→app→worker→POC→typecheck/lint→Playwright; R:D88-D93,platform; B:flags/readers preserving submissions/reports; A:deployment; L:900,all.
- [ ] 5.2 U15 Verify-only in `openspec/changes/tb-113-visitor-feedback/verify-report.md`: nine-specs/eight-appendices/capabilities/D01-D93/exhaustive-413/distinct-types/QR-only/no-`public_unverified`/unchecked/scope; D:U14; E:traceability-lint/evidence-audit; R:D01-D93; B:evidence; A:none; L:400,SDD/root. No apply/archive.
