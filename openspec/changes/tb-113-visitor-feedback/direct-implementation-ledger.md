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
