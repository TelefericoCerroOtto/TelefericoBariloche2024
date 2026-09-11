## Exploration: TB-113 visitor feedback

### Current State

**Outcome:** The repository has reusable Next.js security, CMS mediation, Strapi schema, private GCS, Cloud Run, and test patterns, but it has no implemented visitor-feedback domain. The approved D01-D93 baseline is therefore a cross-package and infrastructure addition, not an extension of existing survey code.

#### Verified repository facts

- `teleferico-app` is a Next.js 15 App Router application with locale-aware public pages, an authenticated administration area, Auth.js sessions backed by Strapi Users & Permissions JWTs, server-only Strapi clients, and mediated browser APIs.
- `teleferico-app/src/middleware.ts` treats `/qr/**` as public and locale-neutral. The only current QR route, `src/app/qr/home/route.ts`, redirects to `/`; no survey route or ordinary navigation entry exists.
- Administrative mutations use `ensureTrustedBrowserRequest` followed by `requireCsrfSession`, bounded errors, a server-side Strapi JWT, and focused Route Handler tests. Authorization is currently role-name based; the Auth.js session exposes a role but not the five TB-113 capabilities.
- Public forms already provide reusable origin, content-length, internal-key, Redis rate-limit, degradation-event, schema-validation, and server-only Strapi patterns. Redis failures in the current rate limiter are observable and non-blocking after validation, which is compatible with D24, but survey browser-token and receipt semantics do not exist.
- CMS browser access is mediated by Next.js. `/api/proxy` allowlists endpoint families and selects a server-held content token or authenticated session JWT; direct client-to-Strapi traffic is prohibited.
- `teleferico-cms` uses Strapi 5 collection/single/component JSON schemas and factory routers/controllers/services. Its existing domain handlers are mostly generated core factories; TB-113 invariants, aggregation, concurrency, and immutable-state rules require explicit custom domain logic rather than unrestricted CRUD.
- Strapi application roles (`plugin::users-permissions.user`) and panel roles (`admin::user`) are distinct. `docs/STRAPI_PERMISSIONS.md` is the repository access contract, is deny-by-default, and must change with any new content type or permission expectation.
- No `teleferico-cms/database/migrations` files exist. One local seed script, `scripts/seed-postulations.js`, demonstrates bounded arguments, deterministic synthetic rows, marker-scoped cleanup, direct Strapi database access, and guaranteed teardown.
- `teleferico-app/packages/survey-reporting-core` and `teleferico-app/services/survey-report-worker` do not exist. `pnpm-workspace.yaml` currently records supply-chain policy but declares no package globs; Vitest discovers only `src/**/*.{test,spec}.{ts,tsx}`.
- Recharts, ECharts, a Vertex AI SDK, and a Cloud Tasks client are not present in `teleferico-app/package.json`. Playwright is a development dependency and Chromium is used by E2E, but there is no runtime PDF image or renderer.
- Private GCS access exists for CVs through `src/lib/services/cv-storage`, using ADC, private cache headers, authenticated streaming, environment-selected local/GCS drivers, and `private/job-applications`. The report and diagnostic prefixes and lifecycle policy do not exist.
- Repository Cloud Build application/CMS files under `docs/infra/cloud-build/` are documentation snapshots; live trigger inline configuration remains the operational source of truth. Existing app and CMS services are public Cloud Run services using one shared runtime service account. No Cloud Tasks queue, private worker service, worker OIDC invoker binding, Vertex routing, report alerting, or feature-specific cost labels are represented in the repository.
- Current app tests cover Route Handlers, guards, auth boundaries, components, and unauthenticated Playwright flows. The CMS has no configured automated test suite, and the current real-stack E2E baseline does not prove authenticated reads/writes, roles, permissions, uploads, or worker behavior.
- The OpenDesign feedback form/dashboard previously inspected are prototypes with independent fixture datasets; they are not runtime contracts and cannot establish deterministic cross-view metric consistency.

#### Planned paths, not current files

- The exact file layout remains design work, but expected boundaries are:
  - `teleferico-cms/src/api/survey-{version,qr-point,submission,report-generation,report}/**` and `src/api/survey-settings/**` for schemas and domain endpoints.
  - `teleferico-cms/src/components/survey/**`, `database/migrations/**`, and a marker-scoped survey seed under `scripts/` for components, compatibility, and synthetic data.
  - `teleferico-app/src/app/qr/feedback/[publicCode]/**` (or an equivalent locale-neutral QR namespace) and dedicated `src/app/api/feedback/**` public Route Handlers.
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/(sections)/feedback/**` and `src/app/api/admin/feedback/**` for analytics, comments, generations, reports, retry, and download.
  - Survey contracts, validation, services, capability checks, storage mediation, and tests under existing `src/types`, `src/lib`, `src/components`, and `src/hooks` domain conventions.
  - The new pure package `teleferico-app/packages/survey-reporting-core` and private service `teleferico-app/services/survey-report-worker`, each with explicit build and test boundaries.
  - Reviewed deployment definitions or snapshots for the worker, queue, OIDC/IAM, environment variables, secrets, logging/alerting, cost labels, and GCS lifecycle rules. These require later operational application through the repository's PR-to-environment deployment governance.

### Affected Areas

- `teleferico-cms/src/api/**` — five collection types, one single type, custom public/admin/worker routes, lifecycle enforcement, aggregations, concurrency, retry lineage, and immutable report handling.
- `teleferico-cms/src/components/**` — repeatable aspect-definition and aspect-rating schemas.
- `teleferico-cms/src/extensions/users-permissions/**` and `docs/STRAPI_PERMISSIONS.md` — exact application-role capability mapping and deny-by-default access; panel Super Admin behavior remains standard.
- `teleferico-cms/database/migrations/**`, `teleferico-cms/scripts/**`, and `types/generated/**` — schema rollout, indexes/constraints/backfill, deterministic local fixtures, and regenerated Strapi types.
- `teleferico-app/src/app/qr/**` and `src/app/api/feedback/**` — QR-only survey resolution/submission, signed sessions, local-draft recovery, idempotency, browser receipt, and safe invalid-point behavior.
- `teleferico-app/src/app/[locale]/(administration)/dashboard/**` and `src/app/api/admin/feedback/**` — authenticated capability-gated dashboard, comments, reports, generations, retry, and download.
- `teleferico-app/src/lib/{auth,http,schemas,services,constants}/**` and `src/types/**` — mediation, validation, redaction boundaries, server-only credentials, capability projection, and versioned HTTP/CMS contracts.
- `teleferico-app/packages/survey-reporting-core/**` — planned dependency-free metrics, period normalization, snapshot schemas, evidence thresholds, and renderer-neutral `ChartViewModel`.
- `teleferico-app/services/survey-report-worker/**` — planned private Cloud Run worker for Vertex calls, map/reduce validation, deterministic rendering, diagnostics, storage, checkpoints, and terminal status.
- `teleferico-app/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, worker manifests/image files — sensitive dependency, lockfile, workspace, and isolated-build changes.
- `docs/infra/cloud-build/**`, `docs/INFRA.md`, package `.env.example` files, and future deployment configuration — sensitive Cloud Tasks, Cloud Run, OIDC/IAM, GCS lifecycle, environment, observability, cost-alert, and rollout documentation.
- `teleferico-app/src/**/*.{test,spec}.{ts,tsx}`, package/worker tests, and `teleferico-app/tests/e2e/**` — deterministic unit, contract, Route Handler, component, security, renderer POC, worker, and real-stack coverage.

### Approaches

1. **Contract-first vertical slices with an isolated worker** — Establish versioned shared contracts and deterministic core first, then CMS persistence, QR ingestion, administration, and finally asynchronous AI/PDF delivery through the separate worker.
   - Pros: Preserves D49/D85-D90; keeps official metrics deterministic; prevents Chromium, ECharts, and Vertex dependencies from entering the public app image; enables compatibility gates and staged rollback; supports narrow review slices.
   - Cons: Requires workspace/build changes, explicit snapshot handoff, more deployment/IAM surfaces, and disciplined cross-package contract testing.
   - Effort: High

2. **Single Next.js runtime for ingestion, analytics, AI, and PDF** — Put reporting jobs and renderers inside the public app service while retaining Strapi persistence.
   - Pros: Fewer deployable services and simpler local startup.
   - Cons: Violates the closed worker/image-isolation decisions, couples request traffic to long-running generation, expands public-service dependencies and IAM, and weakens deterministic rollout/rollback boundaries.
   - Effort: Medium initially, High operationally

3. **Strapi-centric analytics and report execution** — Implement aggregation and generation primarily in CMS custom services.
   - Pros: Data access is close to PostgreSQL and fewer app-to-CMS reads may be needed.
   - Cons: Violates the chosen app/core/worker handoff, overloads the CMS runtime, mixes mutable job execution with content administration, and makes PDF/Vertex dependencies part of the CMS image.
   - Effort: High

### Recommendation

Use **contract-first vertical slices with an isolated worker**. Product and macro architecture are already closed; this recommendation concerns implementation sequencing, not product reconsideration.

1. Define versioned HTTP, CMS, snapshot, AI-output, checkpoint, and `ChartViewModel` contracts before schema or UI implementation. Make the snapshot immutable, cutoff-bound, canonicalized, and digestible so the worker can reject unknown versions or altered payloads without recalculating metrics.
2. Build `survey-reporting-core` as pure deterministic functions for Buenos Aires inclusive periods, previous-period derivation, eligible populations, distributions, trends, aspect/QR comparisons, evidence thresholds, and snapshot validation. Give both dashboard and report requests the same core-derived source.
3. Add Strapi schemas and custom services/controllers/routes with database-backed uniqueness/state transitions. Application users receive only D31 capabilities; public/API tokens and panel Super Admin remain separate. Enforce immutability and concurrency server-side, not only in UI.
4. Add the QR flow and mediated Route Handlers. Resolve active point plus active version on GET, issue a short-lived signed session, and validate session/version/point/idempotency/guards on POST. Keep local drafts client-only, keep locale mutable, and preserve the fail-open Redis rule without weakening schema or QR validation.
5. Add capability-gated admin analytics/comments before AI reporting. Use one normalized filter/period contract and core snapshot builder so every dashboard view is reconcilable against one accepted-submission population.
6. Complete a renderer-neutral POC before adopting chart dependencies: Recharts dashboard and ECharts 6.1 SVG SSR PDF must prove semantic parity, vector output, Spanish fonts/clipping, accessible tables, reduced motion, bar and scatter/matrix cases, bundle impact, and worker cold-start impact.
7. Deploy the private worker and queue only after contract tests pass. Cloud Tasks sends `reportRunId`; the worker authenticates OIDC, loads the immutable known-version snapshot, checkpoints valid stages, calls `gemini-3.8-flash` through Vertex, validates evidence/output, renders deterministic PDF, stores private artifacts, and completes generation atomically.
8. Roll out compatibly: additive CMS schema/indexes and capability setup; seed/fixture validation; core and app readers; worker supporting the contract version; queue/IAM/storage lifecycle/alerts; reporting UI enablement; then generation enablement. Roll back by disabling enqueue/UI, draining or pausing tasks, retaining immutable generations/reports, repointing the active survey version when needed, and deploying prior compatible app/worker revisions. Never roll back by deleting accepted submissions or completed reports.

### D01-D93 Traceability

Every decision below is carried into a concrete implementation concern; no entry reopens the approved product or macro architecture.

- **D01** — Gate GET/POST by active QR-point `publicCode`; **D02** — add no public navigation/CTA or hidden alternative; **D03** — filter all initial metrics/reports to accepted valid-point submissions.
- **D04** — model no visitor/ticket identity; **D05** — store ES/EN/PT in one jointly activated version; **D06** — version aspects as evolvable ordered definitions.
- **D07** — make `aspectKey` semantic identity; **D08** — enforce sole active pointer plus draft/editable and published/immutable lifecycle; **D09** — bind permanent QR only to point.
- **D10** — encode 30-minute superseded-session grace in signed-session validation; **D11** — return all translations, preserve answers on locale switch, and persist final locale; **D12** — persist stable point key/code, display/status/timestamp/order.
- **D13** — block inactive-point intake while preserving/reactivating identity; **D14** — seed/admin procedures distinguish sign replacement from semantic relocation; **D15** — validate integer overall rating 1-5.
- **D16** — validate 1-3 selected aspects; **D17** — count `other`, requiring text and explicit sentiment; **D18** — keep general comment separate from `other`.
- **D19** — snapshot aspect key, displayed label, and rating; **D20** — make server context authoritative and application-user submissions immutable; **D21** — implement two-hour local draft keyed by version/point/browser context.
- **D22** — establish 24-hour browser success guard across points; **D23** — use pseudonymous token/receipt plus Redis, with IP only as short-retention high-threshold signal; **D24** — fail Redis checks open after all authoritative validation and emit degradation telemetry.
- **D25** — retain accepted responses/original comments indefinitely; **D26** — warn against personal data, preserve original, and redact typed email/phone/URL patterns only in model-bound copies; **D27** — keep application and panel actor systems distinct.
- **D28** — authorize application users only for read/generate/download/retry operations and deny survey/point/version management plus report mutation/deletion; **D29** — leave normal Super Admin control intact; **D30** — treat reports globally and requester/generator fields as audit only.
- **D31** — represent exactly the five named capabilities; **D32** — mediate every browser request through Next.js and keep credentials server-only; **D33** — define public GET/POST contracts for translations, signed session, context, idempotency, and guards.
- **D34** — separate admin summary/aspects/QR/comments/reports/generations/retry/download contracts; **D35** — require private worker OIDC; **D36** — add exactly the five approved collection types.
- **D37** — add `survey-settings` as a single type; **D38** — use repeatable aspect-definition/rating components; **D39** — prohibit the eight excluded collection categories.
- **D40** — keep mutable generation separate from success-only report; **D41** — normalize inclusive dates in `America/Argentina/Buenos_Aires`; **D42** — derive the immediately preceding equal-day inclusive period deterministically.
- **D43** — freeze `dataCutoffAt` at request time; **D44** — enforce global active exact-range uniqueness atomically; **D45** — require warning/override and create a new immutable report for completed-range regeneration.
- **D46** — create retry generation with lineage to the failed generation; **D47** — calculate/list all inclusive overlap intervals and require explicit override; **D48** — fail the entire run and create no PDF if any required stage fails.
- **D49** — make core metrics authoritative and forbid model calculation; **D50** — snapshot current/previous processed metrics and eligible comments; **D51** — include all eligible comments without sampling.
- **D52** — route by exact model CountTokens fit, otherwise balanced complete-record map/reduce; **D53** — budget full request/schema/output/headroom with character count only as prefilter; **D54** — preserve source languages and require Spanish final analysis.
- **D55** — generate temporary opaque evidence references only in worker memory/checkpoints and strip them from outputs; **D56** — repository-version prompts/schemas/redaction/token/chunk/model/validator/narrative criteria and record source revision; **D57** — support only Vertex `gemini-3.8-flash` in every environment.
- **D58** — set temperature 0, LOW reasoning, grounding off; **D59** — enforce map/direct/reduce target and maximum output budgets; **D60** — constrain map to evidence/themes and reduce to validated maps plus global official metrics.
- **D61** — classify errors, retry transient failures twice, regenerate invalid output once, never retry auth/config, and skip valid persisted stages; **D62** — validate fixed Spanish descriptive/no-action/no-causality style; **D63** — reject verbatim comments in AI output.
- **D64** — emit explicit insufficient-evidence categories; **D65** — keep recurrent and minority signals separate; **D66** — require four unique comments for minority evidence.
- **D67** — calculate recurrence per period as `max(10, ceil(2%))`; **D68** — schema-limit narrative to the seven allowed sections; **D69** — expose asynchronous queued/running/succeeded/failed UX independent of page lifetime.
- **D70** — dispatch private Cloud Tasks by idempotent/checkpoint `reportRunId`; **D71** — preserve process/artifact separation through CMS relations/state; **D72** — emit structured safe logs with run/stage/status/attempt/model/tokens/chunks/duration, excluding sensitive payloads.
- **D73** — alert only on terminal failure; **D74** — return safe UI failure plus `reportRunId`; **D75** — accumulate usage-metadata cost with a versioned pricing snapshot.
- **D76** — attach feature/service labels distinct from other Agent Platform usage; **D77** — issue one non-blocking alert above cumulative USD 10 without hard/monthly cap; **D78** — retain metadata/validated output indefinitely and sanitized diagnostics for 30 days only.
- **D79** — reuse environment bucket under the two private prefixes unless isolation requirements force a separately approved bucket; **D80** — render validated JSON through typed view model and deterministic HTML/CSS/SVG with pinned Chromium/Playwright; **D81** — fix the eight PDF sections.
- **D82** — implement the five fixed charts; **D83** — exclude raw comments and place narrative after official evidence; **D84** — keep `ChartViewModel` renderer-neutral and gate Recharts/ECharts 6.1 adoption on the full POC.
- **D85** — keep shared core pure and free of framework/runtime dependencies; **D86** — isolate AI/render/storage in private worker and prohibit metric recomputation; **D87** — have app/core create immutable snapshot and worker validate known contract version.
- **D88** — keep workspace changes within `teleferico-app`, not repository root; **D89** — build a separate worker image so Chromium/ECharts never enter public app image; **D90** — specify compatibility matrix and rollout order before deployment.
- **D91** — record product/macro architecture as closed; **D92** — defer exact schema/HTTP/IAM/deployment/migration/seed/test/POC details to subsequent SDD artifacts; **D93** — prohibit implementation until proposal, specs, design, and tasks are complete.

### Migration, Test, Rollout, and Rollback Concerns

- **Schema and data:** Prefer additive schemas and indexes first. Database-level constraints are needed for active exact-range uniqueness and safe state transitions; Strapi schema validation alone is insufficient under concurrency. Migration design must identify existing-environment behavior when settings, an active version, or points are absent.
- **Seeds:** Use deterministic synthetic ES/EN/PT versions, points, submissions, comments, periods, overlaps, generations, and reports. Marker-scoped cleanup must never match production data, and seeds must not bypass invariant tests merely for convenience.
- **Compatibility:** Version HTTP and snapshot contracts independently where needed. App and worker must support an overlap window; unknown snapshot versions fail safely before model or rendering work. A source revision, contract version, snapshot digest, and cutoff must travel together.
- **Testing:** Use strict TDD for core metrics/thresholds/time zones, redaction, token budgets/chunking, validators, retries/checkpoints, and chart view models. Add Route Handler tests for ordering of origin/auth/capability/validation checks and safe errors; component tests for locale-preserving drafts/accessibility; CMS integration tests for permissions, immutability, uniqueness, overlap, lineage, and atomic completion; worker contract/golden tests for direct/map-reduce and PDF structure; and synthetic E2E for QR-only access plus authenticated administration.
- **Renderer POC:** Treat the POC as an adoption gate, not production code. Compare semantic values and accessible tables rather than pixels; pin fonts/browser/runtime, inspect SVG determinism, and measure both app bundle exclusion and worker image/cold start.
- **Infrastructure:** Cloud Tasks queue policy, OIDC audience/service account, private Cloud Run ingress/invoker, Vertex roles, bucket-prefix IAM, lifecycle rules, alert routing, and labels require explicit design and approved operational execution. Existing shared runtime identity increases blast radius and must be assessed before granting worker capabilities.
- **Rollout:** Separate schema/capability migration, app/core release, worker release, infrastructure provisioning, read-only dashboard exposure, QR intake enablement, and report generation enablement. Validate staging with synthetic data and exact contract revisions before production promotion.
- **Rollback:** Feature-disable intake/generation independently; pause queue dispatch; preserve accepted submissions and immutable reports; keep compatible readers deployed during rollback; and repoint `activeSurveyVersion` instead of mutating versions. Infrastructure rollback must remove only TB-113-specific grants/rules after consumers are stopped.

### Risks

- This change crosses every repository-sensitive boundary: dependencies/lockfiles, Strapi schemas/auth/generated types, and infrastructure/deployment/environment configuration.
- Existing role-name authorization cannot directly express D31; capability transport and server-side enforcement need a precise design to avoid UI-only authorization or accidental permission expansion.
- The CMS lacks an automated test runner, while the hardest invariants are transactional and permission-sensitive.
- Cloud Build application configurations are documentation snapshots rather than live declarative sources, so repository review alone cannot prove deployed queue/IAM/lifecycle parity.
- Shared app/CMS runtime identity may make least-privilege worker, Vertex, task-invoker, and GCS-prefix access difficult without identity separation.
- All-comments AI processing can exceed model budgets; CountTokens routing, deterministic chunking, checkpoint reuse, and bounded retries must be proven with worst-case multilingual fixtures.
- Deterministic PDF output depends on pinned Chromium, fonts, locale/time-zone behavior, SVG generation, and stable CSS; the POC can reject the proposed libraries before dependency adoption.
- The likely implementation exceeds the 800-line review budget by a wide margin and should be decomposed into compatible, independently verifiable delivery slices during `sdd-tasks`.

### Ready for Proposal

Yes. The proposal should preserve all D01-D93 decisions, explicitly name `teleferico-app`, `teleferico-cms`, the new core package, the private worker, and GCP operational surfaces, and define phased delivery plus rollback without reopening QR-only access or other settled product decisions.
