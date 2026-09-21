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
