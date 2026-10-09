# TB-113 pre-PDF validation diagnostics

## Problem and objective

The current worker can fail with `INVALID_OUTPUT` after the `validate` stage returns successfully and before PDF rendering begins, without identifying which closed validation boundary rejected the output. The bounded stdout rejection event currently classifies only `direct`, `map`, and `reduce`; it therefore cannot classify PDF validation at the `validate`/`render` boundary. The exact PDF validation predicate for the observed live failure is unknown.

Add closed, privacy-safe classification metadata at the existing PDF validation boundary and propagate it through the existing terminal rejection event. The useful distinctions are published-analysis contract, chart contract, evidence reference, and verbatim-comment rule. This is future triage evidence only: it must not claim the cause of an earlier failure or change generation, retry, rendering, storage, or terminal-failure behavior.

The supplied live-run observations are limited to HTTP 200 responses for claim, snapshot, redact, count, direct, and validate; the terminal fail call also returned HTTP 200 before render. No old `tb113_output_rejection` event was present because its stage enum covers only direct/map/reduce. No report content was read or is needed for this task.

## Scope and constraints

- **Branch/base:** `fix/app-root-tb-113-pdf-validation-diagnostics`, based on `origin/development` at `9e5583e4bafb6a4836848879796d8098d27ed96b`. The current worktree contains the implementation candidate plus this untracked task document; no publication operation has been performed in this documentation update.
- **Tracking:** existing canonical Work ID `TB-113`; Notion state `Formalizado`, formal channel `GitHub Issue`, issue #227 open; PR #428 is merged to staging. No tracking mutation is authorized or needed.
- **Route:** ordinary direct implementation, following `openspec/changes/tb-113-visitor-feedback/README.md`; its proposal, specs, design, and tasks remain normative. This task is not an SDD lifecycle operation.
- **Authorization:** the user explicitly authorized exactly one commit of the current PDF-render-rejection diagnostic candidate, one non-force push of `HEAD` to `origin`, and one implementation PR targeting `development`. This document-only update does not perform those operations. No merge, deployment, staging retry, GCP operation, or tracking mutation is authorized.
- The worker package policy in `services/survey-report-worker/AGENTS.md` forbids optional failure diagnostics. The user's narrow authorization is an exception only for extending the existing bounded stdout event at the PDF validation boundary. It does not authorize a diagnostic store, environment flag, dependency, GCP access, new provider behavior, extra log path, or report-content handling.
- Keep classification values closed and fixed. Attach them from typed validation boundaries or explicit safe metadata, never by parsing exception messages, model/provider output, HTML, chart data, evidence-reference values, or comments. Unknown predicates remain `unclassified`; do not guess.
- Preserve the existing event's bounded shape and terminal-only/best-effort behavior. Extend only its closed stage/category classification as required for `validate`/`render`; do not expose additional dynamic fields. Keep the detailed `PdfValidationError`/`RendererValidationError` text in memory only as currently required. `PdfRendererError` mapped to `STORAGE_TRANSIENT` is not an output-validation rejection and remains out of scope.
- Synthetic marker values only. No private report text, comments, PDFs, raw exception text, secrets, credentials, or report artifacts may be read, logged, copied into tests, or persisted.
- Do not modify tests, source, worker README, normative OpenSpec files, or the direct implementation ledger while creating this task document and its Engram mirror.

## Tasks

- [ ] **PVD-1 — Attach closed classification metadata to PDF validation failures.** *(implementation done, verification/closure pending due to documented local font mismatch)* At the existing `PdfValidationError` and `RendererValidationError` boundaries, add the minimum fixed metadata needed to distinguish `published_analysis_contract`, `chart_contract`, `evidence_reference`, and `verbatim_comment_rule`; retain `unclassified` for predicates that cannot be safely and deterministically identified. Extend only the existing closed stage/category contract for the `validate`/`render` boundary. Do not infer a category from free-form error text or add diagnostic payload fields. Add synthetic unit coverage for each explicit classification, unknown/unclassified behavior, and rejection of arbitrary text or dynamic stage values. **Route:** direct implementation (NOT SDD), by ONE delegated direct writer covering PVD-1 and PVD-2 together. **Mandatory delegation trigger:** reading/preparing and implementing the combined work spans two or more nontrivial app/worker source, test, and documentation files across package boundaries.
- [ ] **PVD-2 — Propagate classification to the terminal event and document verified behavior.** *(implementation done, verification/closure pending due to documented local font mismatch)* Carry the bounded classification to the existing stdout rejection event only after a committed, non-replayed terminal `INVALID_OUTPUT` failure at the PDF validation/render boundary. Preserve existing direct/map/reduce event behavior, exact payload allowlist, at-most-once semantics, failure/replay silence, and unchanged report outcome if event emission fails. Use an injected deterministic renderer and synthetic marker values; test exact event fields and allowed values, no sensitive marker leakage, and no browser, live provider, CMS, or GCP calls. Update only the worker documentation needed to describe the resulting bounded event during implementation; do not change the direct ledger until there is observed implementation evidence to record. **Route:** direct implementation (NOT SDD), by the same ONE delegated direct writer covering PVD-1 and PVD-2 together. **Mandatory delegation trigger:** reading/preparing and implementing the combined work spans two or more nontrivial app/worker source, test, and documentation files across package boundaries.

## Acceptance and verification

- [x] A deterministic closed mapping distinguishes the four stated validation categories where the corresponding typed boundary proves them; everything else is `unclassified`.
- [x] Only the existing bounded terminal stdout event is extended. It emits at most once after a confirmed terminal failure commit and does not emit for recovery attempts, non-`INVALID_OUTPUT` failures, replay, or an uncommitted failure.
- [x] Event fields, stage, and category are from closed allowlists. No raw exception detail, report text, comments, PDF bytes, evidence-reference value, prompt, provider response, secret, credential, URL, or other private/dynamic content appears in the event or test output.
- [x] Existing retry, checkpoint, safe failure message, render/store, and terminal CMS behavior remain unchanged; an event-emission failure cannot change the terminal result.
- [x] All tests use synthetic values and an injected deterministic renderer. No browser, live provider, report retry, credential access, GCP, IAM, deployment, or external storage is required.
- [x] Record exact commands and actual outcomes below when implementation is performed. Do not mark any check passed before it is run.

### PVD-1 observed implementation evidence

- Typed PDF and renderer validation boundaries now expose only closed category metadata; published-analysis shape, chart contract, evidence-reference, and verbatim-comment failures have fixed categories. Unknown typed PDF failures remain `unclassified`; event stage/category projection rejects arbitrary values and never inspects error text.
- RED: `PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback/worker-pdf.test.ts -t "maps typed PDF validation boundaries to closed render rejection categories"` — exit 1; expected published-analysis rejection projected as `unclassified` before the metadata implementation.
- GREEN: `PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback/worker-pdf.test.ts -t "maps typed PDF validation boundaries|classifies a verbatim-comment boundary"` — exit 0; 2 selected tests passed, 38 skipped.

### PVD-2 observed implementation evidence

- The existing rejection event now accepts `render` as a closed stage and the four fixed PDF validation categories. `PdfValidationError` and `RendererValidationError` carry explicit closed metadata; unknown values remain `unclassified`. `failSafely` retains its existing committed, non-replayed terminal `INVALID_OUTPUT` gate and unchanged event payload allowlist.
- Targeted GREEN: `PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback/worker-pdf.test.ts -t "maps typed PDF validation boundaries|classifies a verbatim-comment boundary|emits a closed render rejection only after a terminal chart-contract failure|emits a closed terminal (map|reduce|render) output-rejection event"` — exit 0; 1 file, 6 selected tests passed, 36 skipped. The event test covers direct and map/reduce render-stage failures, exact event fields, commit ordering, marker exclusion, and replay silence.
- Required focused suite: `PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts` — exit 1; 1 file failed and 1 passed; 61/62 tests passed. The one failure is the known `STORAGE_TRANSIENT` in `passes only the minimal redacted model projection to CountTokens and analysis providers`, caused locally by the host font SHA not matching the pinned renderer digest.
- App typecheck: same Node 22 PATH prefix with `COREPACK_ENABLE_NETWORK=0 corepack pnpm run typecheck` — exit 0 with no diagnostics; initial invocation exceeded the 120-second tool timeout and the longer-timeout rerun completed successfully. Worker typecheck: same command from `services/survey-report-worker/` — exit 0 with no diagnostics.
- `git diff --check` — exit 0. The untracked task document's `git diff --no-index --check /dev/null odd/tasks/tb-113-pdf-validation-diagnostics.md` emitted no whitespace errors; exit 1 is expected because the file differs from `/dev/null`.
- Worker build: not run because the known local font-digest mismatch makes it unavailable; no font replacement, install, or digest change was attempted.
- No live failure cause, real renderer acceptance, Cloud Run log collection, or runtime readiness is claimed.

### Focused RED/GREEN and package checks

Run the focused Vitest command from `teleferico-app/`; first establish the expected failing assertions, then implement and rerun the same command for GREEN:

```bash
PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm exec vitest run src/lib/feedback/worker-pdf.test.ts src/lib/feedback/worker-output-preflight.test.ts
```

Run both typechecks without changing package files:

```bash
# From teleferico-app/
PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm run typecheck

# From services/survey-report-worker/
PATH="/home/manuel/.nvm/versions/node/v22.22.0/bin:$PATH" COREPACK_ENABLE_NETWORK=0 corepack pnpm run typecheck
```

Run from the repository root after the implementation/documentation diff:

```bash
git diff --check
```

The worker build and full real-renderer suite are known to be blocked in this local environment by a mismatch between the installed DejaVuSans font and the renderer's pinned font digest. Record the exact observed result if attempted; treat this only as an environmental limitation, not a task fix or a green check. Do not replace fonts, change the pinned digest, install packages, or infer renderer acceptance from injected-renderer tests.

## Delivery, status, and rollback

- **Delivery strategy:** The two tasks form one bounded work unit. The standing TB-113 limit is 6,000 authored lines prospectively per PR; no additional size exception is requested. The user has authorized exactly one commit of the current candidate, one non-force push of `HEAD` to `origin`, and one implementation PR targeting `development`. That publication remains a separate finalization action; no merge, deployment, staging retry, GCP operation, or tracking mutation is authorized.
- **Progress:** PVD-1 and PVD-2 implementation, targeted synthetic tests, both package typechecks, and diff checks are complete as recorded above. The required focused two-file suite has one known local font-digest fixture failure (61/62 passed); worker build was not run for the same reason. Both task checkboxes remain open pending required verification and closure. This is not evidence of live root cause or runtime readiness.
- **Rollback boundary:** when implemented, remove only the new PDF validation classification metadata, its terminal-event propagation, the focused synthetic tests, and the narrowly necessary worker documentation update. Preserve existing provider behavior, renderer behavior, terminal CMS semantics, retry/checkpoint behavior, and unrelated TB-113 work.
- **Next step:** after this documentation-only update and its mirror/checks are complete, proceed with the separately authorized single-commit, single-push, single-PR finalization to `development`. Keep PVD-1/PVD-2 open until the required verification passes; the current 61/62 suite result and unrun worker build remain unresolved. Do not merge, deploy, retry staging, perform GCP or tracking mutations, or claim a live root cause.

## Skill resolution

- `cognitive-doc-design`: loaded for this task document.
- `work-unit-commits`: loaded for work-unit boundaries and rollback guidance; the single candidate commit is authorized for separate finalization but was not created in this documentation-only update.
- `change-intake-preflight`: loaded for this documentation-only follow-up; the existing branch and base were verified, and no branch or tracking mutation was made.
- `notion-todo-governance` and `issue-context-harness`: loaded through change-intake composition; existing `TB-113` tracking was supplied and no tracking mutation is needed.
- Change-local route: direct implementation, not SDD. The listed OpenSpec artifacts are normative scope references, not authorization to dispatch an SDD phase.

## Engram mirror

- Topic key: `odd/tb-113-pdf-validation-diagnostics/tasks`
- Repository document: `odd/tasks/tb-113-pdf-validation-diagnostics.md`
- The complete task document is mirrored under this new topic key in Engram; the repository document remains the recovery copy if mirror write or readback fails.
