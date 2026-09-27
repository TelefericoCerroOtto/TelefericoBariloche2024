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

### `U9-A-CORRECTION-1: Completion contract and transaction proof`

- **Correction trigger:** Review found that artifact spreads could overwrite report identity and lineage fields, completion preparation omitted required `survey-report` schema attributes, the PostgreSQL test used separate pool connections for transaction statements, and the retry fake replaced its source row.
- **Scope:** Corrected only U9-A app/CMS completion preparation and its focused evidence. U9-A1 authenticated CMS/HTTP dispatch-failure compensation remains out of scope and unchanged.
- **Fix:** Both completion helpers now whitelist artifact fields, preserve authoritative report/generation/cutoff identity, emit the schema's analysis, renderer, artifact metadata, and source-generation relation fields, and reject incomplete contract inputs. CMS retry tests now model distinct immutable source and queued retry rows. The PostgreSQL harness executes lifecycle completion through one checked-out transaction client and proves a database failure rolls back both report insertion and generation completion as observed from another connection.
- **RED evidence:** `pnpm exec vitest run 'src/lib/feedback/generation-lifecycle.test.ts' 'src/lib/feedback/admin-command.test.ts'` — exit 1; the new app assertion observed artifact-provided `reportId`, `generationRunId`, and `dataCutoffAt` replacing authoritative values; 12 other tests passed. `npm test -- feedback/generation-lifecycle` — exit 1; the new CMS completion assertion observed artifact-provided `generationRunId`; the retry test also exposed that its fake replaced the source row. The prior PostgreSQL case passed but its separate `pool.query` transaction statements did not establish the claimed transaction rollback.
- **GREEN evidence:** `pnpm exec vitest run 'src/lib/feedback/generation-lifecycle.test.ts' 'src/lib/feedback/admin-command.test.ts'` — exit 0; 2 files and 13 tests passed. `npm test -- feedback/generation-lifecycle` — exit 0; 4 tests passed, including isolated PostgreSQL active-range serialization, successful atomic completion, and failure rollback with independent-connection state assertions. `git diff --check` — exit 0, no output.
- **Authored size:** `961` additions plus deletions, measured as `git diff --numstat HEAD` additions+deletions for tracked changes plus the line counts of every intended untracked text file; ceiling 1,000. The candidate contains the existing nine paths only.
- **Status:** `passed` for local correction and listed focused evidence only. This is not native review approval, formal SDD verification, integrated app/CMS wiring, or delivery evidence.
- **Residual risks:** Authenticated CMS/HTTP worker completion and integrated app/CMS behavior remain unverified and outside U9-A. U9-A1 remains deferred to its owner. Existing native review state remains terminal escalated/declined; no review lifecycle operation was invoked.
- **Rollback boundary:** Revert this correction's changes within the existing nine U9-A candidate paths as one unit; retain the pre-existing U9-A1 boundary and all unrelated working-tree content.

## U8-D reliability follow-up — period reset and deterministic timestamps

- **Scope:** Reset comment pagination to page 1 when the selected reporting period changes; format displayed comment timestamps using `America/Argentina/Buenos_Aires` and 24-hour output.
- **Implementation:** Added the period reset beside the existing reports reset and made `dateTime` pass an explicit reporting timezone and `hour12: false`.
- **Focused evidence:** Added component coverage for settled page-1 requests/UI after a period change and for a UTC-boundary timestamp rendering as `19/9/2026, 23:30:00` in Argentina.
- **Deferred:** U8-E, U9 lifecycle/race coverage, U12-A download delivery, package-wide typecheck/lint, authenticated browser validation, and integrated `development` validation remain outside this correction.

### `U8-D audit and correction follow-up`

- **Audit basis:** Reconciled the current UI against `specs/feedback-administration/spec.md`, `design/02-http-contracts.md`, `design/06-migration-testing-rollout.md`, the U8-D task row, U8-A read pagination, U8-B command boundaries, and the Version 101 OpenDesign evidence recorded above.
- **UI-owned corrections:** Added report-history pagination using the bounded reports projection, reset report pagination when the shared period changes, rejected empty/reversed independent report ranges before dispatch, disabled duplicate generation/retry submissions while a command is in flight, and added Escape dismissal plus focus restoration for comment detail.
- **Accepted ownership boundaries:** Active-range races, lifecycle polling/state refresh, retry lineage, persisted failed-generation history, and download artifact/storage/streaming remain deferred to U9 and U12-A as required by the contracts. The combined comments/reports read remains a parallel request with a shared module-level loading/error state because both resources render as one U8-D surface.
- **Revalidation:** Focused dashboard test command passed with exit 0; 1 file and 11 tests passed. Authenticated runtime/command test command passed with exit 0; 2 files and 8 tests passed. `git diff --check` passed with exit 0 and no output.
- **Authored count:** `330` additions plus deletions against `b141588`, including untracked files (none present at audit time), remaining below the U8-D 550–750 forecast and the change-level ceiling.
- **Status:** Audit corrections passed focused verification; full typecheck/lint, authenticated responsive browser validation, U8-E Playwright, U9 lifecycle validation, and U12-A download validation remain intentionally deferred.

### `U8-D audit correction follow-up: independent reads and mediated download`

- **Independent read correction:** Split comments and report-history reads into sibling effects with separate `loading|ready|error` state, data clearing at request start, and resource-specific retry counters. Comment filters and comment pagination now reload only comments; report period and report pagination reload only reports. A failed or loading resource no longer displays its stale rows or blocks the sibling resource.
- **Download correction:** The repository has no implemented `/api/admin/feedback/reports/[reportId]/download` route. U8-D now keeps `REPORT_DOWNLOAD_ROUTE_AVAILABLE = false`, renders no live download link even when a read projection contains `canDownload: true`, and displays an unavailable message naming U12-A as the owner. The earlier U8-D download evidence means capability presentation only; it must not be read as proof that the endpoint exists or that PDF delivery works. U12-A must add and verify the mediated route before this flag can be enabled.
- **Overlap correction:** A 409 overlap response blocks repeat submission until the explicit confirmation checkbox is selected. Changing either independent report date clears the overlap disclosure and confirmation state immediately.
- **Proof expansion:** Component coverage now proves all comment query dimensions and OR rating serialization, independent comment/report pagination, no report refetch on comment changes, sibling failure/retry isolation, invalid ranges, duplicate-command prevention, overlap gating/reset, empty and low-data states, Escape/focus restoration, and absence of a live download link before U12-A.
- **Revalidation:** Focused dashboard test command passed with exit 0; 1 file and 17 tests passed. Authenticated runtime/command test command passed with exit 0; 2 files and 8 tests passed. `git diff --check` passed with exit 0 and no output.
- **Current authored count:** `514` additions plus deletions against `b141588`, including untracked files (none present), below the U8-D 550–750 forecast and the change-level ceiling.

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

### `U8-D: Admin comments and reports UI`

- **Identity and scope:** Added the combined Comments and reports administration module after Summary, Aspects, and QR points. Comments support text-only search, single aspect, OR star filters, QR point, language, 25-item pagination, bounded results, responsive table/cards, detail with per-aspect evaluations, and explicit empty/error states. Reports support independent-range generation through U8-B, immutable successful history, mediated download controls, overlap confirmation, and queued/retry status display. U8-E, U9 lifecycle/races, provider/runtime/storage, CMS schema/auth, environment, infrastructure, and deployment remain excluded.
- **Requirements references:** `specs/feedback-administration/spec.md` comments/report filters, order, pagination, detail, independent generation, immutable history, and fixed module order; `specs/authoritative-survey-metrics/spec.md` anonymous comments, deterministic metrics, and explicit low/empty states.
- **Design references:** `design/02-http-contracts.md` administration routes and `design/06-migration-testing-rollout.md` UI evidence boundary.
- **Task references:** `tasks.md` row U8-D and task 3.2.
- **Dependencies:** U8-A read projections, U8-B generation/retry command routes, U8-C dashboard shell and period control, existing authenticated internal fetch.
- **Visual reconciliation:** OpenDesign project `teleferico-cerro-otto-design-system`, `feedback-dashboard.html`, Version 101, revision `6b6de75a-82a9-483c-a1aa-0ed64b1007ec`, SHA-256 `7fcb81d46b1cb7aa56e41f1e3dce9abe346a324568bdb09b5cfc56c5ec4fa5ce`. Kept the combined hierarchy, sticky desktop header, bounded internal results viewport, responsive mobile cards, semantic tables, neutral report sections, anonymous-by-design wording, independent report ranges, and immutable history explanation. Download remains a capability-gated control only; artifact storage and route implementation stay with U12-A.
- **Changed paths and reasons:**
  - `teleferico-app/src/components/administration/feedback/FeedbackDashboard.tsx` — adds the combined comments/reports module, filters, pagination, detail dialog, generation/retry command controls, history, download links, and responsive/accessibility states.
  - `teleferico-app/src/components/administration/feedback/FeedbackDashboard.test.tsx` — covers comments/detail/history/download and independent generation payload behavior.
  - `teleferico-app/src/types/api/admin/feedback.d.ts` — adds typed paginated comments and reports projections.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this direct implementation evidence.
- **Implementation:**
  - Status: `passed`
  - Revision: `pending`
  - Pull request: `pending`
  - Merge evidence: `pending`
  - Authored additions plus deletions against `b141588`, including untracked files: `271`.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx'`
  - Status: `passed`
  - Exact result: exit 0; 1 file passed; 10 tests passed.
  - Command: `pnpm --dir teleferico-app exec vitest run 'src/app/api/admin/feedback/runtime-harness.test.ts' 'src/lib/feedback/admin-command.test.ts'`
  - Status: `passed`
  - Exact result: exit 0; 2 files passed; 8 tests passed.
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0 with no output.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm --dir teleferico-app run typecheck`, package-wide lint, authenticated desktop/mobile browser validation, and U8-E Playwright E2E.
  - Status: `not run`
  - Reason: Explicit direct-route scope defers broad checks and U8-E; no source-mutating formatter or dependency operation was authorized.
  - Intended future checkpoint: implementation PR CI, integrated human validation on `development`, and U8-E.
  - Owner: implementation PR CI, TB-113 implementer, and reviewer.
- **Acceptance criteria:**
  - Combined module follows Summary, Aspects, QR points: `passed` by component test and existing navigation test.
  - Comment filter controls, bounded 25-item result surface, responsive semantic parity, detail, and empty/error states: `passed` by implementation and existing projection tests; authenticated browser parity remains deferred.
  - Reports use an independent generation range and existing command boundary: `passed` by component test and existing command tests.
  - Anonymous comments, deterministic metrics, previous-period comparison, filter independence, and immutable snapshots are clarified in UI copy: `passed` by component test; integrated report-content validation remains deferred.
  - Download is capability-gated by persisted `canDownload` and does not expose storage URLs: `passed` by component test; U12-A download endpoint remains pending.
- **Residual risks:** Full typecheck/lint and authenticated responsive browser behavior remain unverified. The current read contract exposes successful report rows only, so retry is shown for a locally returned failed command but failed persisted-generation history remains a U9/read-contract concern. UI copy remains Spanish within the existing administration convention.
- **Rollback boundary:** Revert the U8-D additions in `FeedbackDashboard.tsx`, its focused test additions, the paginated projection types, and this ledger entry together; preserve U8-C analytics, U8-A reads, and U8-B command transports.
- **Later integrated validation:**
  - Status: `pending`
  - Evidence: authenticated API/browser validation of filters, pagination, detail focus/scroll behavior, independent generation, and mediated download on the integrated `development` revision.
- **Correction or follow-up:**
  - Trigger: `none observed` in focused local verification.
  - Status: `pending`
  - Fix evidence: `pending`
  - Revalidation evidence: `pending`
- **Formal SDD reconstruction:**
  - Status: `pending`
  - Evidence: `pending`

### `U8-E: Admin Playwright E2E`

- **Identity and scope:** Added authenticated Chromium coverage for the complete U8 administration journey: module navigation, shared responsive semantics, Summary/Aspects/QR transitions, comments filters/results/pagination/detail, independent report generation and retry, immutable history presentation, explicit empty states, and deterministic local fixture isolation. Production bypasses, CMS/application behavior, dependencies, auth middleware, infrastructure, and remote resources remain excluded.
- **Requirements references:** `specs/feedback-administration/spec.md` fixed module order, responsive parity, comments filters/order/pagination/detail, independent generation, immutable report history, empty states, and mediated download boundary.
- **Design references:** `design/06-migration-testing-rollout.md` RED-first E2E contract and synthetic-only browser boundary; `design/02-http-contracts.md` versioned admin resource and command surfaces.
- **Task references:** `tasks.md` U8-E row and task 3.2 browser acceptance.
- **Dependencies:** U8-D merged UI, existing Chromium-only Playwright config, and the local synthetic Strapi fixture.
- **Changed paths and reasons:**
  - `teleferico-app/tests/e2e/feedback-admin.spec.ts` — authenticates through the local synthetic fixture, stubs only browser-facing admin responses, and verifies desktop/mobile U8-E behavior and request isolation.
  - `teleferico-app/tests/e2e/server/strapi-fixture.mjs` — adds deterministic local-only credentials and `/api/users/me` responses required by the real Auth.js session path.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records U8-E evidence, deferrals, risks, and rollback boundary.
- **Implementation:**
  - Status: `passed`
  - Revision: `pending`
  - Pull request: `pending`
  - Merge evidence: `pending`
- **Focused tests:**
  - Command: `pnpm exec playwright test tests/e2e/feedback-admin.spec.ts`
  - Status: `passed`
  - Exact result: exit 0; 2 tests passed in 1.2 minutes with one Chromium worker.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm run typecheck`, `pnpm run lint`, the broad Playwright smoke/maintenance suites, real-auth acceptance, integrated `development` validation, and staging/production checks.
  - Status: `not run`
  - Reason: The direct U8-E contract authorizes the focused synthetic Playwright command only; no remote or production resource is authorized.
  - Intended future checkpoint: implementation PR CI and integrated validation on `development`.
  - Owner: implementation PR CI, TB-113 implementer, and reviewer.
- **Acceptance criteria:**
  - Authenticated Administrator reaches the feedback dashboard through the real local Auth.js session path: `passed` by the focused Playwright run.
  - Desktop module order, analytics transitions, comments filters/pagination/detail, independent generation, retry, history, and download boundary: `passed` by the focused Playwright run.
  - Mobile module order, empty comments/reports states, and no horizontal overflow: `passed` by the focused Playwright run.
  - Browser remains isolated from the fixture origin and legacy `/api/tb113/` paths: `passed` by the focused Playwright assertions.
- **Residual risks:** Focused browser coverage uses synthetic browser-facing admin responses; it does not prove real CMS projection compatibility, lifecycle races, PDF delivery, package-wide type safety, lint, or integrated deployment behavior. The local synthetic login fixture is intentionally not a production authentication path.
- **Rollback boundary:** Revert `feedback-admin.spec.ts`, the synthetic auth additions in `strapi-fixture.mjs`, and this ledger entry together; preserve U8-D application behavior and existing non-feedback E2E coverage.
- **Later integrated validation:**
  - Status: `not run`
  - Evidence: `pending implementation PR CI and integrated development validation`.
- **Correction or follow-up:**
  - Trigger: Initial focused attempts exposed login hydration timing and an ambiguous rating-filter locator after the candidate rendered both desktop and mobile result markup.
  - Status: `passed`
  - Fix evidence: Added bounded login hydration readiness with one local reload retry and selected the rating checkbox by role in `feedback-admin.spec.ts`; no application behavior was changed.
  - Revalidation evidence: `pnpm exec playwright test tests/e2e/feedback-admin.spec.ts` — exit 0; 2 tests passed in 1.2 minutes.
- **Formal SDD reconstruction:**
  - Status: `pending`
  - Evidence: `pending`

### `U9-A: Generation lifecycle`

- **Identity and scope:** Added the bounded generation lifecycle contract for overlap disclosure, immutable cutoff capture, compare-and-swap transitions, failed-run retry lineage, pre-claim enqueue compensation, and atomic generation/report completion. U10 dispatch/worker/provider behavior, U12-A PDF delivery/storage, schema/auth/permission changes, dependencies, infrastructure, deployment, and remote resources remain excluded.
- **Requirements references:** `specs/report-generation-lifecycle/spec.md` separate process/report records, active-range concurrency, overlap override, retry lineage, and atomic terminal completion; D40 and D43-D48/D69-D71.
- **Design references:** `design/01-persistence-contracts.md` lifecycle and transaction rules; `design/02-http-contracts.md` generation/retry and worker completion contracts; `design/03-metrics-snapshot-contracts.md` cutoff-before-read rule; `design/04-ai-worker-infrastructure.md` pre-claim compensation boundary; `design/06-migration-testing-rollout.md` RED-first lifecycle and concurrent PostgreSQL coverage.
- **Task references:** `tasks.md` U9-A row and task 3.3.
- **Dependencies:** U8-B native Strapi generation command boundary, U8-E local administration proof, U4 persistence constraints, and U6 reporting periods. No dependency or schema change was made.
- **Changed paths and reasons:**
  - `teleferico-app/src/lib/feedback/generation-lifecycle.ts` — owns pure app-side cutoff, overlap, retry, compensation, command-payload, and completion-contract preparation.
  - `teleferico-app/src/lib/feedback/generation-lifecycle.test.ts` — covers overlap completeness/digest, cutoff, retry, compensation CAS, completion prerequisites, and queued command identity.
  - `teleferico-app/src/lib/feedback/admin-command.ts` — reuses the lifecycle contract for overlap disclosure, cutoff payload construction, and retry lineage without changing the U8-B transport boundary.
  - `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js` — adds CMS-owned CAS compensation, retry preparation, atomic completion preparation, and transaction orchestration while preserving existing transition primitives.
  - `teleferico-cms/src/api/survey-report-generation/services/survey-report-generation.js` — exposes the lifecycle primitives through the native generation service boundary.
  - `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js` — verifies rollback-safe compensation/retry and one-transaction completion with a deterministic transaction fake.
  - `teleferico-cms/test/feedback/generation-lifecycle/postgres.test.js` — proves concurrent active-range uniqueness and committed generation/report visibility against isolated local PostgreSQL.
  - `teleferico-cms/test/feedback/harness/test-runner.js` — registers the `feedback/generation-lifecycle` selector.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records U9-A evidence and bounded deferrals.
- **Implementation:**
  - Status: `passed` for the bounded local implementation.
  - Revision: `pending` (uncommitted by instruction).
  - Pull request: `pending` (not authorized).
  - Merge evidence: `pending` (not authorized).
- **RED evidence:**
  - App command: `pnpm exec vitest run 'src/lib/feedback/generation-lifecycle.test.ts' 'src/lib/feedback/admin-command.test.ts'` — exit 1; the new suite failed before collection because `./generation-lifecycle` did not exist; the existing admin command suite passed 7 tests.
  - CMS command: `npm test -- feedback/generation-lifecycle` — exit 1; three unit tests failed because the lifecycle exports did not exist, and the initial PostgreSQL test failed during local pool startup with `Connection terminated unexpectedly` before assertions.
- **GREEN focused tests:**
  - Command: `pnpm exec vitest run 'src/lib/feedback/generation-lifecycle.test.ts' 'src/lib/feedback/admin-command.test.ts'`
  - Status: `passed`
  - Exact result: exit 0; 2 files passed; 13 tests passed.
  - Command: `npm test -- feedback/generation-lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 4 tests passed, including 3 unit lifecycle tests and 1 concurrent isolated PostgreSQL test; owned resources were cleaned up.
- **Focused tests:**
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0 with no output after the U9-A ledger append.
- **Intentionally deferred validation:**
  - Exact command or scenario: `pnpm run typecheck`, package-wide app tests, lint/format checks, full CMS feedback suites, full PostgreSQL/Strapi integration beyond the focused concurrent harness, authenticated browser validation, worker/provider/PDF/storage execution, implementation PR CI, integrated `development` validation, staging, and production checks.
  - Status: `not run`
  - Reason: The direct U9-A route authorizes focused app/CMS lifecycle evidence only; the user explicitly prohibited broad, remote, deployment, and later-unit checks.
  - Intended future checkpoint: implementation PR CI for static checks; integrated `development` validation for cross-package lifecycle/worker behavior; U10/U12-A work units for worker and delivery execution; formal verification for deferred TB-113 evidence.
  - Owner: TB-113 implementer/reviewer for CI and integrated validation; U10 owner for dispatch/worker; U12-A owner for PDF/storage; formal verification owner for closure evidence.
- **Acceptance criteria:**
  - All inclusive overlaps are disclosed with deterministic intersections and digest: `passed` by the app lifecycle test.
  - Cutoff is captured as a valid UTC timestamp before downstream snapshot work and retry gets a fresh cutoff: `passed` by app lifecycle tests.
  - Queued→failed compensation and lifecycle completion require expected state version and reject task/terminal/incomplete states: `passed` by app/CMS unit tests.
  - Failed retry creates a new queued run with lineage while leaving the source run unchanged: `passed` by app/CMS unit tests.
  - Concurrent identical active ranges admit one PostgreSQL row and successful completion exposes generation/report together after commit: `passed` by the isolated PostgreSQL harness; broader Strapi HTTP wiring remains deferred.
- **Residual risks:** The native U8-B HTTP transport still performs browser-command validation before native CRUD; U9 transaction orchestration is exposed through the CMS service seam but is not yet wired to a new worker/admin route, which remains owned by U10 and the existing command boundary. The completion helper currently proves the direct required-stage set only; map/reduce checkpoint contracts remain a U10 concern. No external queue, worker, renderer, storage, or integrated authenticated CMS readback was executed.
- **Rollback boundary:** Revert the U9-A lifecycle module/tests, the bounded imports and payload construction changes in `admin-command.ts`, the CMS lifecycle/service exports, the harness selector, and this ledger entry together. Preserve U8-A/U8-B readers and native command transport, existing U4 schemas/constraints, U6 core, and U8-E E2E fixtures.
- **Later integrated validation:**
  - Status: `not run`
  - Evidence: pending authenticated Strapi/app transaction wiring, U10 dispatch/worker contract integration, and integrated `development` revision evidence.
- **Correction or follow-up:**
  - Trigger: pre-existing retry-dispatch orphan risk confirmed after the focused GREEN run; follow-up `U9-A1` owns only the authenticated CMS/HTTP CAS compensation after enqueue exhaustion, allowing only an untouched `queued` generation with the expected state version and no task claim to transition to `failed`; U9-A remains closed under its original generation-lifecycle definition.
  - Status: `pending`
  - Fix evidence: `pending`
  - Revalidation evidence: `pending`
- **Formal SDD reconstruction:**
  - Status: `pending`
  - Evidence: `pending`

### `U9-A1: Authenticated dispatch-failure compensation`

- **Identity and scope:** Adds one deny-by-default authenticated Strapi action for atomic queued-to-failed compensation, plus server-side app wiring only for an explicitly typed enqueue-exhaustion result that proves no task was created. `DISPATCH_UNAVAILABLE`, thrown/ambiguous dispatch outcomes, missing state-version evidence, and CMS transport failures do not invoke compensation. Task-name pre-reservation and a real enqueue coordinator remain U10-owned; no schema, migration, permission grant, dependency, infrastructure, or external resource changed.
- **Requirements and design:** U9-A follow-up recorded above; `design/02-http-contracts.md` A/dispatch-failure; `design/04-ai-worker-infrastructure.md` task reservation/dispatch ownership.
- **Changed paths:** `teleferico-app/src/lib/feedback/{admin-command.ts,admin-command.test.ts,dispatch.ts}`, `teleferico-app/src/types/api/admin/feedback.d.ts`, `teleferico-cms/src/api/survey-report-generation/{controllers/survey-report-generation.js,routes/admin.js,services/lifecycle.js,services/survey-report-generation.js}`, `teleferico-cms/test/feedback/{admin-report-commands.test.js,generation-lifecycle/lifecycle.test.js,permissions/permissions.test.js,permissions/postgres-permissions.test.js}`, `docs/STRAPI_PERMISSIONS.md`, both design files above, and this ledger entry.
- **Behavior and boundary:** CMS validates the exact command and size, row-locks and CAS-updates in one database transaction, permits identical replay before stale-version rejection, and rejects stale, claimed/running, task-created, terminal, or altered commands. The action requires an explicit test-scoped role grant; generic `update`/`delete` remain denied. Generate and retry share the app compensation path; the default dispatcher still leaves generations queued.
- **RED evidence:** `pnpm exec vitest run 'src/lib/feedback/admin-command.test.ts' 'src/lib/feedback/generation-lifecycle.test.ts'` — exit 1 before assertions because `vitest` is not installed in this worktree. `npm test -- feedback/admin-report-commands` — exit 1 before Strapi HTTP assertions because `@strapi/strapi` is unavailable. These are environment failures, not observed behavioral RED results.
- **GREEN/local evidence:** `node --test test/feedback/generation-lifecycle/lifecycle.test.js` — exit 0; 4 tests passed, covering success/replay, altered and stale requests, claimed state, task-created state, retry preservation, and lifecycle completion. The required app Vitest command remains unavailable (`vitest` not found). `npm test -- feedback/admin-report-commands` remains unavailable (`@strapi/strapi` not found); authenticated HTTP denial/allow and concurrent-request proof therefore remain unexecuted. `npm test -- feedback/generation-lifecycle` runs 4 passing unit tests but exits 1 because its PostgreSQL integration cannot load `pg`.
- **Other checks:** JavaScript `node --check` on all changed CMS source/tests passed. Final `git diff --check` passed with exit 0 and no output.
- **Authored size:** `485` additions plus deletions. Method: `git diff --numstat HEAD` totals for all tracked changed files, plus newline counts for every path returned by `git ls-files --others --exclude-standard`; includes the untracked `routes/admin.js` file. This is below the 800-line ceiling.
- **Status:** `partial`; local pure lifecycle tests pass, but app Vitest, Strapi auth/HTTP, and PostgreSQL transaction/race tests could not execute because required package dependencies are absent. No package install was authorized.
- **Residual risks and deferred validation:** Verify the custom Strapi action registration, explicit-grant denial/allow, exact HTTP envelopes, transaction serialization under concurrent requests, and app generate/retry wiring by rerunning the exact focused commands in a dependency-complete isolated worktree. Verify task-name pre-reservation and real no-task-created exhaustion only in U10; until then the production default remains `DISPATCH_UNAVAILABLE` and visibly queued.
- **Rollback boundary:** Revert this U9-A1 ledger entry and only the paths listed above as one unit; preserve U9-A lifecycle work and all unrelated files.
- **Later checkpoint and owner:** Implementation PR CI plus authenticated integrated development validation; TB-113 implementer/reviewer. U10 owns task-name pre-reservation and actual enqueue proof. Formal SDD reconstruction remains pending.
- **Formal SDD reconstruction:** `pending`.

### `U10-A2: Authenticated CMS dispatch-state seam`

- **Identity and scope:** Added the minimal additive CMS contract for reserving a deterministic task identity and recording `created`, `absent`, or `unknown` outcomes. Verified absence is the only route from a reserved task to dispatch-exhaustion compensation; unknown remains queued and prevents blind re-reservation. No queue adapter, scheduler, worker endpoint, operational reconciliation, infrastructure, or deployment behavior was added.
- **Requirements references:** `tasks.md` U10-A row; `specs/survey-worker-operations/spec.md` private idempotent task execution.
- **Design references:** `design/02-http-contracts.md` dispatch state request/evidence/result contracts; `design/04-ai-worker-infrastructure.md` task identity, retry, and compensation boundaries.
- **Changed paths and reasons:**
  - `teleferico-cms/src/api/survey-report-generation/content-types/survey-report-generation/schema.json` — adds private `dispatchState` and bounded private `dispatchEvidenceJson` fields; state is separate from reserved `taskName`.
  - `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js` — validates closed v1 commands/evidence; implements reservation and created/unknown/absent CAS transitions; preserves the U9-A1 guard; recognizes identical terminal replay before stale-version rejection.
  - `teleferico-cms/src/api/survey-report-generation/services/survey-report-generation.js` — reads and updates state/evidence in the existing row-locked transaction.
  - `teleferico-cms/src/api/survey-report-generation/controllers/survey-report-generation.js` and `routes/admin.js` — add the bounded authenticated `dispatch-state` content API action; it requires an explicit Users & Permissions action grant.
  - `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js` and `postgres.test.js` — cover reservation, ambiguity, confirmed creation, verified-absence compensation, replay, stale CAS, and database transaction compatibility.
  - `teleferico-cms/test/feedback/admin-report-commands.test.js` — covers anonymous/ungranted denial, body limits, concurrent reservation/replay, queued unknown state, no blind re-enqueue, and absence compensation with a fake queue map.
  - `teleferico-cms/test/feedback/catalog/schema-catalog.test.js`, `test/feedback/permissions/permissions.test.js`, and `test/feedback/permissions/postgres-permissions.test.js` — verify the additive private schema and authenticated route registration with no default permission grant.
  - `docs/STRAPI_PERMISSIONS.md`, TB-113 `design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, and `teleferico-app/README.md` — document the access boundary, evidence contract, and still-unconfigured provider boundary.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this work unit and remaining U10-A scope.
- **Implementation:**
  - Status: `passed` for the local authenticated CMS contract seam only; U10-A remains incomplete.
  - Revision: `pending` (uncommitted local candidate).
  - Pull request: `pending` (not authorized).
  - Merge evidence: `pending` (not authorized).
- **Focused tests:**
  - Command: `npm --prefix teleferico-cms test -- feedback/generation-lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 10 tests passed, including PostgreSQL lifecycle transaction/rollback coverage.
  - Command: `npm --prefix teleferico-cms test -- feedback/admin-report-commands`
  - Status: `passed`
  - Exact result: exit 0; 1 authenticated Strapi/PostgreSQL HTTP test passed. Anonymous and ungranted callers were denied; oversized and unmeasurable bodies returned 413; identical concurrent reservation/outcome requests returned 200 with one replay; unknown stayed queued and re-reservation returned 409; matching fake-queue absence evidence committed failed once and replayed idempotently; generic update/delete remained denied. Harness cleanup completed.
  - Command: `npm --prefix teleferico-cms test -- feedback/lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 12 tests passed, including isolated PostgreSQL migration and fresh Strapi schema synchronization.
  - Command: `npm --prefix teleferico-cms test -- feedback/catalog`
  - Status: `passed`
  - Exact result: exit 0; 6 tests passed, including private dispatch-state schema checks.
  - Command: `npm --prefix teleferico-cms test -- feedback/permissions`
  - Status: `passed`
  - Exact result: exit 0; 4 tests passed, including isolated Strapi route/action denial-by-default inspection.
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback`
  - Status: `passed`
  - Exact result: exit 0; 16 files passed; 162 tests passed.
- **Observed test corrections:**
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` initially failed because concurrent identical absent-outcome requests returned `[200,409]` instead of `[200,200]`. The replay comparison was corrected to compare the bounded persisted evidence independent of JSON serialization; the final command passed with `[200,200]` and one replay.
  - `npm --prefix teleferico-cms test -- feedback/permissions` initially failed because Strapi's registered handler names were unqualified (`survey-report-generation.dispatchState`/`dispatchFailure`); the assertion was corrected to the observed registry values and the final command passed.
- **Intentionally deferred validation:**
  - Exact scenario: production Cloud Tasks create/retry, lookup/readback, same-name task reconciliation, and provider-confirmed absence after ambiguous outcomes.
  - Status: `not run`
  - Reason: No Cloud Tasks adapter or real provider call was implemented or authorized. The local fake queue test demonstrates the CMS contract only; it is not operational absence evidence.
  - Intended future checkpoint: separately authorized U10-A provider adapter integration and private server harness.
  - Owner: TB-113 U10-A implementer/platform reviewer.
  - Exact scenario: app-side invocation of CMS reservation/outcome actions; worker HTTP OIDC authentication and CMS claim/snapshot/checkpoint/complete/fail integration.
  - Status: `not run`
  - Reason: Explicit scope here was the additive CMS contract only; U10-B owns the private worker runtime and no scheduler/automatic reconciliation was added.
  - Intended future checkpoint: U10-A app/CMS integration followed by U10-B private worker harness.
  - Owner: TB-113 U10-A/U10-B implementers and reviewer.
  - Exact commands: `pnpm --dir teleferico-app run typecheck`, package-wide lint, and Playwright E2E.
  - Status: `not run`
  - Reason: Broad checks are deferred by the TB-113 direct implementation profile; focused feedback tests passed.
  - Intended future checkpoint: implementation PR CI and integrated development validation.
  - Owner: implementation PR CI and TB-113 implementer/reviewer.
- **Acceptance criteria:**
  - CMS persists reserved task identity separately from task creation outcome: `passed` by schema, lifecycle, and authenticated route tests.
  - Reservation and state changes use row locking/CAS; identical requests replay while stale or conflicting requests fail closed: `passed` by local PostgreSQL-backed HTTP tests.
  - Unknown outcomes remain queued and cannot be blindly reserved or compensated: `passed` by lifecycle and HTTP tests.
  - Absence requires exact bounded evidence for the same task, exactly three attempts, and `not-found`; compensation and evidence persist atomically: `passed` against the local fake queue contract.
  - Production Cloud Tasks behavior or live provider absence: `not run`; no operational claim is made.
- **Residual risks:** The custom authenticated CMS action trusts the server-mediated app role to submit provider evidence. Local tests verify only the evidence contract using a fake queue map; a production adapter must obtain authoritative task lookup evidence and must not translate ambiguous responses into `absent`. The app still uses the unavailable dispatcher and does not call this action. The manually managed role grant is documented but was not changed in any environment. CMS generated type artifacts were not edited because package governance forbids manual generated-artifact changes and the app does not consume these custom dispatch fields.
- **Rollback boundary:** Revert the new CMS dispatch schema fields, lifecycle/transaction/controller/route action, focused dispatch-state tests, corresponding permission/design/README documentation, and this entry together. Preserve the previous U10-A1 task identity helper, U9-A1 v1 compensation endpoint/guard, and all unrelated TB-113 work.
- **Later integrated validation:** `pending`; no live Cloud Tasks, private worker, staging, production, deployment, IAM, or formal SDD evidence was produced.
- **Correction or follow-up:**
  - Trigger: U10-A provider adapter and app integration remain separate work; no blind retry is permitted from `unknown`.
  - Status: `pending`
  - Fix evidence: `pending`
  - Revalidation evidence: `pending`
- **Formal SDD reconstruction:** `pending`.

### `U9-A1 correction 1: Fail-closed body sizing and dispatch proof`

- **Correction scope:** Corrected the measured-byte guard for dispatch-failure requests, validate the entire exhaustion result before CMS compensation, and align permission wording with the actual JWT/role flow. No schema, dependency, grant, infrastructure, or task-coordinator changes.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/services/dispatch-failure-request.js`, its controller and lifecycle tests, `teleferico-cms/test/feedback/admin-report-commands.test.js`, `teleferico-app/src/lib/feedback/admin-command.ts` and `.test.ts`, `docs/STRAPI_PERMISSIONS.md`, `design/02-http-contracts.md`, and this ledger.
- **Behavior:** The CMS counts only raw `Buffer`/`Uint8Array` bytes when supplied; otherwise it requires a valid Content-Length and rejects transfer-encoded or unmeasurable requests with safe 413 before service access. The app compensates only an exact `survey-dispatch-command.v1` exhaustion result with `noTaskCreated: true`, exact failure code, exactly three attempts, and the task name derived from the generation ID. App compensation is through the Auth.js-session user JWT and the corresponding explicitly granted Users & Permissions role action; no API token is used.
- **RED evidence:** Before adding the raw-size helper, `node --test test/feedback/generation-lifecycle/lifecycle.test.js` — exit 1 because the expected `dispatch-failure-request` helper module did not exist. This is the observed RED for byte-measurement coverage. The app RED tests could not run because Vitest is absent.
- **GREEN evidence:** `node --test test/feedback/generation-lifecycle/lifecycle.test.js` — exit 0, 5/5 tests, including 68,199-byte whitespace, trusted Content-Length, missing length, and chunked cases. `node --test test/feedback/generation-lifecycle/lifecycle.test.js test/feedback/permissions/permissions.test.js` — exit 0, 7/7 tests. The HTTP test now asserts oversized Content-Length and chunked requests return 413 and leave the generation queued, but it was not run because `@strapi/strapi` is missing; do not treat this as observed HTTP evidence.
- **Required command results:** App Vitest — `vitest` not found. CMS `feedback/admin-report-commands` — `@strapi/strapi` not found before HTTP assertions. CMS `feedback/generation-lifecycle` — 5 unit tests passed; suite exits 1 because `pg` is missing. No dependencies were installed.
- **Remaining validation:** The authenticated CMS HTTP mutation-safety test, PostgreSQL race/transaction test, and app malformed-exhaustion/generate/retry tests remain unverified until run in an isolated worktree with the existing dependencies available. U10 still owns task-name pre-reservation and actual enqueue proof.
- **Authored size:** `656` additions plus deletions. Method: tracked `git diff --numstat HEAD` additions/deletions plus newline counts for each untracked path from `git ls-files --others --exclude-standard`; includes both untracked CMS files. Below the 800-line cap.
- **Status:** `partial` pending the focused dependency-backed checks above.
- **Rollback boundary:** Revert only the U9-A1 implementation, this correction entry, and its related tests/docs as one candidate; retain U9-A and unrelated work.

### `U9-A1 validation follow-up: dependency-backed rerun`

- **App command:** `./node_modules/.bin/vitest run 'src/lib/feedback/admin-command.test.ts' 'src/lib/feedback/generation-lifecycle.test.ts'` — passed; 2 files, 20 tests.
- **CMS admin command:** `npm test -- feedback/admin-report-commands` — failed at the existing stale-version assertion: expected 409, got 400 for `expectedStateVersion: 0`, which is rejected as invalid input. Before that assertion, the run observed anonymous and ungranted-role denial (403), oversized Content-Length and chunked body rejection (413), queued state unchanged, and both concurrent authorized compensation requests returning 200. Strapi shut down in `finally`; fixed local harness readback found no containers or volumes for `tb113_test_admin_commands`.
- **CMS lifecycle command:** `npm test -- feedback/generation-lifecycle` — passed; 6/6 tests including PostgreSQL concurrency/rollback.
- **CMS permissions command:** `npm test -- feedback/permissions` — passed; 4/4 tests including isolated Strapi registered-route and deny-by-default inspection.
- **Disposition and size:** No further source correction was made beyond the specifically authorized app-overlap fixture and Strapi route-config fixes. The stale request test still needs an in-scope valid stale-version fixture if separately authorized; current suite status remains `partial`. Complete candidate size is `702` additions plus deletions, measured as tracked `git diff --numstat HEAD` additions/deletions plus newline counts for all untracked paths returned by `git ls-files --others --exclude-standard`; below the 800-line cap.

### `U9-A1 correction 2: Valid state-version conflict fixture`

- **Correction:** Replaced the invalid zero state version with `expectedStateVersion: 3` after the concurrent compensation commits version 2; the request is exact-shape but has a different positive expected version, so it reaches CAS conflict without altering production validation or replay behavior. The test now asserts safe `STATE_VERSION_CONFLICT`.
- **RED evidence:** Immediately before this fixture correction, `npm test -- feedback/admin-report-commands` failed at this assertion: expected 409 but received 400 for `expectedStateVersion: 0`.
- **GREEN evidence:** `./node_modules/.bin/vitest run 'src/lib/feedback/admin-command.test.ts' 'src/lib/feedback/generation-lifecycle.test.ts'` — 2 files, 20 tests passed. `npm test -- feedback/admin-report-commands` — 1 test passed, including 403 unauthenticated/ungranted denial, 413 Content-Length and chunked body rejection, unchanged queued state, concurrent compensation/replay, and safe 409 state-version conflict. `npm test -- feedback/generation-lifecycle` — 6/6 passed including PostgreSQL. `npm test -- feedback/permissions` — 4/4 passed.
- **Cleanup and integrity:** The admin command harness’s built-in cleanup and post-test absence assertions passed. Final `git diff --check` passed. Complete candidate size is `710` additions plus deletions, measured by tracked `git diff --numstat HEAD` additions/deletions plus newline counts for all untracked `git ls-files --others --exclude-standard` paths; below the 800-line cap.

### `TB-113 direct implementation: clear feedback typecheck diagnostics`

- **Identity and scope:** Fixed the nine current app TypeScript diagnostics in the dashboard query serializer and its focused fixtures only; no production contract, schema, dependency, or behavior change beyond omitting absent optional query values.
- **Changed paths:** `teleferico-app/src/components/administration/feedback/FeedbackDashboard.tsx`, `teleferico-app/src/components/administration/feedback/FeedbackDashboard.test.tsx`, `teleferico-app/src/lib/feedback/admin-read.test.ts`, and `teleferico-app/src/lib/feedback/generation-lifecycle.test.ts`.
- **Implementation:** The query helper accepts optional values and adds only present parameters; the matrix fixture uses its mutable contract type, QR projections are tagged with their narrowed view literals, the admin-read fixture is built by `createSnapshot`, and the incomplete-checkpoint case supplies all other required completion fields.
- **Checks actually run:**
  - `pnpm run typecheck` from `teleferico-app` — passed; exit 0, no TypeScript diagnostics.
  - `pnpm exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx' 'src/lib/feedback/admin-read.test.ts' 'src/lib/feedback/generation-lifecycle.test.ts'` from `teleferico-app` — passed; exit 0, 3 files and 32 tests passed.
  - `pnpm exec prettier --check 'src/components/administration/feedback/FeedbackDashboard.tsx' 'src/components/administration/feedback/FeedbackDashboard.test.tsx' 'src/lib/feedback/admin-read.test.ts' 'src/lib/feedback/generation-lifecycle.test.ts'` from `teleferico-app` — failed; check-only reported formatting differences in the dashboard component, dashboard test, and lifecycle test. No formatter write was applied.
  - `git diff --check` from the repository root — passed; exit 0, no output after the final ledger append.
- **Status:** `passed` for typecheck and the requested focused tests only; formatter convergence and broader/integrated validation are not claimed.
- **Runtime harness:** `N/A` — type-contract and unit/component test cleanup; no external runtime boundary was changed.
- **Rollback boundary:** Revert this entry and the four changed app source/test files together; no other files or behaviors are in scope.
- **Later integrated validation:** `pending`; no PR CI, browser, CMS, staging, production, or formal SDD validation was run.

### `TB-113 direct implementation: clear feedback build lint diagnostics`

- **Identity and scope:** Cleared the 13 reported `no-unused-vars` errors and one `react-hooks/exhaustive-deps` warning from the four reported feedback paths. Existing typecheck-fix content in the dashboard files was preserved; the prior five-file working-tree change was not reverted or rewritten.
- **Changed paths for this follow-up:**
  - `teleferico-app/src/components/administration/feedback/FeedbackDashboard.test.tsx` — underscore-prefixes one unused parameter label in a Promise resolver type.
  - `teleferico-app/src/components/administration/feedback/FeedbackDashboard.tsx` — underscore-prefixes four unused callback parameter labels in type signatures and uses a stable module-level empty available-points fallback.
  - `teleferico-app/src/lib/feedback/browser-guard.ts` — underscore-prefixes unused type-only callback parameter labels without changing guard inputs, runtime dependencies, or behavior.
  - `teleferico-app/src/lib/feedback/dispatch.ts` — underscore-prefixes the unused dispatcher interface parameter label only.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — appends this evidence; all preceding entries remain unchanged.
- **Initial reproduction:** The requested ESLint command reported 13 `no-unused-vars` errors and one `react-hooks/exhaustive-deps` warning across those four paths.
- **Checks actually run:**
  - `pnpm exec eslint 'src/components/administration/feedback/FeedbackDashboard.test.tsx' 'src/components/administration/feedback/FeedbackDashboard.tsx' 'src/lib/feedback/browser-guard.ts' 'src/lib/feedback/dispatch.ts'` from `teleferico-app` — passed; exit 0, no output.
  - `pnpm run typecheck` from `teleferico-app` — passed; exit 0, `tsc -p tsconfig.json --noEmit` emitted no diagnostics.
  - `pnpm exec vitest run 'src/components/administration/feedback/FeedbackDashboard.test.tsx' 'src/lib/feedback/admin-read.test.ts' 'src/lib/feedback/generation-lifecycle.test.ts' 'src/lib/feedback/browser-guard.test.ts'` from `teleferico-app` — passed; exit 0, 4 files and 37 tests passed.
  - No dispatch-specific test file was present; the requested generation-lifecycle suite was included in the focused test run.
  - `pnpm run build` — not run because `next build` loads the secret-bearing `.env.local`, which this task explicitly prohibits accessing.
  - `git diff --check` from the repository root — passed; exit 0, no output after the final ledger append.
- **Status:** `passed` for the targeted lint, typecheck, and focused tests; production build remains `not run` for the stated environment-safety reason.
- **Runtime harness:** `N/A` — type-only label cleanup and a stable fallback reference; no browser-guard or dispatch contract behavior changed.
- **Residual risks:** Full Next.js build/lint validation was not run; exact four-file ESLint and app typecheck passed. Existing Prettier differences recorded above remain outside this follow-up.
- **Rollback boundary:** Revert this follow-up's changes in the four listed app paths and remove this appended ledger entry; preserve the earlier typecheck-fix content and all other working-tree changes.
- **Later integrated validation:** `pending`; PR CI and integrated validation remain unobserved.

### `U10-A1: Fail-closed report task identity`

- **Identity and scope:** Centralized deterministic task-name construction for valid report-run UUIDs and rejected malformed CMS run identifiers before dispatch. This is one local contract slice only; it does not implement task reservation, queue creation, worker HTTP authentication, or CMS worker actions.
- **Requirements references:** `tasks.md` U10-A row; `specs/survey-worker-operations/spec.md` private idempotent task execution.
- **Design references:** `design/02-http-contracts.md` worker/admin dispatch-failure contracts; `design/04-ai-worker-infrastructure.md` deterministic task name and pre-enqueue reservation.
- **Changed paths and reasons:**
  - `teleferico-app/src/lib/feedback/dispatch.ts` — creates task names only for canonical versioned UUIDs.
  - `teleferico-app/src/lib/feedback/dispatch.test.ts` — covers stable identity and malformed UUID rejection.
  - `teleferico-app/src/lib/feedback/admin-command.ts` — uses the shared task-name contract and fails safely before dispatcher invocation for invalid CMS IDs.
  - `teleferico-app/src/lib/feedback/admin-command.test.ts` — proves invalid CMS IDs do not reach the dispatcher.
  - `teleferico-app/README.md` — documents server-only identity and the unavailable default dispatcher behavior.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records bounded implementation evidence and remaining U10-A scope.
- **Implementation:**
  - Status: `passed` for the bounded task-identity contract only; U10-A remains pending.
  - Revision: `pending` (local uncommitted changes only).
  - Pull request: `pending` (not authorized).
  - Merge evidence: `pending` (not authorized).
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback`
  - Status: `passed`
  - Exact result: exit 0; 16 test files passed; 162 tests passed.
- **Check-only validation:**
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0; no output after the ledger append.
- **Intentionally deferred validation:**
  - Exact scenario: authenticated CMS task-name reservation and queue dispatch, including retry classification, same-name task reconciliation, and no-task-created exhaustion.
  - Status: `not run`
  - Reason: No CMS reservation or queue adapter is implemented in this bounded slice; Cloud Tasks credentials and infrastructure are explicitly outside scope.
  - Intended future checkpoint: a separately bounded U10-A implementation with local authenticated CMS/fake-queue harness.
  - Owner: TB-113 U10-A implementer and reviewer.
  - Exact scenario: private worker HTTP endpoint authentication and CMS claim/snapshot/checkpoint/complete/fail actions, including resumable delivery.
  - Status: `not run`
  - Reason: No worker HTTP/CMS action contract exists in the current code; implementing public or credential-hardcoded substitutes would violate the security boundary.
  - Intended future checkpoint: U10-A authenticated app/CMS contract tests before U10-B runtime integration.
  - Owner: TB-113 U10-A implementer and reviewer.
  - Exact commands: `pnpm --dir teleferico-app run typecheck`, `pnpm --dir teleferico-app run lint`, and authenticated private-server/E2E scenarios.
  - Status: `not run`
  - Reason: Broad checks and local runtime harnesses are intentionally deferred by the TB-113 direct implementation profile; they are not needed to prove this pure contract.
  - Intended future checkpoint: implementation PR CI and integrated development validation.
  - Owner: implementation PR CI and TB-113 implementer/reviewer.
- **Acceptance criteria:**
  - A valid report-run UUID maps to `tb113-report-<UUID without hyphens>`: `passed` by focused tests.
  - Malformed CMS run identifiers fail before dispatcher invocation: `passed` by focused app feedback tests.
  - CMS-backed durable reservation and actual queue creation: `pending` for remaining U10-A work.
  - Worker authentication, CMS actions, and resumable task delivery: `pending` for remaining U10-A work.
- **Residual risks:** This slice does not create or authenticate tasks. The existing U9-A1 compensation path rejects any generation with a stored `taskName`, while U10 design requires storing the deterministic name before enqueue. That contract conflict must be resolved and tested before adding durable reservation/queue behavior. The current unavailable dispatcher remains the production-safe fallback and leaves generations queued.
- **Rollback boundary:** Revert only the task-name helper and its integrations/tests, the README paragraph, and this ledger entry; preserve prior lifecycle compensation and worker/PDF work.
- **Later integrated validation:** `pending`; no CMS worker HTTP, private-server, queue, staging, production, or formal SDD validation was run.
- **Correction or follow-up:**
  - Trigger: U10-A still requires authenticated CMS reservation/worker actions and task delivery; resolve the taskName-versus-U9-A1-compensation contract conflict first.
  - Status: `pending`
  - Fix evidence: `pending`
  - Revalidation evidence: `pending`
- **Formal SDD reconstruction:** `pending`.

### `U10-A2 correction: Reject unverified absence claims`

- **Correction trigger:** Independent validation found that the prior U10-A2 implementation accepted caller-supplied `lookupResult: "not-found"` as proof and could commit queued→failed without an authoritative Cloud Tasks lookup. This append-only correction supersedes the previous U10-A2 absence/compensation acceptance claims; treat those claims as invalid.
- **Correction scope:** The new `dispatch-state` action now accepts only `reserve`, `created`, and `unknown`. It rejects every `absent` outcome before the service/transaction; the reserved generation remains unchanged and queued. The U9-A1 v1 `dispatch-failure` route and guard were not modified.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/content-types/survey-report-generation/schema.json`, `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js`, `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js`, `teleferico-cms/test/feedback/admin-report-commands.test.js`, `teleferico-cms/test/feedback/catalog/schema-catalog.test.js`, `docs/STRAPI_PERMISSIONS.md`, TB-113 `design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, `teleferico-app/README.md`, and this ledger.
- **Implementation:** `passed` for the fail-closed correction; full U10-A remains incomplete. Revision, PR, and merge evidence remain `pending`.
- **Focused tests:**
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; 10 tests passed, including rejection of the absence claim without changing the reserved row.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — exit 0; 1 authenticated Strapi/PostgreSQL HTTP test passed. A caller-supplied `not-found` claim returned 400; the reservation remained queued/unknown and replay returned the same state. The unchanged legacy U9-A1 route returned 409 for the reserved task name.
  - `npm --prefix teleferico-cms test -- feedback/catalog` — exit 0; 6 tests passed with the `dispatchState` enum excluding `absent`.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — exit 0; 4 tests passed; explicit custom-action registration and deny-by-default behavior remain intact.
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback` — exit 0; 16 files and 162 tests passed.
- **Check-only validation:** `git diff --check` — pending final check after this ledger append.
- **Accepted state transitions:** Reservation, `created`, and `unknown` remain supported; `unknown` remains queued and cannot be re-reserved. `absent` has no accepted command, schema state, or compensation path in the new action.
- **Residual risks and remaining U10-A:** No verified absence path, real dispatch, or app invocation exists. A future provider adapter must supply genuinely authoritative evidence before any compensation capability is added. Private worker/OIDC/CMS claim/snapshot/checkpoint/complete/fail work remains pending. No queue adapter, scheduler, provider credentials, GCP/IAM, deployment, dependency, or new collection was introduced.
- **Rollback boundary:** Revert only this correction's removal of the `absent` state/validator/transition, its rejection tests, and the accompanying documentation/ledger correction; preserve reservation/created/unknown behavior, U10-A1, and U9-A1 v1 unchanged.
- **Formal SDD reconstruction:** `pending`.

### `U10-A2 correction: Complete dispatch reservation result`

- **Identity and scope:** Follow-up to open parent PR #344 at head `eabe5f57edee3f65f2d2ab0eaa2e6bb0b023f0e2`, on child branch `fix/cms-root-tb-113-dispatch-state-response`. Corrects only the reserved first-success and replay response fields required by `DispatchStateResultV1`: `dispatchAttemptCount: 0` and `failureCode: null`.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js` returns the existing generation attempt count (default 0) and nullable failure code for both reservation responses; `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js` asserts exact local success/replay results; `teleferico-cms/test/feedback/admin-report-commands.test.js` asserts exact authenticated HTTP success/replay results; this ledger records evidence.
- **Requirements/design:** `design/02-http-contracts.md`, normative `DispatchStateResultV1` at line 93; values 0 and null match the existing generation state and established record-response shape.
- **Focused evidence:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed, exit 0; 10 tests, including PostgreSQL lifecycle coverage. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed, exit 0; 1 authenticated Strapi/PostgreSQL HTTP test. Before implementation, both exact-result assertions failed because the two fields were omitted.
- **Intentionally deferred validation:** Broad app Vitest was not rerun in this slice. Its earlier diagnostic found two unrelated pre-existing `teleferico-app/src/lib/services/__tests__/form-protection.test.ts` mismatches: expected `TOO_MANY_REQUESTS`, received `EMAIL_LIMIT_EXCEEDED`. Neither form-protection nor security files are in this slice or changed.
- **Remaining U10-A:** Actual queue/task adapter and app-side reservation/outcome integration remain pending; this slice adds no queue, worker, schema, environment, dependency, or infrastructure behavior.
- **Status:** `passed` for the bounded CMS response contract and focused tests only; PR/merge, integrated app behavior, and formal SDD reconstruction remain pending.
- **Rollback boundary:** Revert the response-field addition, the two exact-response assertions, and this entry together; preserve the parent PR and all unrelated files.

### `U10-A3: Authenticated CMS worker claim`

- **Identity and scope:** Added only the bounded authenticated `POST W/claim` CMS action. Queued claims atomically enter running; running claims resume; terminal runs return minimal replay. No worker runtime, queue integration, credential provisioning, grants, schema, environment, dependency, IAM, or deployment change.
- **Requirements/design:** U10-A row and task 4.1 in `tasks.md`; `design/01-persistence-contracts.md` lifecycle CAS; `design/02-http-contracts.md` `WorkerClaimCommandV1`, `WorkerClaimResultV1`, and `POST W/claim`; `design/04-ai-worker-infrastructure.md` worker authorization boundary.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/{controllers/survey-report-generation.js,routes/admin.js,services/lifecycle.js,services/survey-report-generation.js}`; `teleferico-cms/test/feedback/{admin-report-commands.test.js,generation-lifecycle/lifecycle.test.js,permissions/permissions.test.js,permissions/postgres-permissions.test.js}`; `docs/STRAPI_PERMISSIONS.md`; `design/02-http-contracts.md`; this ledger entry.
- **Behavior and security:** Exact command schema and 4 KiB cap; native authenticated action remains ungranted by default. The row-lock transaction exposes only checkpoints/model/pricing to running claims, increments state version exactly once on queued→running, resumes running without a write, and returns only run ID/status/version for terminal replay. The claim query never selects comments. The separate worker credential and explicit permission grant remain unconfigured and deferred.
- **Focused tests:**
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 11 tests, including isolated PostgreSQL lifecycle transaction coverage and domain claim replay.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated Strapi/PostgreSQL HTTP test, covering anonymous and ungranted denial, oversized body rejection, concurrent claim replay/version, and response exclusion of comments.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — initial run failed because the route-registration harness did not exclude Strapi's unqualified `workerClaim` action from its core CRUD list; updated the assertion and reran the exact command successfully, exit 0; 4 tests passed, including real isolated Strapi/PostgreSQL deny-by-default inspection.
  - `git diff --check` — pending final run after this ledger append.
- **Authored size:** 194 additions plus deletions against the exact published parent head, including this entry; below the 400-line ceiling.
- **Status:** `partial` under the requested stop/report rule because the first required permissions invocation failed; its test-only assertion was corrected and the final rerun passed.
- **Residual risks/deferred validation:** No worker credential is provisioned and no non-default permission grant is created; no private Cloud Run/OIDC-to-CMS execution was run. The CMS route's real authorization is proven only with the isolated synthetic Users & Permissions role. Worker transport, snapshots, checkpoints, completion/failure actions, and actual worker integration remain unimplemented.
- **Rollback boundary:** Revert only the worker-claim lifecycle/controller/route/service changes, their four focused test changes, the workerClaim permission/HTTP contract documentation, and this entry together. Preserve all existing U9/U10 dispatch-state and compensation behavior.
- **Later integrated validation:** `pending`; intended checkpoint is separately authorized U10-A worker credential/grant setup and private authenticated worker harness; owner is the TB-113 U10-A implementer/platform reviewer.
- **Formal SDD reconstruction:** `pending`.

### `U10-A4: Authenticated CMS worker snapshot read`

- **Identity and scope:** Added the bodyless authenticated `GET /api/tb113/worker/generations/:reportRunId/snapshot` action. It returns a `survey-worker-cms.v1` `SnapshotResultV1` only for a running generation with a positive safe state version, supported `survey-snapshot.v1` payload and matching canonical SHA-256 digest. No worker credential, permission grant, schema, dependency, environment, queue, runtime, IAM, or deployment change.
- **Requirements/design:** `tasks.md` U10 row and task 4.1; `design/02-http-contracts.md` worker snapshot route/result/failure contract; `design/03-metrics-snapshot-contracts.md` canonical `tb-json.v1` digest and `SnapshotEnvelopeV1`; `specs/survey-worker-operations/spec.md` private worker boundary.
- **Changed paths:**
  - `teleferico-cms/src/api/survey-report-generation/routes/admin.js` — registers the authenticated worker-only GET route.
  - `teleferico-cms/src/api/survey-report-generation/controllers/survey-report-generation.js` — validates the run ID and maps safe 404/409/500 responses.
  - `teleferico-cms/src/api/survey-report-generation/services/survey-report-generation.js` — locks and selects only generation snapshot state for the transaction.
  - `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js` — constructs the exact result envelope and rejects non-running, unsupported-version, invalid-state-version, and digest-invalid records.
  - `teleferico-cms/test/feedback/{generation-lifecycle/lifecycle.test.js,admin-report-commands.test.js,permissions/permissions.test.js,permissions/postgres-permissions.test.js}` — verifies domain rejection, authenticated HTTP behavior, deterministic result, and deny-by-default route registration.
  - `docs/STRAPI_PERMISSIONS.md` — documents the new separately granted worker action without creating a grant.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this evidence.
- **RED evidence:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 1; 11 passed, 1 failed because `workerSnapshot` did not exist. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — exit 1; 0/1 passed because the new route was absent (404 instead of the required anonymous denial).
- **Focused tests:**
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 12 tests passed, including running-state/version/digest rejection and deterministic domain result.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated Strapi/PostgreSQL HTTP test passed. Anonymous and ungranted snapshot requests were denied; the explicitly granted synthetic action returned the exact envelope including worker-only comments; repeated GET responses were structurally and byte-order deterministic; queued, unsupported-version, and digest-mismatch requests returned safe 409 responses. Harness cleanup and owned-container/volume absence assertions passed.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — final run passed; exit 0; 4 tests passed, including isolated Strapi route registration and confirmation that no default permission is created. The first run exposed the newly registered action missing from the deny-by-default action inventory; the test expectation was updated and this exact command passed on rerun.
  - `git diff --check` — pending final check after this ledger append.
- **Formatting:** A Prettier write across the existing compact CMS JavaScript files caused unrelated whole-file reflow and was reverted to keep the authored slice within its review boundary. The new code follows each file's existing formatting style; no generated files or dependencies changed.
- **Implementation status:** `passed` for the bounded local authenticated CMS read contract only; revision, PR, merge, integrated worker runtime, and formal SDD reconstruction remain `pending`.
- **Authored size:** `250` additions plus deletions against `6725652`, including this ledger entry; below the 400-line review boundary.
- **Residual risks/deferred validation:** The endpoint reads the persisted private snapshot; this unit does not populate snapshots or wire the app coordinator. No approved worker credential or non-default production role grant exists. Private Cloud Run/OIDC-to-CMS execution, authenticated integrated worker harness, staging/production, and operational validation were not run and remain separately authorized checkpoints. The isolated HTTP test seeds the private snapshot row directly because the private fields are not part of the native content API write surface.
- **Rollback boundary:** Revert only the worker snapshot route/controller/service/lifecycle read, its focused tests, the `workerSnapshot` permission documentation, and this entry. Preserve U10-A2 dispatch state, U10-A3 claim behavior, U9-A1 compensation, and all unrelated work.
- **Later integrated validation:** `pending`; intended checkpoint is an approved private worker-authenticated CMS harness after separate credential/grant authorization; owner is the TB-113 U10-A implementer/platform reviewer.
- **Formal SDD reconstruction:** `pending`.

### `U10-A4 correction: Isolate private snapshot row projection`

- **Correction trigger:** Independent review found that the shared `lockGeneration` query selected and mapped `snapshot_json` for dispatch and claim calls, although only `workerSnapshot` needs the private snapshot/comments.
- **Correction:** Removed snapshot-specific columns from the shared lifecycle lock projection and added a narrow `lockWorkerSnapshot` query used exclusively by `workerSnapshot`. Dispatch, claim, and other lifecycle operations keep their prior projections and behavior.
- **Focused regression evidence:** Before the service correction, `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — exit 1; the new query assertion observed quoted `snapshot_json` in the dispatch-state reservation lock. After the correction, an intermediate assertion also matched the unrelated `pricing_snapshot_json` identifier; tightened the assertion to the exact quoted column name, then the final command passed.
- **Required verification:**
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 12 tests.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated Strapi/PostgreSQL integration test, proving dispatch reservation and claim lock queries omit `"snapshot_json"`, while the snapshot read includes it and still returns the correct deterministic envelope.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — passed; exit 0; 4 tests, including no-default-grant route inspection.
  - `git diff --check` — passed; exit 0 with no output after this correction and ledger append.
- **Authored size:** `305` additions plus deletions against `6725652`, including this correction and ledger entry; within the 800-line unit ceiling.
- **Status:** `passed` for the projection privacy correction and listed local checks; no route/auth contract changed. Credentialed worker integration, operational validation, PR/merge evidence, and formal SDD reconstruction remain `pending`.
- **Rollback boundary:** Revert only `lockWorkerSnapshot`/its call-site, the projection assertions/fake transaction hook, and this correction entry; preserve the original U10-A4 route, digest checks, privacy boundary, and all U9/U10-A1–A3 behavior.

### `U10-A5: Authenticated worker checkpoint write`

- **Identity and scope:** Added the authenticated `PUT /api/tb113/worker/generations/:reportRunId/checkpoints/:stageKey` CMS contract, exact bounded command/result envelopes, running-state and stage-dependency checks, checkpoint replay/conflict behavior, and transactional state-version advancement. No completion/failure endpoint, worker runtime, queue adapter, schema, grant, credential, dependency, IAM, or deployment change.
- **Requirements/design:** `tasks.md` U10 row/task 4.1; `specs/survey-worker-operations/spec.md` private idempotent execution; `design/01-persistence-contracts.md` lifecycle CAS; `design/02-http-contracts.md` checkpoint request/result/error/replay contract; `design/04-ai-worker-infrastructure.md` stage keys, payload kinds, ordering, privacy, and checkpoint replay.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/{controllers/survey-report-generation.js,routes/admin.js,services/lifecycle.js,services/survey-report-generation.js}`; `teleferico-cms/test/feedback/{admin-report-commands.test.js,generation-lifecycle/lifecycle.test.js,permissions/permissions.test.js,permissions/postgres-permissions.test.js}`; `docs/STRAPI_PERMISSIONS.md`; this ledger entry.
- **RED evidence:** `node --test test/feedback/generation-lifecycle/lifecycle.test.js` — exit 1; the new case failed because `writeWorkerCheckpoint` did not exist (after correcting the test fixture's local canonicalization setup).
- **Focused tests:**
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 13 tests including isolated PostgreSQL lifecycle transaction/rollback coverage.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated Strapi/PostgreSQL HTTP test including anonymous/ungranted denial, bounded body, successful write, identical replay, altered replay conflict, and persisted checkpoint privacy.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — passed; exit 0; 4 tests including isolated Strapi route/action registration and no default permission grant. The first attempt failed because the expected route inventory was not in lexical order; the assertion was corrected and the exact command passed on rerun.
  - `git diff --check` — passed; exit 0 with no output on the completed source/test/doc changes.
- **Intentionally deferred normalization:** Prettier write on the changed legacy compact JavaScript files — `not run`; whole-file formatting would reflow pre-existing code outside the checkpoint addition and threaten the 400-line work-unit boundary. No dependency/install or unrelated formatting change was made.
- **Implementation status:** `partial; never activated`. The initial HTTP/CAS implementation was superseded by the safety correction below; the current lifecycle rejects checkpoint writes with `UNKNOWN_VERSION` before transaction entry and has never persisted or accepted a checkpoint. Nested `validatedOutput` schema/evidence validation and authoritative digest recomputation remain activation blockers. Formal task completion remains unchecked.
- **Intentionally deferred validation:** Private Cloud Run/OIDC-to-CMS execution, separately approved worker credential/grant provisioning, actual worker-produced direct/map-reduce checkpoint round trips, and production queue/provider behavior were not run; owner/checkpoint: separately authorized U10-A/U10-B integration and implementation PR CI, by the TB-113 worker implementer/platform reviewer.
- **Residual risks:** The HTTP harness grants only its synthetic role. No persistent role/token grant exists. The unresolved server-side `inputDigest` recomputation is a conformance blocker before treating checkpoint payloads as authoritative worker evidence.
- **Rollback boundary:** Revert the U10-A5 endpoint/lifecycle/service CAS changes, route/controller/domain/HTTP/permission tests, permission-document paragraph, and this ledger entry together; preserve U10-A1–A4, U9-A1 compensation, and unrelated work.
- **Revision, PR, merge, integrated runtime, and formal SDD reconstruction:** `pending`.

### `U10-A5 safety correction: Fail closed pending CMS-verifiable bindings`

- **Reason:** The persisted snapshot contains comment record IDs and text, but normative evidence refs are keyed HMACs and their ref-to-comment map and key are worker-memory-only. CMS cannot independently derive authoritative map chunk membership from the stored snapshot; accepting worker-supplied refs would trust the assertion being verified. The canonical `contractVersions`, immutable stage-config projection/digest, and ordered dependency-digest formula also remain unimplemented.
- **Safety boundary:** `writeWorkerCheckpoint` now rejects with `UNKNOWN_VERSION` before opening a transaction; the authenticated route maps this to 400. The incomplete envelope/output/digest/dependency preparation code was removed rather than left as an apparently usable validator. No checkpoint write, CAS update, replay acceptance, schema, auth, permission grant, credential, dependency, IAM, or infrastructure change is included. Existing route authorization remains unchanged.
- **RED evidence:** `node --test --test-name-pattern='worker checkpoint writes fail closed until CMS can verify checkpoint bindings' test/feedback/generation-lifecycle/lifecycle.test.js` — exit 1 before the change; the lifecycle unexpectedly accepted the write (`Missing expected rejection`).
- **Changed paths:** CMS lifecycle/controller and checkpoint tests; `design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, and this ledger entry. Existing U10-A5 paths and unrelated partial changes remain on the branch.
- **Verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — final serial run passed, exit 0, 13 tests; its first parallel run failed in the PostgreSQL test with `Connection terminated unexpectedly`, then passed on serial rerun. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed, exit 0, authenticated route test including denied checkpoint attempts, unchanged version, and empty persisted checkpoints. `npm --prefix teleferico-cms test -- feedback/permissions` — passed, exit 0, 4 tests. `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` — passed, exit 0, 9 tests. `git diff --check` — passed, exit 0.
- **Next slice:** Specify and implement a compatible source of CMS-verifiable evidence-ref membership together with explicit contract versions, immutable stage configuration, ordered dependencies, and full nested output validation; only then enable the checkpoint route and align the worker runtime.
- **Rollback boundary:** Revert only the fail-closed checkpoint behavior, its regression assertions, and this safety-correction entry. Do not restore the earlier accepting route without the complete independently verifiable contract.
- **Status:** `partial`; no checkpoint payload is currently accepted. Normative checkpoint completion remains blocked.

### `U10-A5 foundation: deterministic membership and digest vectors`

- **Candidate exception:** The user approved a one-candidate `size:exception` up to 4,000 additions plus deletions for this foundation; `tasks.md` records the exact branch/base and retains 800 as the default for later candidates.
- **Contract:** CountTokens still chooses the minimum chunk count that fits complete serialized requests. For each candidate count, records are canonically ordered by period, acceptedAt, recordId and assigned by canonical original-record UTF-8 byte weight, lowest total first with index tie-break. Byte weights are not token estimates or token-safety proof.
- **Implementation:** Added pure app/CMS HMAC ref derivation, byte-weight membership derivation, exact membership verification, closed contract versions, immutable full-model stage-config digest, and stage-input digest with canonical ordered dependency digests. The HTTP route remains `UNKNOWN_VERSION` before transaction entry.
- **Privacy/scope:** Only test-only synthetic key material is used. No secret is stored/logged; key ID is nonsecret. Helpers return only refs, key ID, indexes/count, and digest. No runtime key provider, schema/auth/grant/dependency/IAM/infra change, or accepted checkpoint write.
- **RED:** CMS `node --test --test-name-pattern='CMS matches the worker synthetic|CMS rejects altered membership' test/feedback/generation-lifecycle/lifecycle.test.js` and app `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts -t 'synthetic CMS evidence-membership|rejects changed IDs'` both initially failed because the pure helper modules were absent.
- **Vector checks:** The same CMS and app focused commands above passed after implementation: CMS 2/2 vectors; app 2/2 vectors. Negative coverage includes changed IDs/snapshot digests, reordered/missing/duplicate/foreign refs, key/key-ID/chunk-count/config/dependency changes, unknown contract version keys, Unicode normalization distinction, unpaired surrogates, duplicate IDs, and invalid timestamps.
- **Required verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` passed, 15 tests; `npm --prefix teleferico-cms test -- feedback/admin-report-commands` passed, 1 authenticated HTTP/PostgreSQL test; `npm --prefix teleferico-cms test -- feedback/permissions` passed, 4 tests; `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` passed, 11 tests; focused TypeScript check `pnpm --dir teleferico-app exec tsc --noEmit --pretty false --target ES2022 --module ESNext --moduleResolution Bundler --strict --skipLibCheck --types node services/survey-report-worker/src/checkpoint-contract.ts` passed; `git diff --check` passed.
- **Normalized authored size:** `1,345` additions plus deletions against `c67f51e` after the documentation correction: tracked delta `418` additions + `13` deletions, plus 465 app-helper and 449 CMS-helper lines. This includes the preserved fail-closed baseline and is below the approved 4,000 ceiling.
- **Activation prerequisites:** Keep writes disabled until a separately authorized runtime verifier-key provider supplies the per-run key ID/key, CMS wires derived membership and recomputes complete stage/output/dependency digests inside CAS, nested evidence/privacy validation is complete, app worker stage keys/indexes/payloads align, and the unchanged 4 KiB route cap is shown to fit all valid map payloads. CountTokens selection remains worker evidence, not CMS proof.
- **Rollback boundary:** Remove only the two pure checkpoint-contract modules, their app/CMS vector tests, this foundation entry, the foundation-specific design paragraphs, and this candidate-only task exception. Preserve the original fail-closed route and prior U10-A5 partial evidence.
- **Status:** `partial`; deterministic local membership and digest foundations are tested, but checkpoint activation and normative U10-A5 completion remain blocked.

### `U10-A5: Direct render/store stage-input binding`

- **Identity and scope:** Replaced the worker's legacy render/store input projection with normative v1 digests derived from the CMS claim's immutable model configuration and the exact direct-route validate→render→store output dependencies. The CMS checkpoint write remains `UNKNOWN_VERSION` before transaction entry; map/reduce, complete output/evidence validation, key provisioning, and activation are excluded.
- **Requirements/design:** `tasks.md` task 4.1; `design/02-http-contracts.md` worker claim and checkpoint boundary; `design/04-ai-worker-infrastructure.md` stage-config and stage-input digest rules.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/{checkpoint-contract.ts,contracts.ts,worker-runtime.ts}`; `teleferico-app/src/lib/feedback/worker-pdf.test.ts`; `openspec/changes/tb-113-visitor-feedback/{design/02-http-contracts.md,design/04-ai-worker-infrastructure.md,tasks.md}`; this ledger entry.
- **Behavior:** The claim DTO now requires raw `modelConfig` and `pricingSnapshot` properties, typed `unknown` to reflect that CMS returns stored JSON (including currently empty defaults), matching the actual CMS running-claim response. The runtime validates the closed model-config shape before snapshot/provider work. Render binds to the canonical digest of the locally validated `validate` payload; store binds to the canonical render-payload output digest. The full model config, stage config, contract versions, snapshot/source revision, renderer, and ordered dependency are included. There is no fallback to the legacy digest.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts` — exit 1; 1 file failed at the new stage-input test because `deriveStageInputDigestV1` was not yet implemented; the other file passed. The failure was assertion-level, not an environment failure.
- **Focused app verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts` — passed; exit 0; 2 files and 25 tests.
  - `pnpm --dir teleferico-app run typecheck` — passed; exit 0; no TypeScript diagnostics.
- **CMS verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 15 tests, including the existing assertion that checkpoint writes reject before transaction entry.
- **Authored size:** 376 additions plus deletions against exact base `640ef5709031d7c59163a06a49d008e584eda4e2`, including this ledger entry; within the ordinary 400-line review budget, so no size exception is used.
- **Intentionally deferred validation:** Private Cloud Run/OIDC-to-CMS execution, a provisioned runtime key and grant, accepted CMS checkpoint writes, complete nested semantic/evidence/privacy validators, map/reduce execution, full 4 KiB map-payload fit proof, and provider/storage execution — `not run`; owner/checkpoint: separately authorized U10-A/U10-B implementation and private authenticated worker harness; TB-113 worker implementer/platform reviewer.
- **Residual risks:** This does not establish complete U10-A5 or validated model analysis. Model config values currently originate in the CMS claim response but generation creation still initializes an empty config; these runs safely fail closed. The current published-analysis validation does not provide the complete normative nested output/semantic guarantees.
- **Rollback boundary:** Revert the app claim/stage-binding contract, runtime use of the v1 direct render/store digests, focused regression tests, the corresponding TB-113 design/task updates, and this entry together. Preserve CMS `UNKNOWN_VERSION` behavior and all prior U10-A5 safety/foundation work.
- **Status:** `partial` for app-side direct render/store digest derivation only; CMS verification, complete output validators, checkpoint activation, PR/merge, integrated runtime, and formal SDD reconstruction remain pending.

### `U10-A5 correction: Validate pinned model and pricing claim inputs`

- **Identity and scope:** Corrected the same direct render/store stage-input candidate by validating the exact pinned model and the CMS claim's `PricingSnapshotV1` before snapshot/provider work. No CMS route, checkpoint write, pricing calculation, provider, schema, credential, dependency, remote, or deployment behavior changed.
- **Root cause:** The prior app validator accepted any nonempty model identifier, and runtime ignored raw `pricingSnapshot` JSON even though it was part of the running claim. This allowed model/config drift and malformed pricing data through the worker's initial claim boundary.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts` — exit 1 before implementation; the new wrong-model case and the missing/malformed/extra/duplicate/invalid-pricing cases both observed a successful worker result instead of rejection. The other 25 tests passed.
- **Behavior:** `ModelConfigV1.model` and runtime validation now require `gemini-3.8-flash`; all existing pinned topology, temperature, reasoning, grounding, schema, and routing bounds remain exact. `PricingSnapshotV1` requires exact snapshot/unit keys, nonempty version/SKU, USD, unique SKUs, and finite nonnegative safe-integer prices. Pricing is validated but not consumed for cost calculation by this POC. Absent or malformed config/pricing rejects before snapshot, provider, or renderer calls.
- **Changed paths:** Existing candidate paths only: `teleferico-app/services/survey-report-worker/src/{checkpoint-contract.ts,contracts.ts,worker-runtime.ts}`, `teleferico-app/src/lib/feedback/worker-pdf.test.ts`, TB-113 `design/04-ai-worker-infrastructure.md`, `tasks.md`, and this ledger. CMS source remains unchanged and checkpoint writes stay `UNKNOWN_VERSION` before transaction entry.
- **GREEN app verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts` — exit 0; 2 files and 27 tests. `pnpm --dir teleferico-app run typecheck` — exit 0; no diagnostics.
- **GREEN CMS verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; 15 tests, including fail-closed checkpoint-write coverage.
- **Candidate size exception:** Final candidate size is 544 authored additions plus deletions against exact base `640ef5709031d7c59163a06a49d008e584eda4e2`; the user authorized a candidate-only ceiling of 4,000 for this correction on `feat/app-cms-root-tb-113-checkpoint-stage-input-binding`. This does not alter future-slice defaults.
- **Remaining blockers:** CMS-side digest/dependency recomputation under CAS, authorized runtime verifier-key source, complete nested semantic/evidence/privacy validation, map/reduce, and proof of valid map checkpoint size under the existing 4 KiB cap remain pending. Owner/checkpoint: separately authorized U10-A/U10-B implementation and private authenticated worker harness; TB-113 worker implementer/platform reviewer.
- **Rollback boundary:** Revert the pinned model/pricing validator, claim validation call, focused tests, matching design/task exception notes, and this correction entry together; preserve the previous v1 direct render/store binding and CMS `UNKNOWN_VERSION` behavior.
- **Status:** `partial` for fail-closed app claim validation and listed local checks only; no CMS checkpoint is accepted or persisted, and U10-A5 is not complete.
### `U8-E smoke follow-up: Bind readiness to the login route`

- **Identity and scope:** Tightened only the local Playwright web-server readiness target and login navigation completion signal after the failed PR #349 smoke. Feedback assertions, authenticated product behavior, retries, timeouts, dependencies, fixture credentials, production paths, access-lock work, and remote operations remain unchanged.
- **Observed evidence:** PR #349 Cloud Build `8c804633-ea00-4ed9-8a64-0e3f25ca912c` passed 9 fixture-backed Chromium cases and failed the feedback-admin journey at the Aspect detail heading; retries failed at dashboard URL navigation and the exact summary count, while the mobile comments empty state was flaky. A prior focused local attempt timed out on `GET /es-AR/login` before DOMContentLoaded with no completed response (trace status `-1`); the mobile case passed. Neither observation alone proves why the earlier dashboard requests/assertions failed.
- **Root-class assessment:** The harness's Next.js readiness probe previously checked only `/api/auth/providers`, not the `/es-AR/login` route that the admin tests immediately navigate to. This is a verified readiness gap and a plausible source of startup races, not conclusive proof that it caused every prior symptom. No production LoginForm or FeedbackDashboard defect was established; the underlying cause of the separate async dashboard assertion failures remains uncertain.
- **Correction:** The app web-server readiness URL now targets `/es-AR/login`, forcing that route to respond before Playwright starts. The login helper waits for the document response to commit, then retains its existing hydration assertion and one bounded reload fallback; the login/session and dashboard assertions are not removed or weakened.
- **RED evidence:** The existing focused reproduction above is observed failure evidence for login navigation, but a deterministic standalone regression for process-startup ordering was not feasible without introducing timing-dependent test behavior. No speculative product patch was made.
- **Changed paths:** `teleferico-app/playwright.base.config.ts`, `teleferico-app/tests/e2e/feedback-admin.spec.ts`, and this ledger entry.
- **Required verification:** `pnpm --dir teleferico-app run typecheck` — passed, exit 0. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; 2 tests passed in 1.9 minutes, including exact summary count `18`, Aspect detail heading, and mobile empty-comments/report states. Playwright logged one Fast Refresh full-reload warning. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/maintenance.spec.ts --config=playwright.maintenance.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; 2 tests passed in 53.6 seconds. Playwright emitted a nonblocking Next.js `themeColor` warning on `/maintenance`; ports 3101 and 4101 were clear after the run. `git diff --check` — passed, exit 0 with no output after the ledger append.
- **Status:** `passed` for the local readiness adjustment and required focused browser coverage only; no claim is made that the readiness gap caused all historical retry symptoms or that broader Cloud Build, real-stack, real-auth, or PR CI is proven.
- **Rollback boundary:** Revert the login route readiness URL, the login navigation wait condition, and this entry together; preserve all feedback/product assertions and the independent access-lock work.

### `U8-E startup diagnostic: Identify and bound readiness probes`

- **Identity and scope:** Distinguishes the existing synthetic Strapi fixture health probe from the Next.js login-route probe and gives each a named, per-server startup deadline. The login and `/health` readiness URLs and all E2E assertions remain unchanged; no test/assertion timeout, retry, auth probe, production route, dependency, fixture credential, or remote operation changed.
- **Failure evidence:** The user-provided exact-SHA Cloud Builds `093fbfad-de55-4544-a7db-ff0e44e42a13` and `0ae03ab9-5b42-4982-b57b-4121e03be163` both stopped at Playwright step 3 before test discovery with `Timed out waiting 60000ms from config.webServer`. The accompanying `gcloud unauthenticated` annotation is not the primary failure; both builds started. Those failures do not identify which unnamed server probe timed out.
- **Observed local evidence vs. hypothesis:** `strapi-fixture.mjs` serves `/health` with an empty 204 response after its local HTTP server listens. The previous exact `/es-AR/login` readiness reproduction exceeded 90 seconds without a completed response, and later warm local runs passed. This supports the Next.js login route as the likely slow probe, but does not prove which process timed out in either Cloud Build. Named webServer diagnostics make a future timeout attributable; CI cause remains unknown until a named failure or startup timing is observed there.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/playwright-config.test.ts'` — exit 1; both default and maintenance cases failed because the fixture had no distinct name or explicit timeout. The initial `pnpm --dir teleferico-app run typecheck` found the test's `webServer` union was not necessarily iterable; the test now normalizes the union before selecting the two configured servers.
- **Decision:** Name the probes `Strapi E2E fixture readiness` and `Next.js E2E login readiness`. Keep the fixture startup budget strict at 15 seconds for its local Node `/health` server. Set only the Next.js startup budget to 180 seconds: the same login-route probe previously exceeded 90 seconds locally, so the prior implicit 60-second deadline was demonstrably too short for that observed cold-start case. This is a bounded process-startup allowance only; the E2E test timeout, navigation timeout, and retry policy are untouched. No stdout forwarding or new application/fixture log content was added, avoiding unbounded or sensitive output.
- **Changed paths:** `teleferico-app/playwright.base.config.ts` — per-server names and 15,000/180,000 ms startup budgets; `teleferico-app/src/lib/__tests__/playwright-config.test.ts` — checks both profiles retain distinct named probes, budgets, and existing URLs; this ledger entry.
- **GREEN evidence:** `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/playwright-config.test.ts'` — exit 0; 1 file, 2 tests passed. `pnpm --dir teleferico-app run typecheck` — exit 0. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — exit 0; 2 tests passed in 2.3 minutes. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/maintenance.spec.ts --config=playwright.maintenance.config.ts --project=chromium --retries=0 --reporter=line` — exit 0; 2 tests passed in 1.4 minutes. The named Next.js server emitted only its existing bounded Fast Refresh and maintenance metadata warnings; no readiness timeout occurred locally.
- **Integrity and limitations:** Ports 3100/4100 were observed free before the admin run; ports 3101/4101 were observed free before maintenance. The two local Playwright runs passed and owned-server cleanup completed by runner exit. These end-to-end durations include startup and tests and do not isolate the Next readiness duration. No Cloud Build/GitHub operation was performed, so the remote failure's exact slow probe and exact-SHA CI status remain unknown.
- **Rollback boundary:** Revert only the two names and per-server timeouts in `playwright.base.config.ts`, the focused config test, and this appended entry; preserve the pre-existing login-route readiness URL, test behavior, and all other TB-113 paths.
- **Status:** `passed` for local diagnostic configuration, typecheck, config assertions, and the two focused browser suites only; exact-SHA CI and integrated remote validation remain `not run`.

### `U10-A9: Server-only private report-source transport`

- **Identity and scope:** Added a server-only app transport for the existing private CMS source-page action. It uses an explicit CMS origin and injected custom content-API token provider, bounded POST/response handling, fixed safe error categories, and the existing complete-page source adapter. No browser route, admin generation/retry/dispatch wiring, CMS schema/route/grant, production token, environment configuration, or deployment behavior changed.
- **Requirements/design:** U10-A and task 4.1; `design/02-http-contracts.md` authenticated private source-page request/response and this transport continuation; `design/03-metrics-snapshot-contracts.md` immutable source inputs; `design/04-ai-worker-infrastructure.md` strict authoritative CMS source adapter.
- **Candidate identity and authorization:** Branch `feat/app-root-tb-113-private-report-source-transport`; exact open draft parent PR #363 head `bd3091ed2cc5b92cb5885d509f97ddf56713ca0a`. The user approved one candidate-specific `size:exception` ceiling of 4,000 authored additions plus deletions for this cohesive work unit only. It does not change the 400-line reviewer budget or 800-line default for future candidates.
- **Changed paths and reasons:**
  - `teleferico-app/services/survey-report-worker/src/private-report-source-transport.ts` — server-only, injected-token POST transport for the exact CMS source-page action.
  - `teleferico-app/src/lib/feedback/private-report-source-transport.test.ts` — fake-fetch coverage for multi-resource pagination, status/auth errors, invalid/partial envelopes, body/deadline bounds, and non-disclosure.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — records app transport constraints and the deferred integrated/operational boundaries.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — records this candidate exception, exact parent identity, exclusions, credential owner/source, and future integrated proof.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this work-unit evidence.
- **RED evidence:** Before adding the transport module, `pnpm --dir teleferico-app exec vitest run src/lib/feedback/private-report-source-transport.test.ts` exited 1 before test collection because the module import did not exist. After the initial implementation, 2 of 17 cases exposed defects: a terminal first page with `cursor: null` was misclassified as a repeated cursor, and an oversized streamed response was downgraded to `UPSTREAM_UNAVAILABLE`. The implementation was corrected; the exact final focused command below passed.
- **Transport boundary:** Requires explicit HTTPS CMS origin (HTTP only for loopback test harnesses) and token-provider injection for each page; no token/env lookup or fallback exists. Uses the fixed `/api/tb113/worker/report-source` path, custom bearer token only, no redirects, no-store, 10-second per-page deadline, 4 KiB request cap, 1 MiB declared/streamed response cap, page size 25, and strict JSON/version/resource/cursor/total/row checks. CMS non-2xx bodies and internal provider/fetch errors are not returned or logged. `buildAuthoritativeGenerationInputsV1` remains responsible for stable totals, complete cursor chains, complete row validation, and invoking the materializer only after full source validation.
- **Focused app verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/private-report-source-transport.test.ts src/lib/feedback/authoritative-generation-source.test.ts src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/admin-command.test.ts` — passed; exit 0; 4 files and 67 tests passed.
- **App typecheck:** `pnpm --dir teleferico-app run typecheck` — passed; exit 0; no TypeScript diagnostics after narrowing the typed transport-error assertions in the new test.
- **Independent CMS contract harness:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; exit 0; 1 isolated authenticated Strapi/PostgreSQL HTTP test passed, including synthetic custom content-API token allow, JWT/ungranted denial, private field projection, pagination, validation, oversized request, bounded upstream failures, and owned-resource cleanup. This harness did not call the new app transport and did not provision a real token.
- **Diff integrity:** `git diff --check` — passed; exit 0 with no output after the final source/test/documentation changes.
- **Intentionally deferred integrated validation:** Exact scenario: run `private-report-source-transport` against an isolated local Strapi HTTP server with a synthetic custom content-API token granted only `workerSourceRead`, more than 25 synthetic submissions, and the existing authoritative page builder; prove complete submissions/versions/points traversal, cursor totals, private comment/digest normalization, and no partial materialization. Status: `not run`. Reason: The app↔Strapi composition is intentionally not part of this transport-only unit; only a separate CMS harness was run. Intended future checkpoint: authorized isolated app/CMS integration test. Owner: TB-113 app/CMS implementer and reviewer.
- **Operational credential source and owner:** Future expected source is a dedicated Secret Manager secret injected only into the app server runtime through the explicit provider interface. Secret resource name, IAM grant, runtime binding, and named individual owner are unapproved/unassigned; no real token was provisioned, read, or logged. The platform/CMS runtime operator owns approval, creation, least-privilege access, and rotation.
- **Acceptance criteria:** Exact action URL and closed v1 body with page size 25: `passed` by fake-fetch app tests. 401/403/500, malformed version/resource/cursor/total/rows, oversized body, timeout, provider/fetch/JSON failure and no token/comment in error outputs/logs: `passed` by focused app tests. Complete authoritative materialization over multiple source-page types/cursors: `passed` by fake-fetch app test. Real app↔Strapi integration with synthetic action token: `not run`. Real operational token/provider binding: `not run`.
- **Authored size and inventory:** `740` authored additions plus deletions against exact parent #363 head `bd3091ed2cc5b92cb5885d509f97ddf56713ca0a`; method: tracked `git diff --numstat HEAD` plus `git diff --no-index --numstat /dev/null` for both new app files. The complete five-path inventory is exactly the paths listed above; no other path is changed. This is within the candidate-only 4,000-line ceiling.
- **Residual risks:** The provider is deliberately not constructed by a caller and the transport is not connected to admin generation, retry, or dispatch. Compatibility of the app fetch adapter with the authenticated Strapi HTTP handler remains unproven. Real token provisioning and runtime injection require separate approval.
- **Rollback boundary:** Remove the new app transport and its focused test, then remove only this U10-A9 entry and the U10-A9 paragraphs in TB-113 `design/02-http-contracts.md` and `tasks.md`. Preserve the preceding CMS source action, its permissions boundary, and all existing generation behavior.
- **Status:** `passed` for the standalone app transport, fake-fetch tests, typecheck, and independent CMS contract harness only; integrated app↔Strapi proof, operational credentials, PR/merge evidence, and formal SDD reconstruction remain `pending`.

### `U8-E startup diagnostic correction: Preserve fixture startup baseline`

- **Correction trigger:** Independent review found no cold-start measurement of the fixture while Next.js was starting concurrently to justify lowering the fixture's Playwright default startup deadline from 60 seconds to 15 seconds.
- **Correction:** Keep the distinct `Strapi E2E fixture readiness` name and explicitly set its timeout to `60_000` ms, preserving Playwright's original default budget. Keep `Next.js E2E login readiness` at `180_000` ms. No startup timing is claimed for the fixture; the prior `/health` handler behavior after listen does not prove process readiness under concurrent cold start.
- **RED evidence:** After changing the focused config assertion to expect `60_000`, `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/playwright-config.test.ts'` — exit 1; both default and maintenance configurations still returned `15_000` for the fixture.
- **Scope and verification:** This correction changes only `teleferico-app/playwright.base.config.ts`, the expected value in `teleferico-app/src/lib/__tests__/playwright-config.test.ts`, and this ledger. URLs, auth setup, assertions, retries, Next.js budget, and other paths are unchanged. The names prefix webServer log messages; they do not by themselves establish which probe caused a generic startup timeout.
- **Final local verification:** `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/playwright-config.test.ts'` — passed, exit 0; 1 file, 2 tests. `pnpm --dir teleferico-app run typecheck` — passed, exit 0. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — partial, exit 1; 1 of 2 tests passed, and the admin journey failed at the existing exact-text assertion for `18` (`getByText("18", { exact: true })` not found within 5 seconds), not at server readiness. No retry was run. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/maintenance.spec.ts --config=playwright.maintenance.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; 2 tests passed. Owned server ports were free after each suite. `git diff --check` — passed, exit 0 with no output after this ledger update. No Cloud Build was run.
- **Status:** `partial`; config regression and typecheck passed, maintenance passed, but the feedback-admin E2E assertion failed. No readiness timeout or Cloud Build result is claimed.
- **Rollback boundary:** Revert the fixture timeout from `60_000` to its previous candidate value and the matching test expectation, then remove this correction entry; retain the distinct names and Next.js `180_000` ms timeout.

### `U8-E smoke correction: Synchronize feedback journeys on resource readiness`

- **Identity and scope:** Corrected only the authenticated feedback Playwright journey's synchronization with its existing synthetic admin API responses. No FeedbackDashboard/product behavior, API fixture data, assertions, routes, retries, package settings, or external operations changed.
- **Root cause:** `FeedbackDashboard` initially renders a loading state until the Summary read resolves; Aspects changes the same parent loading state while its read is pending; Comments and Reports have independent loading states and fetch in parallel. The E2E test asserted exact Summary value `18`, Aspects detail, comments, and empty states without awaiting the matching successful resource responses and rendered ready state. The generic test failed because the exact Summary value was not yet in the DOM, not because data was invalid.
- **RED evidence:** Added a deterministic route-response barrier around the fixture's Summary response while leaving the original exact-`18` assertion unsynchronized. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — exit 1; the admin journey reproduced `getByText('18', { exact: true })` timing out after 5,000 ms while the Summary response remained deliberately held; the mobile test passed (1/2). The barrier was then used in the final test to prove the loading state remains visible and the value is absent until the response is released.
- **Correction:** Added a resource-scoped GET response waiter that matches endpoint and optional query, then fails with method/path/query/status if the response is non-2xx. The tests now await Summary, Aspects (including the Valley filter), QR comparison/detail, Comments, Reports, filtered Comments, and page-2 Comments before checking their rendered ready output. The mobile journey awaits Summary and parallel Comments/Reports reads before preserving both empty-state assertions. Existing exact `18`, Aspect detail, mobile empty-comments/report, report submission, and security-boundary assertions remain intact.
- **Changed paths:** `teleferico-app/tests/e2e/feedback-admin.spec.ts` — deterministic Summary response barrier and resource-response/rendered-ready synchronization; this ledger entry. The pre-existing `playwright.base.config.ts` and config regression test candidate paths were preserved and not altered by this correction.
- **Final local verification:** `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/playwright-config.test.ts'` — passed, exit 0; 1 file, 2 tests. `pnpm --dir teleferico-app run typecheck` — passed, exit 0. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; 2 tests. `CI=1 pnpm --dir teleferico-app exec playwright test --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; all 11 fixture smoke tests. The focused and full runs each logged the existing nonblocking Fast Refresh full-reload warning. Port 3100/4100 were observed free before each run.
- **Remote validation boundary:** No Cloud Build, GitHub, GCP, credential, push, commit, PR, or other remote operation was performed. Local fixture smoke does not prove exact-SHA Cloud Build, real-stack readiness, or real-auth acceptance.
- **Rollback boundary:** Revert only the new response barrier/wait helper and their call sites in `feedback-admin.spec.ts`, and remove this ledger entry. Keep the pre-existing three-path Playwright diagnostics candidate (named config probes, config regression test, and prior ledger evidence) unchanged.
- **Status:** `passed` for this local E2E synchronization correction and the exact listed checks; remote and integrated runtime validation remain `not run`.

### `U8-E cold-navigation follow-up: Release document lifecycle gates`

- **Identity and scope:** Adjusted only synthetic Playwright navigation synchronization and recorded this follow-up. Authentication, dashboard rendering, Summary/Aspects API behavior, fixture responses, assertions, retries, timeouts, dependencies, product code, and remote operations remain unchanged.
- **Observed Cloud Build evidence:** Exact-SHA build `a99ffcbe-a20d-4346-84e0-a65f13e3b3ff` for `bc2bb3a50cf0a49d396e398b8ea9258584fff669` started Next.js and ran 11 fixture Chromium tests; 10 passed. The desktop feedback-admin journey exhausted three attempts: attempt 1 timed out waiting for `/dashboard` via `waitForURL` (default `load`); attempt 2 timed out in `page.goto('/es-AR/dashboard/feedback', { waitUntil: 'domcontentloaded' })`; attempt 3 timed out waiting for the `/aspects` response. The build did not run real-stack readiness or real-auth acceptance, and no trace artifacts were exported. A Fast Refresh full-reload warning was present. On the unchanged local candidate, the focused feedback-admin suite passed 2/2 once in 2.8 minutes; this confirms the failure is not locally deterministic and does not establish a product defect.
- **Root-class assessment:** The first two failures directly implicate navigation lifecycle completion as a test gate: first full `load`, then `DOMContentLoaded`. The later missing `/aspects` response is not explained conclusively by the available evidence; without a trace/request record it cannot distinguish a request never issued from a request that failed to produce a response. Existing `waitForSuccessfulAdminRead` reports an observed non-2xx status, while a missing response remains a timeout. No product authentication or dashboard defect is established.
- **Correction:** Wait only for navigation `commit` at the post-login URL and both feedback dashboard document navigations. Keep the login hydration assertion/reload fallback, assert the authenticated dashboard `<main>` is visible, retain the deterministic held-Summary barrier, successful resource-response checks (including HTTP status and the Aspects detail assertions), and add a rendered analyzed-period status check after the successful Summary response. No arbitrary delay, new retry, or product-code change was added.
- **RED evidence:** No deterministic local RED was added: the prior exact-SHA failures were not reproducible on the unchanged local candidate, and simulating a cold network/document lifecycle failure in this synthetic fixture would add timing-dependent behavior rather than prove this gate. The exact-SHA Cloud Build failure above remains observed failure evidence, not proof that this correction resolves every retry symptom.
- **Changed paths:** `teleferico-app/tests/e2e/feedback-admin.spec.ts` — use commit-based document navigation while retaining authenticated/readiness assertions; this ledger entry — records evidence, uncertainty, and rollback.
- **Required verification:** `pnpm --dir teleferico-app run typecheck` — passed, exit 0. `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/playwright-config.test.ts'` — passed, exit 0; 1 file and 2 tests. `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; 2 tests in 1.3 minutes. `CI=1 pnpm --dir teleferico-app exec playwright test --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — passed, exit 0; all 11 fixture smoke tests in 2.3 minutes. Both browser runs logged the existing nonblocking Fast Refresh full-reload warning. Ports 3100/4100 were observed free before each browser run and after the final run. `git diff --check` — passed, exit 0 with no output before this ledger append.
- **Residual uncertainty:** Local fixture smoke does not establish exact-SHA Cloud Build behavior or real-stack/real-auth readiness. The third-attempt `/aspects` observation remains unexplained; a future captured failure must inspect the request and response evidence before any broader change.
- **Rollback boundary:** Revert only the three navigation/readiness assertion edits in `feedback-admin.spec.ts` and remove this entry. Preserve the existing exact product, authentication, Summary-barrier, successful API-response, output, and security assertions.
- **Status:** `passed` for this bounded local navigation-test correction and the exact checks above; resolution of every previously observed Cloud Build attempt and all remote/integrated validation remain `not run`.

### `U8-E failure-only diagnostic: Bound feedback navigation evidence`

- **Identity and scope:** Added failure-only browser diagnostics to the existing synthetic feedback-admin E2E. It records only allowlisted auth/dashboard/admin-feedback events, with method, pathname, received HTTP status, and a finite request-failure category. All existing product/security assertions, waits, timeouts, and retries remain unchanged; no product code, fixture behavior, dependency, environment, infrastructure, or remote resource changed.
- **Observed context:** The user supplied Cloud Build `64a8069a-3384-4a3e-872f-ca0c0750f1c0` evidence for revision `61a6734432068aff15f322c56dede10491c96def`: 10 of 11 fixture Chromium tests passed; the admin desktop failed across three attempts at dashboard navigation and missing Summary/aspects responses. No trace artifact was exported, so the available evidence could not distinguish a request never issued from a response never received. This entry records that supplied evidence, not a new CI observation.
- **Diagnostic boundary:** Emitted only by the existing Playwright `afterEach` when test status differs from expected status. Output is capped at 24 records and 3,072 serialized characters. The allowlist covers login/dashboard paths, Auth.js endpoints, and feedback Summary/Aspects/QR-points/Comments/Reports/Generations endpoints. Query strings, hosts, bodies, headers, cookies, tokens, user/content text, raw failure text, and trace data are not emitted. The record sequence shows observed request/navigation progression; missing response or failed-request records distinguish the observed stopping point without claiming an unobserved cause.
- **Changed paths:** `teleferico-app/tests/e2e/feedback-admin.spec.ts` — attaches bounded event collection to the two existing journeys and logs only on failure; `teleferico-app/tests/e2e/feedback-admin-diagnostics.ts` — allowlist, redaction, finite failure categories, and deterministic bounds; `teleferico-app/src/lib/__tests__/feedback-admin-diagnostics.test.ts` — focused redaction and bounds proof; this ledger entry.
- **Checks actually run:**
  - `pnpm --dir teleferico-app run typecheck` — passed; exit 0.
  - `pnpm --dir teleferico-app exec vitest run 'src/lib/__tests__/feedback-admin-diagnostics.test.ts'` — passed; exit 0; 1 file and 3 tests passed.
  - `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-admin.spec.ts --config=playwright.config.ts --project=chromium --retries=0 --reporter=line` — passed; exit 0; 2 tests passed in 1.2 minutes. Ports 3100/4100 were checked free immediately before the run.
  - `git diff --check` — passed; exit 0 with no output after the final ledger append.
- **Status:** `passed` for local typing, diagnostic redaction/bounds tests, and focused synthetic Chromium E2E only. No Cloud Build or PR check was triggered or observed; CI validation for this change remains `pending`.
- **Residual uncertainty:** The diagnostic reports only browser events observed before an existing test failure. It cannot establish backend causation, identify a request outside the allowlist, or replace a Playwright trace; remote cause remains unknown until the next authorized CI execution.
- **Rollback boundary:** Revert the failure-only recorder and call sites in the E2E spec, remove its focused helper/test, and remove this ledger entry. Preserve all existing assertions, auth security, waiters, timeouts, and retries.
### `TB-113 feedback capability release lock`

- **Identity and scope:** Added a fail-closed server-side release gate for feedback administration and anonymous visitor feedback while the capability remains incomplete. This is a reversible application boundary only; it does not finish pending formal tasks or enable production/staging.
- **Requirements references:** `specs/feedback-administration/spec.md` authenticated Next.js mediation; `design/02-http-contracts.md` public and admin contracts; `tasks.md` pending U7/U8 acceptance.
- **Changed paths and reasons:**
  - `teleferico-app/src/lib/feedback/capability-gate.ts` and `.test.ts` — enforce an explicit server-only test/development opt-in and hard-deny production/staging.
  - `teleferico-app/src/app/[locale]/(administration)/dashboard/(sections)/feedback/page.tsx` and `src/app/qr/feedback/[publicCode]/page.tsx` — return generic not-found pages while closed.
  - `teleferico-app/src/app/api/feedback/{surveys/[publicCode]/route.ts,submissions/route.ts}` — deny before constructing feedback runtime dependencies.
  - `teleferico-app/src/lib/feedback/admin-route.ts` — deny all five admin reads and both generation commands before origin/session checks or reader/command access.
  - Dashboard layout, shell projection, and projection tests — hide the feedback navigation item using the same server gate, without changing global maintenance behavior.
  - `teleferico-app/playwright.base.config.ts` and `.env.example` — configure/document fixture-only opt-in; production and staging remain closed if the variable is present.
  - `teleferico-app/README.md`, this route README, and this ledger — document the release lock and evidence boundary.
  - Focused public/admin route tests — cover closed direct requests, production flag spoofing, fixture opt-in, generic pages, no downstream calls, and enabled-path routing.
- **Implementation:** `partial` for the local candidate; the required Vitest and TypeScript commands could not execute because this worktree has no installed `node_modules` (`vitest` and `tsc` are unavailable). No packages were installed.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback src/app/api/feedback src/app/api/admin/feedback 'src/app/qr/feedback/[publicCode]/FeedbackForm.test.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'`
  - Status: `failed` before test collection.
  - Exact result: exit nonzero; pnpm reported `Command "vitest" not found` and indicated the package `node_modules` directory is missing. No test assertion ran.
- **Typecheck:**
  - Command: `pnpm --dir teleferico-app run typecheck`
  - Status: `failed` before TypeScript analysis.
  - Exact result: exit nonzero; shell reported `tsc: not found`; pnpm confirmed package `node_modules` is missing.
- **Check-only validation:** `git diff --check` — passed; exit 0 with no output.
- **Authored size:** `329` additions plus deletions, measured as tracked `git diff --numstat HEAD` additions+deletions plus all three new source/test file line counts; no code-golf or size-driven scope reduction was applied.
- **Intentionally deferred validation:**
  - Exact scenario: `pnpm --dir teleferico-app exec playwright test tests/e2e/visitor-feedback.spec.ts tests/e2e/feedback-admin.spec.ts`.
  - Status: `not run`.
  - Reason: The user prohibited browser/CMS fixture execution because another session may be using those servers, ports, and resources. The fixture Next.js process is explicitly configured to opt in, preserving future feedback spec eligibility, but this was not executed here.
  - Intended future checkpoint: isolated implementation PR CI or a later dedicated local browser validation with exclusive fixture resources.
  - Owner: TB-113 implementer/reviewer.
- **Acceptance criteria:** The gate source and test cases encode production/staging deny, direct-route denial, no runtime/CMS/mutation invocation, fixture opt-in, and hidden sidebar behavior; execution evidence remains `pending` because required test binaries are unavailable. Browser fixture eligibility is configured but not runtime-verified.
- **Residual risks:** No local automated assertion or type analysis ran; integrated browser, CMS, locale rendering, staging, production, deployment, and formal SDD evidence remain unobserved. No unfinished UI is deliberately exposed when the page gate executes.
- **Rollback boundary:** Revert the capability gate, page/API/sidebar wiring, fixture-only opt-in/documentation, focused tests, and this ledger entry together; preserve all existing feedback handlers and their auth/CSRF/origin/QR/rate-limit controls.
- **Later integrated validation:** `pending`; run the stated isolated browser scenarios and required checks in a dependency-complete worktree, then validate the complete feedback runtime only through authorized integrated checkpoints.
- **Formal SDD reconstruction:** `pending`; no task checkbox or formal completion claim was changed.

### `TB-113 feedback capability release lock: offline verification follow-up`

- **Correction:** Fixed two incorrect relative imports in `src/app/api/feedback/capability-gate.test.ts`; the initial focused run failed only when loading the admin generation/retry test routes from the sibling `api/admin` directory.
- **Offline install:** `COREPACK_ENABLE_NETWORK=0 corepack pnpm install --offline --frozen-lockfile --ignore-scripts` — passed in `teleferico-app`, pnpm `10.33.0`; 991 packages reused from cache, zero downloaded. Lockfile remained frozen and lifecycle scripts were skipped.
- **Focused verification:** The initial focused command exited 1 with 209/210 tests passing due to those bad relative imports. After the two-path correction, the exact rerun `COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback src/app/api/feedback src/app/api/admin/feedback 'src/app/qr/feedback/[publicCode]/FeedbackForm.test.tsx' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'` passed; exit 0, 24 files and 210 tests passed. This covers direct closed admin/public pages, all seven admin route operations, production flag spoofing, fixture opt-in, sidebar hiding, and existing public/admin security behavior.
- **Typecheck:** `COREPACK_ENABLE_NETWORK=0 corepack pnpm run typecheck` exited 2. It reported missing existing `@/public/*` assets/declarations and missing generated `RouteContext` declarations in unchanged route files; it reported no diagnostics in the capability gate or `admin-route.ts`. No unrelated assets/types were changed.
- **Final diff check:** `git diff --check` — passed; exit 0 with no output.
- **Authored size:** `340` additions plus deletions, measured as tracked `git diff --numstat HEAD` additions+deletions plus the line counts of the three new source/test files; below 400, with no size exception needed.
- **Deferred browser validation:** `pnpm --dir teleferico-app exec playwright test tests/e2e/visitor-feedback.spec.ts tests/e2e/feedback-admin.spec.ts` remains `not run` due shared-service contention risk; no E2E pass is claimed.
- **Status:** `partial`; offline installation and focused Vitest passed, while package typecheck remains failed on diagnostics outside this candidate. No Playwright, Docker, SDD, remote, or deployment operation was run.

### `TB-113 feedback capability release lock: synthetic typegen verification`

- **Initial failures retained:** The earlier typecheck exited 2 with missing static `@/public/*` module declarations and `RouteContext` names; the first `next typegen` attempt failed before generating types because `images.remotePatterns[0]` was invalid without the required deployment environment values. Its numeric exit code was not captured. These results remain historical evidence, not the final verification status.
- **Synthetic type generation:** `COREPACK_ENABLE_NETWORK=0 BUILD_STRAPI_BUCKET_HOSTNAME=example.invalid BUILD_STRAPI_BUCKET_PATHNAME='/uploads/**' BUILD_STRAPI_BASE_URL=https://example.invalid corepack pnpm exec next typegen` — exit 0; route types generated successfully. The synthetic non-secret values were scoped to this process; no `.env` file was read or written, and no network/build fallback was used.
- **Final typecheck:** `COREPACK_ENABLE_NETWORK=0 corepack pnpm run typecheck` — exit 0; `tsc -p tsconfig.json --noEmit` emitted no diagnostics after type generation.
- **E2E:** Visitor/admin Playwright specs remain `not run` because shared fixture resources may be in use by the independent smoke session; this typecheck result does not prove browser behavior.
- **Current local verification status:** Focused Vitest (24 files, 210 tests), generated route types, typecheck, and `git diff --check` passed. E2E and integrated/staging/production validation remain unverified.
- **Final candidate size:** 349 authored additions plus deletions against `e90f4b7764831b163aeb1044ee667596a9a116f0`, including the three new gate/test files and this entry; below the 400-line review budget.
### `U10-A5 continuation: validate direct render/store checkpoints`

- **Identity and scope:** On `feat/app-cms-root-tb-113-checkpoint-stage-validation`, based at exact open parent #349 head `7996471ef54e5f08b291177bd924415c37ecfb3e`, added strict local validation for the worker's direct-route render/store checkpoint subset. This exact candidate has a user-approved, candidate-only `size:exception` capped at 4,000 additions plus deletions; no later candidate inherits it.
- **Requirements/design:** `specs/survey-worker-operations/spec.md` private idempotent execution; `design/02-http-contracts.md` checkpoint envelope and fail-closed route; `design/04-ai-worker-infrastructure.md` checkpoint graph, payload privacy, ordered dependencies, and activation gates; `tasks.md` U10 task 4.1.
- **Changed paths:**
  - `teleferico-app/services/survey-report-worker/src/checkpoint-contract.ts` — validates exact direct-route render/store checkpoint keys and indexes, timestamps, input/output digest shape, canonical output digest, and private staged object identity.
  - `teleferico-app/services/survey-report-worker/src/worker-runtime.ts` — restricts this POC runtime to direct route with no chunks; validates every prior render/store checkpoint's closed shape and privacy before snapshot/provider/renderer/storage work; checks digest binding after analysis; emits direct render/store indexes 4/5.
  - `teleferico-app/src/lib/feedback/worker-pdf.test.ts` — covers malformed/extra/private fields, including prior render comments and prior store signed URLs, and proves rejection before provider invocation; also covers digest/index/route mismatch, exact output digest, generated stage indexes, and fail-closed map/reduce behavior.
  - `design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, and `tasks.md` — describe the limited POC behavior, digest conformance gap, remaining gates, and unchanged 800-line default.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this evidence and rollback boundary.
- **Important limit:** Worker `stageInputDigest` remains its legacy POC projection. The current claim omits immutable model configuration and validated `validate` output needed to construct the full v1 `StageConfigProjectionV1` and ordered dependency graph. This work does not claim v1 stage-input digest conformance, nested AI/evidence validation, or map/reduce support; unsupported route/checkpoint history fails closed. The CMS checkpoint route remains `UNKNOWN_VERSION` before transaction entry and accepts/persists no writes.
- **RED/correction evidence:** The first focused Vitest run failed because its pre-existing render-reuse fixture used obsolete `common`/index `0` metadata and a placeholder output digest. The fixture was corrected to represent a valid direct-route stage. An intermediate app typecheck also caught an `unknown` output-digest narrowing error in the new validator; the type guard was fixed and the final required typecheck passed.
- **Scoped correction:** Two new regressions were run RED first with malformed prior entries containing `rawComments` in a render payload and `signedUrl` in a store payload. `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` failed both new assertions because `analysisProvider` had already been called. Runtime now validates every prior entry in a loop before snapshot/provider/renderer/storage work; the expected stage-input digest comparison remains after analysis because the current analysis digest is needed to compute it. This does not claim full v1 digest conformance.
- **Verification after final code/design/task normalization:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 1 file, 16 tests.
  - `pnpm --dir teleferico-app run typecheck` — one intermediate run failed because checkpoint creation still supplied the removed expected `inputDigest` validator option; after removing that argument, rerun passed with exit 0 and no diagnostics. Per this correction request, the overall status is `partial` because a required command invocation failed before correction.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 15 tests, including PostgreSQL transaction/concurrency coverage and the still-fail-closed checkpoint write contract.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated Strapi/PostgreSQL HTTP test, including worker checkpoint attempts remaining rejected.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — passed; exit 0; 4 tests, including deny-by-default worker actions.
  - `git diff --check` — passed; exit 0 with no output after all seven paths were normalized.
- **Authored size:** `471` additions plus deletions across all seven changed paths against exact parent head `7996471ef54e5f08b291177bd924415c37ecfb3e`, including this ledger entry. This is within the approved candidate-only 4,000-line exception; default for later candidates remains 800.
- **Status:** `partial` under the request's rule because one intermediate required typecheck failed before its fix; the corrected rerun and the rest of final verification passed. The bounded prior-checkpoint safety correction is implemented; full U10-A5 and checkpoint activation remain incomplete.
- **Activation prerequisites / later owners:** Full v1 stage binding and dependency recomputation; explicit runtime verifier-key source; complete nested MapV1/DirectV1/ReduceV1 claim, evidence, and privacy validation; CMS-side validation inside CAS; valid map payload sizing against the unchanged 4 KiB limit; approved credentials/grant and private worker integration. These remain future separately authorized U10-A5/U10-B work owned by the TB-113 worker implementer/platform reviewer.
- **Rollback boundary:** Revert this ledger entry, the six listed implementation/design/task paths, and their worker-PDF tests together. Preserve the parent #349 checkpoint-contract foundation, the CMS fail-closed `UNKNOWN_VERSION` path, and all unrelated work.
- **Revision, PR, merge, integrated runtime, and formal SDD reconstruction:** `pending`; no commit, push, remote operation, SDD phase, or production operation was performed.

### `U10-A5 continuation: direct analysis output preflight`

- **Identity and scope:** Reconstructed the existing `feat/app-root-tb-113-checkpoint-output-validation` branch on exact immediate parent #350 head `70440c3cad15b22a54470738e55bbb12c299bfcc` by replaying only its unique DirectV1 preflight commit. The pure preflight checks independently provable schema, evidence-reference, threshold, privacy, Unicode, and prohibited-marker constraints. It never returns a validated analysis; MapV1/ReduceV1 and checkpoint acceptance remain out of scope.
- **Candidate size authorization:** For this exact branch and parent #350 head, the user approved a candidate-specific `size:exception` up to 4,000 additions plus deletions. The final measured candidate is 512 additions plus deletions, above the 400-line reviewer budget and below the 800-line default; this exception applies only to this candidate and does not carry forward.
- **Requirements/design:** `specs/survey-worker-operations/spec.md` isolated worker validation; `design/03-metrics-snapshot-contracts.md` immutable snapshot; `design/04-ai-worker-infrastructure.md` lines 11–26 evidence, thresholds, privacy, and validation rules.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/analysis-output-preflight.ts`; `teleferico-app/src/lib/feedback/worker-output-preflight.test.ts`; `design/04-ai-worker-infrastructure.md`; `tasks.md`; this ledger entry.
- **RED evidence:** Not captured before implementation; the focused tests below are GREEN evidence only.
- **Focused verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts` — passed; exit 0; 1 file, 6 tests, covering unknown keys/order, missing/malformed/duplicate/foreign refs, thresholds, action language, comment leakage, duplicate IDs, Unicode, and an explicit unresolved semantic-contradiction blocker.
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 1 file, 16 tests.
  - `pnpm --dir teleferico-app run typecheck` — first invocation failed because the new test omitted explicit Vitest global imports; added `describe`, `expect`, and `it` imports, then reran the exact command successfully with no diagnostics.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 15 tests, including the unchanged fail-closed checkpoint contract.
  - `git diff --check` — passed; exit 0 with no output.
- **Authored size:** 512 additions plus deletions against exact parent head `70440c3cad15b22a54470738e55bbb12c299bfcc` (41 tracked additions plus deletions plus 471 lines in the two new source/test files). This exceeds the ordinary 400-line reviewer budget and is covered by the exact candidate-specific exception above; the 800-line default remains unchanged for later slices.
- **Explicit blockers:** No real evidence key/provider is wired. Clean output remains `incomplete` because semantic claim-to-metric entailment, contradictory evidence, provider-evidence meaning, and versioned insufficient-evidence copy are not provable in this unit. CMS checkpoint writes remain `UNKNOWN_VERSION` before transaction entry.
- **Rollback boundary:** Revert the new direct-output preflight and its focused tests plus this entry and the corresponding design/task clarification; preserve existing checkpoint contract helpers and the CMS fail-closed route.
- **Status:** `partial` under the request's rule because the first required typecheck invocation failed before the missing test imports were corrected; the exact final rerun and all other final checks passed. RED-first evidence was not captured before implementation. The original work unit changed no key, environment, auth/grant/schema/dependency, IAM, deployment, or SDD state. Its unique implementation commit was replayed locally during reconstruction; no remote update, PR operation, or deployment was performed.

### `TB-113 feedback flag: server-only environment switch`

- **Identity and scope:** Made the exact server-side `FEEDBACK_CAPABILITY_ENABLED === "true"` value the sole gate in every runtime, with staging and production deployments explicitly defaulting to false. Kept the existing page/API/sidebar guards and enabled-path security layers. No live service, environment file, deployment, or SDD operation was changed.
- **Changed paths:** `teleferico-app/src/lib/feedback/capability-gate.ts`; public/API and admin-route Vitest coverage; `docs/infra/cloud-build/app-{staging,production}.yaml`; `teleferico-app/README.md`; `docs/INFRA.md`; root `AGENTS.md`; this TB-113 README and ledger.
- **Focused RED/GREEN evidence:** The final `COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run 'src/app/api/feedback/capability-gate.test.ts' 'src/app/api/admin/feedback/summary/route.test.ts' 'src/app/[locale]/(administration)/dashboard/_components/dashboard-shell-projection.test.ts'` run passed; exit 0, 3 files and 23 tests. Covers true in staging/production despite runtime labels, absent/false/malformed values closed, server-only source boundary, closed page/API/admin/sidebar behavior, and retained origin/CSRF guards. No pre-implementation RED run was captured.
- **Typecheck:** `COREPACK_ENABLE_NETWORK=0 corepack pnpm run typecheck` initially failed because tests assigned the readonly `NODE_ENV` property; changed those cases to `vi.stubEnv` and reran the exact command successfully, exit 0 with no diagnostics.
- **Deployment contract:** `node --test .github/scripts/tb113-feedback-and-mapper-contract.test.js` passed its Cloud Build false-default assertion. Deployment snapshots were not applied to live triggers; no runtime deployment was performed.
- **Residual gap:** `teleferico-app/.env.example` could not be updated because the runtime denied access to that path. The flag is documented in the app README and infrastructure docs, but the package environment-example documentation remains outstanding. Next.js build/runtime behavior and browser flows were not exercised; Playwright remains deferred to implementation PR CI/integrated validation.
- **Rollback boundary:** Revert the gate, focused tests, app deploy snapshot defaults, operational toggle documentation, TB-113 route text, and this entry together. The operational toggle must be returned to false separately by an approved operator if one is ever enabled.
- **Status:** `partial`; focused app tests, typecheck, and deployment-contract assertion passed. Environment-example documentation and integrated runtime validation remain pending. No commit, push, PR, merge, or deployment was performed.

### `TB-113 mapper: authorized read-only remote inventory`

- **Identity and scope:** Added `authorized-remote-inventory`, requiring current-session destination, read-only operation, and credential/session authorization. Preserved `local-boundary`, publication-preflight requirements, and the v2 field shape; kept Bash default deny and added only scoped, read-oriented GitHub verbs/local Git reads. Removed the `gh auth status` allow and documented that publication-preflight fetch mutates local refs.
- **Changed paths:** `.opencode/agents/delivery-state-mapper.md`; `.github/scripts/tb113-feedback-and-mapper-contract.test.js`; this ledger.
- **Focused evidence:** `node --test .github/scripts/tb113-feedback-and-mapper-contract.test.js` passed; exit 0, 3 tests covering staging/production deploy defaults, scope authorization/v2 fields, finite read-only allowlist, and forbidden broad/write patterns. The test is static text-contract coverage; the OpenCode Bash matcher/CLI was not run, so runtime permission enforcement is not proven.
- **Residual risk:** Dynamic `gh api` read-only requests remain denied because wildcard command patterns could admit write methods/options. The mapper supports the listed built-in read-only commands only. OpenCode configuration is loaded at startup; restart the process to activate this agent-file permission change.
- **Rollback boundary:** Revert the mapper scope/allowlist text, its static contract test, and this entry together; no existing scope or publication workflow was executed.
- **Status:** `passed` for the static contract checks only; OpenCode runtime matcher validation and authorized remote inventory execution remain not run. No remote command, credential inspection, commit, push, PR, merge, or SDD operation was performed.

### `U10-A5 continuation: DirectV1 section-signal consistency`

- **Identity and scope:** Extended the pure direct-analysis preflight to reject `recurrent_themes` claims that are not marked `recurrent` and `minority_signals` claims that are not marked `minority`. Existing snapshot-derived evidence-reference membership/threshold checks remain unchanged. Numeric metric grounding, contradictory evidence semantics, and current/previous comparison truth are not inferable from the current free-text claim contract; those claims remain `incomplete`, never fully validated.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/analysis-output-preflight.ts`; `teleferico-app/src/lib/feedback/worker-output-preflight.test.ts`; `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md`; `tasks.md`; this ledger entry.
- **RED evidence:** Before the production change, `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts` failed as expected: 1 failed test, 6 passed. The new assertion expected `rejected` with `section_signal_mismatch` but received `incomplete` at `worker-output-preflight.test.ts:168`.
- **Focused verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 2 files, 29 tests.
  - `pnpm --dir teleferico-app run typecheck` — passed; exit 0; no diagnostics.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 15 tests, including the unchanged fail-closed checkpoint test.
  - `git diff --check` — passed; exit 0 with no output.
- **Runtime harness:** `N/A`; this is a pure in-memory validator change, and no runtime/provider/CMS checkpoint activation is authorized or implemented.
- **Deferred checks and owner:** A machine-readable, normative metric-anchor and period-comparison representation is not specified. The TB-113 design/spec owner and worker implementer must define it before exact numeric grounding, contradiction, or current/previous truth can be verified; future CMS checkpoint CAS proof remains with the CMS lifecycle owner. No lexical heuristic may be presented as semantic proof. No key is provisioned or operational evidence key is emitted. `MapV1`/`ReduceV1` and versioned insufficient-evidence Spanish text remain unvalidated. CMS checkpoint writes must continue returning `UNKNOWN_VERSION` before transaction entry.
- **Candidate-specific size exception:** The user authorized up to 4,000 additions plus deletions only for `feat/app-root-tb-113-direct-analysis-evidence` against exact immediate parent PR #356 head `4727994c00be96310bba334c47c7b6fa94bda2ca`. Final authored count: 71 additions plus deletions (70 insertions, 1 deletion across five tracked paths); within the ordinary 400-line reviewer budget, so the exception was not needed. It expires with this candidate and does not alter the 400-line reviewer budget or 800-line default for other work.
- **Rollback boundary:** Revert the section/signal consistency check, its regression tests, this entry, and the corresponding `design/04-ai-worker-infrastructure.md` and `tasks.md` clarifications together; preserve the existing preflight checks and fail-closed CMS checkpoint route.
- **Status:** `partial`; the deterministic section/signal mismatch subset is covered by RED/GREEN evidence, but semantic metric/evidence analysis and all activation blockers remain pending. No commit, push, remote operation, SDD phase, key provisioning, schema/auth/grant/dependency/environment/IAM/deployment change occurred.

### `U10-A5 continuation: MapV1 and ReduceV1 structural preflight`

- **Identity and scope:** Added pure app-side MapV1 and ReduceV1 structural/evidence-membership checks alongside the existing DirectV1 preflight. This exact candidate is `feat/app-root-tb-113-map-reduce-output-preflight`, based on immediate parent #357 head `6fb869ced1e319179d02f95de3dc5e27d017e67a`. No runtime consumer or checkpoint-write activation was added.
- **Requirements/design:** `design/04-ai-worker-infrastructure.md` lines 11–26 and 28–49; `design/03-metrics-snapshot-contracts.md` `CommentRecordV1`/`SnapshotEnvelopeV1`; `specs/vertex-feedback-analysis/spec.md` output, evidence, privacy, and narrative constraints; U10 task 4.1.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/analysis-output-preflight.ts`; `teleferico-app/src/lib/feedback/worker-output-preflight.test.ts`; `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md`; `tasks.md`; this entry.
- **Behavior:** Map preflight checks the closed `survey-map.v1` shape and canonical `map.<i>-of-<n>` key, derives the expected ordered chunk refs from the validated snapshot through `deriveChunkMembership`, and rejects any caller-supplied `coveredRefs` mismatch. It checks unique code-point-sorted theme/claim IDs, chunk-local refs, schema/order, prohibited content, Unicode, exposed refs, and comment leakage. Reduce preflight checks the closed `survey-analysis.v1`/`route: "reduce"` contract, ordered sections, claims, prohibited content, and exact `mapOutputDigests` equality with the supplied digest records numbered consecutively from chunk 1. Clean outputs remain `incomplete`.
- **RED evidence:** Before production implementation, `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts` — exit 1; 6 new MapV1/ReduceV1 tests failed because the two preflight exports did not exist; 8 existing DirectV1 tests passed. This was an assertion-level implementation RED, not an environment failure.
- **Final focused verification after source normalization:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 2 files and 36 tests. `pnpm --dir teleferico-app exec prettier --check services/survey-report-worker/src/analysis-output-preflight.ts src/lib/feedback/worker-output-preflight.test.ts` — passed; both files match Prettier.
- **Typecheck evidence:** First final `pnpm --dir teleferico-app run typecheck` invocation exited 2 on a test-fixture assignment because the generated section claims type was inferred as `never[]`. The fixture was adjusted to construct the supported section without mutating the inferred empty array. The exact final rerun passed; exit 0 with no diagnostics. The initial failed invocation is retained and makes this candidate status `partial` under the direct-route evidence rule.
- **CMS/final diff evidence:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 15 tests, including PostgreSQL transaction/concurrency coverage and the unchanged checkpoint-write fail-closed contract. `git diff --check` — passed; exit 0 with no output after the final code normalization.
- **Runtime harness:** `N/A`; the changes are pure in-memory validators and no worker/provider/CMS activation boundary was changed.
- **Candidate size exception:** The user authorized a candidate-only ceiling of 4,000 authored additions plus deletions for this exact branch against exact parent #357 head `6fb869ced1e319179d02f95de3dc5e27d017e67a`. Final candidate count is 731 authored additions plus deletions across the five tracked candidate paths. This exception expires with this candidate; the ordinary 400 reviewer budget and 800 default remain for later slices.
- **Unproven boundaries:** The supplied chunk count is not proof that exact CountTokens chose the minimal fitting count. Caller-supplied validated map-output digests are matched by ordered chunk index but are not independently recomputed here. Model semantic correctness, exact metric grounding, contradiction/current-previous truth, immutable per-run key selection, and CMS stage/output/dependency digest recomputation inside CAS are not established. No default key is provided; test-only synthetic key material is used. CMS checkpoint writes remain `UNKNOWN_VERSION` before transaction entry. No credential, CMS write activation, schema/auth/grant/dependency/environment/IAM/GCP/deployment change occurred.
- **Intentionally deferred validation and owners:** Exact CountTokens chunk-selection evidence and provider/map semantic validation — future U10-A5 worker owner; immutable runtime key provider and private authenticated worker harness — separately authorized U10-A/U10-B worker/platform owner; checkpoint membership/output/dependency recomputation under CAS and write activation — CMS lifecycle owner after those gates. `pnpm --dir teleferico-app` broader test/runtime/provider scenarios are not substituted for the requested focused commands.
- **Rollback boundary:** Revert the MapV1/ReduceV1 functions and tests, this ledger entry, and the corresponding design/task paragraphs together; preserve the existing DirectV1 preflight, checkpoint-contract helpers, and CMS fail-closed route.
- **Status:** `partial`; deterministic structural/evidence-membership subsets passed locally, but all named semantic, CountTokens, key-provider, CMS-CAS, and activation boundaries remain incomplete. Formal task checkboxes remain unchecked; revision, PR, merge, integrated runtime, and formal SDD reconstruction remain pending.

### `U10-A5 correction: Remove caller-asserted Reduce map digest authority`

- **Correction trigger:** Independent verification found that the preceding ReduceV1 preflight compared `mapOutputDigests` with caller-supplied `validatedMapOutputs`. Matching values did not establish that those digests came from CMS-verified Map checkpoints. The preceding ledger claim of exact equality with supplied “validated” records is superseded; those records had no independent authority.
- **Identity and scope:** One scoped correction to the same `feat/app-root-tb-113-map-reduce-output-preflight` candidate against exact parent #357 head `6fb869ced1e319179d02f95de3dc5e27d017e67a`. No CMS route, runtime consumer, key source, checkpoint write, or unrelated candidate behavior changed.
- **Correction:** Removed the caller-supplied expected-digest input and equality check. Reduce preflight now rejects only empty, malformed, or duplicate digest strings; it does not claim map membership or chunk-index order. Every syntactically clean Reduce remains `incomplete` with explicit blocker `independently_verified_cms_map_checkpoint_output_digests`. The API ignores an extra forged legacy `validatedMapOutputs` property and never labels it verified.
- **RED evidence:** Before the correction, `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts -t 'does not treat matching caller-supplied map digests as CMS-verified'` — exit 1; the new regression observed the misleading `ordered_validated_map_output_digests` checked label despite matching forged expected values. After implementation, one intermediate full output-preflight run exited 1 because the test still expected an extra but syntactically valid digest to be rejected; without an authoritative map list, that cardinality cannot be independently established. The test was corrected to require `incomplete`, not rejection, for that unprovable case.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/analysis-output-preflight.ts`; `teleferico-app/src/lib/feedback/worker-output-preflight.test.ts`; TB-113 `design/04-ai-worker-infrastructure.md`; `tasks.md`; this ledger entry.
- **Final verification after Prettier normalization:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 2 files and 37 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 15 tests. `git diff --check` — passed; exit 0 with no output.
- **Proof boundary:** Map index/ref consistency is rejected where membership derives from the supplied map chunk ID and snapshot partition. Reduce section evidence refs, digest syntax, and digest uniqueness are checked. Reduce digest-to-checkpoint identity, completeness, and index order are not provable from `ReduceV1.mapOutputDigests` alone and are not claimed; arbitrary valid digest lists remain incomplete. No supplied output digest is treated as a CMS authority.
- **Remaining blockers and owners:** CMS must provide independently authenticated/verified Map checkpoint output digests with chunk indexes, and its checkpoint write path must recompute stage/output/dependency bindings under CAS; owner: CMS lifecycle implementer. Exact CountTokens chunk selection, model semantic/metric validation, immutable runtime evidence-key provisioning, and private authenticated runtime remain pending with U10-A5/U10-B owners. CMS checkpoint writes continue returning `UNKNOWN_VERSION` before transaction entry.
- **Rollback boundary:** Revert only the removal of caller-supplied Reduce expected-digest comparison, its regression/shape tests, this correction entry, and matching design/task clarification; preserve MapV1 membership checks, existing DirectV1 behavior, and CMS fail-closed checkpoint writes.
- **Candidate-specific size exception:** Same user-approved 4,000 additions-plus-deletions cap; exact final count is 769 against parent #357. Exception remains confined to this branch and expires with this candidate; default reviewer budgets remain 400/800 for future work.
- **Status:** `partial`; the false caller-list authority has been removed and scoped tests pass, but independently verified CMS map output digest authority and all other listed activation evidence remain unavailable. No credential, CMS write activation, schema/auth/grant/dependency/environment/IAM/GCP/deployment, remote operation, commit, push, PR, or SDD action occurred.

### `U10-A5 continuation: Pure CMS checkpoint graph verification`

- **Identity and scope:** Added an unconnected pure CMS verifier for the closed direct-route checkpoint history and one candidate. It verifies lifecycle/snapshot identity, source/model configuration binding, exact v1 contract versions, direct route/key/index order, state-version freshness, stage-config/input digests, dependency output-digest order, canonical payload output digests, exact replay, and conflict rejection. Structurally safe payload checks cover redact/count/render/store. Arbitrary `DirectV1` and all MapV1/ReduceV1 or published-analysis outputs remain `incomplete` or fail closed; the API rejects map-reduce because it receives no independent snapshot/key pair. It performs no database work and is not wired into the route.
- **Chain identity and exception:** Current branch `feat/cms-root-tb-113-checkpoint-graph-verifier` starts at exact open draft parent PR #358 head `6dd7b99a5fd99ddbf1eedc4593ba505c860eeb41`; #358 chains through #357 to #356 implementation root. The user authorized a candidate-only ceiling of 4,000 authored additions plus deletions for this cohesive verifier/tests/design/ledger unit. Final count: 490 authored additions plus deletions across five tracked paths against the exact parent; the candidate-specific exception is used. It expires with this candidate and does not change the 400-line reviewer budget or 800-line default for later candidates.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/services/checkpoint-contract.js`; `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js`; `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md`; `openspec/changes/tb-113-visitor-feedback/tasks.md`; this ledger entry.
- **RED evidence:** `node --test --test-name-pattern='checkpoint graph verifier' test/feedback/generation-lifecycle/lifecycle.test.js` — exit 1 before implementation; the focused regression failed because `verifyCheckpointGraphV1` was not exported/implemented. The failure was assertion-level, not an environment failure.
- **Final focused verification:**
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 17 tests, including isolated PostgreSQL lifecycle coverage, the full direct-stage dependency chain, private store-shape rejection, pure digest/history checks, and the assertion that checkpoint writes do not invoke `withTransaction`.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated isolated Strapi/PostgreSQL HTTP test. The granted synthetic checkpoint request still returned HTTP 400 `UNKNOWN_VERSION`; persisted checkpoint history remained unchanged.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — passed; exit 0; 4 tests, including deny-by-default action registration.
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts` — passed; exit 0; 2 files, 37 tests.
  - `git diff --check` — passed; exit 0 with no whitespace errors after final source normalization and size/count documentation.
- **Verified result:** A complete direct graph enforces ordered redact→count→direct→validate→render→store dependency hashes. Only closed, safe structural metadata is reported as structurally checked. Arbitrary DirectV1 and published-analysis objects stay incomplete; an unsafe external store URL rejects. Exact replay does not advance the state version; a changed replay conflicts; snapshot/model mismatch and stale state reject. The HTTP checkpoint write remains disabled before transaction entry.
- **Intentionally deferred validation and owners:** Complete nested DirectV1/MapV1/ReduceV1 and published-analysis semantic/evidence/privacy validation, independently derived Map membership from a separately authorized per-run evidence key, and actual checkpoint-write/CAS integration — CMS lifecycle owner after explicit key-provider authorization. Exact CountTokens minimum-chunk selection and provider/model semantic proof — U10-A5 worker/design owner. Private Cloud Run/OIDC runtime, real credential/grant, and end-to-end worker checkpoint flow — separately authorized U10-A/U10-B worker/platform owner. No key, GCP, schema/auth/grant/dependency/environment/IAM/deployment change or runtime harness was performed.
- **Residual risk:** This pure verifier is not a persistence authorization and must not be connected to `writeWorkerCheckpoint` until all semantic/evidence gates and authenticated cross-runtime vectors are complete. The candidate proves only the enumerated deterministic structural and digest subset.
- **Rollback boundary:** Revert the new graph-verifier code in `checkpoint-contract.js`, its lifecycle regression/import/no-transaction assertion, the matching Appendix 04/task notes, and this ledger entry. Preserve pre-existing canonicalization/membership helpers and the `UNKNOWN_VERSION` HTTP/lifecycle behavior.
- **Status:** `partial`; local pure verifier subset and listed serial checks passed. The checkpoint route remains non-writing; full U10-A5 proof, integrated runtime, PR/merge, and formal SDD reconstruction are pending. No remote operation, commit, push, PR mutation, SDD phase, or user question occurred.

### `U10-A5 correction: Strip incomplete checkpoint graphs from verifier results`

- **Correction trigger:** Independent review found that `verifyCheckpointGraphV1` returned top-level `status: "incomplete"` while embedding the unvalidated Direct/Validate candidate and prior graph entries with persisted `status: "valid"`. Those persisted values are contract data, not semantic proof, and must not be returned as apparent authority.
- **Correction:** Every incomplete result now contains only `status`, an explicit `reason`, `structurallyVerifiedStageKeys`, and `pendingStageKeys`. It omits checkpoint sets, entries, candidate payloads, replay/state-version fields, and proposed next-state versions, for both new semantic candidates and identical replay of preexisting semantic history. Safe structural stage-name summaries contain no checkpoint status or payload.
- **RED evidence:** `node --test --test-name-pattern='checkpoint graph verifier binds safe stage digests' test/feedback/generation-lifecycle/lifecycle.test.js` — exit 1 before the correction; the first new assertion observed missing `SEMANTIC_VALIDATION_REQUIRED`. The regression also asserts the exact sanitized result shape and exercises both new Direct output and replayed Direct history; the previous reviewer independently observed the nested `status: "valid"` leak.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/services/checkpoint-contract.js`; `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js`; TB-113 `design/04-ai-worker-infrastructure.md`; `tasks.md`; this ledger entry. Existing CMS fail-closed route/lifecycle behavior is unchanged.
- **Final verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed, exit 0, 17 tests; `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed, exit 0, 1 authenticated isolated Strapi/PostgreSQL test; `npm --prefix teleferico-cms test -- feedback/permissions` — passed, exit 0, 4 tests; `git diff --check` — passed, exit 0. PostgreSQL-backed commands were run serially.
- **Candidate count correction:** The prior entry recorded 490 authored additions plus deletions; the independent review reported 488 for its reviewed snapshot. At this correction snapshot, exact-parent `git diff --numstat HEAD` against `6dd7b99a5fd99ddbf1eedc4593ba505c860eeb41` was `18 4` Appendix 04, `30 0` ledger, `3 1` tasks, `188 0` CMS contract, `294 2` lifecycle tests — 540 additions plus deletions across five tracked paths. The test-only follow-up below supersedes this historical count.
- **Deferred validation and owners:** Complete nested DirectV1/MapV1/ReduceV1 and published-analysis semantic/evidence/privacy validation, independently derived Map membership from separately authorized per-run evidence key, and actual checkpoint-write/CAS integration remain with the CMS lifecycle owner after explicit key-provider authorization. Exact CountTokens minimum-chunk selection and provider/model semantic proof remain with the U10-A5 worker/design owner. Private Cloud Run/OIDC runtime, real credential/grant, and end-to-end worker checkpoint flow remain with the separately authorized U10-A/U10-B worker/platform owner. Preserve these prior deferrals; no key, GCP, schema/auth/grant/dependency/environment/IAM/deployment or runtime-harness change is included.
- **Rollback boundary:** Revert only the incomplete-result sanitization, its new-candidate/replay regression assertions, this correction's Appendix 04/task notes, and this ledger entry. Preserve the underlying pure digest/graph checks and `UNKNOWN_VERSION` before transaction entry.
- **Status:** `partial`; the incomplete-result authority leak is corrected and locally verified, but semantic validation, authenticated persistence/CAS, runtime key authority, and checkpoint activation remain pending. Prior RED/GREEN evidence and failures above are retained without revision.

### `U10-A5 test-only follow-up: Validate-history replay sanitization`

- **Scope:** Added only a lifecycle regression fixture with persisted Redact, Count, Direct, and Validate history, then replayed the existing Validate checkpoint. It asserts the exact four-field incomplete result shape, safe stage-key summaries, and absence of nested valid status, checkpoints, entries, replay/state-version fields, and Direct/Validate payload markers. No production behavior or HTTP route changed.
- **Evidence classification:** GREEN characterization only. No RED was requested or claimed. `node --test --test-name-pattern='sanitizes replay of persisted Validate history' test/feedback/generation-lifecycle/lifecycle.test.js` — passed; exit 0; 1 focused test.
- **Required final verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 18 tests. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated isolated Strapi/PostgreSQL test. `npm --prefix teleferico-cms test -- feedback/permissions` — passed; exit 0; 4 tests. `git diff --check` — passed; exit 0. PostgreSQL-backed commands ran serially.
- **Candidate count:** Prior complete-candidate count 540 predates this test-only follow-up. Final exact-parent `git diff --numstat HEAD` against `6dd7b99a5fd99ddbf1eedc4593ba505c860eeb41`: `18 4` Appendix 04, `40 0` ledger, `3 1` tasks, `188 0` CMS contract, `375 2` lifecycle tests — 631 additions plus deletions across five tracked paths. This is the final candidate count; the prior 490 and reviewer-reported 488 refer to earlier snapshots.
- **Deferred validation and owners:** Preserve the previously recorded CMS lifecycle owner for semantic/evidence/privacy validators, per-run key authority, and CAS/write activation; U10-A5 worker/design owner for CountTokens and provider/model semantics; separately authorized U10-A/U10-B worker/platform owner for private runtime, credentials/grant, and end-to-end worker flow. No deferred owner or scope changed.
- **Rollback boundary:** Revert only this Validate-history replay test and this test-only ledger entry, plus the matching current candidate count in `tasks.md`; preserve the result sanitization and all prior graph-verifier tests/production code.
- **Status:** `partial`; focused characterization and required final suites passed, and the exact final candidate count is recorded above. Semantic validation and checkpoint activation remain pending. No production code, route, secret, remote, commit, PR, or SDD change was made.

### `U10-A6: Pure worker generation-input materialization`

- **Identity and scope:** Added an injectable pure materializer for exact cutoff-bound `SnapshotV1` payload/digest, closed initial `survey-checkpoints.v1`, exact versioned model configuration, and nonempty pricing snapshot. No CMS reader, runtime key, admin-command integration, public generation behavior, dispatcher, checkpoint write, or production provider path was added.
- **Requirements/design:** `specs/authoritative-survey-metrics/spec.md` complete immutable snapshot; `specs/report-generation-lifecycle/spec.md` immutable cutoff/retry; `specs/survey-worker-operations/spec.md` model and immutable pricing inputs; `design/03-metrics-snapshot-contracts.md` canonical snapshot digest; `design/04-ai-worker-infrastructure.md` ModelConfigV1, PricingSnapshotV1, checkpoint initial state, and materialization boundary; pending task 4.1/U10-A.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/generation-inputs.ts` — injected materialization and persisted-input revalidation; `services/survey-report-worker/src/checkpoint-contract.ts` — reuse closed model/pricing validation and reject empty pricing; `src/lib/feedback/generation-lifecycle.test.ts` — exact membership/digest, cutoff/retry immutability, missing/mismatched/placeholder rejection; `design/04-ai-worker-infrastructure.md`, `tasks.md`, and this ledger — boundary, deferrals, evidence.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/generation-lifecycle.test.ts` — exit 1 before implementation; 8 tests failed because `materializeGenerationInputs` and its validator were absent. A follow-up test-fixture correction removed three invalid missing-input cases that initially failed to omit their values; the final RED/GREEN evidence is the missing API run and the subsequent complete passing run.
- **Focused app verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/admin-command.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 3 files, 51 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0, no diagnostics.
- **CMS fail-closed verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 18 tests, including PostgreSQL lifecycle transaction/rollback checks and the existing `UNKNOWN_VERSION` checkpoint-write guard. This does not prove an app-to-CMS materialization adapter.
- **Materialization evidence:** The synthetic fixture proves the snapshot contains only comments at/before the injected cutoff and that its payload, digest, generation source revision, model source revision, evidence key ID, and checkpoint digest agree. `ModelConfigV1` and `PricingSnapshotV1` are explicit inputs; model/pricing defaults are not synthesized; the key ID is nonsecret and no verifier key is accepted or persisted. The initial checkpoint object is the closed versioned envelope with `entries: []`, not an empty object.
- **Candidate size:** Candidate-specific `size:exception` ceiling: 4,000 authored additions plus deletions for branch `feat/app-root-tb-113-worker-input-materialization` against exact parent PR #360 head `302a7d5e7287e07b97b14f4c73a7a2a30ef0f7f6`. Final count: `561` additions plus deletions, including the untracked 156-line materializer; under the approved cap. The normal 400-line reviewer budget and 800-line hard default for later candidates are unchanged.
- **Intentionally deferred validation and owner:** CMS-derived accepted submissions/definitions/points retrieval; replacing `buildGenerationData` placeholders; app generate/retry integration with fresh-cutoff materialization; private worker/CMS runtime; model/pricing operational source approval; and provider, storage, key, grant, or deployment readiness — `not run`, owned by the next separately bounded U10-A adapter/integration owner and the U10-A/U10-B worker/platform reviewers. The current public admin path was deliberately left unchanged and is not claimed worker-ready. CMS checkpoint writes remain `UNKNOWN_VERSION`; deployment feature flag remains `false`.
- **Runtime harness:** `N/A` for the new pure materializer; it has no runtime/network boundary. The CMS lifecycle command above is an existing isolated fail-closed regression, not an integrated materializer harness.
- **Residual risks:** Existing admin generation still initializes placeholder snapshot/model/pricing fields and has no data adapter. Do not connect this materializer to runtime or claim generation readiness until authoritative injected CMS inputs and explicit approved model/pricing inputs are supplied and generate/retry integration is tested.
- **Rollback boundary:** Revert only `generation-inputs.ts`, the `validateGenerationInputContractsV1` addition in `checkpoint-contract.ts`, the `SnapshotInput` export, this candidate's lifecycle tests, the matching Appendix 04/task notes, and this ledger entry. Preserve the existing admin-command path, feature flag, and CMS `UNKNOWN_VERSION` behavior.
- **Status:** `partial`; the pure local input-materialization contract and focused app/CMS checks passed. CMS sourcing, public admin wiring, accepted checkpoint writes, private runtime, PR/merge, and formal SDD reconstruction remain pending. No credential, schema/auth/grant/dependency/env var/IAM/GCP/deployment, remote operation, commit, or PR action was performed.

### `U10-A6 evidence correction: Prove cutoff exclusion independently`

- **Correction trigger:** Review found the original “after cutoff” row used `2026-08-21T00:00:01Z` while the one-day range was `2026-08-01`, so the record was already outside the reporting period. The test's expected payload also called `createSnapshot` itself, making that result a non-independent oracle. The earlier U10-A6 cutoff-specific acceptance claim is superseded by this correction.
- **Scoped fix:** Test fixture/evidence only; no worker materializer or core production change. The current period remains `2026-08-01`; the frozen cutoff is `2026-08-01T12:00:00.000Z`. It includes one current-period comment exactly at cutoff and one previous-period comment at `2026-08-01T02:00:00.000Z` (local July 31), plus an after-cutoff record at `2026-08-01T12:00:01.000Z` that remains inside the current range.
- **Independent assertions:** Assert exactly one current and one previous submission/comment, `excludedAfterCutoffCount: 1`, exact ordered comment record IDs and timestamps, and absence of the in-range late record. Snapshot canonical JSON is compared to fixed known canonical bytes in the test; the expected digest is computed from those bytes using Node SHA-256. The test no longer calls `createSnapshot` to produce its expected result.
- **Observed classification:** GREEN characterization only; no RED is claimed because the underlying core cutoff behavior passed once the fixture supplied the intended exact cutoff. One intermediate test run correctly exposed that a first fixture edit had changed a shared helper rather than the local fixture, leaving its cutoff at August 21; the local fixture was corrected before final evidence. No production defect was observed.
- **Changed paths:** `teleferico-app/src/lib/feedback/generation-lifecycle.test.ts`; this ledger entry; and a focused U10-A6 candidate-size record in `tasks.md`. Production materialization/helper code remains unchanged.
- **Initial foreground verification:** The required combined app Vitest command exited 1 with 1 failing test: retry immutability still expected the old helper cutoff `2026-08-21T00:00:00.000Z` after that helper had been aligned to `2026-08-01T12:00:00.000Z`. Typecheck passed; CMS lifecycle passed 18 tests; `git diff --check` passed. This was a stale test expectation, not a production failure. After correcting it, `pnpm --dir teleferico-app exec vitest run src/lib/feedback/generation-lifecycle.test.ts` passed (1 file, 16 tests).
- **Final foreground verification after correction:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/admin-command.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; exit 0; 3 files, 52 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; exit 0; 18 tests, including isolated PostgreSQL lifecycle checks. `git diff --check` — passed; exit 0. The initial stale-expectation failure above was resolved by updating only the test fixture expectation and is retained as prior observed evidence.
- **Deferred checks and owner:** CMS source adapter and integrated generate/retry materialization remain not run and belong to the separately bounded U10-A adapter/integration owner. CMS checkpoint writes remain `UNKNOWN_VERSION`; feature deployment flag remains `false`. No key, credential, admin behavior, dispatch, schema/auth/grant/dependency/env/IAM/GCP/deployment or remote operation changed.
- **Rollback boundary:** Revert only the corrected lifecycle test fixture/golden canonical-byte assertions and this correction entry plus its matching tasks.md evidence line. Preserve the U10-A6 materializer and all prior fail-closed/runtime boundaries.
- **Candidate size:** Exact additions-plus-deletions against parent #360 head `302a7d5e7287e07b97b14f4c73a7a2a30ef0f7f6`: `616` (including the untracked 156-line materializer); the previous 561-line measurement predates this test/evidence correction and is superseded. It remains within the candidate-scoped 4,000-line approval. No change to later-candidate budgets.

### `U10-A7: Strict authoritative generation source adapter`

- **Identity and scope:** Added a server-only, transport-agnostic injected page reader that strictly maps complete CMS submission/version/QR-point rows into the existing immutable generation-input materializer. It does not modify `admin-reader`, generation lifecycle, CMS routes, generation dispatch, or the public/admin runtime path.
- **Requirements and design:** `specs/authoritative-survey-metrics/spec.md` complete cutoff-bound current/previous snapshots; `design/03-metrics-snapshot-contracts.md` period/population/digest rules; `design/04-ai-worker-infrastructure.md` initial input materialization and explicit model/pricing/key-ID gates; `tasks.md` U10-A7 candidate authorization and pending gates.
- **Changed paths:**
  - `teleferico-app/services/survey-report-worker/src/authoritative-generation-source.ts` — validates cursor-chain totals/completion for every page, exact private-field presence, QR-valid source, unique row/receipt/version/point identities, required relations/aspects, and consistent previous/current window/cutoff before invoking the materializer.
  - `teleferico-app/src/lib/feedback/authoritative-generation-source.test.ts` — proves multiple-page current/previous/late-in-range membership and fail-closed truncation, cursor loops, malformed rows, missing private fields/relations, duplicate identity, ambiguous definitions, and absent generation config.
  - `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md` — documents the strict local adapter and the still-unproved authenticated private CMS projection/config source.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — records the exact candidate-specific approval and keeps U10/task completion pending.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this evidence and remaining gates.
- **Candidate authorization:** The user approved up to `4,000` authored additions plus deletions only for `feat/app-root-tb-113-authoritative-snapshot-adapter` against exact open draft parent #361 head `468cca5a86316e01f8ae6029574017d1cbbbedb2`, in the existing `stacked-to-main` chain (#361 → #360 → #358 → #357 → #356). The 400-line reviewer budget and 800-line default remain unchanged for later candidates; no code-golf or coverage/documentation omission was used.
- **Final candidate size:** `682` authored additions plus deletions against exact parent `468cca5a86316e01f8ae6029574017d1cbbbedb2`, including both new untracked source/test files and the design/task/ledger documentation. This is within the candidate-specific 4,000-line ceiling; the 400-line reviewer budget and 800-line default for later candidates are unchanged.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/authoritative-generation-source.test.ts` — exit 1 before implementation because the adapter module could not be resolved; zero tests were collected. After the initial adapter appeared, the late-record fixture first showed `currentSubmissionCount` 2 instead of 1 because its cutoff was after the late row; the fixture cutoff was corrected to precede that row and the core then proved it excluded.
- **Focused verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-reader.test.ts src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; 3 files, 42 tests.
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/authoritative-generation-source.test.ts` — passed; 1 file, 10 tests.
  - `pnpm --dir teleferico-app run typecheck` — passed; no TypeScript diagnostics.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; 18 tests, including isolated PostgreSQL lifecycle coverage.
  - `git diff --check` — passed; exit 0 with no output.
- **Implementation status:** `passed` for the injected local adapter and listed synthetic/focused evidence only. No existing admin generation or dispatch path consumes it; this is not formal task completion, integrated runtime readiness, or authenticated HTTP proof.
- **Residual risks and pending gates:** No authenticated Strapi HTTP call demonstrated that private `comment` and `payloadDigest` are present in the required row projection; response shape, caller authorization, and full-source behavior remain unproved. No approved model configuration, pricing snapshot, or evidence key-ID source was selected or wired; the adapter requires explicit input and supplies no defaults. No CMS permission/token/schema change, runtime integration, or remote operation was made. Feedback generation remains disabled, CMS checkpoint writes remain `UNKNOWN_VERSION`, task 4.1 remains unchecked, and formal SDD reconstruction remains pending.
- **Deferred validation:** Authenticated private CMS HTTP projection and generation create/retry integration — `not run`; intended checkpoint is a separately authorized source/auth integration and private authenticated harness; owner is the TB-113 U10-A implementer/platform reviewer. Cloud Tasks, OIDC worker execution, key provisioning, provider, deployment, staging/production, and operational proof remain outside this unit.
- **Rollback boundary:** Revert only the new adapter, its focused test, and the matching U10-A7 design/task/ledger text. Preserve the prior immutable materializer, CMS `UNKNOWN_VERSION` checkpoint guard, existing admin reader behavior, and all preceding chain work.
- **Formal SDD reconstruction:** `pending`; this direct ledger entry is not native verification or task completion evidence.

### `U10-A7 correction: Bind submission relations to canonical source identities`

- **Correction trigger:** Independent verification found that a submission's `qrPoint` and `surveyVersion` relations were checked only by key membership. A row could therefore name a known key while carrying a different or missing relation ID, bypassing the canonical source-row identity binding.
- **Correction:** The adapter now indexes canonical point/version row IDs by key, preserves IDs when unwrapping CMS relations, and requires each submission relation ID to equal the ID of that key's collected source row. Missing IDs, mismatched IDs, duplicate source keys/IDs, and unknown keys fail closed before snapshot materialization. No digest fallback or private-content logging was added.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/authoritative-generation-source.test.ts` — exit 1 before the fix; 4 of 17 tests failed because the adapter accepted both known-key/wrong-ID relations and missing relation IDs. The failing cases independently covered QR-point and survey-version bindings.
- **Test correction:** Replaced the misleading combined missing-config test with separate missing `modelConfig`, `pricingSnapshot`, and `evidenceKeyId` cases. Added an invalid QR-provenance case. The final focused suite runs these assertions; no additional cases are claimed as run.
- **Five changed paths (complete inventory):**
  - `teleferico-app/services/survey-report-worker/src/authoritative-generation-source.ts` — canonical source-row identity binding.
  - `teleferico-app/src/lib/feedback/authoritative-generation-source.test.ts` — RED relation-ID cases, independent missing-input cases, and invalid QR source case.
  - `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md` — documents canonical relation-ID binding.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — records this scoped correction and candidate inventory.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records correction evidence and rollback.
  There are exactly five candidate paths: the two app files and these three documents; no sixth path was changed.
- **Verification after final normalization:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/authoritative-generation-source.test.ts src/lib/feedback/admin-reader.test.ts src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/worker-pdf.test.ts` — passed; 4 files, 59 tests. `pnpm --dir teleferico-app run typecheck` — passed; no diagnostics. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; 18 tests, including isolated PostgreSQL lifecycle coverage. `git diff --check` — passed; exit 0 with no output.
- **Candidate size:** Final corrected size is `754` authored additions plus deletions against exact parent `468cca5a86316e01f8ae6029574017d1cbbbedb2`; the prior `682` measurement is historical and superseded. This remains within the same candidate-specific 4,000-line authorization. The branch/parent and 400/800 future defaults are unchanged.
- **Still deferred:** Authenticated CMS HTTP proof of private `comment`/`payloadDigest` exposure and caller authorization; approved model/pricing/evidence-key-ID sources; generation create/retry integration; CMS schema/auth/grants; runtime/provider/operational validation. Generation remains disabled and CMS checkpoint writes remain `UNKNOWN_VERSION`.
- **Rollback boundary:** Revert the adapter/test relation-ID correction and the matching design/task/ledger text only. Preserve all five candidate paths as the corrected unit; no CMS permission/schema/runtime wiring, credentials, remote operations, commits, PRs, or SDD phases were changed or performed.

### `U10-A8: Authenticated private report-source pages`

- **Identity and scope:** Added one fail-closed authenticated CMS source-page action for the existing authoritative generation adapter. It reads only accepted `valid_qr` submissions in the requested previous/current window plus all source versions and QR points, with complete deterministic cursor pagination. It does not connect the adapter to admin generation/retry/dispatch or activate CMS checkpoints.
- **Branch and parent:** `feat/cms-root-tb-113-private-report-source-read`, starting at exact open draft parent #362 head `094edfb07e6ee5298f51d2c66df69f1b77ac64e1`; chain #362 → #361 → #360 → #358 → #357 → #356. No remote state was inspected.
- **Authorization and scope:** Added only `api::survey-report-generation.survey-report-generation.workerSourceRead`, with that exact route scope and no default grant. The disposable HTTP test creates a synthetic role with exactly this action; anonymous and ordinary ungranted application-user JWT requests return 403. Native `survey-submission.find` remains denied to both. The exact authorized route returns original nullable `comment`, `payloadDigest`, ratings, and canonical relation IDs/keys through explicit raw SQL; unrelated private hashes are not selected. No persistent role/token grant, schema/generated-type/dependency/environment change, or credential setup was made.
- **Paging and cutoff:** Closed `survey-generation-source.v1` request; canonical UTC inclusive accepted-time bounds, cutoff, resource, opaque scope-bound cursor, and page size 1..25; measured request cap 4 KiB. Submission keyset order uses unique receipt, and version/point keysets use document ID. Totals are repeated for complete-chain validation. Rows after the frozen cutoff remain in-range source input so the shared core can compute `excludedAfterCutoffCount`; the cutoff is bound into cursors, not substituted or used to trim rows. Invalid scopes/cursors and source errors return bounded 400/503/500 envelopes; no partial result is returned.
- **RED evidence:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — exit 1 before the endpoint existed; Strapi returned 405 for the missing POST route instead of the required anonymous 401/403 denial. During implementation, an accepted-time keyset attempt also failed its second-page assertion despite a second in-range database row; keyset pagination was corrected to use unique receipt order, which the core adapter subsequently orders independently.
- **Final focused verification:** `npm --prefix teleferico-cms test -- feedback/permissions` — passed, exit 0; 4 tests, including registered route/no-default-grant inspection. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed, exit 0; 1 isolated authenticated CMS/PostgreSQL HTTP test. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed, exit 0; 18 tests including PostgreSQL transaction/concurrency. `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed, exit 0; 1 isolated Strapi/PostgreSQL HTTP test proves anonymous/ungranted denial, one-action synthetic worker authorization, exact private projection, nullable comment presence, current/previous-window page completion including a row after cutoff, version/point pages, cursor/date/page-size/body validation, safe source/internal error mapping, and container/volume cleanup. `git diff --check 094edfb07e6ee5298f51d2c66df69f1b77ac64e1` — passed before this ledger append; final post-append result is recorded below.
- **Deferred validation and owner:** Real worker principal/credential and non-default grant setup, app transport wiring, generation create/retry integration, private worker runtime, provider/model/pricing/evidence-key approvals, Cloud Tasks/OIDC, and staging/production — `not run`; owner is the separately authorized TB-113 worker/platform owner. Feature generation remains disabled and checkpoint writes remain `UNKNOWN_VERSION`.
- **Rollback boundary:** Revert only the source controller/service/route, focused HTTP selector/test, route-permission assertions, `STRAPI_PERMISSIONS.md`, TB-113 design/task notes, and this entry. Preserve U10-A1–A7, existing `workerSnapshot`, native submission permissions, schema, and all unrelated work.
- **Publication:** No commit, push, PR, SDD phase, GCP/IAM, or deployment operation was performed; parent #362 owns publication.
- **Final candidate size:** `743` authored additions plus deletions across 13 candidate paths against exact parent #362 head `094edfb07e6ee5298f51d2c66df69f1b77ac64e1`: tracked delta `144` additions + `11` deletions plus `588` lines across the two new source/test files. This is within the explicitly approved branch-specific 4,000-line ceiling and the ordinary 800-line hard default, but above the 400-line reviewer budget; no code-golf or coverage/documentation reduction was used. Later-candidate budgets remain unchanged.
- **Final check:** `git diff --check 094edfb07e6ee5298f51d2c66df69f1b77ac64e1` — passed; exit 0 after the ledger append.
- **Status:** `passed` for the bounded local CMS action and listed isolated verification only; no operational credential/grant or integrated runtime proof is claimed.

### `U10-A8 security correction: Require a custom content API token

- **Correction trigger:** Independent security verification showed that a Users & Permissions role action is not a machine identity: an ordinary application-user JWT granted `workerSourceRead` could read original private comments. The prior U10-A8 role-based authorization claim is superseded and must not be used as security proof.
- **RED evidence:** Before the correction, `npm --prefix teleferico-cms test -- feedback/private-report-source` exited 1 because the ordinary app-user JWT, after receiving the synthetic `workerSourceRead` action in the disposable database, returned 200 instead of the required denial.
- **Verified Strapi boundary:** Installed Strapi 5.45.1 source confirms the content API supports the native `content-api-token` strategy, rejects absent/invalid token identities, builds ability from custom token permission actions, checks the route scope, and stores the selected strategy/credentials in `ctx.state.auth`. The endpoint now restricts route auth to `strategies: ['content-api-token']` plus the exact `workerSourceRead` scope. The handler independently requires runtime strategy name `content-api-token`, token kind `content-api`, and token type `custom` before body measurement/contract validation or service invocation. It uses verified Strapi auth context, not caller fields or a role name.
- **GREEN HTTP proof:** The isolated Strapi/PostgreSQL test now proves anonymous denial; denial of an ordinary app-user JWT even with the exact Users & Permissions action granted; that same JWT with an oversized/unknown body is rejected before source/body-contract validation and issues no `survey_submissions` source query; denial of a custom content API token without the action; allow only for a synthetic custom content API token with exactly the single source-read action; and denial of native `survey-submission.find` for both the granted JWT and custom token. The successful custom-token response retains exact original comment (including explicit null), payloadDigest, ratings, and canonical point/version relations. No token or private comment is logged.
- **Final focused checks:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; 1 isolated HTTP/PostgreSQL test. `npm --prefix teleferico-cms test -- feedback/permissions` — passed; 4 tests, including exact token-strategy/scope route configuration and no default permission grant. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; 1 isolated authenticated HTTP test. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; 18 tests including PostgreSQL. `git diff --check` is required after this entry.
- **Credential and grant boundary:** Both synthetic custom tokens and the temporary U&P test permission are confined to the test-owned disposable PostgreSQL database, removed with its container/volume. No production token/role grant or credential value/file is provisioned or changed. Real machine-token issuance, secure value delivery/rotation, and its one-action grant remain separately authorized operational work owned by the TB-113 worker/platform owner.
- **Rollback boundary:** Revert the exact route strategy restriction and controller identity check, source HTTP test changes, permission route assertion, and this correction entry together; retain the private source projection, closed request/pagination contract, docs, and no-default-grant baseline only if a separately verified machine-auth boundary replaces this one.
- **Final candidate size:** `811` authored additions plus deletions across the same 13 candidate paths against exact parent #362 head `094edfb07e6ee5298f51d2c66df69f1b77ac64e1`: tracked delta `199` additions + `11` deletions plus `601` lines across the two new source/test files. This exceeds the ordinary 800-line hard default and is within the exact candidate-specific 4,000-line approval; the 400-line reviewer budget and later-candidate defaults do not change. No code-golf or test/documentation reduction was used.
- **Final diff check:** `git diff --check 094edfb07e6ee5298f51d2c66df69f1b77ac64e1` — passed; exit 0 with no output after the correction entry.

### `U10-A9 security correction: Require exact public-origin allowlisting`

- **Correction trigger:** Independent verification found the transport accepted any HTTPS `baseUrl`; `redirect: "error"` prevents redirects but does not constrain the initial destination, so a misconfigured caller could send the custom content-API token to an attacker-controlled or private host.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/private-report-source-transport.test.ts` — exit 1; 14 of 36 tests failed. The constructor accepted absent allowlists and unsafe HTTPS origins even when those origins were explicitly included in the test allowlist. No real hostname or credential was used.
- **Correction:** `createPrivateReportSourceTransport` now requires a nonempty explicit `allowedOrigins` list. Each entry and `baseUrl` must be a canonical public HTTPS DNS origin; the target is checked for exact allowlist membership at construction before a token provider can run. It rejects all IP literals, local/private/reserved/metadata/deceptive host forms, userinfo, noncanonical authority, path/query/fragment, and unsafe allowlist entries even when explicitly listed. Existing `redirect: "error"` remains, and redirected or cross-origin fetch responses fail closed. No default allowlist, runtime composition, actual CMS hostname, environment lookup, credential, or remote operation was added.
- **GREEN focused verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/private-report-source-transport.test.ts` — passed; 1 file, 48 tests, included in the final combined 4-file/96-test run. Coverage proves missing/empty/mismatched allowlists and unsafe targets reject before token-provider invocation, exact canonical public-origin allow succeeds through the existing multi-resource pagination/error cases, and redirects are rejected.
- **Final required verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/private-report-source-transport.test.ts src/lib/feedback/authoritative-generation-source.test.ts src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/admin-command.test.ts` — passed; exit 0; 4 files, 96 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0. `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; exit 0; 1 isolated synthetic Strapi/PostgreSQL HTTP test. `git diff --check` — passed; exit 0 with no output.
- **Deferred origin/trust boundary:** No production CMS hostname or allowlist source has been selected; a trusted server-only runtime composition does not exist. Integrated app↔Strapi proof remains `not run` and must use a separately approved canonical HTTPS test origin/allowlist plus only a synthetic custom token carrying `workerSourceRead`, more than 25 synthetic submissions, complete three-resource pagination/materialization, and disposable-resource cleanup. Owner: TB-113 app/CMS implementer and reviewer. Real Secret Manager resource, runtime binding, IAM grant, and named individual owner remain separately approved/unassigned.
- **Changed paths:** Only the existing five U10-A9 candidate paths are in scope: app transport and test, TB-113 `design/02-http-contracts.md`, `tasks.md`, and this ledger.
- **Candidate size:** `913` authored additions plus deletions against exact parent #363 head `bd3091ed2cc5b92cb5885d509f97ddf56713ca0a`; method: tracked changes `56 + 38 + 2` lines from `git diff --numstat HEAD`, plus `345 + 472` lines from `git diff --no-index --numstat /dev/null` for the two new app files. Exactly five paths are changed: the transport source/test plus TB-113 `design/02-http-contracts.md`, `tasks.md`, and this ledger. The correction remains within the same candidate-only 4,000-line ceiling.
- **Rollback boundary:** Revert only the explicit allowlist/origin validation and redirected-response checks, their focused SSRF tests, the U10-A9 transport-contract paragraph in `design/02-http-contracts.md`, the current U10-A9 size line in `tasks.md`, and this appended correction entry. Preserve the private source endpoint contract, CMS implementation, and prior transport bounds.
- **Status:** `passed` for standalone origin validation/fake-fetch coverage only; allowlist provisioning/composition and integrated app↔Strapi proof remain `not run`.

### `U10-A10: Same-process private-source app↔CMS integration`

- **Identity and scope:** Extended the existing isolated CMS private-source HTTP test to execute the app's real transport, authoritative page adapter, and immutable materializer against the same live synthetic Strapi instance. No production app/CMS behavior, route, schema, auth policy, grant, environment, dependency, lockfile, remote resource, or deployment changed.
- **Candidate identity and authorization:** Branch `test/app-cms-root-tb-113-private-source-integration`; exact open draft parent PR #364 head `b7b1321e5f52b21d5cdc82d127dcac4b576fdfbb`, chain rooted at #356. The user authorized a candidate-specific `size:exception` ceiling of 4,000 authored additions plus deletions for this cohesive test-and-evidence unit only. The ordinary 400-line reviewer budget and 800-line hard default remain unchanged for later candidates.
- **Changed paths and reasons:**
  - `teleferico-cms/test/feedback/private-report-source.test.js` — seeds 27 synthetic QR submissions, loads the exact app modules in memory through a restricted TypeScript bridge, and exercises app transport→Strapi HTTP→authoritative materialization.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — records bridge restrictions, host mapping, pagination/cutoff results, cleanup, and remaining operational gates.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — records the candidate-only size exception and scope.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records observed test, cleanup, candidate-size, and rollback evidence.
- **RED evidence:** `npm --prefix teleferico-cms test -- feedback/private-report-source` initially failed when the existing two-row fixture was expanded but retained its old terminal-cursor expectation; after that fixture assertion was corrected, the new app integration call failed because its in-memory loader did not yet exist. Subsequent loader bring-up exposed the required explicit `node:crypto` builtin and confirmed that null comments and the post-cutoff row are excluded from snapshot comments. These were test/harness setup failures, not fabricated production defects; each was corrected before the final passing run.
- **Security and runtime boundary:** The harness requires the CMS-installed transitive TypeScript version `5.4.5` and `transpileModule`; missing/unsupported TypeScript fails closed. It loads only recursively imported relative `.ts` modules under the app worker and reporting-core source roots, allows only the explicit `node:net` and `node:crypto` builtins, and supplies only an empty test stub for `server-only`. It uses no global require hook, child process, environment variable, temporary source file, package install, or direct dependency declaration. The synthetic token stays in the CMS test's in-memory closure. Injected fetch accepts only the exact logical HTTPS endpoint and maps it to loopback Strapi without resolving `cms.example.com`; redirects are errors, the local response is origin-checked, and a test `Response` wrapper restores the logical URL for the production transport's origin check. Nonmatching URLs are rejected before Authorization forwarding.
- **Synthetic data and proof:** Seeded 27 unique `valid_qr` receipts: 13 in the previous period, 13 in the current period before the fixed cutoff, and one in-range current-period record after the cutoff. The app transport read submissions in pages `25+2` with total `27` echoed on both pages and a valid cursor chain, plus one version page and one point page. Source projection assertions cover nullable `comment` and lowercase SHA-256 `payloadDigest`. Materialization produced 13 previous submissions, 13 current submissions, and `excludedAfterCutoffCount: 1`; 25 comment records reflect the null-comment row and post-cutoff exclusion. An interrupted second submissions page rejects the complete builder call instead of returning partial materialization.
- **Authentication and cleanup:** Existing assertions in this same CMS harness still prove anonymous and ordinary JWT denial, ungranted custom-token denial, exact custom-token action scope, and native collection-read denial. The app transport authenticated only with the harness-created custom token carrying `workerSourceRead`. The test's `finally` destroyed Strapi and removed only Compose project `tb113_test_private_report_source`; post-run owned-container and volume absence assertions passed.
- **Focused CMS verification:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; exit 0; 1 isolated Strapi/PostgreSQL HTTP test, including the same-process app transport and materializer integration; owned-resource absence assertions passed.
- **Focused app verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/private-report-source-transport.test.ts src/lib/feedback/authoritative-generation-source.test.ts` — passed; exit 0; 2 files and 65 tests passed.
- **App typecheck:** `pnpm --dir teleferico-app run typecheck` — passed; exit 0; no TypeScript diagnostics.
- **Diff integrity:** `git diff --check` against the exact parent — passed; exit 0 with no whitespace errors.
- **Operational gaps:** No real custom token, production CMS hostname/allowlist composition, runtime binding, IAM grant, provider, generation/retry/dispatch integration, checkpoint activation, staging/production, GCP, or deployment was used or proven. Existing generation remains disabled and CMS checkpoint writes remain `UNKNOWN_VERSION`.
- **Authored size:** `354` additions plus deletions across the four intended paths against exact parent `b7b1321e5f52b21d5cdc82d127dcac4b576fdfbb` (tracked `git diff --numstat`; 337 additions and 17 deletions). This is below the candidate-only 4,000-line ceiling; ordinary later-candidate budgets remain unchanged.
- **Rollback boundary:** Revert only this CMS integration-harness change and the corresponding U10-A10 paragraphs in `design/02-http-contracts.md`, `tasks.md`, and this ledger entry. Preserve the U10-A8 CMS source endpoint/auth boundary, U10-A9 app transport, existing default-deny tests, and all unrelated work.
- **Status:** `passed` for the local integration harness, focused app tests, typecheck, cleanup, and diff integrity only; this does not complete formal U10-A, enable generation/checkpoint writes, or provide production credential evidence.

### `U10-A11: Admin generation input composition`

- **Identity and scope:** Compose the existing strict private CMS source-page port, authoritative source adapter, and pure materializer into app server-side generation and failed retry. No browser contract, CMS implementation/schema/auth/grant, dispatcher implementation, production runtime config, environment variable, credential, provider, GCP/IAM, deployment, remote, commit, PR, or SDD change is included.
- **Branch and parent:** `feat/app-root-tb-113-generation-input-composition` at the exact local parent `e3f1f16cda26da477b105c5454664082d1bbb9eb`, open draft parent PR #365, chain rooted at #356. Parent publication remains owned by the parent workflow.
- **Candidate authorization:** Candidate-scoped `size:exception` up to 4,000 authored additions plus deletions, authorized by the user for this exact branch and parent. The ordinary 400-line reviewer budget and 800-line hard default remain unchanged for later candidates. No code-golf or test/documentation omission is authorized.
- **Changed paths and reasons:**
  - `teleferico-app/src/lib/feedback/admin-command.ts` — require an injected private-page reader and approved versioned configuration, materialize complete inputs after overlap/failed-state preflight, freeze cutoff before sourcing, reject absent/invalid config before create/dispatch, and take fresh retry inputs.
  - `teleferico-app/src/lib/feedback/generation-lifecycle.ts` — persist exact validated digest/snapshot/checkpoints/model/pricing values; remove synthetic all-zero/empty substitutes.
  - `teleferico-app/src/lib/feedback/admin-command.test.ts` — cover complete command values, missing/invalid config fail-closed behavior, stale overlap ordering, and independent retry cutoffs/source reads/lineage.
  - `teleferico-app/src/lib/feedback/generation-lifecycle.test.ts` — require materialized generation inputs and preserve retry immutability coverage.
  - `teleferico-app/src/app/api/admin/feedback/generations/route.test.ts` — prove capability-off and origin failures precede transport access.
  - `openspec/changes/tb-113-visitor-feedback/README.md` — record the production fail-closed generation boundary.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — specify the app generation/retry composition and unchanged browser contract.
  - `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md` — record explicit config/input requirements and operational deferrals.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — record U10-A11 scope, branch/parent, size authorization, and pending operational gates.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — this evidence entry.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts` — exit 1 before implementation; 3 assertions exposed the placeholder retry payload, missing-source path reaching create, and retry not reading independent generation inputs. An intermediate combined run also exposed one old conflict fixture that needed explicit injected inputs; it was corrected before final verification.
- **GREEN app verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts src/lib/feedback/generation-lifecycle.test.ts src/app/api/admin/feedback/generations/route.test.ts src/lib/feedback/authoritative-generation-source.test.ts` — passed; exit 0; 4 files and 62 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0 with no diagnostics.
- **CMS verification:** `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 isolated Strapi/PostgreSQL HTTP test, including native authorization and core generation/worker command boundaries.
- **Runtime behavior and deferred owner:** Injected tests establish an accepted synthetic composition path: complete cutoff-bound snapshot and closed worker inputs are persisted before dispatch, with current and retry generations using independent cutoffs. The default production transport factory intentionally does not inject a source/config port; it returns a bounded unavailable result before generation create/dispatch after overlap preflight. The feedback capability remains disabled by default. Trusted production CMS origin/token-provider composition, approved model/pricing/key-ID source, credential provisioning, and integrated app↔CMS create/retry runtime proof are `not run`; owner is the separately authorized TB-113 app/CMS platform implementer and reviewer. No real credential or operational approval was added.
- **Candidate size before the test-only correction:** `509` authored additions plus deletions across exactly ten changed paths against exact parent `e3f1f16cda26da477b105c5454664082d1bbb9eb`, measured with `git diff --numstat HEAD` after the then-current documentation/ledger update. This was within the candidate-specific 4,000-line authorization; the superseding corrected count is recorded below. No later candidate exception is implied.
- **Rollback boundary:** Revert the two app command/lifecycle production changes, their three focused test changes, and the matching README/design/task/ledger updates as one U10-A11 unit. Preserve the prior private-source transport/adapter/materializer, default feature flag, CMS `UNKNOWN_VERSION` checkpoint guard, and all earlier TB-113 units.
- **Formal SDD reconstruction:** `pending`; this direct ledger entry is not native verification, task completion, runtime readiness, or publication evidence.

### `U10-A11 test-only correction: Prove incomplete source continuation blocks create`

- **Scope:** Added a parameterized characterization assertion to the existing U10-A11 `admin-command.test.ts` for both generate and failed retry. Its injected reader returns a first submissions page with a continuation and total two, then an empty terminal continuation while the same total remains two. The test proves the strict authoritative builder actually requests the continuation and that the command returns the safe 503 without a generation create or dispatcher call. No production code, CMS code, runtime configuration, credential, or public contract changed.
- **Characterization result:** GREEN only; no production RED is claimed. The first focused invocation failed because the retry test stub matched the unencoded query substring `filters[reportRunId]`, so retry stopped at `INVALID_STATE` before reading the injected page. The test stub was corrected to match `reportRunId`; the subsequent focused test passed both parameterized cases through continuation traversal and observed no create/dispatch.
- **Focused command:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts` — passed; exit 0; 1 file, 24 tests.
- **Required final verification at that snapshot:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts src/lib/feedback/generation-lifecycle.test.ts src/app/api/admin/feedback/generations/route.test.ts src/lib/feedback/authoritative-generation-source.test.ts` — passed; exit 0; 4 files, 64 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 isolated Strapi/PostgreSQL HTTP test. `git diff --check` — passed; exit 0.
- **Candidate size:** `607` authored additions plus deletions across the same ten paths against exact parent `e3f1f16cda26da477b105c5454664082d1bbb9eb`, measured from final `git diff --numstat HEAD` totals after ledger/task normalization. This exceeds the ordinary 400-line reviewer budget, remains below the ordinary 800-line hard default, and is within the exact candidate-specific 4,000-line authorization; no code was reduced to meet a budget.
- **Rollback boundary:** Remove only this parameterized `admin-command.test.ts` characterization and this correction entry; update the U10-A11 count in `tasks.md` to the remaining candidate snapshot. Preserve the existing U10-A11 production composition and all earlier evidence.
- **Remaining gates:** Trusted production CMS origin/token-provider composition, approved versioned model/pricing/evidence-key inputs, credential provisioning, and integrated app↔CMS create/retry runtime proof remain pending with the separately authorized TB-113 app/CMS platform implementer and reviewer. No production generation readiness is claimed.

### `U10-A11 invariant correction: Bind snapshot to generation period and cutoff`

- **Root cause:** `validateMaterializedGenerationInputsV1` proved the snapshot digest and the materialized fields' internal consistency, but `buildGenerationData` paired that result with a period and cutoff from a separate command context without comparing them. A digest-valid August 1 snapshot could therefore be persisted as an August 1–20 report with a September cutoff. The cutoff and period are generation identity and must agree with `snapshotJson.population` before persistence.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/generation-lifecycle.test.ts` — exit 1 before the lifecycle fix; the new wrong-range and wrong-cutoff cases both failed because `buildGenerationData` accepted the mismatched snapshot. The remaining 16 tests passed. This was a genuine command-boundary invariant defect.
- **Correction:** `buildGenerationData` now derives the cutoff once and requires snapshot population current `from/to` to match the effective command/source period and population cutoff to equal that exact UTC cutoff. Create and retry map construction failures to bounded `UPSTREAM_UNAVAILABLE` before CMS POST/dispatch. Synthetic generation/retry fixtures now provide materialized snapshots matching their effective period and cutoff. No `createdAt`-versus-cutoff ordering rule was added because the normative design does not define one.
- **GREEN focused verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/admin-command.test.ts` — passed; exit 0; 2 files, 42 tests.
- **Required final verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts src/lib/feedback/generation-lifecycle.test.ts src/app/api/admin/feedback/generations/route.test.ts src/lib/feedback/authoritative-generation-source.test.ts` — passed; exit 0; 4 files, 66 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 isolated Strapi/PostgreSQL HTTP test. `git diff --check` — passed; exit 0.
- **Changed paths:** Existing U10-A11 paths only: `teleferico-app/src/lib/feedback/generation-lifecycle.ts`, `teleferico-app/src/lib/feedback/admin-command.ts`, `teleferico-app/src/lib/feedback/generation-lifecycle.test.ts`, `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, `tasks.md`, and this ledger. No new path was added.
- **Candidate size:** `733` authored additions plus deletions across the same ten candidate paths against exact parent `e3f1f16cda26da477b105c5454664082d1bbb9eb`, measured from final `git diff --numstat HEAD` totals after ledger/task normalization. This exceeds the ordinary 400-line reviewer budget, remains below the ordinary 800-line hard default, and is within this candidate's 4,000-line authorization; later-candidate defaults are unchanged.
- **Rollback boundary:** Revert only the generation-context comparison/safe error mapping, aligned lifecycle fixtures and mismatch cases, and this correction's design/task/ledger text. Preserve the prior U10-A11 injected source/config composition and incomplete-continuation coverage, along with all earlier TB-113 units.
- **Remaining runtime gates:** Approved CMS origin/token-provider composition, approved versioned model/pricing/evidence-key inputs, credential provisioning, and integrated app↔CMS create/retry proof remain pending with the separately authorized TB-113 app/CMS platform implementer and reviewer. No operational approval or real credential was added.

### `U10-A12: Actual admin-command/CMS create-retry integration — blocked`

- **Identity and scope:** Test-only extension of the existing private-source Strapi/PostgreSQL HTTP harness to load the current app admin-command transport using the existing same-process in-memory TypeScript bridge. Production app/CMS logic, browser contracts, feature flag, schema, persistent auth grants, dependencies, credentials, environment samples, remote services, GCP/IAM, deployment, commit, PR, and SDD are excluded.
- **Branch and parent:** `test/app-cms-root-tb-113-generation-create-retry-integration`, based on local parent `4491450e12bbfc94ffa64cc05ee1bb37f885f727` (draft parent PR #366 per user; chain rooted at #356). The parent remains untouched.
- **Candidate authorization:** Candidate-specific `size:exception` ceiling of 4,000 authored additions plus deletions for this exact test-only candidate. The ordinary 400-line reviewer budget and 800-line hard default remain unchanged for later candidates.
- **Changed paths and reasons:**
  - `teleferico-cms/test/feedback/private-report-source.test.js` — explicitly allow the admin command plus one exact runtime alias in the realpath-constrained loader; exercise JWT/token cross-use denials, real native `find`, app source pagination, and the actual POST boundary.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — document the observed native create blocker and deferred success signals.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — bind the candidate exception to the exact branch/parent and retain unresolved acceptance gates.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — record this evidence and rollback boundary.
- **Auth separation:** The disposable app-user JWT role is asserted to have exactly `api::survey-report-generation.survey-report-generation.find` and `.create`; it has no `workerSourceRead`. The separate synthetic custom content API token is asserted to carry only `workerSourceRead`. JWT private-source use was denied without querying submissions; custom-token native generation `find` and `create` were both denied. No persistent role/token grant was changed.
- **Observed integration boundary:** The real app command transport completed CMS generation `find` over HTTP and fetched the real private-source pages through the app transport, including submissions pages of 25+2. An unauthorized source JWT and an interrupted continuation both stopped before POST with no new row and no dispatch. The actual native create POST returned HTTP 400 `ValidationError`: the app payload includes `requestedBy: null`, while that schema attribute is private. The test did not strip or transform the app request.
- **RED/blocker evidence:** During characterization, the actual native create returned HTTP 400 and the app surfaced bounded `VALIDATION_FAILED`; the safe diagnostic identified `requestedBy`. No test-specific request rewrite was used. This prevents real create/retry from being claimed without a separately authorized app/CMS contract correction.
- **Focused CMS characterization:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; exit 0; 1 isolated Strapi/PostgreSQL test passed while asserting the actual create rejection, source-denial/incomplete-source no-create behavior, zero inserted generation beyond the seeded failed row, and zero dispatch. The harness's Strapi and owned Compose cleanup/absence assertions completed. This result does not prove successful create or retry.
- **Additional requested verification:** `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 isolated Strapi/PostgreSQL HTTP test. `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts src/lib/feedback/authoritative-generation-source.test.ts` — passed; exit 0; 2 files, 41 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0 with no diagnostics. `git diff --check` — passed; exit 0 before the final count-only ledger normalization; final check follows below.
- **Not proven:** Successful native generation create, dispatch-after-create, persisted materialized generation fields, failed retry with fresh cutoff and immutable source lineage, production origin/config/key/provider, real credentials, runtime rollback, and worker/provider readiness.
- **Candidate size:** `452` authored additions plus deletions across exactly four paths against exact local parent `4491450e12bbfc94ffa64cc05ee1bb37f885f727`, measured from `git diff --numstat <parent>` and including this ledger entry. This exceeds the ordinary 400-line reviewer budget and is within the exact candidate-specific 4,000-line authorization; the 800-line hard default remains unchanged for later candidates.
- **Rollback boundary:** Revert this test-only loader/characterization and the U10-A12 paragraphs in `design/02-http-contracts.md`, `tasks.md`, and this entry. Preserve U10-A10 source integration, U10-A11 production composition, the default flag, CMS grants/schema, and all earlier work.
- **Status:** `partial; blocked` pending separately authorized resolution of the app/CMS private `requestedBy` write contract. This candidate must not be reported as successful U10-A12 create/retry integration.

### `U10-A12 correction: Omit null private requestedBy from native create`

- **Identity and scope:** One scoped native-create compatibility correction inside the same dirty U10-A12 candidate. The app omits the nullable private requester relation when constructing both generation and retry payloads; no synthetic attribution is supplied. The existing Strapi HTTP integration verifies actual generation create/retry and storage. No CMS schema/private-JSON/auth/grant, app browser contract, default flag, dependency, credential, environment sample, remote, GCP/IAM, deployment, commit, PR, or SDD change is included. This correction supersedes the blocked status immediately above.
- **Root cause and RED:** The previous integrated harness sent `requestedBy: null`; real Strapi returned HTTP 400 `ValidationError` because `requestedBy` is a private content-type relation. Before the correction, the new `admin-command.test.ts` and `generation-lifecycle.test.ts` assertions both failed because the generated payload contained `requestedBy: null`.
- **Correction:** `buildGenerationData` now omits `requestedBy`. Native Strapi leaves the nullable relation unlinked by default; no requester identity is synthesized. App tests require the generated CMS create command to have no own `requestedBy` property. The CMS integration queries `survey_report_generations_requested_by_lnk` directly and proves the created row has no requester link.
- **Changed paths:** `teleferico-app/src/lib/feedback/generation-lifecycle.ts`; `teleferico-app/src/lib/feedback/generation-lifecycle.test.ts`; `teleferico-app/src/lib/feedback/admin-command.test.ts`; `teleferico-cms/test/feedback/private-report-source.test.js`; `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md`; `tasks.md`; this ledger.
- **Real HTTP result:** The existing restricted loader executed current `createFeedbackAdminCommandTransport`; the exact synthetic JWT had only generation `find`/`create`, and the separate custom token had only `workerSourceRead`. Cross-use stayed denied. Real source transport read 27 submissions in 25+2 pages. Native CMS `find`/`create` both completed over HTTP. The created generation persisted its exact cutoff-bound snapshot/digest, matching initial checkpoints, model configuration, pricing snapshot, and source revision; the raw requester link table count was zero. The fake dispatcher ran only after successful CMS create. A seeded failed row was retried through real CMS HTTP with a new cutoff/digest and `retryOfGeneration` lineage; the original failed row stayed unchanged. Unauthorized source and an interrupted continuation both failed before POST with no extra generation or dispatch. No Cloud Tasks request was made.
- **Final required verification:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; exit 0; 1 isolated Strapi/PostgreSQL test including real create/retry and cleanup. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 isolated authenticated CMS/PostgreSQL HTTP test. `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts src/lib/feedback/generation-lifecycle.test.ts src/lib/feedback/authoritative-generation-source.test.ts` — passed; exit 0; 3 files, 59 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0 with no diagnostics. Final `git diff --check` — pending count/ledger normalization.
- **Authored size and inventory:** U10-A12 delta is `505` additions plus deletions across 7 paths against exact parent #366 head `4491450e12bbfc94ffa64cc05ee1bb37f885f727`. The complete stacked diff from `e3f1f16cda26da477b105c5454664082d1bbb9eb` is `1,220` additions plus deletions across 11 paths: TB-113 `README.md`, `design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, `direct-implementation-ledger.md`, `tasks.md`; app `src/app/api/admin/feedback/generations/route.test.ts`, `src/lib/feedback/admin-command.test.ts`, `admin-command.ts`, `generation-lifecycle.test.ts`, `generation-lifecycle.ts`; CMS `test/feedback/private-report-source.test.js`. Counts use tracked `git diff --numstat`; they include this ledger content. Both counts exceed 400 and are within the exact candidate-specific 4,000-line authorization; later-candidate 800-line hard default remains unchanged.
- **Operational/runtime boundary:** No production CMS origin/token/provider, model/pricing/key provider, real credential, Cloud Tasks, worker runtime, GCP/IAM, deployment, or operational rollback was exercised. The feature default remains disabled and persistent role/token grants remain unchanged.
- **Rollback boundary:** Revert the `requestedBy` omission and its two app regression assertions, the integrated CMS create/retry/raw-null assertion, and U10-A12 design/task/ledger correction as one native-create compatibility outcome. Preserve U10-A10 source integration, U10-A11 source/materialization composition, all earlier TB-113 work, and the default feature flag.
- **Status:** `passed` for local synthetic native create/retry integration only; production/provider/runtime readiness and formal SDD completion remain pending.

### `U10-A13: Restrict worker claim, snapshot, and checkpoint to custom content API tokens`

- **Identity and scope:** On `fix/cms-root-tb-113-worker-actions-machine-auth`, based on exact open draft parent PR #367 head `e512fb363dd1be8f7d644e37651caef05ea57016` and chain rooted at #356, moved only `W/claim`, `W/snapshot`, and `W/checkpoints/:stageKey` behind Strapi's native `content-api-token` strategy with one exact action scope per route. A shared controller guard requires the runtime-selected `content-api-token` strategy, `kind: "content-api"`, and `type: "custom"` before controller body measurement/validation or service/database access. `workerSourceRead` retains its existing implementation and scope.
- **Changed paths and reasons:**
  - `teleferico-cms/src/api/survey-report-generation/routes/admin.js` — adds route-local machine-strategy and exact action scopes only for the three worker routes.
  - `teleferico-cms/src/api/survey-report-generation/controllers/survey-report-generation.js` — reuses the existing private-source token-identity guard before worker command/snapshot/checkpoint work.
  - `teleferico-cms/test/feedback/admin-report-commands.test.js` — RED/GREEN isolated Strapi/PostgreSQL HTTP proof using action-isolated synthetic custom tokens and JWT roles artificially granted each worker action; verifies claim/replay, private snapshot, checkpoint `UNKNOWN_VERSION`, no worker DB lock, anonymous/no-scope denial, and unchanged native generation plus submission/report reads.
  - `teleferico-cms/test/feedback/permissions/permissions.test.js` — asserts exact route scopes, shared pre-handler identity checks, and unchanged JWT admin dispatch actions.
  - `teleferico-cms/AGENTS.md` — records the CMS worker-action auth invariant for future changes.
  - `docs/STRAPI_PERMISSIONS.md` — documents the intentional JWT-grant incompatibility, exact custom-token scopes, no persistent/default grants, and unchanged core/admin JWT surfaces.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, `tasks.md`, and this ledger — align normative contracts, candidate exception, and evidence.
- **Candidate authorization and size:** The user approved one cohesive candidate-specific `size:exception` up to 4,000 authored additions plus deletions for this exact branch and parent. Final authored count: `243` additions plus deletions (`198` additions + `45` deletions) across 10 changed paths, measured as tracked `git diff --numstat` additions+deletions against the clean worktree's exact starting `HEAD` and including this ledger entry. This is below the ordinary 400-line reviewer budget; the exception was not needed. The 800-line hard default for later candidates remains unchanged; no code-golf or test/documentation omission was used.
- **RED evidence:** Before route auth was changed, the isolated `npm --prefix teleferico-cms test -- feedback/admin-report-commands` run failed because an Auth.js-equivalent Users & Permissions JWT with synthetic `workerClaim` action permission successfully claimed a generation (HTTP 200), contrary to the new denial contract. This confirms the access gap was real and the red test exposed it.
- **GREEN verification:** `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — exit 0; 1 isolated Strapi/PostgreSQL HTTP test passed. The three worker custom-token tests prove exact-scope claim/snapshot access and expected checkpoint `UNKNOWN_VERSION`; JWTs with each corresponding role action, anonymous calls, and custom tokens missing a route's action are denied. The same test proves native generation `find`/`create`, submission/report reads, admin `dispatch-state`/`dispatch-failure`, and claim queued→running/resumed behavior remain unchanged. `npm --prefix teleferico-cms test -- feedback/permissions` — exit 0; 4 tests passed, including isolated no-default-grant route/action inspection. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; 18 tests passed, including PostgreSQL transaction/rollback and worker checkpoint `UNKNOWN_VERSION` before transaction entry. `npm --prefix teleferico-cms test -- feedback/private-report-source` — exit 0; 1 isolated Strapi/PostgreSQL test passed, retaining its prior source-token boundary and app create/retry integration. Harness-owned services, containers, and volumes were cleaned up.
- **Authentication migration:** Existing U&P role grants for `workerClaim`, `workerSnapshot`, or `workerCheckpoint` no longer authorize these endpoints, intentionally. Native Strapi generation `find`/`create`, submission/report reads, and admin dispatch actions retain existing JWT authorization. No global auth strategy, schema, default grant, persistent role/token, real credential, dependency, environment variable, GCP/IAM, deployment, or production token grant changed. A production worker custom content API token with approved least-privilege action permissions remains deferred to separately authorized worker/platform operations.
- **Rollback boundary:** Revert the three route auth configs, the three controller guard calls, the focused route/HTTP permission test changes, and the corresponding CMS governance, permission, design, task, and ledger text together. Preserve `workerSourceRead` and its test boundary, native generation CRUD and admin dispatch JWT contracts, all earlier U10 work, and the default feature-disabled posture.
- **Deferred validation and status:** No production worker token/grant issuance, runtime rotation, live Cloud Tasks/Cloud Run/OIDC, staging/production, GCP/IAM, or deployment validation was authorized or performed. Local synthetic security behavior is `passed`; production worker credential provisioning and runtime readiness remain `pending`. Direct implementation only; no commit, push, PR, merge, or SDD operation was performed. Loaded skill resolution: `code-design`, `change-intake-preflight`, `chained-pr`, `work-unit-commits`, `notion-todo-governance`, `issue-context-harness`, and required app/CMS package governance; TB-113 change-local README selected the direct implementation route.

### `U10-A13 test-only correction: tolerate wrapped permission prose`

- **Observed failure:** The parent spot-check `npm --prefix teleferico-cms test -- feedback/permissions` reported 3/4 passing; `permissions.test.js:103` failed because its exact wording regex expected a literal space between `its` and `role`, while `docs/STRAPI_PERMISSIONS.md:240-241` wraps that phrase across a newline. This is a documentation line-wrap/assertion matching mismatch, not an auth behavior, provider, or production failure; the permission wording is correct.
- **Correction:** Changed only the assertion in `teleferico-cms/test/feedback/permissions/permissions.test.js` to allow `\s+` between `its` and `role`, while retaining the exact `Users & Permissions JWT is denied even if its role is granted the same action` meaning. No route, controller, auth behavior, permission documentation, or production code changed.
- **Exact rerun:** `npm --prefix teleferico-cms test -- feedback/permissions` — exit 0; 4/4 tests passed. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — exit 0; 1 isolated Strapi/PostgreSQL HTTP test passed. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; 18 tests passed. `npm --prefix teleferico-cms test -- feedback/private-report-source` — exit 0; 1 isolated Strapi/PostgreSQL HTTP test passed. `git diff --check` — pending final count normalization.
- **Final candidate count:** `250` additions plus deletions across 10 paths against the exact starting HEAD `e512fb363dd1be8f7d644e37651caef05ea57016`; the 4,000-line authorization ceiling is unchanged and the candidate remains below the 400-line reviewer budget.

### `U10-A14: Authenticated worker terminal-failure command`

- **Identity and scope:** Implemented only the CMS `POST W/fail` `FailV1`/`FailResultV1` terminal command on `feat/cms-root-tb-113-worker-fail-command`, based on exact open draft parent PR #368 head `8769275d53a710fc19b608f5b7b5a34e0bf6ccce` (chain rooted at #356). No success/complete, checkpoint activation, schema/generated-type/dependency/environment, GCP/IAM, deployment, or real credential work is included.
- **Requirements references:** `specs/report-generation-lifecycle/spec.md` running-only terminal failure, state version, safe failure; `specs/survey-worker-operations/spec.md` safe failure and no prompt/comment/credential/signed-URL leakage.
- **Design references:** `design/02-http-contracts.md` `FailV1`/`FailResultV1`, 4 KiB worker boundary, status mapping, replay-before-CAS, custom-token scope and controller guard; `design/04-ai-worker-infrastructure.md` fixed failure-code/message allowlist and post-commit alert boundary.
- **Task references:** U10 / task 4.1 worker CMS actions; U10-A14 candidate-specific exception recorded in `tasks.md`. The exception is capped at 4,000 authored additions plus deletions for this exact branch and parent only; 400-line reviewer budget and 800-line hard default for later candidates remain unchanged.
- **Dependencies:** Existing generation lifecycle, private worker action identity guard, existing private `safeFailureMessage` field, and disposable PostgreSQL/Strapi test harness.
- **Authored size and inventory:** `495` additions plus deletions across 14 paths against exact starting HEAD `8769275d53a710fc19b608f5b7b5a34e0bf6ccce`, measured with tracked `git diff --numstat`; the count includes this ledger entry. The candidate-specific 4,000-line ceiling is not a blanket exception; the ordinary 400-line reviewer budget and 800-line hard default remain unchanged for later candidates.
- **Changed paths and reasons:**
  - `teleferico-cms/src/api/survey-report-generation/routes/admin.js` — registers `POST /tb113/worker/generations/:reportRunId/fail` with native `content-api-token` and exact `workerFail` scope.
  - `teleferico-cms/src/api/survey-report-generation/controllers/survey-report-generation.js` — checks custom-token identity before command body measurement/read, enforces the 4 KiB cap and fixed closed command, and maps safe statuses.
  - `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js` — validates the exact bounded code/message map and applies running-only locked CAS plus identical terminal replay before stale-version handling.
  - `teleferico-cms/src/api/survey-report-generation/services/survey-report-generation.js` — loads/persists only the safe failure metadata within the existing locked transaction.
  - `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js` — covers safe mapping, successful transition, replay without mutation, stale CAS, and queued/succeeded/changed-terminal conflicts.
  - `teleferico-cms/test/feedback/admin-report-commands.test.js` — proves anonymous, JWT-with-action, and custom-token-without-action denial; exact custom-token success; oversize-before-lock behavior; PostgreSQL concurrent replay; stale/changed/queued conflicts; no report; and raw-message non-disclosure.
  - `teleferico-cms/test/feedback/permissions/permissions.test.js` — asserts exact route scope/guard and permission-document contract.
  - `teleferico-cms/test/feedback/permissions/postgres-permissions.test.js` — asserts route registration and no default persistent worker grant.
  - `teleferico-cms/AGENTS.md` — extends the invariant for worker-only custom-token actions.
  - `docs/STRAPI_PERMISSIONS.md` — documents the new action's machine identity, scope, state and no-default-grant boundary.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — records the HTTP/auth/status/CAS/replay/privacy contract.
  - `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md` — records the exact fixed safe message map and deferred alert policy.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — records candidate identity, exception, sensitivity, exclusions, and rollback.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this direct implementation evidence.
- **Implementation:**
  - Status: `passed` for the bounded local implementation only.
  - Revision: `pending` (worktree remains uncommitted at the exact starting parent head above).
  - Pull request: `pending`; no remote, commit, push, PR, merge, or SDD operation was performed.
  - Merge evidence: `pending`.
- **RED evidence:** Before implementation, `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` failed at the new unit case because `lifecycle.failWorker` did not exist (18 other tests passed). Before the route/action was registered, `npm --prefix teleferico-cms test -- feedback/admin-report-commands` failed while Strapi rejected the synthetic `workerFail` scope as unregistered. Both failures demonstrated the missing lifecycle method and HTTP action; neither was a base-suite failure.
- **Focused tests:**
  - Command: `npm --prefix teleferico-cms test -- feedback/generation-lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 19 tests passed, including running-only fail transition, replay, stale CAS, queued/succeeded conflicts, and the isolated PostgreSQL lifecycle harness.
  - Command: `npm --prefix teleferico-cms test -- feedback/admin-report-commands`
  - Status: `passed`
  - Exact result: exit 0; 1 isolated Strapi/PostgreSQL authenticated HTTP test passed, including concurrent same-command requests yielding exactly one mutation and one replay.
  - Command: `npm --prefix teleferico-cms test -- feedback/permissions`
  - Status: `passed`
  - Exact result: exit 0; 4 tests passed, including isolated Strapi registration and default-grant inspection.
  - Command: `npm --prefix teleferico-cms test -- feedback/private-report-source`
  - Status: `passed`
  - Exact result: exit 0; 1 isolated Strapi/PostgreSQL HTTP test passed; an existing PostgreSQL client-query deprecation warning was emitted.
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts`
  - Status: `passed`
  - Exact result: exit 0; 1 file passed; 21 tests passed.
  - Command: `git diff --check`
  - Status: `passed`
  - Exact result: exit 0; no whitespace errors after final normalization.
- **Authentication and privacy evidence:** The native route is scoped only to `workerFail`; a Users & Permissions JWT with a synthetic matching role grant and a custom token with only `workerClaim` are denied without a generation-row lock. A synthetic custom content API token with only `workerFail` is accepted. Unknown/raw message text fails with a generic 400 and is not reflected or persisted. Successful persistence contains only the allowlisted code/message, terminal status/version, and completion time; no report or partial artifact is created. No alert is delivered by this command.
- **Intentionally deferred validation:**
  - Exact command or scenario: production custom-token issuance/rotation, real worker alert delivery, authenticated external CMS/app deployment, Cloud Tasks/Cloud Run execution, GCP/IAM, staging/production, full package suites/typecheck/lint, and formal SDD verification.
  - Status: `not run`.
  - Reason: outside this local U10-A14 boundary and not authorized; alert delivery must wait for a separately implemented idempotent post-terminal-commit path.
  - Intended future checkpoint: separately authorized worker/platform operations and future alert integration; implementation PR CI for repository checks; formal verification only under an explicit SDD request.
  - Owner: TB-113 worker/CMS implementer and separately authorized platform operator.
- **Acceptance criteria:**
  - Exact closed 4 KiB command and fixed bounded message map: `passed` by lifecycle unit and authenticated HTTP tests.
  - Native custom-token-only `workerFail` scope with shared controller identity guard before controller body access/service or database work; anonymous/JWT-with-grant/custom-missing-scope denied: `passed` by isolated HTTP and permissions tests.
  - Running-only locked state-version transition, fixed failure metadata, and current-version identical replay before stale CAS: `passed` by unit and concurrent PostgreSQL/Strapi HTTP tests.
  - Changed replay, stale running version, queued and succeeded status conflicts; no partial report/PDF; raw message non-disclosure: `passed` by unit/HTTP tests.
  - Production token/grant, alert delivery, worker/provider/runtime/deployment readiness, and formal task completion: `pending`.
- **Residual risks:** `safeFailureMessage` is persisted as the existing private bounded attribute; future edits must keep the CMS allowlist synchronized with the app worker's safe mapping. No notification/outbox is created, so terminal alert delivery remains intentionally absent. Local synthetic credentials prove only the isolated test boundary.
- **Rollback boundary:** Revert the new route, controller action, lifecycle validation/transition, service transaction projection, four focused test files, CMS worker-action invariant, permission documentation, TB-113 design/task updates, and this ledger entry as one U10-A14 unit. Preserve existing `workerClaim`, `workerSnapshot`, `workerCheckpoint`, `workerSourceRead`, native generation CRUD, admin dispatch JWT actions, and the feature-disabled default.
- **Later integrated validation:**
  - Status: `pending`.
  - Evidence: production readiness, least-privilege token issuance/rotation, application worker transport, and any future post-commit alert path must be separately authorized and verified.
- **Correction or follow-up:**
  - Trigger: `none observed` after final required rerun.
  - Status: `pending`.
  - Fix evidence: `pending`.
  - Revalidation evidence: `pending`.
- **Formal SDD reconstruction:**
  - Status: `pending`.
  - Evidence: no SDD operation was requested or run.

### `U10-A14 test-only correction: PostgreSQL rollback after worker failure update`

- **Identity and scope:** Same U10-A14 candidate, branch `feat/cms-root-tb-113-worker-fail-command`, exact starting head `8769275d53a710fc19b608f5b7b5a34e0bf6ccce`, parent PR #368, chain rooted at #356. Added only isolated PostgreSQL transaction test support and this append-only evidence; production controller, route, lifecycle/service implementation, auth, and schema remain unchanged.
- **Changed paths:** `teleferico-cms/test/feedback/generation-lifecycle/postgres.test.js` — creates the private safe-message column in its disposable schema, verifies the conditional UPDATE returned the uncommitted failed row, injects a known error after that UPDATE and before commit, then checks rollback from an independent pool connection. `openspec/changes/tb-113-visitor-feedback/tasks.md` — appends this correction and updates the literal final candidate count. This ledger — appends the test evidence and rollback boundary.
- **No fabricated RED:** The correction did not first assert an expected failure. The pre-existing implementation was characterized directly; the test passed only after observing the SQL update inside the transaction and then confirming independent-connection rollback.
- **Exact verification:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; 19 tests passed, including the isolated PostgreSQL harness. The hook observed `status=failed`, state version `8`, `failureCode=INVALID_OUTPUT`, the fixed safe message, and non-null `completed_at` in the transaction's `UPDATE ... RETURNING` result before throwing `INJECTED_AFTER_WORKER_FAIL_UPDATE`. After rollback, an independent connection observed `status=running`, version `7`, null failure code/message/completed time, and zero report rows.
- **Remaining required verification:** `npm --prefix teleferico-cms test -- feedback/admin-report-commands`, `npm --prefix teleferico-cms test -- feedback/permissions`, and `git diff --check` are pending their final serial rerun after count/ledger normalization.
- **Authored size and inventory:** `587` additions plus deletions across 15 paths against the exact starting head above, including the prior 14 U10-A14 paths and this PostgreSQL test. Count is tracked `git diff --numstat` additions+deletions and includes this appended ledger entry; the candidate-specific maximum remains 4,000, not a blanket exception.
- **Rollback boundary:** Revert only the new `postgres.test.js` transaction-hook/schema/assertions, the appended U10-A14 correction in tasks and ledger, and the count normalization needed by the candidate. Preserve all U10-A14 production code, auth/CAS/replay tests and prior direct-ledger evidence. No production fix or schema rollback is required because the existing transaction already rolls back the terminal failure update.

### `U10-A14 test-only correction: final verification and rollback evidence`

- **Identity and scope:** Same worker-fail candidate/branch and exact starting head above. Test-only extension of the existing disposable PostgreSQL lifecycle harness; no production route, controller, lifecycle/service implementation, auth, schema, dependency, environment, credential, infrastructure, or deployment change.
- **PostgreSQL rollback proof:** The focused nested subtest `worker fail rolls back after its conditional update` seeds a running row at version 7 with `failureCode`, `safeFailureMessage`, `completedAt` null and no report. The transaction test wrapper runs a conditional PostgreSQL `UPDATE ... WHERE state_version=7 AND status='running' RETURNING ...`; it asserts exactly one row changed and observes failed/status version 8/code/fixed message/non-null completion time inside the still-open transaction, then throws the explicit injected error before commit. `failWorker` rejects with that injected error. A separately checked-out pool connection then observes the original running/version-7 row, all three failure fields still null, and zero report rows. This proves the fault was after the conditional database update and the rollback was visible outside the transaction; it is not fake-only evidence.
- **No fabricated RED:** No RED was manufactured. Existing implementation behavior was characterized directly; the PostgreSQL rollback proof passed.
- **Exact command and result:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; the final rerun result is recorded below after serial verification.
- **Changed paths:** Added `teleferico-cms/test/feedback/generation-lifecycle/postgres.test.js`; updated `openspec/changes/tb-113-visitor-feedback/tasks.md` candidate count/correction note; appended this ledger entry. No other paths were added for this test-only correction.
- **Authored size and inventory:** `TBD` additions plus deletions across 15 paths against exact starting HEAD `8769275d53a710fc19b608f5b7b5a34e0bf6ccce`, measured by tracked `git diff --numstat` with this ledger included. The sole new code/test path is the isolated PostgreSQL lifecycle test; the full 15-path inventory is listed in the preceding U10-A14 entry plus that path.
- **Rollback boundary:** Revert only `teleferico-cms/test/feedback/generation-lifecycle/postgres.test.js`, this test-only correction entry, its task count/correction note, and the final candidate-count normalization. Preserve all production U10-A14 implementation and prior auth/CAS/replay/privacy evidence. No production change or persistent database rollback is required; the disposable PostgreSQL harness performs cleanup.
- **Serial verification after the correction:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — exit 0; 20 tests passed (19 top-level and the focused PostgreSQL rollback subtest). `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — exit 0; 1 isolated authenticated Strapi/PostgreSQL HTTP test passed. `npm --prefix teleferico-cms test -- feedback/permissions` — exit 0; 4 tests passed. `git diff --check` — exit 0; no whitespace errors.
- **Correction to the prior count line:** The final nested-test invocation reports 20 total passing tests, not 19; the additional count is the focused `worker fail rolls back after its conditional update` subtest. No earlier RED was manufactured.
- **Final count normalization:** The earlier `587` value was an intermediate pre-ledger-append measurement. The final complete candidate count, including all appended evidence and this correction, is `604` additions plus deletions across 15 paths against starting HEAD `8769275d53a710fc19b608f5b7b5a34e0bf6ccce`, measured by tracked `git diff --numstat`.

### `U10-A15: App worker CMS HTTP client`

- **Identity and scope:** Implemented only the server-only `WorkerCmsClient` HTTP methods for claim, snapshot, and fail on `feat/app-root-tb-113-worker-cms-client`, against exact parent PR #369 head `e267654e24e13f77a423e5c1f3735bf27433a5e3`, with chain rooted at #356. The user authorized one cohesive candidate-specific `size:exception` capped at 4,000 authored additions plus deletions; this does not change the ordinary 400-line reviewer budget or 800-line hard default for later candidates.
- **Requirements/design:** `tasks.md` U10/task 4.1 and its U10-A15 exception; `design/02-http-contracts.md` worker claim/snapshot/fail request and response contracts, private-comment boundary, and fail-closed checkpoint/completion behavior; `specs/survey-worker-operations/spec.md` private worker boundary.
- **Changed paths and reasons:**
  - `teleferico-app/services/survey-report-worker/src/cms-origin.ts` — owns hostname syntax and exact-origin allowlist validation shared by both app CMS transports; it does not resolve DNS or validate addresses.
  - `teleferico-app/services/survey-report-worker/src/private-report-source-transport.ts` — reuses the shared origin validator without changing its route/request behavior.
  - `teleferico-app/services/survey-report-worker/src/worker-cms-client.ts` — adds server-only bounded action-scoped claim/snapshot/fail HTTP requests and explicit no-request checkpoint/completion rejections.
  - `teleferico-app/src/lib/feedback/worker-cms-client.test.ts` — fake-fetch, response, digest, privacy, status, bounds, and no-request coverage.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — records the transport boundary and deferred integrated proof.
  - `openspec/changes/tb-113-visitor-feedback/tasks.md` — records the exact branch/parent/candidate-specific exception and exclusions.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this work unit and observed evidence.
- **Behavior and security:** Requires canonical HTTPS hostname syntax and nonempty exact-origin allowlist membership before token-provider invocation; these checks do not perform DNS resolution, resolved-IP validation/pinning, or network-egress proof. Split-horizon DNS/rebinding can still resolve an allowlisted name to a private address, so this is not a complete SSRF guarantee. Before wiring an operational token provider, separately approve the trusted CMS origin and verify DNS/address controls plus egress restrictions that prevent the bearer token reaching private, loopback, link-local, or unapproved addresses. The provider receives the precise Strapi custom-token action identifier and must return the same identity alongside its opaque token; no bearer default, U&P JWT, host, environment lookup, or production composition exists. Routes and methods are fixed to `POST W/claim`, `GET W/snapshot`, and `POST W/fail`. Closed request/response validation, 4 KiB request and 1 MiB response bounds, 10-second operation deadline, `no-store`, redirect refusal, same-origin response checks, fixed status/error mapping, and non-disclosing failures are enforced. Snapshot digest validation uses the existing core validator; comments are returned only in the validated private snapshot. `checkpoint` rejects `UNKNOWN_VERSION` and `complete` rejects as unsupported before token acquisition or HTTP; neither reports success.
- **RED evidence:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-cms-client.test.ts` — exit 1 before implementation because the test import target `worker-cms-client` did not exist. This was the expected missing-module RED.
- **Typecheck correction:** The first `pnpm --dir teleferico-app run typecheck` found a snapshot-envelope cast and new test typing issues; the assertion now casts through `unknown` and the synthetic token-provider result carries the action identity. The final typecheck below passed.
- **Focused tests:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-cms-client.test.ts` — passed; exit 0; 1 file, 14 tests.
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/private-report-source-transport.test.ts` — passed; exit 0; 2 files, 69 tests.
  - `pnpm --dir teleferico-app run typecheck` — passed; exit 0; no TypeScript diagnostics.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; exit 0; 1 authenticated isolated Strapi/PostgreSQL test; the test harness shut down Strapi.
  - `git diff --check` — passed; exit 0 after final documentation and count normalization.
- **Runtime harness:** `not run`; no client-to-CMS integration was executed in this candidate. Exact deferred scenario: extend `teleferico-cms/test/feedback/private-report-source.test.js` using its existing U10-A10 same-process restricted TypeScript loader and logical-origin fetch shim (no child process or environment-file access), then call real isolated Strapi `W/claim`, `W/snapshot`, and `W/fail` with distinct synthetic custom content API tokens in the ephemeral database. Verify action-scope isolation/denial, successful scoped calls and replay, snapshot digest/private-comment handling, checkpoint/complete no-request behavior, and owned-resource cleanup. Owner: TB-113 app/CMS implementer and reviewer. The separate required CMS admin-report command did run against its isolated CMS harness but did not exercise this app client. No environment file, real token, or real CMS host was accessed.
- **Authored size and inventory:** `1,098` additions plus deletions across 7 paths against exact starting HEAD `e267654e24e13f77a423e5c1f3735bf27433a5e3`, using tracked `git diff --numstat` additions plus deletions and all intended untracked text line counts. Candidate cap: 4,000; no code-golf or omission of tests/docs.
- **Acceptance criteria:** Exact scoped claim/snapshot/fail requests and replay/result validation; action identity mismatch and invalid/missing token providers rejected; invalid origins rejected before token lookup; 401/403/409/413/500 mapped to bounded errors; malformed, oversized, redirected/cross-origin responses rejected; snapshot digest verified; private comment returned only in private result; checkpoint/completion make no token or network request — passed by the 14 fake-fetch tests.
- **Residual risks/deferred validation:** App fake-fetch evidence does not prove Strapi HTTP wiring or token issuance. The hostname validator does not resolve/pin DNS addresses or prove egress; before operational token wiring, require a separately approved trusted origin and verified DNS/address and network-egress controls. The exact synthetic custom-action client↔Strapi test and owner are recorded under Runtime harness above. No DNS query, network/egress test, or GCP operation was performed. No real/custom token, origin, CMS grant, runtime wiring, environment variable, dependency, CMS schema/auth, GCP/IAM, Cloud Run/OIDC, or deployment change is included. CMS checkpoint remains fail-closed and completion remains unregistered.
- **Rollback boundary:** Revert the new worker client and its test, shared origin helper plus the private-source transport import/refactor, and the U10-A15 design/task/ledger additions together. Preserve the prior private-source transport behavior, worker contracts, CMS actions, and all earlier TB-113 work.
- **Later integrated validation:** `pending`; owner is the TB-113 app/CMS implementer and reviewer, using a separately approved isolated test-only CMS environment and synthetic custom action tokens.
- **Formal SDD reconstruction:** `pending`; no SDD operation was requested or run.

### `U10-A16: CMS worker claim contract correction and app integration`

- **Identity and scope:** Direct continuation on `test/app-cms-root-tb-113-worker-client-integration`, exact starting HEAD `ea33a00af166825ae972738b477c13d6c6dfa4eb`, immediate open draft parent PR #370 based on `feat/cms-root-tb-113-worker-fail-command` at `e267654e24e13f77a423e5c1f3735bf27433a5e3`, chain rooted at #356. Candidate-specific `size:exception` authorized by the user: maximum 4,000 authored additions plus deletions against this exact parent; no code-golf or test/documentation omission. The 400-line reviewer budget and 800-line hard default for later candidates are unchanged.
- **Changed paths:** `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js` — parses/validates claim data before queued transition or running resume and returns normalized objects; terminal replay stays minimal. `teleferico-cms/src/api/survey-report-generation/services/survey-report-generation.js` — selects the persisted source revision under the existing row lock. `teleferico-cms/src/api/survey-report-generation/services/checkpoint-contract.js` — reuses model validation and adds the closed direct/initial-undecided empty-checkpoint and pricing claim contract. `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js` — proves JSON normalization, accepts only the empty undecided initial set, and rejects malformed, double-encoded, placeholder, digest/route/source mismatch, unsupported-entry, and invalid pricing data without queued/running state changes. `teleferico-cms/test/feedback/admin-report-commands.test.js` — updates existing real HTTP worker claim fixtures to valid closed claim inputs. `teleferico-cms/test/feedback/private-report-source.test.js` — adds real app-created undecided-route client flow plus malformed stored-JSON HTTP rejection. `teleferico-app/services/survey-report-worker/src/worker-cms-client.ts` and `teleferico-app/src/lib/feedback/worker-cms-client.test.ts` — accept only the exact undecided initial envelope alongside existing direct validation. The remaining changed paths are this design, task, and ledger documentation. No schema, route, controller, auth, permission, dependency, environment variable, or lockfile changed.
- **Claim contract and failure safety:** The row remains locked within the existing transaction. Terminal replay returns its previous minimal envelope without touching private fields. For queued and running records, CMS parses a string value once, rejects a second-level JSON string/non-object, checks exact checkpoint-set keys, v1, snapshot digest equality, null chunk count, and empty entries; only `direct` or the exact initial `undecided` route is supported. Model config and pricing use closed validation as before. Any parse/validation failure maps to fixed `INVALID_STATE` before queued→running state/version/claimedAt changes. No raw persisted values are returned in errors. The app client accepts `undecided` only when the checkpoint envelope has null chunk count and zero entries; unknown routes or malformed initial sets remain `INVALID_RESPONSE`.
- **RED/GREEN route-compatibility evidence:** Before the app change, `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-cms-client.test.ts` failed the new undecided-initial case with `INVALID_RESPONSE` (14 existing tests passed). Before the CMS change, `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` failed the new undecided claim case with `INVALID_STATE` (22 other tests passed). No route coercion was used.
- **RED/GREEN evidence:** Before the production correction, `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` failed on serialized claim values and missing rejections for malformed checkpoint JSON and invalid running-resume pricing data. After correction, the focused lifecycle suite passed all 22 tests (including the PostgreSQL rollback subtest). The isolated HTTP test writes a malformed JSON string into the queued checkpoint field, observes 409 `INVALID_STATE`, and confirms status remains queued, version remains 1, and `claimed_at` remains null before restoring the valid disposable fixture.
- **Integrated app↔CMS evidence:** The same-process app module loader and exact logical-origin-to-loopback fetch seam preserve real client origin/redirect checks. The manually seeded direct-route claim/replay/snapshot/fail/replay succeeds. More importantly, the test captures the actual `reportRunId` returned by the U10-A12 app admin-generation HTTP command and drives that normal CMS-created row through the app client: its persisted initial `route: "undecided"` claim is `claimed` at version 2, replay is `resumed`, snapshot digest/private comments validate, and bounded `INVALID_OUTPUT` fail/replay succeeds. The app client also rejects malformed claim and digest-altered snapshot responses; checkpoint/complete make no token or fetch calls. No response adapter coerces CMS results.
- **Execution boundary:** Accepting the initial undecided envelope only completes transport/lifecycle claim compatibility. The worker runtime was not changed or executed. It remains fail-closed while route is undecided; CountTokens route selection must choose `direct` or `map-reduce` before model/provider/render work. No provider, renderer, checkpoint write/CAS, or complete call was made. U10 remains incomplete and no model execution readiness is claimed.
- **Authorization, privacy, and cleanup:** Three distinct custom content API tokens retain exactly one worker action each. The JWT carrying all worker actions remains denied; wrong-scope tokens remain denied before generation-table access; native generation collection reads remain denied. No permission/access expectation changed, so `docs/STRAPI_PERMISSIONS.md` was not changed. No raw token or private comment appears in error/log assertions. The finally path stops the Strapi server, restores environment, removes owned Compose containers/volumes, and verifies absence.
- **Operational boundary:** No real origin, DNS/address control, egress restriction, operational token, persistent grant, worker runtime, GCP/IAM, Cloud Run, or deployment was exercised. Those previously documented production gates remain pending.
- **Verification:** `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed, 1 isolated HTTP test covering manually seeded direct and normal U10-A12 app-created undecided claim/replay, snapshot digest/private comments, fail/replay, malformed/digest response rejection, invalid stored JSON 409/no-transition, authorization isolation, and cleanup. `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed, 1 isolated Strapi/PostgreSQL HTTP test. `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed, 23 tests including the PostgreSQL rollback subtest. `npm --prefix teleferico-cms test -- feedback/permissions` — passed, 4 tests. `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-cms-client.test.ts src/lib/feedback/worker-pdf.test.ts` — passed, 2 files/36 tests. `pnpm --dir teleferico-app run typecheck` — passed with no diagnostics. Final `git diff --check` — passed. Remaining U10 execution gates are not closed.
- **Authored size and inventory:** `976` additions plus deletions across 11 paths against exact starting HEAD `ea33a00af166825ae972738b477c13d6c6dfa4eb`, measured using tracked `git diff --numstat`. Inventory: `teleferico-cms/src/api/survey-report-generation/services/lifecycle.js`, `teleferico-cms/src/api/survey-report-generation/services/survey-report-generation.js`, `teleferico-cms/src/api/survey-report-generation/services/checkpoint-contract.js`, `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js`, `teleferico-cms/test/feedback/admin-report-commands.test.js`, `teleferico-cms/test/feedback/private-report-source.test.js`, `teleferico-app/services/survey-report-worker/src/worker-cms-client.ts`, `teleferico-app/src/lib/feedback/worker-cms-client.test.ts`, `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md`, `tasks.md`, and this ledger. Candidate cap: 4,000 authored lines; this candidate-specific exception expires here and is not reusable.
- **Rollback boundary:** Revert only the CMS worker claim validation/normalization and source-revision projection, app client's exact initial-undecided claim DTO support, updated CMS/app claim tests, and this U10-A16 design/task/ledger evidence. Preserve all prior worker actions/auth boundaries, unrelated U10 work, and earlier harness scenarios.
- **Formal SDD reconstruction:** `pending`; this direct implementation did not invoke SDD.

### `U10-A17: Guard the undecided worker claim boundary`

- **Identity and scope:** Added a focused regression assertion that an initial CMS claim with `route: "undecided"` does not reach snapshot, provider, renderer, artifact staging, checkpoint writes, or completion. This is a safety-only partial of the prospective local worker execution deliverable; it does not implement route selection or claim U10/U11/U12 completion.
- **Requirements references:** `specs/vertex-feedback-analysis/spec.md` exact CountTokens routing; `specs/report-generation-lifecycle/spec.md` resumable stages and atomic completion; `specs/deterministic-report-delivery/spec.md` validated-only rendering.
- **Design references:** `design/02-http-contracts.md` worker claim/checkpoint/complete contracts; `design/04-ai-worker-infrastructure.md` CountTokens, graph validation, CMS CAS, and explicit incomplete-output boundary; `design/05-pdf-renderer-poc.md` validated rendering input.
- **Task references:** `tasks.md` Execution after U10-A16; tasks 4.1–4.3 remain unchecked.
- **Dependencies:** Existing synthetic worker runtime tests, app worker CMS client, and CMS lifecycle/checkpoint harness. No external services or real provider.
- **Changed paths and reasons:**
  - `teleferico-app/src/lib/feedback/worker-pdf.test.ts` — proves the initial undecided route is rejected before private snapshot/model/render/artifact work.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records observed verification and the incomplete execution boundary.
- **Implementation:**
  - Status: `partial`; regression protection only. The worker currently rejects the undecided route rather than selecting a route. Candidate size: 78 authored additions plus deletions against exact starting HEAD `e7327ff15cdea2880147fa841e2d1de6497bb0b2`, measured by tracked `git diff --numstat HEAD` across the two changed paths; below the 400-line PR default.
  - Revision: `pending` (local uncommitted candidate).
  - Pull request: `pending` (not authorized).
  - Merge evidence: `pending` (not authorized).
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts`
  - Status: `passed`
  - Exact result: exit 0; 1 file and 22 tests passed, including the new no-provider assertion.
- **Focused tests:**
  - Command: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-cms-client.test.ts`
  - Status: `passed`
  - Exact result: exit 0; 3 files and 53 tests passed.
- **Focused tests:**
  - Command: `npm --prefix teleferico-cms test -- feedback/generation-lifecycle`
  - Status: `passed`
  - Exact result: exit 0; 23 tests passed, including isolated PostgreSQL rollback coverage. The suite explicitly reports that worker checkpoint writes remain fail-closed until CMS can verify checkpoint bindings; direct semantic stages remain incomplete.
- **Focused tests:**
  - Command: `npm --prefix teleferico-cms test -- feedback/admin-report-commands`
  - Status: `passed`
  - Exact result: exit 0; 1 authenticated Strapi/PostgreSQL HTTP test passed, including worker claim/snapshot/fail boundaries, authorization denial, and bounded body behavior. No checkpoint or completion was accepted.
- **Static validation:**
  - Command: `pnpm --dir teleferico-app run typecheck`
  - Status: `passed`
  - Exact result: exit 0; `tsc -p tsconfig.json --noEmit` emitted no diagnostics. `git diff --check` — exit 0, no output after the ledger append.
- **Intentionally deferred validation:**
  - Exact scenario: End-to-end execution from an undecided CMS claim through exact CountTokens route selection, direct/map-reduce validated outputs, CMS-recomputed checkpoint graph/CAS writes, validated completion, and private PDF/report delivery.
  - Status: `not run`
  - Reason: Current CMS checkpoint verification explicitly rejects map-reduce and reports direct/map/reduce/validate semantic outputs as incomplete; the authenticated checkpoint action remains fail-closed and the app client has no complete operation. Activating the worker would require bypassing precisely the CMS-authoritative validation and completion safeguards that this work must preserve. No compatible full execution path is verified in this candidate.
  - Intended future checkpoint: A follow-up cohesive local app–CMS–worker implementation after complete semantic/evidence validation, route-specific graph/CAS verification, completion HTTP/service wiring, and a synthetic integration scenario are implemented together.
  - Owner: TB-113 app/CMS worker implementer and reviewer.
- **Acceptance criteria:**
  - An undecided claim cannot invoke provider, renderer, or artifact staging: `passed` by the focused worker test.
  - CountTokens routing, direct/map-reduce stage graph, CMS-authoritative checkpoint persistence, atomic completion, and app↔CMS↔worker execution: `pending`; not implemented in this partial.
  - Runtime capability remains disabled/fail-closed absent operational composition: `pending` integrated validation; no flag/configuration was changed.
- **Residual risks:** The requested local worker execution behavior remains unimplemented. Existing fake CMS success paths in worker-PDF tests do not prove CMS checkpoint acceptance or atomic completion over HTTP. Do not infer U10, U11, or U12 completion from these checks.
- **Rollback boundary:** Revert only the new undecided-claim regression test and this ledger entry; preserve the pre-existing fail-closed runtime and all earlier worker/CMS contracts.
- **Later integrated validation:** `pending`; no synthetic app↔CMS↔worker model-execution or complete/report-delivery scenario ran.
- **Correction or follow-up:** Trigger: complete the prospective local execution deliverable without weakening incomplete validation, CMS CAS, unknown-version, or completion boundaries. Status: `pending`; fix and revalidation evidence: `pending`.
- **Formal SDD reconstruction:** `pending`; no SDD phase or formal task checkbox was changed.

### `U10-A17 continuation correction: Executable local zero-comment direct route`

- **Identity and relationship to prior entry:** Continued the same local writer/candidate on `feat/app-cms-root-tb-113-worker-execution`; this is a correction within the prospective cohesive local worker outcome, not another work unit/PR. The earlier 27-line test and 51-line ledger entry were work-in-progress evidence. This correction supersedes their assertion that no direct local route or CMS checkpoint/completion path was implemented; historical text above is retained unchanged.
- **Implemented behavior:** The worker remains `undecided` until an injected CountTokens analogue receives the canonical versioned request (model config, instructions, schema, official metrics, sanitized comments). It validates exact integer segment results, computed headroom, output reservation, total budget, and stores a digest of the exact request. Only a fitting direct route continues. The app then writes `redact`, `count`, empty-evidence `direct`, `validate`, `render`, and `store` checkpoints through the scoped CMS HTTP client, stages deterministic private PDF bytes, and requests completion. Transient injected provider/count operations receive at most two retries.
- **CMS authority/security:** Added separate `workerCheckpoint` and `workerComplete` custom content API token actions. Controllers enforce native `content-api-token` strategy and exact per-action scope before body access. Checkpoint writes lock the generation and snapshot, recompute direct graph/order/dependencies/config/input/output and CountTokens request bindings, then CAS-persist only accepted stages. Completion repeats full graph validation and checks the fixed analysis, deterministic report identity, renderer and artifact fields; it creates the report relation and succeeds the generation in one transaction. Ordinary claim/fail transactions no longer select private `snapshot_json`. `docs/STRAPI_PERMISSIONS.md` now documents the exact action boundary; no default or persistent grant was added.
- **Deliberate local limit:** The executable route is restricted to a snapshot with zero eligible comments and the exact seven-section, no-claims, fixed insufficient-evidence output. Any nonempty-comment analysis is rejected; map/reduce remains unsupported because minimal-fit chunk proof and complete semantic validation are not available. The only provider/count implementations in the synthetic end-to-end test are injected fakes. Production generation remains disabled; no live provider/storage/queue credentials, service composition, config, or deployment changed. Do not claim full U10/U11/U12 completion.
- **Changed paths and reasons:**
  - `teleferico-app/services/survey-report-worker/src/direct-execution-plan.ts` — creates canonical CountTokens input, fit decision, and fixed empty-evidence output contract.
  - `teleferico-app/services/survey-report-worker/src/{contracts.ts,checkpoint-contract.ts,worker-cms-client.ts,worker-runtime.ts}` — typed six-stage direct execution, v1 digests, exact action-scoped checkpoint/completion HTTP, retry/replay, and deterministic report/artifact identity.
  - `teleferico-app/src/lib/feedback/{worker-pdf.test.ts,worker-cms-client.test.ts}` — verifies route selection/input digest, no semantic or budget bypass, PDF pipeline, and exact scoped HTTP operations.
  - `teleferico-cms/src/api/survey-report-generation/{controllers/survey-report-generation.js,routes/admin.js,services/checkpoint-contract.js,services/lifecycle.js,services/survey-report-generation.js}` — authenticated endpoints, graph validation/CAS, private snapshot transaction projection, and atomic report completion.
  - `teleferico-cms/test/feedback/{admin-report-commands.test.js,generation-lifecycle/lifecycle.test.js,permissions/permissions.test.js,permissions/postgres-permissions.test.js,private-report-source.test.js}` — verifies deny-by-default scopes, contracts, and real isolated app-client↔Strapi/PostgreSQL synthetic execution.
  - `docs/STRAPI_PERMISSIONS.md`, `openspec/changes/tb-113-visitor-feedback/{README.md,design/02-http-contracts.md,design/04-ai-worker-infrastructure.md}` — records supported direct boundary, new action scopes, and retained fail-closed gates.
- **Focused verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-cms-client.test.ts` — `passed`; exit 0, 3 files and 54 tests.
  - `pnpm --dir teleferico-app run typecheck` — `passed`; exit 0, no diagnostics.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — `passed`; exit 0, 23 tests including isolated PostgreSQL lifecycle rollback coverage.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — `passed`; exit 0, 1 authenticated Strapi/PostgreSQL HTTP test.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — `passed`; exit 0, 4 tests including isolated route registration and no-default-grant assertions.
  - `npm --prefix teleferico-cms test -- feedback/private-report-source` — `passed`; exit 0, 1 isolated Strapi/PostgreSQL HTTP integration test. It executes the app worker runtime through the restricted same-process TypeScript loader, uses only synthetic action-scoped custom tokens, proves 6 CMS checkpoint CAS writes plus report completion, rejects a bad completion digest without changing the running row or inserting a report, verifies the source-generation relation, and confirms complete/worker terminal replay without duplicates. Test-owned services/data were cleaned up.
  - `git diff --check` — `passed`; exit 0, no output after the continuation ledger append.
- **Intentionally deferred:** Nonempty-comment validated narrative, exact map/reduce chunk planning/output semantics, Vertex, GCS, Cloud Tasks/Cloud Run/OIDC, DNS/egress, production token/provider wiring, feature enablement, broad E2E, deployment/staging, and formal SDD closure remain `not run` or pending under their existing owners. No attempt was made to weaken these gates.
- **Rollback boundary:** Revert this continuation's app direct execution, CMS checkpoint/completion actions/services/tests, permission/design documentation updates, and both U10-A17 ledger entries together; preserve all predecessor commits and unrelated TB-113 behavior.
- **Current status:** `partial`—an independently exercised local empty-evidence direct path works end to end; all nonempty semantic and map/reduce paths remain unavailable. Formal tasks 4.1–4.3 and U15 remain unchecked/pending. Candidate size: `1,931` authored additions plus deletions against exact starting HEAD `e7327ff15cdea2880147fa841e2d1de6497bb0b2`, measured as tracked `git diff --numstat HEAD` plus the 157-line untracked direct-execution module. No commit or publication was authorized.
- **Provider-call safety correction (same candidate):** RED — `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` exited 1; the direct-route test observed one `analysisProvider` call for an empty-comment snapshot. GREEN — the same command exited 0 with 1 file/23 tests; zero-comment direct output is now deterministic and the injected analysis provider is not invoked. Full required app triplet then passed 3 files/54 tests; `pnpm --dir teleferico-app run typecheck` and the isolated CMS lifecycle/private-source checks passed.

### Current candidate-specific size exception authorization

- **Identity:** `feat/app-cms-root-tb-113-worker-execution` against exact base `e7327ff15cdea2880147fa841e2d1de6497bb0b2`.
- **Authorization:** The user explicitly approved up to `6,000` authored additions plus deletions for this one cohesive local TB-113 worker-execution candidate.
- **Scope:** This exact branch/base/candidate only. This is not blanket authority for another candidate, branch, or base and expires with this candidate. No commit, push, PR, remote, GCP, credential, install, or SDD permission is granted by the size exception.

### Same-candidate semantic and map/reduce gate assessment

- **Nonempty direct blocker:** `services/survey-report-worker/src/analysis-output-preflight.ts` returns `incomplete` for clean direct output; `design/04-ai-worker-infrastructure.md` does not define machine-verifiable claim-to-metric entailment, contradictory/current-vs-previous truth, or an authorized per-run evidence-key provider. A fake model output cannot independently prove those semantics, so no nonempty direct provider output or checkpoint was enabled.
- **Map/reduce blocker:** `preflightMapAnalysis`/`preflightReduceAnalysis` explicitly retain blockers for minimal-fit CountTokens authority, immutable key selection, CMS map-digest authority, and semantic validation; the CMS `verifyCheckpointGraphV1` rejects `route: "map-reduce"`. No graph/CAS or completion path was relaxed to force acceptance.
- **Disposition:** No speculative semantic validators, synthetic production fallback, extra route, or additional micro-unit was added. Keep those paths blocked pending an independently specified proof contract. The zero-comment direct route and provider-call correction remain the only executable analysis path in this candidate.
- **Current candidate measurement:** `1,941` authored additions plus deletions against exact base `e7327ff15cdea2880147fa841e2d1de6497bb0b2`, tracked `git diff --numstat HEAD` plus the 157-line untracked direct-execution module; inside the user-approved 6,000-line cap for this branch/candidate only.
- **Post-assessment size correction:** After recording the candidate-scoped authorization in `tasks.md` and this ledger and completing the bounded gate assessment, final current candidate size is `1,949` authored additions plus deletions by the same method; no code beyond the previously validated zero-comment provider-call correction was added in this turn.

### `Local worker execution continuation: Synthetic nonempty direct analysis`

- **Identity and route:** Continued locally on `feat/app-cms-root-tb-113-nonempty-analysis` from exact supplied parent PR #374 head `c0d3897a99d447b1e3193843f20d91d0364cd85f`. This is one cohesive direct implementation, not an SDD phase. No branch, commit, publication, remote service, GCP, Notion, credential, install, or deployment-default operation was performed.
- **RED/GREEN evidence:** RED — the initial focused app run observed two obsolete expectations (`incomplete` rather than structurally accepted direct output; nonempty execution failed before provider invocation); the first CMS integration run observed the pre-existing zero-route schema/count mismatch and failed at completion on the fixed empty-only CMS completion validator. GREEN — after aligning app/CMS count schemas and instructions, preserving zero-comment fallback, and admitting only verified direct narratives, the final focused app triplet passed 3 files/54 tests; CMS lifecycle passed 23 tests on a sequential rerun; admin-report-commands passed 1 integration test; permissions passed 4 tests; private-report-source passed 1 isolated Strapi/PostgreSQL integration test; app typecheck passed; and `git diff --check` passed with no output. One overlapping Docker harness run of the lifecycle command separately failed with `Connection terminated unexpectedly`; its serial rerun passed. All final CMS harness commands were executed serially after that contention.
- **Implemented behavior:** The local direct route keeps the initial graph undecided until an injected CountTokens fake validates a canonical request containing the closed direct schema, deterministic metrics, and redacted complete comment copies. A fitting request selects direct. Nonempty direct output now passes app preflight only with closed schema/order, unique sorted claim IDs, valid same-run/key evidence refs and snapshot membership, minimum signal thresholds, scalar text, privacy/prohibited/verbatim checks, and numeric values found in immutable core metrics. The worker sends only email/phone/URL-redacted comment copies to CountTokens and the injected analysis provider. Semantic truth, contradiction, metric entailment, and editorial review remain deliberately outside acceptance.
- **CMS authority and publication:** CMS resolves `evidenceKeyId` through an optional injected server-only `feedback.workerEvidenceKeyProvider`; there is no provider/key default. Missing or mismatching evidence-key material fails closed for nonempty checkpoint writes. CMS recomputes reference membership and structural/privacy constraints from its locked snapshot, validates the claim-to-published-prose projection, and retains graph/digest/CAS checks. The isolated app–worker–Strapi/PostgreSQL integration proves six ordered checkpoint writes, redaction, a nonempty direct analysis result, deterministic synthetic PDF artifact and atomic completion, source-generation relation, and terminal replay without duplicate reports. Map/reduce remains a separate fail-closed route. Feature capability remains disabled and no real provider/storage/queue was configured.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/{analysis-output-preflight.ts,checkpoint-contract.ts,contracts.ts,direct-execution-plan.ts,worker-runtime.ts}`; `teleferico-app/src/lib/feedback/{worker-output-preflight.test.ts,worker-pdf.test.ts}`; `teleferico-cms/src/api/survey-report-generation/services/{checkpoint-contract.js,lifecycle.js,survey-report-generation.js}`; `teleferico-cms/test/feedback/private-report-source.test.js`; and `openspec/changes/tb-113-visitor-feedback/{README.md,design/04-ai-worker-infrastructure.md}`.
- **Exact verification commands/results:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-cms-client.test.ts` — passed; 3 files, 54 tests.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; 23 tests, including isolated PostgreSQL rollback coverage (serial rerun after one resource-contention failure).
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; 1 isolated authenticated Strapi/PostgreSQL test.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — passed; 4 tests.
  - `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; 2 tests (the outer isolated-source scenario and a nested synthetic app–worker–CMS nonempty-direct scenario), including final cleanup.
  - `pnpm --dir teleferico-app run typecheck` — passed; no diagnostics.
  - `git diff --check` — passed; no output.
- **Deferred:** Exact minimal-fit map/reduce token routing and map/reduce checkpoint/CMS authority, real Vertex/CountTokens and operational evidence-key provisioning, Google/GCS/Cloud Tasks/Cloud Run/OIDC readiness, production configuration, feature enablement, full E2E/Cloud Build, deployment/staging, and formal SDD verification/archive remain unproven or unauthorized. U10/U11/U12 checkboxes remain unchanged and incomplete.
- **Rollback boundary:** Revert the 14 changed paths together to remove this nonempty-direct continuation while preserving the prior zero-comment route and unrelated TB-113 work.
- **Candidate measurement and status:** `612` authored additions plus deletions against the exact supplied parent head, calculated from tracked `git diff --numstat HEAD` plus any untracked authored-file lines; no untracked files were present. This is below the standing TB-113 cap of 6,000. Status: local synthetic nonempty direct route implemented and the final requested focused checks passed; map/reduce and operational gates remain deferred. No commit or publication was authorized.

### `HTTP contract correction: nonempty direct route`

- **Correction:** The two stale worker-route paragraphs in `design/02-http-contracts.md` now distinguish CMS-verified zero/nonempty DIRECT graphs from the unsupported map/reduce route. They document injected CountTokens/provider/key fakes, CMS-recomputed evidence membership and structural/privacy/deterministic-metric validation, atomic completion, the deliberate absence of semantic-truth judgment, and gated live provider/storage integrations. Earlier entries remain unchanged.
- **Verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-cms-client.test.ts` — passed, 3 files/54 tests. `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed, 2 tests including the nested nonempty direct app–worker–CMS integration and cleanup. `git diff --check` — passed with no output.

### `U10 private worker HTTP entrypoint: local synthetic boundary`

- **Identity and scope:** Continued the direct implementation on `feat/app-root-tb-113-private-worker-http` from exact local parent `c33c1452bd5fb4a5244142f8786652f3bdabeabd` (the supplied open draft PR #379 head). Added the canonical private worker execute endpoint around existing `executeReportWorker`; no SDD phase, branch switch, commit, publication, or tracking read occurred.
- **Requirements and design:** `specs/survey-worker-operations/spec.md` private idempotent task execution and OIDC denial; `design/02-http-contracts.md` exact worker command contract; `design/04-ai-worker-infrastructure.md` OIDC identity and keyless runtime gates; `tasks.md` prospective local worker execution and task 4.1.
- **Implemented boundary:** Added a pure handler requiring explicit runtime dependencies and an injected signed-token verifier. It checks verified signature result, exact frozen issuer allowlist/audience/principal and temporal claims before body reads or CMS calls; then enforces exact POST path, no query, JSON media type, 4 KiB raw bound, closed command shape, and safe response projection. Added an opt-in Node HTTP server adapter with no auto-start. Invalid OIDC and malformed transport requests stop before CMS; valid requests invoke the existing worker executor, preserving claim/replay/checkpoint behavior.
- **Changed paths and reasons:**
  - `teleferico-app/services/survey-report-worker/src/worker-http.ts` — pure authenticated command handler and explicit Node adapter.
  - `teleferico-app/services/survey-report-worker/src/index.ts` — exports the opt-in HTTP boundary.
  - `teleferico-app/src/lib/feedback/worker-http.test.ts` — verifies auth-first denial, identity/temporal checks, route/method/query/media/body limits, valid loopback execution, and server cleanup with synthetic dependencies.
  - `openspec/changes/tb-113-visitor-feedback/README.md` — clarifies local endpoint evidence and production readiness gap.
  - `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md` — records the exact HTTP, auth, bounded response, and runtime composition contract.
  - `openspec/changes/tb-113-visitor-feedback/design/04-ai-worker-infrastructure.md` — records the injected verifier boundary and remaining OIDC/CMS operation gates.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — records this unit and observed checks.
- **Implementation status:** `passed` for the local synthetic HTTP boundary only; no deployed readiness is claimed. Revision, PR update/publication, merge evidence, and formal verification remain `pending`.
- **Focused verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-http.test.ts src/lib/feedback/worker-pdf.test.ts` — `passed`; exit 0, 2 files and 31 tests.
  - `pnpm --dir teleferico-app run typecheck` — `passed`; exit 0, no diagnostics.
  - `git diff --check` — `pending` final run after this ledger append.
- **Intentionally deferred:** Real Cloud Run listener/configuration, Cloud Tasks delivery, production OIDC signature verifier, approved CMS origin and action-bound token provider, Google/Vertex/Cloud Storage integration, deployment, and staging checks — `not run`; no operational authorization or production composition was supplied. Intended checkpoint: separately approved post-development integration and operational validation; owner: TB-113 app/CMS worker implementer and platform operator.
- **Acceptance and formal status:** Synthetic invalid-token rejection before CMS and valid existing-executor dispatch are `passed` by the focused loopback tests. Formal task 4.1 remains unchecked; U10/U11/U12 operational readiness, task completion, and SDD verification/archive remain `pending`.
- **Residual risks:** The verifier and runtime dependencies are ports, not production implementations. A caller must supply a real signature-verifying OIDC verifier and construct the worker CMS client with an approved exact-origin allowlist and action-bound token provider. The local adapter has no total execution deadline; Cloud Run deadline configuration and deadline-respecting production dependencies remain activation gates. No test identity or default listener is installed. The existing `FEEDBACK_CAPABILITY_ENABLED=false` default is unchanged.
- **Rollback boundary:** Revert `worker-http.ts`, its export, `worker-http.test.ts`, and the three documentation/ledger updates together; the existing worker runtime and direct/map-reduce behavior remain unchanged.
- **Authored candidate size:** `727` additions plus deletions against exact local parent `c33c1452bd5fb4a5244142f8786652f3bdabeabd`, measured from tracked `git diff --numstat` plus all lines in the two untracked authored files; standing TB-113 ceiling is 6,000 additions plus deletions.
- **Formal SDD reconstruction:** `pending`; no formal SDD operation was requested or invoked.
- **Scope:** Documentation-only correction to the two identified paragraphs plus this append-only evidence entry. No code, test, task checkbox, runtime configuration, or operational gate changed.

### `Worker privacy projection and completion replay correction`

- **RED:** The new app boundary test failed because CountTokens received the old comment serialization; the new CMS lifecycle replay test failed with `Missing expected rejection` because altered analysis returned replay success with the stored digest.
- **GREEN:** The app worker suite passed 3 files/55 tests; CMS generation lifecycle passed 24 tests including the altered-replay rejection; admin-report-commands passed 1, permissions passed 4, and private-report-source passed 2 tests including the app–worker–CMS integration; app typecheck and `git diff --check` passed.
- **Correction:** For nonempty input, CountTokens and analysis receive only `survey-model-input.v1`: deterministic snapshot metrics and per-comment `{period, redacted text, evidenceRef}`; the zero-comment route preserves its `[]` CountTokens comment segment. CMS recomputes the exact sanitized nonempty CountTokens digest and reference membership using the locked private snapshot and injected key. A succeeded replay verifies the command analysis's canonical digest and exact stored analysis before returning `replayed:true`; exact replay performs no writes.
- **Boundary:** The worker retains source identity/ref mapping privately. Map/reduce, semantic-truth checks, live provider/storage, and production enablement remain unchanged and gated.

### `Local worker execution continuation: Synthetic two-chunk Map/Reduce`

- **Identity and scope:** Continued locally on `feat/app-cms-root-tb-113-map-reduce-worker` from the exact supplied draft-parent #375 head `c6b002d0fd6bc1775d3f9255e067e301a1a6312e`. This is one direct implementation continuation; no branch switch, commit, publication, remote service, GCP, Notion, credential, install, environment-default, schema, persistent grant, or deployment change occurred.
- **RED evidence:** Added a synthetic app–worker–Strapi/PostgreSQL scenario with a complete two-comment snapshot. The first run failed as intended: CountTokens did not select/persist an executable route and the worker returned `failed` instead of the expected completed report. A forged map checkpoint digest case was added to the same integration: CMS must reject a persisted map output-digest mismatch before accepting Reduce.
- **Implemented behavior:** The worker CountTokens-counts the complete direct request, then tests byte-balanced, complete-record map requests for chunk counts in ascending order and selects the smallest count for which every chunk fits. No record is sampled or dropped. The count checkpoint binds the direct request plus every candidate chunk-count request digest and segment result. Map and CMS derive the same evidence refs, memberships, and membership digests from the immutable snapshot and the same injected key. Map stages persist closed output plus output-count evidence. Reduce receives only outputs from acknowledged persisted map checkpoints, their checkpoint digests, and deterministic core metrics; the CMS independently checks ordered digest membership and the full input/output/checkpoint graph under state-version CAS. CMS also re-runs the injected CountTokens authority on the serialized route/output requests; absent CMS-side provider authority, Map/Reduce writes fail closed. Final Reduce/Validate/Render/Store completion is atomic and terminal replay does not duplicate the report.
- **Validation policy:** Structural/privacy/reference/threshold/output-budget validation is enforced through the existing Map/Reduce preflights and CMS verifier. Semantic truth, contradiction, metric entailment, and per-report human editorial approval are deliberately not required. The direct route and zero-comment fallback remain unchanged. Live Google providers, operational evidence-key provisioning, GCS, Cloud Tasks, deployment defaults, and feature enablement remain out of scope; the deployment flag stays false.
- **Changed paths and reasons:**
  - `teleferico-app/services/survey-report-worker/src/map-reduce-execution-plan.ts` — serializes complete requests, derives deterministic map inputs, and selects the smallest CountTokens-fitting chunk count.
  - `teleferico-app/services/survey-report-worker/src/map-reduce-worker-runtime.ts` — executes/resumes the map, reduce, validation, rendering, storage-checkpoint, and completion stages.
  - `teleferico-app/services/survey-report-worker/src/{analysis-output-preflight.ts,checkpoint-contract.ts,contracts.ts,direct-execution-plan.ts,worker-cms-client.ts,worker-runtime.ts}` — closes Map/Reduce input/output, checkpoint, CMS transport, and route-selection contracts while preserving direct behavior.
  - `teleferico-app/src/lib/feedback/worker-output-preflight.test.ts` — aligns pure preflight evidence with the structurally accepted/no-semantic-truth contract.
  - `teleferico-cms/src/api/survey-report-generation/services/{checkpoint-contract.js,lifecycle.js,survey-report-generation.js}` — independently recounts exact requests, verifies map membership/ref/output digests and ordered graph/CAS, and permits only the verified route-specific atomic completion.
  - `teleferico-cms/test/feedback/private-report-source.test.js` — proves two-chunk synthetic app–worker–CMS HTTP execution, forged persisted map-digest rejection, deterministic completion, and terminal replay.
  - `openspec/changes/tb-113-visitor-feedback/{README.md,design/02-http-contracts.md,design/04-ai-worker-infrastructure.md}` — synchronizes the local route contract, payload shape, and operational deferrals.
  - `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` — append-only evidence for this continuation.
- **Exact verification commands/results:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts src/lib/feedback/worker-cms-client.test.ts` — passed; 3 files, 55 tests.
  - `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed; 24 tests, including isolated PostgreSQL rollback coverage.
  - `npm --prefix teleferico-cms test -- feedback/admin-report-commands` — passed; 1 authenticated isolated Strapi/PostgreSQL test.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — passed; 4 tests.
  - `npm --prefix teleferico-cms test -- feedback/private-report-source` — passed; 3 tests, including nested nonempty-direct and two-chunk Map/Reduce app–worker–CMS integrations and test-owned cleanup.
  - `pnpm --dir teleferico-app run typecheck` — passed; no diagnostics.
  - `git diff --check` — passed; no whitespace errors after the final ledger append.
- **Intentionally deferred:** Live Vertex/CountTokens, real evidence-key provisioning, production CountTokens provider composition, Google/GCS/Cloud Tasks/Cloud Run/OIDC readiness, deployment/staging, full E2E/Cloud Build, and formal SDD verification/archive remain not run or unauthorized. U10/U11/U12 formal task checkboxes remain unchanged and unchecked.
- **Rollback boundary:** Revert this continuation's app/CMS Map/Reduce worker/checkpoint code and focused integration/preflight tests, plus its README/design/ledger documentation changes, as one candidate; preserve the exact #375 parent, pre-existing direct worker behavior, and unrelated work.
- **Status:** Local synthetic Map/Reduce implementation and listed focused checks passed. This is not live-provider readiness, formal U10–U12 completion, integrated-development evidence, or publication. No commit or PR was created.
- **Authored size:** `2,126` additions plus deletions across 17 candidate paths, measured once against exact parent `c6b002d0fd6bc1775d3f9255e067e301a1a6312e` as tracked `git diff --numstat` additions+deletions plus authored line counts of both untracked source files; below the standing 6,000-line TB-113 cap.

### `CMS map checkpoint identity binding correction`

- **RED:** Added a valid `map.2-of-2` payload with a self-consistent membership and output digest under a `map.1-of-2` checkpoint. Before the fix, `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` failed with `Missing expected exception`, proving the CMS accepted the mismatched identity.
- **Fix:** `verifyCheckpointGraphV1` now binds every map stage key, route, stage index, payload chunk ID/index/count, and graph chunk count during both candidate writes and full persisted-graph verification. The same identity checks therefore run again during Reduce and completion graph verification.
- **GREEN:** `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` — passed, 25 tests including PostgreSQL rollback. The private-report-source nested two-chunk app–worker–CMS scenario passed, including rejection of a forged persisted digest; the outer harness command exited 1 after its subtests with Strapi cron `ReferenceError: strapi is not defined` during teardown. App Vitest triplet (3 files/55 tests), CMS admin-report-commands (1), CMS permissions (4), app typecheck, and `git diff --check` passed.
- **Rollback boundary:** Revert the map stage identity guard in `teleferico-cms/src/api/survey-report-generation/services/checkpoint-contract.js`, this RED/GREEN test in `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js`, and this ledger correction together; preserve the prior synthetic Map/Reduce implementation.
- **Current full candidate size:** `2,258` authored additions plus deletions across 18 paths against exact parent `c6b002d0fd6bc1775d3f9255e067e301a1a6312e`; method: tracked `git diff --numstat` totals plus line counts for both untracked app worker source files. This remains below the standing 6,000-line cap.

### `CMS map checkpoint identity corrective follow-up`

- **RED/GREEN:** Before the verifier fix, `npm --prefix teleferico-cms test -- feedback/generation-lifecycle` failed at the new case with `Missing expected exception`: a self-consistent `map.2-of-2` payload was accepted under `map.1-of-2`. After the fix, the same command passed 25 tests including PostgreSQL rollback. The checker now binds entry stage key/index/route to payload chunk ID/index/count during writes and replay/completion graph verification.
- **Remaining verification:** App focused Vitest triplet passed (3 files/55 tests); app typecheck passed; CMS admin-report-commands passed (1); permissions passed (4); `git diff --check` passed. CMS private-report-source inner direct and two-chunk Map/Reduce subtests passed, including forged persisted digest rejection and cleanup, but the outer command exited 1 after teardown because Strapi's scheduled cron raised `ReferenceError: strapi is not defined`.
- **Rollback boundary:** Revert only the map stage identity guard in `teleferico-cms/src/api/survey-report-generation/services/checkpoint-contract.js`, the RED test in `teleferico-cms/test/feedback/generation-lifecycle/lifecycle.test.js`, and this appended correction; preserve the prior Map/Reduce worker implementation.
- **Current full candidate size:** `2,265` authored additions plus deletions across 18 paths against exact parent `c6b002d0fd6bc1775d3f9255e067e301a1a6312e`; tracked numstat additions+deletions plus authored lines in both untracked app worker source files.

### `Test-only Strapi cron teardown correction`

- **Primary failure and diagnosis:** `npm --prefix teleferico-cms test -- feedback/private-report-source` previously exited 1 after its 3 tests passed with `ReferenceError: strapi is not defined` from `@strapi/core/dist/services/cron.js:35`. Source inspection showed this was a test-owned lifecycle gap: the test destroyed its Strapi instance while scheduled jobs remained active; Strapi's cron error listener closes over the global `strapi`, which destroy removes. It was not candidate runtime logic, concurrent harness contention, or an external resource failure.
- **Fix and cleanup proof:** Test `finally` now calls the supported `strapi.cron.stop()` before `strapi.destroy()` and asserts every owned job has no next invocation. Existing Strapi shutdown, environment restoration, Docker stack removal, and owned container/volume absence assertions remain unchanged; no production CMS config was changed and no asynchronous error was hidden.
- **Verification:** One serial `npm --prefix teleferico-cms test -- feedback/private-report-source` run after this correction passed, exit 0; 3 tests passed, including the direct and synthetic two-chunk app–worker–CMS cases. The earlier required app/CMS focused suites, typecheck, and diff check are recorded above.
- **Rollback boundary:** Revert only the cron stop/observable assertion in `teleferico-cms/test/feedback/private-report-source.test.js` and this ledger note; preserve worker behavior and the existing bounded owned-resource cleanup.
- **Current full candidate size:** `2,281` authored additions plus deletions across 18 paths against exact base `c6b002d0fd6bc1775d3f9255e067e301a1a6312e`, counting tracked diff additions+deletions and both untracked app worker source files.

### `Offline deterministic report-output adapter`

- **Identity and route:** Continued directly on `feat/app-root-tb-113-report-output-worker` from the supplied exact parent #376 head `496decf63f0a2b13c90ab537928dbb2f2098ec15`; local `HEAD` matched that SHA and the working tree was clean before edits. No branch switch, commit, publication, remote service, GCP, Notion, credential, dependency, lockfile, environment, storage grant, deployment, or SDD operation occurred.
- **Implemented behavior:** The validated worker input now produces the fixed ordered eight-section report with the five required charts assigned to distribution/evolution, aspects, and QR points. PDF generation is an explicitly injected offline Playwright adapter using the existing ECharts 6.1, Chromium 1228 binary digest, DejaVu font digest, and Node v22.22.0 from the POC. It embeds the pinned font, checks report structure and accessible figure/table semantics, requires vector chart text and no raster/motion/remote assets, rejects rendered evidence refs or verbatim source comments before invoking the renderer, and normalizes Chromium creation/modification timestamps before SHA-256 calculation. Re-rendering the same synthetic direct report produced the same PDF digest and artifact metadata.
- **Synthetic worker proof:** Extended the nonempty direct worker test to render an actual `%PDF-` artifact through the current app worker validation path and an injected in-memory artifact store. CountTokens, analysis, and evidence-key providers are synthetic fakes; the CMS port is the existing app test fake, not an authenticated CMS HTTP integration. The renderer audit passes for the produced report, the staged artifact digest matches the worker completion metadata, and a narrative containing the raw source comment is rejected before rendering. Formal U12 remains unchecked.
- **POC gate blocker:** The required command `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/components/administration/feedback/__tests__/renderer-poc.test.ts` ran, with the worker suite passing and the Appendix-05 test failing criterion 8 (`publicGraphExcluded=false`). The audit flags existing server-side imports in `teleferico-app/src/lib/feedback/admin-command.ts` and `generation-lifecycle.ts`; neither path is changed here. The checked-in POC result records an earlier pass and is not current evidence for criterion 8. Do not treat this offline adapter as production renderer adoption/readiness; keep runtime composition and storage disabled pending an accurate graph-boundary pass and all gates.
- **Changed paths:** `teleferico-app/services/survey-report-worker/src/pdf.ts`; `teleferico-app/src/lib/feedback/worker-pdf.test.ts`; `openspec/changes/tb-113-visitor-feedback/{README.md,design/05-pdf-renderer-poc.md,tasks.md,direct-implementation-ledger.md}`.
- **Exact verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts` — passed, 1 file/25 tests; `pnpm --dir teleferico-app run typecheck` — passed, exit 0; `git diff --check` — passed, no output. The combined focused worker/POC command above exited 1 solely because the POC criterion 8 failed; its other POC tests passed. `npm --prefix teleferico-cms test -- feedback/private-report-source` — not run because the CMS harness was not changed; the worker test uses an in-memory fake CMS and this does not prove app–CMS HTTP integration. No broad suite or E2E was run.
- **Deferred:** Correctly scope/prove public client graph isolation; repeat the complete Appendix-05 gate after that boundary is resolved; real CMS HTTP acceptance with actual PDF renderer, production worker-image/browser/font pinning, GCS/retention, storage/download mediation, live providers, operational configuration, deployment, and formal SDD verification remain not run or blocked. No feature flag/default was enabled.
- **Rollback boundary:** Revert this candidate's worker PDF/report adapter changes, focused PDF test changes, and the corresponding README/design/task/ledger evidence together; preserve the exact parent and prior worker pipelines.
- **Candidate measurement:** `262` authored additions plus deletions across the six changed paths against exact parent `496decf63f0a2b13c90ab537928dbb2f2098ec15`, calculated from `git diff --numstat HEAD`; no untracked authored files were present. This is below the standing 6,000-line cap.

### `Offline renderer POC correction: Empty named runtime imports`

- **Correction:** The client-graph audit now treats `import {} from "playwright"` as a runtime module evaluation, while preserving elision of explicit type-only imports. Criterion 8 now describes a static source-graph audit and explicitly does not claim exact production-bundle analysis.
- **RED:** `pnpm --dir teleferico-app exec vitest run src/components/administration/feedback/__tests__/renderer-poc.test.ts -t 'empty named runtime import'` — exit 1; the injected `.js` client root was incorrectly reported as `isolated: true`.
- **GREEN verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/worker-pdf.test.ts src/components/administration/feedback/__tests__/renderer-poc.test.ts` — passed; exit 0; 2 files, 32 tests. Includes rejection of the empty named runtime import and preservation of type-only import elision. `pnpm --dir teleferico-app run typecheck` — passed; exit 0, no diagnostics.
- **Changed paths:** `teleferico-app/services/survey-report-worker/poc/renderer-poc.ts`; `teleferico-app/src/components/administration/feedback/__tests__/renderer-poc.test.ts`; `openspec/changes/tb-113-visitor-feedback/design/05-pdf-renderer-poc.md`; this ledger.
- **Proof boundary:** This verifies static client-root/transitive runtime-import classification only. It is not exact framework production-bundle proof, and no such claim is made.
- **Final `git diff --check`:** pending after this append.
- **Status:** `passed` for the bounded classifier correction and listed local checks only; the broader renderer adoption gate and operational/runtime readiness remain pending.

### `Offline renderer POC correction: Current full local gate`

- **Correction:** The initial criterion-8 failure above remains historical evidence. The current local POC passes all nine criteria under criterion 8's static client-root/transitive-import interpretation; this does not prove exact production Next.js bundle reachability.
- **Parent spotcheck:** On exact parent `496decf63f0a2b13c90ab537928dbb2f2098ec15`, the focused worker/POC Vitest selection passed 2 files/32 tests, app typecheck passed, and `git diff --check` passed.
- **Status boundary:** U12 remains unchecked pending production renderer/image integration, storage/download, and operational gates. No real GCS was used; production readiness and runtime adoption are not claimed.

### `U12-A: Private report download metadata and mediated PDF response`

- **Identity and scope:** Implemented on clean branch `feat/app-cms-root-tb-113-report-download-mediation` at exact starting HEAD `b0603009ddd02c12f8f06c618b46db712d337d00`. Added a custom-token-only CMS metadata action, server-authenticated app PDF endpoint, and injected synthetic metadata/object-reader integration. No live GCS reader, credential/token, persistent grant, deployment default, public permission, or live download UI was added; formal U12 remains open.
- **Requirements references:** `specs/deterministic-report-delivery/spec.md` private artifact and download purpose; `specs/feedback-administration/spec.md` report read capability and download mediation.
- **Design references:** `design/02-http-contracts.md` administration download response and CMS-only metadata action.
- **Task references:** `tasks.md` U12-A local storage/download behavior; U12 formal completion remains unchecked.
- **Dependencies:** Existing atomic report completion, immutable report/schema metadata, app origin/session/CSRF/capability gate, exact-origin CMS transport, and existing worker synthetic HTTP harness.
- **Changed paths:**
  - `teleferico-cms/src/api/survey-report-generation/routes/admin.js`, `controllers/survey-report-generation.js`, `services/survey-report-generation.js`, and `services/private-report-download-metadata.js` — registers the exact `workerReportDownloadMetadata` custom content API action, guards identity before query/validation, verifies private report metadata against its succeeded owning generation, and returns only the closed metadata envelope.
  - `teleferico-cms/test/feedback/private-report-source.test.js` — extends the existing isolated PostgreSQL/Strapi/app-loader harness with anonymous/JWT/wrong-scope/query/ID/unknown/failed-generation denials, exact action-token success, app transport, and in-memory object digest/size verification. Only synthetic database roles/tokens are granted.
  - `teleferico-cms/test/feedback/permissions/{permissions,postgres-permissions}.test.js` and `docs/STRAPI_PERMISSIONS.md` — register/document the no-default-grant action and test the real isolated permission baseline.
  - `teleferico-app/services/survey-report-worker/src/private-report-download-metadata-transport.ts` and its test — action-bound, exact-origin, bounded, deadline-limited server-only metadata transport.
  - `teleferico-app/src/lib/feedback/{admin-route,report-download.ts}` and `src/app/api/admin/feedback/reports/[reportId]/download/{route.ts,route.test.ts}` — capability/session/CSRF/origin-guarded handler, fail-closed production composition, injected metadata/object reader, bounded digest-verified PDF response, and security/response tests.
  - `teleferico-app/src/lib/feedback/{private-report-download-metadata-transport.test.ts,report-download.test.ts}` — transport validation, object digest/size/MIME, wrong generation, and no-storage-on-invalid-metadata coverage.
  - `openspec/changes/tb-113-visitor-feedback/{README.md,design/02-http-contracts.md,direct-implementation-ledger.md}` — documents the U12 local boundary, action contract, production fail-closed limit, and observed evidence.
- **Implementation:**
  - Status: `passed` for the local synthetic implementation only; production storage composition and operational readiness remain `pending`.
  - Revision: uncommitted on the supplied starting HEAD; no commit or PR created.
  - Pull request: `not created` by instruction.
  - Merge evidence: `pending`.
- **Focused tests:**
  - Command: `npm --prefix teleferico-cms test -- feedback/private-report-source`
  - Status: `passed`.
  - Exact result: exit 0; 3 tests passed (outer isolated Strapi/PostgreSQL harness plus 2 nested synthetic worker scenarios), including custom-token-only metadata HTTP, succeeded-generation ownership, app transport, and in-memory PDF digest/size checks; owned services and database volumes were cleaned up.
  - Command: `npm --prefix teleferico-cms test -- feedback/permissions`
  - Status: `passed`.
  - Exact result: exit 0; 4 tests passed, including actual isolated Strapi route registration and confirmation of zero default role/token grants.
  - Command: `pnpm --dir teleferico-app exec vitest run 'src/app/api/admin/feedback/runtime-harness.test.ts' 'src/app/api/admin/feedback/generations/route.test.ts' 'src/app/api/admin/feedback/reports/[reportId]/download/route.test.ts' 'src/lib/feedback/private-report-download-metadata-transport.test.ts' 'src/lib/feedback/report-download.test.ts'`
  - Status: `passed`.
  - Exact result: exit 0; 5 files passed; 27 tests passed.
  - Command: `pnpm --dir teleferico-app run typecheck`
  - Status: `passed`.
  - Exact result: exit 0; no TypeScript diagnostics.
  - Command: `git diff --check`
  - Status: `passed`.
  - Exact result: exit 0; no whitespace errors, including this ledger entry.
- **Intentionally deferred validation:**
  - Exact scenario: production GCS object reads with approved credentials/identity and any staging smoke.
  - Status: `not run`.
  - Reason: User explicitly prohibited real GCS, credentials, remote services, and operational work; no production object-reader composition exists, so the app factory fails closed.
  - Intended future checkpoint: separately authorized operational integration after development; keep `FEEDBACK_CAPABILITY_ENABLED` false until applicable gates pass.
  - Owner: TB-113 app/platform implementer and authorized operations owner.
- **Acceptance criteria:**
  - Capability flag short-circuits authentication and services; app origin/session/CSRF/read capability precede metadata/storage; malformed ID and unknown query are rejected: `passed` by Route Handler Vitest.
  - CMS uses exact native custom API token action; anonymous, ordinary JWT even with synthetic matching action, wrong-scope token, query, malformed ID, unknown report, and report tied to non-succeeded generation fail closed before unauthorized data projection: `passed` by isolated Strapi/PostgreSQL HTTP harness.
  - Successful response returns only closed metadata from report and succeeded source-generation relation; no comments, analysis, or storage URL: `passed` by Strapi integration and app transport tests.
  - Object reader receives the fixed private key plus 25 MiB bound; wrong size, PDF signature, MIME/metadata, or SHA-256 fails before response; verified PDF uses attachment, `private, no-store`, SHA-256 ETag, content length, and `nosniff`: `passed` by Vitest synthetic readers/Route Handler.
  - Production GCS reader/credential, browser download UI, production grant, live capability enablement, and formal U12 completion: `not run` / `pending` by scope.
- **Residual risks:** Production object storage has intentionally no reader or credential binding; report download returns bounded 503 until approved composition is supplied. The Route Handler buffers at most 25 MiB so it can verify the complete digest before any bytes are returned.
- **Rollback boundary:** Revert the CMS metadata service/action/controller wiring and permission tests/docs, app metadata transport/download service/Route Handler and focused tests, and this U12 README/design/ledger documentation as one unit. Preserve existing report completion, U8 report history, the private source reader, and all prior worker behavior.
- **Later integrated validation:** `pending`; require separately approved production-adjacent storage integration without enabling production defaults.
- **Correction or follow-up:** The permissions selector initially caught a stale expected application capability (`feedback.reports.download`); its assertion now matches the user-selected existing `feedback.reports.read` route capability, and the required CMS permissions selector passes 4/4.
- **Formal SDD reconstruction:** `pending`; no formal task checkbox, verification, or archive status was changed.
- **Candidate authored size:** `1,033` additions plus deletions against exact starting HEAD `b0603009ddd02c12f8f06c618b46db712d337d00`; method: tracked `git diff --numstat HEAD` additions+deletions plus authored line counts of all seven untracked text files, including this entry; below the standing 6,000-line ceiling.

### `U8-A continuation: Complete private administrative source pages`

- **Identity and scope:** Continued locally on `feat/app-cms-root-tb-113-admin-report-reads` at the user-supplied exact starting HEAD `2e17efaff1fbc5cddd7dbf31cd89c47d0fbf3332`, identified as the open draft PR #378 head. No branch switch, commit, push, PR, remote, GCP, Notion, credential, `.env`, dependency/lockfile, deployment, or SDD operation occurred. No visual/design-significant UI was changed.
- **Outcome:** Replaced arbitrary 1,000-submission/one-report-page caps with complete page/total reconciliation; the app requires explicit private comment/digest/report/actor fields and validates submission point/version row IDs against their canonical source rows. Added the separate exact-scope `feedbackAdminRead` CMS action, cutoff-bound 25-row cursor contract, reports bound to succeeded generations, action-bound app transport, and safe browser projection. `canDownload` remains false; no object key is used to infer availability.
- **Fail-closed boundary:** No production custom token, trusted CMS origin allowlist, or token-provider composition is approved or configured. `getFeedbackAdminReader()` therefore fails closed after Route Handler origin/session/CSRF/capability checks; the session JWT and public content token are not fallbacks. Production admin source reads remain unavailable until separately authorized runtime composition is supplied. No persistent/default CMS grant was added. U8 remains unchecked and the rest of U8 acceptance is not claimed.
- **Requirements/design:** `specs/feedback-administration/spec.md` report history, capability separation, and mediated reads; `specs/authoritative-survey-metrics/spec.md` immutable cutoff and complete population; `design/02-http-contracts.md` new private admin source-page contract and app transport.
- **Changed paths:**
  - `teleferico-app/src/lib/feedback/admin-reader.ts` and `.test.ts` — complete totals/cursor reads, fail-closed strict source fields, relation-ID binding, report parsing, and synthetic 28-submission/105-report paging plus chart projections.
  - `teleferico-app/src/lib/feedback/private-admin-read-transport.ts` and `.test.ts` — server-only exact-action/exact-origin transport, bounded response/deadline, and closed cursor envelope checks.
  - `teleferico-app/src/lib/feedback/admin-route.ts` and `src/app/api/admin/feedback/runtime-harness.test.ts` — browser Route Handler authenticates/capability-checks before private reader creation.
  - `teleferico-cms/src/api/survey-report-generation/{controllers/survey-report-generation.js,routes/admin.js,services/survey-report-generation.js,services/private-feedback-admin-read.js}` — new dedicated private admin action and page service; it reuses only the private source reader internally for its first three resources and keeps its own route/action scope.
  - `teleferico-cms/test/feedback/{permissions/permissions.test.js,permissions/postgres-permissions.test.js,private-report-source.test.js}` — exact route/validator checks and synthetic HTTP denial/allow plus 27-row 25+2 pagination scenario.
  - `docs/STRAPI_PERMISSIONS.md`, `openspec/changes/tb-113-visitor-feedback/design/02-http-contracts.md`, and this ledger — document exact grants, privacy, page contract, and operational deferral.
- **Focused verification:**
  - `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-reader.test.ts src/app/api/admin/feedback/runtime-harness.test.ts src/lib/feedback/private-admin-read-transport.test.ts` — passed; 3 files, 8 tests.
  - `pnpm --dir teleferico-app run typecheck` — passed; no diagnostics.
  - `node --test teleferico-cms/test/feedback/permissions/permissions.test.js` — passed; 3 tests, including route/action identity, docs, and closed page query validation.
  - `node --check` on all changed CMS implementation and test JavaScript paths — passed; no syntax diagnostics.
  - `npm --prefix teleferico-cms test -- feedback/permissions` — partial/failed; all 3 non-PostgreSQL checks passed, then the isolated PostgreSQL test could not start because the harness reported `No approved local Docker socket is available`.
  - `npm --prefix teleferico-cms test -- feedback/private-report-source` — not executed beyond harness startup; it exited before assertions for the same unavailable approved Docker socket.
  - `git diff --check` — pending final post-ledger check.
- **Synthetic evidence boundary:** The app reader test covers 28 submissions and 105 reports across 25-row pages, and checks summary-derived calendar/QR chart counts. The CMS HTTP harness change covers 27 submissions over real Strapi/PostgreSQL 25+2 pages, custom-action allow, JWT/worker/ungranted denial, private fields, stable totals, and cutoff-bound cursor rejection, but could not execute here. The CMS HTTP case with more than 100 persisted reports is `not run`; app paging coverage is not CMS persistence proof.
- **Intentionally deferred validation:** Exact `npm --prefix teleferico-cms test -- feedback/private-report-source` and the PostgreSQL portion of `npm --prefix teleferico-cms test -- feedback/permissions`; both are blocked before assertions by the local harness's missing approved Docker socket. Also not run: production CMS origin/token provisioning, app-to-Strapi transport integration, >100-report CMS/PostgreSQL integration, approved production object reader, authenticated visual/browser acceptance, broad app tests/E2E, and formal SDD verification. These remain pending; no Docker socket discovery or workaround was attempted.
- **Residual risks:** The private CMS report query's Strapi/PostgreSQL relation population, keyset predicate, total stability, and app↔CMS transport remain unverified by HTTP in this environment. Production admin reads intentionally remain unavailable until their separate exact-origin/custom-token composition exists. Downloads intentionally remain unavailable and `canDownload` false.
- **Rollback boundary:** Revert the new `feedbackAdminRead` route/controller/service and its tests/docs, app private transport/reader/route changes and focused tests, permissions documentation, design contract, and this entry together. Preserve prior worker source/download actions, native generation commands, dashboard visual structure, and every prior ledger entry/task checkbox.
- **Candidate size:** Before this append, `1,282` authored additions plus deletions against exact starting HEAD `2e17efaff1fbc5cddd7dbf31cd89c47d0fbf3332` (tracked `git diff --numstat HEAD` totals plus authored line counts of three untracked files). The final count including this entry is pending recalculation; the standing 6,000-line TB-113 cap is not approached.
- **Status:** `partial` — app behavior/typecheck and CMS non-database permission/query checks passed; the CMS/PostgreSQL HTTP proof and production transport composition remain unavailable. Formal U8/U10/U12 checkboxes remain unchanged and unchecked.
- **Formal SDD reconstruction:** `pending`; no SDD phase, formal task checkbox, verification, or archive status was changed.

### `U8-A continuation evidence correction: Final focused checks and size`

- **Correction:** Final checks were rerun after the previous entry and final ledger append. The previous authored-size measurement excluded both ledger entries and is superseded here.
- **Final app tests:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-reader.test.ts src/app/api/admin/feedback/runtime-harness.test.ts src/lib/feedback/private-admin-read-transport.test.ts` — passed; 3 files, 8 tests.
- **Final typecheck:** `pnpm --dir teleferico-app run typecheck` — passed; no diagnostics.
- **Final CMS source syntax:** `node --check` on `private-feedback-admin-read.js`, `controllers/survey-report-generation.js`, `services/survey-report-generation.js`, `routes/admin.js`, `permissions.test.js`, `postgres-permissions.test.js`, and `private-report-source.test.js` — passed with no output.
- **Final diff validation:** `git diff --check` — passed; exit 0, no output.
- **Final authored size:** `1,311` additions plus deletions against exact starting HEAD `2e17efaff1fbc5cddd7dbf31cd89c47d0fbf3332`, measured as tracked `git diff --numstat HEAD` additions plus deletions, plus authored line counts of the three untracked files. The count includes both ledger entries and remains below the standing 6,000-line TB-113 cap.
- **Status:** `partial` unchanged. App focused tests/typecheck and static CMS checks passed; CMS/PostgreSQL integration did not execute because the local harness has no approved Docker socket. No production custom-token/origin composition or live report object reader exists in this candidate; default reads/downloads fail closed. Formal U8 remains unchecked.
- **Measurement scope:** The `1,311`-line count above is superseded; after both evidence appends, the tracked-diff-plus-untracked-source total immediately before this one-line correction is `1,321`. Including this one-line ledger correction yields `1,322` authored additions plus deletions.

### `TB-113 offline injected dispatch coordinator`

- **Identity and scope:** Implemented locally on `feat/app-root-tb-113-dispatch-coordination` from exact parent head `63cb5049416ee0192f29c361722ab643ce629df2` (user-identified draft parent PR #380). No branch switch, commit, push, PR, remote/GitHub/Notion/GCP operation, credential or `.env` access, dependency/install change, deployment change, CMS change, or SDD operation occurred.
- **Outcome:** Added an offline coordinator requiring both explicitly verified task-client and CMS dispatch-state ports. It validates deterministic run/name identity, reserves before enqueue, records verified create or conservative `unknown`, retries at 1s/2s only when the client proves a transient request was never sent, and does not retry terminal auth/config or ambiguous/timeout/5xx results. Exact `AlreadyExists` acceptance requires the injected client to independently verify the same run/name and `created` state. In-process replay returns the settled result; lost CMS responses repeat only the identical CAS command and use CMS idempotent replay. A replayed reservation never triggers a second enqueue.
- **Fail-closed boundary:** The default command factory supplies neither trusted port and still uses `createUnavailableFeedbackDispatcher`. Unknown outcomes remain queued and are never compensated. The current CMS contract rejects `absent` and the compensation service rejects a reserved `taskName`, so the coordinator never emits `noTaskCreated` or `exhausted` after reservation. A verified task-service absence and compensation-compatible CMS evidence path remains a separate deferred operational/design gate. U10 task 4.1 and U13 remain unchecked.
- **Changed paths:** `teleferico-app/src/lib/feedback/dispatch-policy.ts`, `dispatch.ts`, and `dispatch.test.ts`; `teleferico-app/src/lib/feedback/admin-command.ts` and `.test.ts`; TB-113 `README.md`, `design/02-http-contracts.md`, `design/04-ai-worker-infrastructure.md`, `tasks.md`, and this append-only ledger.
- **Focused verification:** `pnpm --dir teleferico-app exec vitest run src/lib/feedback/dispatch.test.ts src/lib/feedback/admin-command.test.ts src/app/api/admin/feedback/generations/route.test.ts` — passed; exit 0, 3 files and 47 tests. `pnpm --dir teleferico-app run typecheck` — passed; exit 0, no diagnostics. Focused coordinator suite before combined run — passed before the CMS lost-response case was added; the final combined run includes 15 coordinator tests.
- **Static validation:** `git diff --check` — passed; exit 0, no whitespace errors after the final ledger append.
- **Not run:** No live Cloud Tasks, Cloud Run/OIDC, credentials, real CMS, Docker, broad Vitest, deployment, or operational validation was run or authorized.
- **Rollback boundary:** Revert the coordinator and its focused app tests, its opt-in admin-command injection, the matching TB-113 README/design/task statements, and this ledger entry together. Preserve the existing unavailable default, CMS reservation/create/unknown and compensation behavior, CMS auth/grants, and all unrelated TB-113 work.
- **Status:** `partial` — offline injected behavior is implemented and focused tests/typecheck pass; no production composition exists, and verified absence/compensation remains deferred. Formal SDD state and checkboxes were not changed.
- **Candidate authored size:** `829` additions plus deletions against exact starting HEAD `63cb5049416ee0192f29c361722ab643ce629df2`; measured as tracked `git diff --numstat HEAD` additions and deletions plus 16 authored lines in new `dispatch-policy.ts`, including this ledger entry. Below the standing 6,000-line TB-113 limit.
