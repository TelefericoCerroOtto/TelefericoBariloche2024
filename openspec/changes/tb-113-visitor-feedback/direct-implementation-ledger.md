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
