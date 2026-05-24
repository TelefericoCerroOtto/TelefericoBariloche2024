# Apply Progress

**Change**: tb-71-form-protection
**Mode**: Strict TDD
**Artifact note**: This repo-side OpenSpec artifact was added during closeout because the worktree only contained `verify-report.md` while the earlier apply-progress existed in Engram as topic `sdd/tb-71-form-protection/apply-progress` (memory `#3353`). The table below reconstructs evidence from the committed test files, the existing task list, and that prior apply summary. Where exact historical RED-first ordering is not recoverable from the repo state alone, that is marked explicitly instead of being invented.

## Completed Work Units

| Unit | Status | Notes |
|------|--------|-------|
| 1 | Done | Vitest harness, policy parsing, guard event/types groundwork landed in `teleferico-app`. |
| 2 | Done | Guard flow and observability runtime behavior restored and covered by guard/route tests. |
| 3 | Done | Redis-backed limiter and Strapi business-rule layer restored without changing the approved architecture. |
| 4 | Done | Tests, docs, and verification artifacts extended for the corrected two-layer model. |
| 4 closeout | Done | Added the missing dedicated postulation `2/30d` threshold test and corrected stale testing metadata/docs. |

## TDD Cycle Evidence

| Batch / task slice | RED evidence | GREEN evidence | REFACTOR / safety net | Notes |
|--------------------|--------------|----------------|-----------------------|-------|
| `1.1`, `1.2`, `1.3`, `2.1`, `2.2`, `2.3`, `2.4`, `6.1`, `6.3` | Current repo contains runtime guard/route tests in `teleferico-app/src/lib/http/guards/__tests__/form-guards.test.ts` and `teleferico-app/src/app/api/__tests__/public-form-routes.test.ts` covering internal-key/origin continuity, rate limiting, missing IP degraded mode, Redis fail-open, and route fail-closed behavior. | `pnpm --dir teleferico-app run test` passes with those suites in the current worktree. | Guard policy, event payloads, and route wiring were centralized under `src/lib/http/guards/*` and app route handlers without architecture drift. | Reconstructed from current repo state and prior apply summary. Exact historical test-first ordering is not recoverable from the repo alone, so this row is evidence-based but not time-sequenced beyond what is currently visible. |
| `3.1`, `3.2`, `3.3`, `3.4`, `4.1`, `4.2`, `4.3`, `4.4`, `5.1`, `5.2`, `5.3`, `6.2`, `7.1`, `7.2`, `7.3` | Current repo contains business-rule runtime tests in `teleferico-app/src/lib/services/__tests__/form-protection.test.ts` covering contact `5/24h`, postulation duplicate blocking, and Strapi fail-closed behavior, plus docs/spec/task deltas aligned to the restored Redis + Strapi contract. | `pnpm --dir teleferico-app run test` passes; `pnpm --dir teleferico-app run check` passes on the current worktree. | Duplicate semantics were clarified to the real current-flow key (`sectorDocumentId`), and ops/docs metadata were aligned to the approved thresholds and local Redis workflow. | Reconstructed from current repo state and prior apply summary. Before this closeout, the dedicated postulation email-threshold runtime test was still missing. |
| Closeout follow-up for `6.2` and stale testing metadata | Added a dedicated failing-target test case in `teleferico-app/src/lib/services/__tests__/form-protection.test.ts` for postulation email threshold enforcement (`2/30d`) and corrected stale metadata in `teleferico-app/AGENTS.md` plus `openspec/config.yaml`. | After the test/docs update, `pnpm --dir teleferico-app run check` and `pnpm --dir teleferico-app run test` are rerun as the closeout GREEN proof. | No code-path refactor beyond the minimal targeted test/doc updates; architecture remains unchanged. | This row is fully evidenced by the repo diff created in the closeout batch. |

## Files Touched In This Closeout Batch

| File | Action | What changed |
|------|--------|--------------|
| `openspec/changes/tb-71-form-protection/apply-progress.md` | Created | Added repo-side apply-progress artifact with truthful reconstructed TDD evidence. |
| `teleferico-app/src/lib/services/__tests__/form-protection.test.ts` | Modified | Added dedicated postulation email threshold runtime coverage for the `2/30d` rule. |
| `teleferico-app/AGENTS.md` | Modified | Corrected stale command guidance to reflect the real `test` script. |
| `openspec/config.yaml` | Modified | Updated in-repo testing metadata so strict-TDD/app verify points at `teleferico-app` first. |

## Remaining Notes

- The earlier Engram apply-progress topic (`#3353`) was not rewritten here; this closeout adds the missing repo-side OpenSpec artifact and explicitly references the prior memory source.
- Historical RED-first timing for earlier batches cannot be proven from the current worktree alone, so this artifact records that limitation instead of fabricating a sequence.
