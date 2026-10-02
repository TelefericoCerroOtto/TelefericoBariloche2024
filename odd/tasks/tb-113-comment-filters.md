# TB-113 comments filter presentation

## Objective

Align only the Comments and reports filter area with the inspected OpenDesign feedback dashboard while retaining real data, authenticated read behavior, and independent report-generation scope.

## Scope and constraints

- Implement only in `teleferico-app/src/components/administration/feedback/FeedbackDashboard.tsx` and its focused tests; append concise UI evidence to `openspec/changes/tb-113-visitor-feedback/direct-implementation-ledger.md` afterward.
- Existing branch `feat/root-tb-113-final-implementation-details` is shared with other TB-113 UI work. Do not claim exclusive ownership, switch branches, overwrite Summary/Aspects/QR edits, or modify another feature task document.
- OpenDesign read-only evidence: `teleferico-cerro-otto-design-system/feedback-dashboard.html`, 322684 bytes, SHA-256 `bca20dcba4ff58c4d72da2a2fb263020286b84dffd37d3cb5aa8f8f7b44793af`. In the Comments scope, its four controls appear as Aspecto, Valoración (five-star multiselect disclosure), Punto QR, Idioma; text search is a separate row; the clear button appears only while a filter is active. The prototype QR-point names and fixture values are not application data.
- Preserve query parameters, OR semantics for selected ratings, page reset, loading/error states, anonymous comments, keyboard/focus accessibility, responsive 4/2/1 filter layout, and independent report dates. Use installed HeroUI v2 `Button` for any new action; do not add dependencies or edit unrelated files.
- TDD source: direct TB-113 route `openspec/changes/tb-113-visitor-feedback/README.md` calls for focused RED/GREEN. Runner: `pnpm --dir teleferico-app exec vitest run src/components/administration/feedback/FeedbackDashboard.test.tsx`; also run app typecheck and `git diff --check`.
- The ~400 authored-lines heuristic is advisory only; prefer a small coherent change with tests. Do not commit, push or create a PR without a separate explicit request. Delivery remains stacked-to-main by user choice.

## Tasks

- [x] **CF-1 — Arrange comment filters like the design.** Added a standalone filter region ahead of results with the reference heading/intro, Aspecto–Valoración–Punto QR–Idioma controls in responsive 4/2/1 columns, separate search and conditional clear-action rows, and compact neutral 44px controls. Real options, query behavior, results, and report dates remain unchanged. Route: delegated direct writer because source and tests changed. Evidence: layout tests observed RED then GREEN; writer saw 30/30 focused tests, app typecheck and `git diff --check` pass after CF-1. Parent reran comment-specific tests: 3 passed; a transient full-file check had 5 concurrent Aspectos/QR failures (28/33), later superseded by the writer's final 36/36 complete-file pass. Parent reran comment-specific checks after final correction: 3 passed / 33 skipped. Rollback: only CF-1 filter markup and tests, preserving all parallel work; no commit.
- [x] **CF-2 — Replace inline rating chips with an accessible multiple-selection control.** Implemented a HeroUI v2 disclosure with sorted selected-star summary, 1–5 native checkboxes in one column, keyboard focus restoration on Escape, outside-pointer close, and popup unmount while closed so Tailwind `grid` cannot override native `hidden`. Existing repeated-rating OR query and page reset remain unchanged. Route: same delegated direct writer; behavior and tests changed together. Evidence: rating tests observed RED then GREEN; writer's full file initially passed 36/36, parent comment-specific spot check passed 3 / 33 skipped, and `git diff --check` passed. An earlier app typecheck timed out twice (120s/240s), but a later typecheck after the complete shared Comments/AI changes passed as reported by the AI-report writer; parent reran the component file 46/46 and `git diff --check`. Node 24 versus required 22.x warning persists. Browser visual/E2E not run. Rollback: only rating disclosure/handlers and adjacent assertions, preserving CF-1 and unrelated changes. No commit.

## Acceptance and next step

- Filter area resembles the current OpenDesign ordering/hierarchy without copying prototype fixtures or redefining backend filters. The independent report generation range is untouched.
- Read back this document and its Engram mirror after each completed task; record exact checks and rollback boundaries, plus any skipped browser review.
- Next: inspect the rendered filters at desktop/mobile widths when convenient; delivery of the shared uncommitted branch is a separate user decision.
