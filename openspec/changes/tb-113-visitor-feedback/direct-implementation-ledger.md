# TB-113 Direct Implementation Ledger

This append-only ledger bridges direct implementation work to possible later formal SDD closure. It is not canonical `apply-progress`, a `verify-report`, native attempt state, receipt evidence, or review authority.

## Recording rules

- Append one entry per work unit. Do not rewrite earlier evidence; append a dated correction when a fact changes.
- Record only observed evidence. Never infer a pass from implementation, review, a merge, another check, or an earlier result.
- Use honest status values: `pending`, `passed`, `failed`, or `not run`.
- Keep exact commands, scenarios, results, revision identifiers, pull request links, and merge evidence when they exist.
- Assign every deferred validation to an intended future checkpoint and owner.
- Tie every later failure and correction back to the originating work unit.
- Leave formal task completion checkboxes and verify or archive claims pending until formal evidence is actually executed and admitted.
- Do not treat this ledger as retroactive native SDD receipts or authority.

**Stop condition:** If a result was not observed, record `not run` or `pending`; do not record `passed`.

## Work unit entry template

Copy this section for each completed or in-progress work unit. Replace every angle-bracket placeholder with observed information or an explicit `pending` or `not run` value. The template itself is not work-unit evidence.

### `<work-unit-id>: <work-unit-name>`

- **Identity and scope:** `<bounded outcome and explicit exclusions>`
- **Requirements references:** `<proposal or specification anchors>`
- **Design references:** `<design anchors>`
- **Task references:** `<task identifiers>`
- **Dependencies:** `<required predecessor units, services, approvals, or none>`
- **Changed paths and reasons:**
  - `<path>` — `<reason>`
- **Implementation:**
  - Status: `<pending|passed|failed|not run>`
  - Revision: `<commit SHA or pending>`
  - Pull request: `<URL or pending>`
  - Merge evidence: `<merge commit or pending>`
- **Focused tests:**
  - Command: `<exact command>`
  - Status: `<pending|passed|failed|not run>`
  - Exact result: `<exit status and concise observed output, or not run>`
- **Intentionally deferred validation:**
  - Exact command or scenario: `<exact command or scenario>`
  - Status: `not run`
  - Reason: `<why validation is deferred>`
  - Intended future checkpoint: `<implementation PR CI, integrated human validation on development, promotion CI, formal verification, or other>`
  - Owner: `<responsible role, team, or person>`
- **Acceptance criteria:**
  - `<criterion and current status: pending|passed|failed|not run>`
- **Residual risks:** `<known risks or none observed>`
- **Rollback boundary:** `<smallest safe revert or disable boundary>`
- **Later integrated validation:**
  - Status: `<pending|passed|failed|not run>`
  - Evidence: `<exact command, scenario, revision, result, and date, or pending>`
- **Correction or follow-up:**
  - Trigger: `<later failed check or validation evidence, or none>`
  - Status: `<pending|passed|failed|not run>`
  - Fix evidence: `<linked revision, pull request, changed paths, and reason, or pending>`
  - Revalidation evidence: `<exact command or scenario and observed result, or pending>`
- **Formal SDD reconstruction:**
  - Status: `<pending|passed|failed|not run>`
  - Evidence: `<fresh formal verification or archive evidence, or pending>`

When a work unit has multiple focused or deferred checks, repeat the corresponding command or scenario block. Do not collapse distinct results into one inferred status.

### `U8-C: Admin analytics UI`

- **Identity and scope:** Added the authenticated Summary, Aspects, and QR-points administration modules, their shared analyzed-period controls, dashboard navigation, U8-A projection additions, responsive semantic tables, and focused tests. Comments/report controls, write commands, CMS work, dependencies, environment configuration, infrastructure, and deployment are excluded.
- **Requirements references:** `specs/feedback-administration/spec.md` administration order, Summary relative/absolute response delta, shared period, Aspects order, QR Comparison/Detail order and filters; `specs/authoritative-survey-metrics/spec.md` authoritative metrics and unavailable-value rules.
- **Design references:** `design/02-http-contracts.md` sections 4.4-4.5; `design/03-metrics-snapshot-contracts.md` metric formulas and `SnapshotV1`; `design/06-migration-testing-rollout.md` responsive prototype boundary.
- **Task references:** `tasks.md` U8-C row and task 3.2.
- **Dependencies:** U8, U8-A, and U3; existing authenticated `/api/admin/feedback/*` mediation; existing `recharts` dependency.
- **Changed paths and reasons:**
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/(sections)/feedback/page.tsx` — mounts the authenticated feedback dashboard page.
  - `teleferico-app/src/components/administration/feedback/FeedbackDashboard.tsx` — implements shared period controls and Summary, Aspects, and QR modules with exact-data and state fallbacks.
  - `teleferico-app/src/components/administration/feedback/FeedbackDashboard.test.tsx` — verifies module order, response-delta audit evidence, QR chart boundaries, exact tables, and accessible tabs.
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.ts` — adds role-scoped feedback navigation.
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts` — updates navigation projection evidence.
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/_components/HeaderTitle.tsx` — maps the feedback route title.
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/_components/Sidebar.tsx` — maps the feedback navigation icon.
  - `teleferico-app/src/lib/constants/routes.const.ts` — declares the feedback dashboard route.
  - `teleferico-app/src/lib/feedback/admin-read.ts` — exposes available QR points and detail-only calendar/aspect context from the U8-A projections.
  - `teleferico-app/src/lib/feedback/admin-route.ts` — applies analytics projections to mediated runtime source envelopes.
  - `teleferico-app/src/app/api/admin/feedback/runtime-harness.test.ts` — proves runtime projection wiring and point-scoped QR detail data.
  - `teleferico-app/src/types/api/admin/feedback.d.ts` — derives UI read contracts from `SnapshotV1`.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records direct implementation evidence and deferrals.
- **Implementation:**
  - Status: `passed`
  - Revision: `pending`
  - Pull request: `pending`
  - Merge evidence: `pending`
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx'`
  - Status: `passed`
  - Exact result: exit 0; 1 file passed; 3 tests passed.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'`
  - Status: `passed`
  - Exact result: exit 0; 1 file passed; 3 tests passed.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app run test -- src/components/administration/feedback/FeedbackDashboard.test.tsx`
  - Status: `failed`
  - Exact result: exit 1; the package script unexpectedly discovered the broad 40-file suite. The requested dashboard file passed, as did 38 other files; 329 tests passed and two pre-existing `src/lib/services/__tests__/form-protection.test.ts` assertions failed because they expected `TOO_MANY_REQUESTS` and received `EMAIL_LIMIT_EXCEEDED`.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app run test -- 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'`
  - Status: `failed`
  - Exact result: exit 1; the package script again discovered the broad 40-file suite. The requested shell-projection file passed, as did 38 other files; 329 tests passed and the same two unrelated form-protection assertions failed.
- **Focused tests:**
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0 with no output after the ledger append.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm --dir teleferico-app run typecheck`
  - Status: `not run`
  - Reason: Full local typecheck is intentionally deferred by the TB-113 direct verification profile.
  - Intended future checkpoint: implementation PR CI.
  - Owner: implementation PR CI and TB-113 implementer.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm --dir teleferico-app run lint`
  - Status: `not run`
  - Reason: Full-package lint is intentionally deferred by the TB-113 direct verification profile.
  - Intended future checkpoint: implementation PR CI.
  - Owner: implementation PR CI and TB-113 implementer.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run 'src/app/api/admin/feedback/runtime-harness.test.ts'`
  - Status: `passed`
  - Exact result: exit 0; 1 file passed; 1 authenticated runtime projection test passed.
- **Intentionally deferred validation:**
  - Exact command or scenario: authenticated desktop/mobile browser validation for `tests/e2e/feedback-administration.spec.ts` covering Summary, Aspects, QR Comparison, QR Detail, filters, chart rendering, exact-data parity, and empty/error states.
  - Status: `not run`
  - Reason: The authenticated responsive browser harness is intentionally deferred on this direct implementation route.
  - Intended future checkpoint: later integrated human validation on `development` and promotion CI.
  - Owner: TB-113 implementer and reviewer.
- **Acceptance criteria:**
  - Top-level order is Summary, Aspects, QR points, Comments and reports: `passed` by focused component test.
  - Summary displays relative response change while retaining absolute delta as audit data: `passed` by focused component test.
  - QR Comparison omits temporal evolution; QR Detail uses a point-filtered source for its calendar and Aspects context: `passed` by focused component and runtime tests.
  - Administrator navigation exposes the feedback route without granting it to other roles: `passed` by focused shell-projection test.
  - Shared current/previous period presentation and route-specific filters: `pending` integrated browser validation.
  - Exact-data table and tab semantics/arrow navigation: `passed` by focused component test; responsive parity remains `pending` authenticated desktop/mobile validation.
  - Zero, unavailable, insufficient-evidence, empty, and upstream-error states: `pending` integrated browser validation.
- **Residual risks:** The two package-script test invocations remain red because they execute the broad suite and encounter unrelated form-protection baseline failures. Full typecheck, lint, real chart rendering, authenticated browser behavior, and responsive parity remain unverified locally. The route now projects mediated source envelopes; integrated upstream source-envelope compatibility remains pending. Current UI copy is not localized.
- **Rollback boundary:** Revert the U8-C page/component/test, feedback dashboard navigation/route mappings, and the bounded `admin-read.ts`/admin feedback type additions as one unit.
- **Later integrated validation:**
  - Status: `pending`
  - Evidence: `pending`
- **Correction or follow-up:**
  - Trigger: pre-review findings for unwired runtime projections, unscoped QR detail context, missing exact table, incomplete tab semantics, and overstated evidence.
  - Status: `passed`
  - Fix evidence: bounded updates to `admin-route.ts`, `admin-read.ts`, `FeedbackDashboard.tsx`, focused tests, and this ledger.
  - Revalidation evidence: focused dashboard, shell projection, and authenticated runtime harness tests passed; `git diff --check` passed.
- **Formal SDD reconstruction:**
  - Status: `pending`
  - Evidence: `pending`

### `U8-C-R1: OpenDesign reconciliation corrections`

- **Identity and scope:** Reconciled the existing Summary, Aspects, and QR analytics UI with the authorized visual evidence without adding Comments/reports behavior, new metrics, dependencies, CMS, environment, infrastructure, or deployment work.
- **Visual evidence:** Read-only OpenDesign project `teleferico-cerro-otto-design-system`, entry `feedback-dashboard.html`; observed size 322684 bytes and mtime `1789055103055.474` (`2026-09-10T12:45:03.055-03:00`). No content revision was exposed; the artifact manifest reports `reconciled: true` and `updatedAt: 2026-09-01T15:55:08.782Z`.
- **Aligned decisions:** Uses the compact administrative header/period surface, compact bordered radii, Spanish module vocabulary, responsive two-axis matrix, four-column five-star association, previous-period KPI context, and explicit loading/error/accessibility states.
- **Intentional divergences:** Keeps all authoritative chart sections always visible; adds no metric or day/week/month selector and no interactive chart marks. Comments/reports remain disabled and deferred to U8-D. Prototype fixture values, ordering, calculations, synthetic subsets, report rows, verification, limits, and downloads were not copied.
- **Fixes applied:** Aligned runtime mobile detection to the Tailwind `md` boundary at 820px; rendered authoritative matrix fields with named quadrants, doubled-median display/equality semantics, selected emphasis, excluded/insufficient states, and an exact table; exposed all authoritative five-star cohort fields; added previous/delta meaning to all Summary KPIs; added date-validation focus/announcement, live loading/error semantics, retry, skip link/main target, and disabled Recharts animation; standardized the feature label as `Feedback del público`.
- **Changed paths:** `teleferico-app/src/hooks/use-is-mobile.ts`, `teleferico-app/src/hooks/use-is-mobile.test.ts`, `teleferico-app/src/components/administration/feedback/FeedbackDashboard.tsx`, `teleferico-app/src/components/administration/feedback/FeedbackDashboard.test.tsx`, dashboard header/navigation projection, and this ledger.
- **Checks actually run:**
  - `pnpm exec prettier --write <changed TS/TSX paths> && pnpm exec prettier --check <changed TS/TSX paths>` — formatter/check passed before the compact-file restoration required by the 400-line boundary; formatting those two legacy compact files expanded the authored delta beyond the authorized limit and was reverted.
  - `pnpm exec prettier --check <changed TS/TSX paths>` — failed on `FeedbackDashboard.tsx` and `FeedbackDashboard.test.tsx`; all four other changed TS/TSX files passed. This unresolved conflict makes the correction status `partial`.
  - `pnpm --dir teleferico-app exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx'` — first passed; after a nullability hardening edit, failed with 2 of 6 tests because an absent optional delta object passed the null-only guard; after correcting the guard, final rerun passed with 1 file and 6 tests.
  - `pnpm --dir teleferico-app exec vitest run 'src/hooks/use-is-mobile.test.ts'` — passed; 1 file, 5 tests.
  - `pnpm --dir teleferico-app exec vitest run 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'` — passed; 1 file, 3 tests.
  - `git diff --check 3d65405528dd1c0344dca7ad724d6947f300bf48` — passed with exit 0 and no output.
  - Authored additions plus deletions against `3d65405528dd1c0344dca7ad724d6947f300bf48`, including untracked files — 222 lines, within the 400-line boundary.
- **Remaining gap:** Repository-wide Prettier convergence for the two inherited compact U8-C files cannot coexist with this correction's strict 400-authored-line boundary; functional focused checks pass.
- **Deferred browser validation:** Authenticated desktop and compact-width validation, visual quadrant placement, focus movement, live announcements, and chart rendering remain `not run`; intended checkpoint is implementation PR CI plus integrated human validation on `development`; owner is the TB-113 implementer/reviewer.
- **Residual risks:** No browser or visual validation was executed. UI copy remains locally Spanish rather than locale-driven. Full typecheck and lint were not requested or run.
- **Rollback boundary:** Revert the two dashboard shell labels, feedback component/test, mobile hook/test, and this ledger entry as one correction unit.

### `U8-C-R1-CORRECTION-2: Revalidate bounded alignment corrections`

- **Identity and scope:** Revalidated the bounded visual-alignment correction after adding authoritative matrix assertions, Spanish accessible labels, and active-module retry coverage. Comments/reports behavior, new metrics, dependencies, CMS, environment, infrastructure, deployment, and commits remain excluded.
- **Correction trigger:** The earlier R1 entry overstated formatter convergence and retained stale test/line-count evidence after the candidate-specific exception and follow-up corrections.
- **Evidence context:** Candidate-specific `size:exception` was granted with an 800 authored changed-line ceiling. The OpenDesign evidence remains the read-only project `teleferico-cerro-otto-design-system`, entry `feedback-dashboard.html`, observed size `322684`, mtime `1789055103055.474`, and `reconciled: true` manifest state.
- **Checks actually run:**
  - `pnpm --dir teleferico-app exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx'` — passed; 1 file, 7 tests.
  - `pnpm --dir teleferico-app exec vitest run 'src/hooks/use-is-mobile.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts' 'src/components/administration/feedback/FeedbackDashboard.test.tsx'` — passed; 3 files, 15 tests.
  - `pnpm exec prettier --write 'src/hooks/use-is-mobile.ts' 'src/hooks/use-is-mobile.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/HeaderTitle.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.ts'` — passed; all four files unchanged.
  - `pnpm exec prettier --check 'src/components/administration/feedback/FeedbackDashboard.tsx' 'src/components/administration/feedback/FeedbackDashboard.test.tsx' 'src/hooks/use-is-mobile.ts' 'src/hooks/use-is-mobile.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/HeaderTitle.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.ts'` — exit 1 as expected; only the two inherited compact dashboard files reported formatting differences.
  - `pnpm exec prettier --check 'src/hooks/use-is-mobile.ts' 'src/hooks/use-is-mobile.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/HeaderTitle.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.ts'` — passed; all four non-inherited changed/new TS/TSX files converged.
  - `git diff --check 3d65405528dd1c0344dca7ad724d6947f300bf48` — passed with exit 0 and no output.
  - Authored additions plus deletions against `3d65405528dd1c0344dca7ad724d6947f300bf48`, including the 18-line untracked mobile test — 362 lines, within the approved 800-line ceiling.
- **Status:** `passed` for the bounded local correction evidence; revision, pull request, merge evidence, and formal SDD reconstruction remain `pending`.
- **Intentional divergence:** The two inherited compact dashboard files remain unformatted to preserve the authorized size boundary; their formatter failure is recorded rather than hidden. Domain values such as `Views` remain data labels while surrounding UI copy is Spanish.
- **Remaining validation:** Full typecheck, lint, authenticated browser validation, responsive visual parity, and integrated CI remain `not run`; intended checkpoint is implementation PR CI plus integrated human validation on `development`; owner is the TB-113 implementer/reviewer.

### `U8-C-R1-CORRECTION-3: Final authored-line count`

- **Correction:** The ledger append itself increased the final authored additions-plus-deletions count from the prior intermediate 362-line measurement to 384 lines.
- **Evidence:** `git diff --numstat 3d65405528dd1c0344dca7ad724d6947f300bf48` plus the 18-line untracked `teleferico-app/src/hooks/use-is-mobile.test.ts` totals 384 authored changed lines, below the approved 800-line ceiling.

### `U8-C-R1-CORRECTION-4: Refresh shared period metadata before active modules`

- **Identity and scope:** Fixed only the remaining shared-period refresh regression: Summary metadata and available QR points now refresh for every accepted period before Aspectos or Puntos QR fetches their active-module data.
- **Root cause:** The Summary effect returned early whenever cached Summary data existed outside the Summary module, so `population` and `availablePoints` remained from the previous period.
- **Fix evidence:** `FeedbackDashboard.tsx` now separates Summary and active-module retry counters, refreshes Summary on `[period, summaryRetry]`, gates active-module fetches on a matching Summary period key, clears old period data before refresh, and ignores inactive responses in addition to aborting requests.
- **Focused tests:**
  - `pnpm --dir teleferico-app exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx'` — passed; 1 file, 9 tests.
  - `pnpm --dir teleferico-app exec vitest run 'src/hooks/use-is-mobile.test.ts'` — passed; 1 file, 5 tests.
  - `pnpm --dir teleferico-app exec vitest run 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'` — passed; 1 file, 3 tests.
  - New regression coverage changes the period while Aspectos is active and while Puntos QR is active, asserting Summary period URLs, active-module period URLs, refreshed population text, refreshed options, and refreshed active data.
- **Formatting evidence:**
  - Exact changed/new TS/TSX paths: `pnpm exec prettier --check 'src/components/administration/feedback/FeedbackDashboard.tsx' 'src/components/administration/feedback/FeedbackDashboard.test.tsx' 'src/hooks/use-is-mobile.ts' 'src/hooks/use-is-mobile.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/HeaderTitle.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.ts'` — exit 1; only the two inherited compact dashboard files reported differences.
  - Non-inherited paths: `pnpm exec prettier --check 'src/hooks/use-is-mobile.ts' 'src/hooks/use-is-mobile.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/HeaderTitle.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.ts'` — passed; all matched.
- **Diff and size evidence:** `git diff --check 3d65405528dd1c0344dca7ad724d6947f300bf48` — passed with no output. Final authored changed lines including the 18-line untracked mobile test: `503`, below the approved 800-line ceiling.
- **Status:** `passed` for this bounded correction; revision, pull request, merge evidence, integrated browser validation, full typecheck, lint, and formal SDD reconstruction remain `pending` or deferred under the prior ledger entries.

### `U8-A-R2: Move feedback reads to native CMS surfaces`

- **Identity and scope:** Replaced the public survey resolver and administration reader's custom CMS read dependencies with bounded native Strapi REST reads. Preserved the custom transactional submission command. Added native read routes for submissions and reports, lifecycle debt documentation, permissions documentation, and focused transport/reader tests. Worker runtime, PDF delivery, provider integration, deployment, and environment changes remain excluded.
- **Requirements references:** `specs/visitor-feedback/spec.md` native CMS boundary and public survey eligibility; `specs/feedback-administration/spec.md` bounded read projections and deterministic comments/reports; `specs/authoritative-survey-metrics/spec.md` snapshot ownership.
- **Design references:** `design/02-http-contracts.md` public resolver and submission surfaces; `design/03-metrics-snapshot-contracts.md` `SnapshotV1`; `design/06-migration-testing-rollout.md` focused app/CMS verification.
- **Task references:** `tasks.md` U7-B3a, U8-A, and U8-B native CMS boundary requirements.
- **Dependencies:** Existing Strapi survey schemas, `survey-reporting-core`, authenticated app administration routes, and existing transaction persistence.
- **Changed paths and reasons:**
  - `teleferico-app/src/lib/feedback/cms-transport.ts` — resolves points, settings, active version, aspects, and lifecycle metadata through bounded native reads.
  - `teleferico-app/src/lib/feedback/admin-reader.ts` — fetches bounded native submissions, points, versions, and reports and creates the app-owned deterministic snapshot source.
  - `teleferico-app/src/lib/feedback/admin-route.ts` — projects comments and reports when the native source envelope is returned while preserving existing route-test fixtures.
  - `teleferico-cms/src/api/{survey-version,survey-settings,survey-qr-point}/routes` and `controllers` — exposes native core read surfaces.
  - `teleferico-cms/src/api/survey-submission/routes/native.js` and `survey-report/routes/survey-report.js` — exposes only native read route families; transactional submission remains custom.
  - `teleferico-cms/src/api/survey-submission/controllers/survey-submission.js` and `survey-report/controllers/survey-report.js` — provides native read handlers while retaining closed submission acceptance.
  - `teleferico-cms/test/feedback/{lifecycle,permissions}/**` — verifies route registration, native reads, and deny-by-default permissions.
  - `teleferico-app/src/lib/feedback/{cms-transport,admin-reader}.test.ts` — verifies native envelopes, malformed responses, bounded reads, deadlines, and public contract normalization.
  - `openspec/changes/tb-113-visitor-feedback/runtime-boundary-debt.md` — records ordinary lifecycle helpers, current consumers, future ownership decision, and closure criteria.
  - `docs/STRAPI_PERMISSIONS.md` — documents the native read actions and preserves the no-generic-CRUD rule.
- **Implementation:**
  - Status: `passed` for the bounded native-read implementation; revision, pull request, and merge evidence remain `pending`.
  - Revision: `pending`
  - Pull request: `pending`
  - Merge evidence: `pending`
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-reader.test.ts src/lib/feedback/cms-transport.test.ts src/lib/feedback/admin-command.test.ts`
  - Status: `passed`
  - Exact result: exit 0; 3 files passed; 24 tests passed.
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback src/app/api/feedback src/app/api/admin/feedback`
  - Status: `passed`
  - Exact result: exit 0; 17 files passed; 164 tests passed.
  - Command: `npm test -- feedback/lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 12 tests passed, including isolated PostgreSQL/Strapi startup.
  - Command: `npm test -- feedback/permissions`
  - Status: `passed`
  - Exact result: exit 0; 4 tests passed, including isolated permission inspection.
  - Command: `npm test -- feedback/catalog`
  - Status: `passed`
  - Exact result: exit 0; 6 tests passed.
  - Command: `npm test -- feedback/seed`
  - Status: `passed`
  - Exact result: exit 0; 5 tests passed.
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0 with no whitespace errors.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm --dir teleferico-app exec tsc --noEmit`
  - Status: `failed`
  - Reason: Existing unrelated type errors remain in `FeedbackDashboard` fixtures and `admin-read.test.ts`; the changed native transport/reader files produced no filtered type errors.
  - Intended future checkpoint: implementation PR CI and focused type cleanup.
  - Owner: TB-113 implementer/reviewer.
  - Exact command or scenario: `pnpm --dir teleferico-app exec prettier --check <changed feedback files>`
  - Status: `failed`
  - Reason: The five edited feedback TypeScript files need formatting convergence; no formatter write was applied in this slice.
  - Intended future checkpoint: implementation PR formatting pass.
  - Owner: TB-113 implementer.
  - Exact command or scenario: `npm test -- feedback`
  - Status: `failed`
  - Reason: The combined suite had one transient PostgreSQL seed connection termination; the isolated `feedback/seed` rerun passed. The catalog failure was a documentation wording assertion and passed after correction.
  - Intended future checkpoint: full CMS suite rerun in a clean isolated process.
  - Owner: TB-113 implementer/reviewer.
- **Acceptance criteria:**
  - Public survey resolution no longer calls `/api/tb113/public/surveys/:publicCode`: `passed` by focused transport tests.
  - Native reads are bounded and malformed native responses fail closed: `passed` by app transport/reader tests.
  - Transactional submission command remains custom and covered: `passed` by lifecycle and app feedback suites.
  - Admin analytics source is app-owned and uses `SnapshotV1`: `passed` by native reader implementation and app feedback suite.
  - Lifecycle helper debt is documented with consumers and closure criteria: `passed` by added runtime-boundary document.
  - Worker/PDF/provider/operational migration: `pending`, intentionally outside this bounded slice.
- **Residual risks:** Strapi private-attribute response behavior for admin/native reads must be verified in the authenticated application harness; no production or staging readback was performed. Native REST query/response compatibility beyond the isolated Strapi startup and existing synthetic app fixtures remains pending.
- **Rollback boundary:** Revert this ledger entry and the changed native transport/reader, CMS route/controller, test, and documentation paths together; preserve the prior custom transactional submission route and persistence implementation.
- **Later integrated validation:**
  - Status: `pending`
  - Evidence: authenticated staging-equivalent native submission/report readback, full app typecheck/lint, and worker/PDF integration evidence.
- **Correction or follow-up:**
  - Trigger: formatting/typecheck or authenticated native private-field readback failure.
  - Status: `pending`
  - Fix evidence: `pending`
  - Revalidation evidence: `pending`
- **Formal SDD reconstruction:**
  - Status: `pending`
  - Evidence: `pending`

### `U10-B/U12-A: App-owned worker and deterministic PDF boundary`

- **Identity and scope:** Implemented the app-owned worker/CMS adapter seam and deterministic PDF boundary. The runtime validates the immutable `SnapshotEnvelopeV1`, never recalculates metrics, reuses digest-matching checkpoints, applies state-version CAS, handles terminal replay and safe failure classification, stages artifacts privately, and completes through an injected CMS adapter. The renderer validates bounded `ChartViewModelV1` input, emits deterministic ECharts SVG/HTML, exposes a worker-only Playwright adapter, and returns SHA-256/size metadata. The admin generation command now exposes an idempotent task-name dispatcher seam and explicit `DISPATCH_UNAVAILABLE` queued behavior. Cloud Tasks, Cloud Run/OIDC, Vertex, GCS production storage, worker image/deployment configuration, and external readiness remain excluded.
- **Requirements references:** `specs/report-generation-lifecycle/spec.md`, `specs/deterministic-report-delivery/spec.md`, `specs/survey-worker-operations/spec.md`.
- **Design references:** `design/02-http-contracts.md`, `design/03-metrics-snapshot-contracts.md`, `design/04-ai-worker-infrastructure.md`, `design/05-pdf-renderer-poc.md`.
- **Task references:** `tasks.md` rows U10-B and U12-A; local app-owned portion only.
- **Dependencies:** Existing ECharts dependency, `survey-reporting-core`, and injected CMS/artifact/analysis/renderer adapters. No dependency or lockfile changes.
- **Changed paths and reasons:**
  - `teleferico-app/services/survey-report-worker/src/contracts.ts` — typed CMS, checkpoint, artifact, analysis, and renderer contracts.
  - `teleferico-app/services/survey-report-worker/src/renderer.ts` — bounded pure chart validation, semantic projection, accessible tables, and deterministic ECharts SVG.
  - `teleferico-app/services/survey-report-worker/src/pdf.ts` — validated report HTML, injected PDF boundary, deterministic test renderer, Playwright worker adapter, and artifact metadata.
  - `teleferico-app/services/survey-report-worker/src/worker-runtime.ts` — claim/snapshot/checkpoint/complete/fail orchestration with replay, CAS, and safe failure behavior.
  - `teleferico-app/services/survey-report-worker/src/index.ts` — worker-only exports.
  - `teleferico-app/src/lib/feedback/dispatch.ts` — explicit unavailable dispatcher seam.
  - `teleferico-app/src/lib/feedback/admin-command.ts`, `src/types/api/admin/feedback.d.ts`, and `src/lib/feedback/admin-command.test.ts` — typed dispatch result and deterministic task identity.
  - `teleferico-app/src/lib/feedback/worker-pdf.test.ts` — renderer parity, metadata, input validation, replay, checkpoint reuse, stale CAS, terminal failure, and no-final-publication tests.
  - `openspec/changes/tb-113-visitor-feedback/{design/02-http-contracts.md,runtime-boundary-debt.md}` — local runtime boundary and deferred infrastructure documentation.
- **Implementation:**
  - Status: `passed` for the local app-owned boundary; external runtime/deployment evidence remains pending.
  - Revision: `pending`
  - Pull request: `pending`
  - Merge evidence: `pending`
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/admin-command.test.ts src/app/api/admin/feedback/generations/route.test.ts`
  - Status: `passed`
  - Exact result: exit 0; 3 files passed; 21 tests passed.
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback src/app/api/feedback src/app/api/admin/feedback`
  - Status: `passed`
  - Exact result: exit 0; 18 files passed; 173 tests passed.
  - Command: `npm test -- feedback/lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 12 tests passed, including isolated PostgreSQL/Strapi startup.
  - Command: `npm test -- feedback/permissions`
  - Status: `passed`
  - Exact result: exit 0; 4 tests passed, including isolated permission inspection.
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0 with no output after the worker/PDF implementation and final ledger append.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm --dir teleferico-app exec tsc --noEmit`
  - Status: `failed`
  - Reason: Existing unrelated errors remain in `FeedbackDashboard.tsx`, `FeedbackDashboard.test.tsx`, and `admin-read.test.ts`; no worker/PDF or dispatch errors remained after the new implementation fixes.
  - Intended future checkpoint: implementation PR typecheck and focused fixture cleanup.
  - Owner: TB-113 implementer/reviewer.
  - Exact command or scenario: Real Playwright PDF execution and Cloud Tasks/Cloud Run/OIDC/Vertex/GCS execution.
  - Status: `not run`
  - Reason: External browser/runtime/provider/storage capabilities are not configured by this local slice; no fake production success path was added.
  - Intended future checkpoint: approved worker-image/integration and operational validation.
  - Owner: worker/platform implementer and approved operations reviewer.
  - Exact command or scenario: `pnpm --dir teleferico-app run lint`
  - Status: `not run`
  - Reason: Not requested by the focused direct verification run.
  - Intended future checkpoint: implementation PR CI.
  - Owner: implementation PR CI and TB-113 implementer.
- **Acceptance criteria:**
  - Chart semantics, empty/one-record/long-label/large-series bounds, accessible tables, and deterministic SVG/PDF test output: `passed` by `worker-pdf.test.ts`.
  - Immutable snapshot validation without metric recomputation: `passed` by tampered-snapshot worker/PDF tests.
  - Terminal replay, checkpoint reuse, stale state-version refusal, terminal failure, and no final artifact publication before completion: `passed` by `worker-pdf.test.ts`.
  - Admin dispatch seam exposes deterministic task identity and explicit unavailable queued behavior: `passed` by `admin-command.test.ts` and generation route tests.
  - Production Cloud Tasks/Cloud Run/OIDC/Vertex/GCS execution and image readiness: `not run`, intentionally deferred.
- **Residual risks:** The local CMS and artifact adapters are test seams, not production network adapters. The injected Playwright path was not exercised in this run. The existing app typecheck remains red on unrelated dashboard/admin fixtures. The historical POC remains evidence and is not silently treated as production deployment proof.
- **Rollback boundary:** Revert the worker/PDF service modules, dispatcher result addition, focused tests, and the two runtime-boundary documentation append sections together; preserve the prior CMS native-read and transactional submission work.
- **Later integrated validation:**
  - Status: `pending`
  - Evidence: approved private worker HTTP harness, Cloud Run/Tasks/OIDC readback, Vertex validation, private artifact completion/download, and exact revision evidence.
- **Correction or follow-up:**
  - Trigger: `none observed` in the focused local run.
  - Status: `pending`
  - Fix evidence: `pending`
  - Revalidation evidence: `pending`
- **Formal SDD reconstruction:**
  - Status: `pending`
  - Evidence: `pending`
