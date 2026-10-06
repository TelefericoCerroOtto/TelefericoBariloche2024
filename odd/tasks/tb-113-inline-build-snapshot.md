# TB-113 inline worker build snapshot

## Objective

Make `docs/infra/cloud-build/worker-staging.yaml` directly pasteable, unchanged, into the Cloud Build trigger's inline execution YAML editor. It must contain only the Build recipe (`steps`, `substitutions`, `options`, `timeout`), not the outer BuildTrigger resource. Keep trigger metadata and manual approval controls outside this repository snapshot.

## Scope and constraints

- Work in the fresh `fix/root-tb-113-inline-build-snapshot` worktree from `origin/development` at `78db0cebf39a7e69a83ff77082656de910a93625`. The root worktree has unrelated changes; do not edit or move them.
- Correct the worker snapshot, its focused contract test, and directly affected worker/infrastructure documentation only. Preserve the existing build step order, pinned image/font, runtime security, substitutions, and deployment recipe. No new dependency or lockfile changes.
- User explicitly authorized this repository correction and, in a separate request, one bounded implementation PR publication (at most one candidate commit and one non-force push). The earlier exact GCP CLI approval change failed with `INVALID_ARGUMENT`; subsequent readback confirmed `approvalRequired: true`. Do not retry or substitute another GCP mutation without fresh exact-command consent. No live trigger build content was changed.
- Tracking: existing TB-113 issue #227; direct implementation route. Testing: focused RED/GREEN using `node --test services/survey-report-worker/test/image-contract.test.mjs`, YAML structural parse, `git diff --check`. No project-wide strict TDD setting is established. The 400-line ODD task heuristic is advisory only.

## Tasks

- [x] **B1 — Diagnose editor and isolate work.** The Console error at `trigger.build` rejected outer BuildTrigger fields. Read-only GCP confirmed approval was still required; the one approved update attempt returned `INVALID_ARGUMENT` with no effective change. Created a clean worktree on the current development head, leaving the unrelated root tree intact. Route: bounded inline state checks; implementation reading belongs to the delegated writer.
- [x] **B2 — Restore a pasteable Build-only worker snapshot.** Added a focused test for column-zero Build root fields and absent trigger metadata; it failed RED against the old wrapper (`steps` missing at root), then passed GREEN (6/6). Normalized the full YAML indentation and updated the four directly affected docs to say the snapshot is pasteable unchanged and trigger metadata/approval is configured separately. PyYAML parsed the file; deep comparison against `origin/development` confirmed it exactly equals that revision's nested `build` map, including all step/scalar content. The four Build keys are the only column-zero root keys. `git diff --check` passed. No dependencies or further GCP operations were performed during B2; B3 verification is recorded below.
- [x] **B3 — Verify and hand off.** Independent read-only review identified noncanonical root indentation, which was corrected before the final checks. Parent spot check observed `node --test services/survey-report-worker/test/image-contract.test.mjs` passing 6/6 and `git diff --check` passing; the writer's PyYAML comparison confirmed the Build mapping is unchanged. This repository-only fix has not been applied or validated in a live Cloud Build run. The separately approved GCP metadata attempt failed `INVALID_ARGUMENT`, and post-failure readback confirmed `approvalRequired: true`; no alternate command was tried. Publication is now separately authorized, but the operator still owns all GCP changes and merges.

## Progress and next step

B1–B3 are complete for the repository correction. The file is ready for human review and manual paste into the inline Build editor, but no live acceptance is claimed. The trigger still requires approval. Publication is handled under the user's explicit bounded request; Git and the PR record the resulting commit/URL. Mirror this entire file under Engram topic `odd/tb-113-inline-build-snapshot/tasks` after each task outcome.
