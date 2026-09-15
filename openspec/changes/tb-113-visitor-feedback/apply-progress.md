# Apply Progress: TB-113 Visitor Feedback

## Status

- Change: `tb-113-visitor-feedback`
- Apply mode: Standard for S05a, using requested behavior-first RED → GREEN → REFACTOR discipline; historical S01-S04 evidence is preserved below
- Delivery mode: bounded chained slice under `ask-on-risk`
- Chain strategy: sequential PRs to `development`, adapting `stacked-to-main` to repository governance
- Review budget: accepted `size:exception`; maintainer-authorized native reset preserves the 843-line S05a candidate as the new baseline
- Current slice/work unit: S05a / task 2.1 / U4 persistence schema completion candidate; post-reset verification complete
- Progress: 3 of 15 tasks complete
- Generation status: disabled
- Vertex gate: G03 passed for sanitized comments with `gemini-3.8-flash` in `us`; no fallback
- Size exception: explicitly accepted together with the successful native reset for this cohesive persistence-definition slice

## Completed tasks

- [x] 1.1 U1 — Record official facts, approved probe evidence, pass/fail criteria, fail-closed fallbacks, provenance, and affected decisions in `docs/infra/survey-reporting/verification-gates.md`.
- [x] 1.2 U2 — Add the isolated local-only PostgreSQL harness, fixed subprocess boundary, deterministic cleanup, and canonical dependency-free Node 22 test command.
- [x] 1.3 U3 — Prove the nine Appendix-05 renderer criteria with Recharts, ECharts 6.1 SVG SSR, pinned Chromium, deterministic PDFs, and synthetic parity fixtures.

## Remaining tasks

- [ ] 2.1 U4 — partial: all approved inert persistence definitions and generated declarations exist; migrations/indexes and lifecycle services/routes remain for S05b
- [ ] 2.2 U5
- [ ] 2.3 U6
- [ ] 3.1 U7
- [ ] 3.2 U8
- [ ] 3.3 U9
- [ ] 4.1 U10
- [ ] 4.2 U11
- [ ] 4.3 U12
- [ ] 4.4 U13
- [ ] 5.1 U14
- [ ] 5.2 U15

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | Inline Python S01 structural validator | Documentation contract | RED/pre-completion PASS: diff clean; 93 decisions; 15 tasks with 0 checked; 24 slices | PASS: validator failed with `missing S01 verification-gates.md` before creation | PASS: 9 complete gates; required sections and blockers present | Skipped: this is a structural evidence artifact with one required document contract and no production branching | None needed; the first complete document structure passed |
| 1.2 | `teleferico-cms/test/feedback/harness/process-boundary.test.js` | Unit plus local PostgreSQL integration | N/A (new harness); prior attempt established the missing canonical test script | PASS: exact focused command entered Node 22 test execution and failed with `MODULE_NOT_FOUND` for `./postgres-harness`; 0 passing, 1 failing | PASS: exact focused command completed 21/21 tests with 0 failures | PASS: 21 cases cover local/remote targets, marker rejection, seven metacharacter paths, alternate Compose path, fixed arrays, stale cleanup, child failure, SIGTERM cleanup, and orphan detection | PASS: 21/21 after local-socket isolation and stale-resource runtime refinement |
| 1.3 | `src/components/administration/feedback/__tests__/renderer-poc.test.ts` | Unit + local Chromium/PDF integration | PASS: package-policy 4/4; exact dependency commands succeeded; typecheck passed | PASS: missing `renderer-poc` import failed; digest/artifact triangulation later failed on absent fields | PASS: 2/2; all nine criteria true | PASS: zero/one, five charts, null/zero/negative, long ES/PT labels, and 200-point scatter | PASS: 2/2 after Node-environment cleanup |

### Test Summary

- Total tests written: 2 structural contract validators, 21 Node cases/subtests, and 2 renderer POC tests.
- Total tests passing: 2 structural validators, 4/4 package-policy tests, 21/21 Node cases, and 2/2 renderer POC tests.
- Layers used: documentation contracts/readback, unit/process-boundary tests, local PostgreSQL integration, and local Chromium/PDF integration.
- Approval tests: none; no existing runtime behavior was refactored.
- Pure functions created: renderer-neutral semantic and HTML/SVG adapter projections.

### Safety-net RED/pre-completion command and result

```bash
git diff --check && python3 -c 'import re;from pathlib import Path;root=Path("openspec/changes/tb-113-visitor-feedback");text="\n".join(p.read_text() for p in [root/"design.md",*sorted((root/"design").glob("*.md"))]);ds=re.findall(r"\bD(\d{2})\b",text);assert len(set(ds))==93 and set(ds)=={f"{i:02d}" for i in range(1,94)};(tasks:=root/"tasks.md");t=tasks.read_text();rows=re.findall(r"^- \[([ x])\] (\d+\.\d+) ",t,re.M);assert len(rows)==15 and sum(v=="x" for v,_ in rows)==0;slices=re.findall(r"\bS(\d{2})\b",t);assert set(slices)=={f"{i:02d}" for i in range(1,25)};print("PASS: diff clean; D01-D93=93 unique; tasks=15/0 checked; S01-S24=24 unique")'
```

RED/pre-completion result: exit 0 — `PASS: diff clean; D01-D93=93 unique; tasks=15/0 checked; S01-S24=24 unique`.

### Final GREEN structural command and result

```bash
python3 -c 'import re;from pathlib import Path;root=Path("openspec/changes/tb-113-visitor-feedback");text="\n".join(p.read_text() for p in [root/"design.md",*sorted((root/"design").glob("*.md"))]);ds=re.findall(r"\bD(\d{2})\b",text);assert len(set(ds))==93 and set(ds)=={f"{i:02d}" for i in range(1,94)};(tasks:=root/"tasks.md");t=tasks.read_text();rows=re.findall(r"^- \[([ x])\] (\d+\.\d+) ",t,re.M);assert len(rows)==15 and sum(v=="x" for v,_ in rows)==1 and [task for state,task in rows if state=="x"]==["1.1"];slices=re.findall(r"\bS(\d{2})\b",t);assert set(slices)=={f"{i:02d}" for i in range(1,25)};print("PASS: D01-D93=93 unique and complete; tasks=15/1 checked/14 unchecked with only 1.1 checked; S01-S24=24 unique and complete")'
```

Final GREEN result: exit 0 — `PASS: D01-D93=93 unique and complete; tasks=15/1 checked/14 unchecked with only 1.1 checked; S01-S24=24 unique and complete`.

### RED/GREEN command and results

```bash
python3 -c 'from pathlib import Path;p=Path("docs/infra/survey-reporting/verification-gates.md");assert p.is_file(), "missing S01 verification-gates.md";s=p.read_text();heads=["## Outcome","## Verified facts","## Failed facts","## Deferred evidence","## Gate register","## Dependency impact","## Official sources"];assert all(h in s for h in heads), "missing required section";labels=["- **Owner**:","- **Source/evidence**:","- **Observed status**:","- **Pass criterion**:","- **Fail criterion**:","- **Fallback**:","- **Timestamp/evidence provenance**:","- **Affected decisions**:"];n=s.count("### Gate ");assert n>=6 and all(s.count(x)==n for x in labels), "incomplete gate fields";assert all(x in s for x in ["gemini-3.8-flash","southamerica-east1","404","NOT_FOUND","generation remains disabled","S03","S15","S18","S19","S20","S21","S22","S23"]), "missing gate evidence or blockers";print(f"PASS: {n} complete gates; required sections and blockers present")'
```

- RED: exit 1 before document creation — `AssertionError: missing S01 verification-gates.md`.
- GREEN: exit 0 after document creation — `PASS: 9 complete gates; required sections and blockers present`.

## Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | The RED/GREEN command above is the smallest structural/traceability check for S01. Final result: exit 0; 9 complete gates with all required sections, evidence fields, and dependency blockers present. |
| Runtime harness command/scenario and exact result | The approved manual/safe/sensitive evidence path was executed. The manual Vertex `countTokens` result was not rerun: transport exit 0, HTTP/error code 404, `NOT_FOUND`, no token totals. At `2026-09-12T00:55:51Z`, each approved GCP read was attempted exactly once: four named Cloud Run describes succeeded (`ingress=all`, shared-identity boolean true); filtered regional inventory returned 0 queues and 0 services; both bucket describes returned `SOUTHAMERICA-EAST1`, empty lifecycle, and null locationType/UBLA/PAP projections; both bucket IAM projections returned empty binding arrays and were classified as inconclusive. |
| Rollback boundary | Revert the S01 document, this apply-progress artifact, and only the task 1.1 checkbox while preserving the other task text. The autonomous branch boundary also includes the seven authorized pre-existing topology corrections: `design.md`, `design/04-ai-worker-infrastructure.md`, `design/06-migration-testing-rollout.md`, `design/08-d01-d93-traceability.md`, `specs/survey-worker-operations/spec.md`, `specs/vertex-feedback-analysis/spec.md`, and `tasks.md`. No runtime resource or behavior changed. |

## Approved probe commands

The commands ran only inside the already-authenticated `google-cloud-sdk` container. Output was transformed before display so identities and members were not emitted.

1. `gcloud run services describe <each approved app/cms staging/production service> --region southamerica-east1 --project teleferico-bariloche-2024 --format=<bounded identity projection>` — four describes, one attempt per named service.
2. `gcloud tasks queues list --location southamerica-east1 --project teleferico-bariloche-2024 --filter=name~'(tb113|survey-report)' --format=<bounded queue projection>` — one attempt.
3. `gcloud run services list --region southamerica-east1 --project teleferico-bariloche-2024 --filter=metadata.name~'(tb113|survey-report)' --format=<bounded service projection>` — one attempt.
4. `gcloud storage buckets describe <each approved CMS bucket> --format=<bounded configuration projection>` — two describes, one attempt per bucket.
5. `gcloud storage buckets get-iam-policy <each approved CMS bucket> --format=<bounded IAM projection>` — two reads, one attempt per bucket.

No other GCP command was executed.

## S02 Corrected Candidate Evidence

- Failed evidence remediated: `sha256:95df89d1fc3b35687ebf18e815ec68acf6976e5a7e347ce039829069828328e4`.
- Corrected evidence revision: `sha256:a477a5c2221a589f462055c747ac658902253a6333ef382156a612f7c60155d1`.
- Manifest exception: only `scripts.test` was added to `teleferico-cms/package.json`; dependencies and lifecycle scripts are unchanged, and `package-lock.json` is untouched.
- Package-security detection: npm package manager; Node `v22.22.0`; npm `11.15.0`; no install, `npx`, package-security configuration mutation, or dependency resolution was performed.

### S02 RED, GREEN, and REFACTOR

| Phase | Command | Exact result |
|---|---|---|
| RED | `npm --prefix teleferico-cms test -- feedback/harness` | Exit 1 after Node 22 test execution began: 0 passing, 1 failing; `MODULE_NOT_FOUND` for `./postgres-harness`. This replaced the prior missing-script failure with a valid behavioral RED. |
| GREEN | `npm --prefix teleferico-cms test -- feedback/harness` | Exit 0; 21 tests, 21 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. |
| REFACTOR | `npm --prefix teleferico-cms test -- feedback/harness` | Exit 0 after fixed local-socket isolation and stale-runtime refinement; 21 tests, 21 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo. |

### S02 Runtime and Cleanup Evidence

Runtime command:

```bash
node teleferico-cms/test/feedback/harness/runtime-smoke.js && docker ps -aq --filter label=com.docker.compose.project=tb113_test_runtime_stale && docker volume ls -q --filter label=com.docker.compose.project=tb113_test_runtime_stale
```

Result: exit 0. PostgreSQL `16.8` ran from the already-local image with `pull_policy: never`; the harness connected only to database `tb113_test_feedback`, seeded and removed exactly one stale owned container and one stale owned volume, and returned `remoteContactCount:0`, `containerCount:0`, and `volumeCount:0`. Both post-run Docker queries were empty.

The subprocess boundary uses `/usr/local/bin/docker` with argument arrays and `shell:false`. It supplies a fixed non-credential environment, selects only an approved local Unix Docker socket, locks Compose to the repository-owned file, rejects non-loopback database hosts and staging/production markers before spawning, generates or validates only `tb113_test_` project ownership, aborts the active child on `SIGINT`/`SIGTERM`, runs `down --volumes --remove-orphans`, and verifies project-labeled containers and volumes are absent. The 21-case suite proves child exit 37 remains primary after cleanup, signal cleanup is idempotent, and any remaining owned container or volume fails the run.

## S02 Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `npm --prefix teleferico-cms test -- feedback/harness`; final exit 0; 21/21 passed with 0 failures. |
| Runtime harness command/scenario and exact result | The runtime command above completed against local PostgreSQL 16.8; one stale container and volume existed before the harness, the database identity was `tb113_test_feedback`, no remote target was present, and cleanup ended at 0 containers/0 volumes. |
| Rollback boundary | Revert `teleferico-cms/test/feedback/harness/**`, remove only `scripts.test` from `teleferico-cms/package.json`, revert only task 1.2's checkbox, and remove only the S02 additions/status changes from this cumulative apply-progress artifact. Preserve S01 and all other task text. |

### S02 Review Boundary

- Slice: S02 only; S03 was not started.
- Authored changed lines before SDD evidence persistence: 587 additions, 0 deletions; below the authorized 800-line budget.
- Intended untracked implementation files: `compose.yaml`, `postgres-harness.js`, `process-boundary.test.js`, `runtime-smoke.js`, and `test-runner.js` under `teleferico-cms/test/feedback/harness/`.
- No dependency, lockfile, credential, provider, GCP, deployment, or external-system mutation occurred.

## Gate result and blockers

- Passed: selected product-project topology; four required APIs; Cloud Tasks regional support.
- Passed after approved reconciliation: exact `gemini-3.8-flash` access and fixed structured-generation settings at Vertex location `us` through `aiplatform.us.rep.googleapis.com`. `CountTokens` returned 8; generation returned `STOP`, model version `gemini-3.8-flash`, and 516 prompt / 330 candidate / 846 total tokens with zero structural validation failures. The output text was suppressed, so language and tone were not manually inspected.
- Failed: `southamerica-east1` returned `NOT_FOUND` for both evaluated Gemini models and is not a production fallback; required diagnostics lifecycle readiness remains failed.
- Deferred: dedicated keyless worker, private ingress, queue retry/OIDC configuration, distinct least-privilege invoker, complete bucket security/IAM evidence, and runtime quota/billing/telemetry attribution.
- S03 passed after explicit dependency authorization: all nine Appendix-05 criteria are true, so S15/S20 are no longer blocked by renderer adoption. Their own prerequisites and the remaining worker, storage, IAM, deployment, diagnostics, quota, billing, and telemetry gates still block generation.
- No alternate model, location, hostname, API, project, or implicit fallback is permitted.

## S03 Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `pnpm --dir teleferico-app exec vitest run src/components/administration/feedback/__tests__/renderer-poc.test.ts`; RED unresolved production import, triangulation RED missing six required digests/artifacts, final GREEN/REFACTOR exit 0 with 2/2 passed and all nine criteria true. Package-policy 4/4, typecheck, and `git diff --check` also passed. |
| Runtime harness command/scenario and exact result | The focused command rendered five synthetic charts through Recharts and ECharts SVG SSR, launched pinned Chromium five times (353/283/280/279/307 ms; p95 353 ms), produced one PDF semantic digest and one pagination digest across five renders, extracted every label, found 0 clipping and 0 serious/critical structural violations, emitted 290 selectable SVG text nodes and no chart raster images, excluded worker imports from the public source graph, measured 184,720,835 compressed candidate-worker bytes (<750 MiB), closed all browsers, and removed temporary artifacts. |
| Rollback boundary | Revert the four exact dependency entries and generated lockfile delta; remove `services/survey-report-worker/poc/**`, the parity fixture, and renderer POC test; revert only task 1.3 and S03 evidence/status here. Preserve S01/S02 and G03 reconciliation. |

## S04 Partial Work Unit Evidence

- Scope: first coherent definition/catalog foundation only. Added `survey-version`, `survey-settings`, `survey-qr-point`, and `survey.aspect-definition`; U4 remains unchecked.
- Explicitly deferred at S04: the other three approved collections, `survey.aspect-rating`, migrations/indexes, lifecycle services/routes, and permission bootstrap. PR #300 synchronized S04 generated declarations before S05a.
- Disabled baseline: all three content types set `draftAndPublish:false`; versions default to `draft`; intake and generation default to `false`; no permission grant or custom route was added.

### S04 RED, GREEN, and REFACTOR

| Phase | Command | Exact result |
|---|---|---|
| RED | `npm --prefix teleferico-cms test -- feedback/catalog` | Exit 1; 4 tests failed because the required foundation schema files did not exist. |
| GREEN | `npm --prefix teleferico-cms test -- feedback/catalog` | Exit 0; 4 tests passed, 0 failed, 0 skipped. |
| REFACTOR | `npm --prefix teleferico-cms test -- feedback/catalog` | Exit 0; no production refactor was needed after the cohesive schema/test structure passed. |

### S04 Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `npm --prefix teleferico-cms test -- feedback/catalog`; exit 0; 4/4 passed with 0 failures. Tests prove approved identities, forbidden identity exclusion, disabled defaults, bounded multilingual definition fields, and constrained QR identity/lifecycle fields. |
| Runtime harness command/scenario and exact result | `npm --prefix teleferico-cms test -- feedback/harness`; exit 0; 21/21 passed with 0 failures. No PostgreSQL process was started for this static schema subset because migrations and runtime services are explicitly deferred; the harness boundary remains healthy and no cleanup-owned process/container/volume was created. |
| Rollback boundary | Remove the four new schema JSON files and `teleferico-cms/test/feedback/catalog/schema-catalog.test.js`; revert only the selector mapping in `test-runner.js`, the TB-113 no-grant note in `docs/STRAPI_PERMISSIONS.md`, and this S04 partial evidence/status. Preserve all S01-S03 files, evidence, and task checkboxes. |

### S04 Review Boundary

- Task state: partial; task 2.1 remains unchecked.
- Sequential boundary: starts after the committed S03 baseline and ends before submission/report schemas or any migration/runtime behavior.
- Size exception: not granted and not used.
- Candidate evidence revision is reported by the executor after final hybrid persistence so the hash is not self-referential.

## Deviations

Explicit authorization installed candidate dependencies before the reviewed pass because the real POC could not execute without them; no production import was added, and rollback is confined to the dependency delta and POC files. All other implementation matches the design.

## S05a Partial Work Unit Evidence

- Scope: added `survey-submission`, `survey-report-generation`, `survey-report`, and `survey.aspect-rating`; regenerated declarations for these definitions only. Task 2.1 remains unchecked.
- RED: `npm --prefix teleferico-cms test -- feedback/catalog` exited 1 with 3/8 passing and 5 failures because the four definitions were absent.
- Pre-reset GREEN/REFACTOR: `npm --prefix teleferico-cms test -- feedback/catalog` exited 0 with 6/6 passing after the final schema and catalog-test refactor.
- Post-reset verification: catalog 6/6 passed; harness 21/21 passed; CMS build exited 0; `git diff --check` exited 0 with no output.
- Runtime harness: N/A for PostgreSQL because this static schema slice adds no migration, index, service, controller, route, or lifecycle behavior. The harness unit suite spawned no real PostgreSQL or Docker resource.
- Cleanup and generation: no test-owned process, container, or volume remained; the repository generator completed with 0 warnings/errors and left both generated declaration hashes unchanged.
- Rollback boundary: remove the four new schema/component files; revert their generated declaration deltas, the focused catalog-test extension, the deny-by-default permissions wording, and this S05a evidence only. Preserve S01-S04 and PR #300 declarations.
- Boundary: sequential S05a slice after merged S04 and PR #300; S05b waits for this future slice to merge before adding migrations/indexes and lifecycle services/routes.
- Size: the reset-authorized candidate baseline is exactly 418 authored changed lines plus 425 generated declaration lines, 843 complete changed lines; task 2.1 stays unchecked because S05b remains.
- Remediation lineage: native reset authorized remediation of failed evidence `sha256:e8af3ff9923dd78a75be29945f0a54de77d48a19278eedf5ee4b16bd1656a7db`; new evidence revision `sha256:2223e4eb6dc602299a8f3463225ea8f566d694dcae98f8b4007fb8967327209b`, computed from the sorted changed-file SHA-256 manifest with this line normalized to `new evidence revision pending`.
