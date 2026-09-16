# Apply Progress: TB-113 Visitor Feedback

## Status

- Change: `tb-113-visitor-feedback`
- Apply mode: Strict TDD; U6 complete and the first bounded U7 foundation is implemented
- Delivery mode: bounded chained slice under `ask-on-risk`
- Chain strategy: sequential PRs to `development`, adapting `stacked-to-main` to repository governance
- Review budget: S11 remains below the 400 authored-line ceiling; no size exception applies
- Current slice/work unit: `S11-U7-intake-http-boundary`; U7 remains incomplete
- Progress: 6 of 15 tasks complete
- Generation status: disabled
- Vertex gate: G03 passed for sanitized comments with `gemini-3.8-flash` in `us`; no fallback
- Size exception: former 800-line attempt settled failed at evidence revision `sha256:c57930a7430e91880415ef1d9c6633220e91dcd0852f343246f5ffabe5c8e264`; maintainer explicitly approved the distinct 807-line correction candidate; later slices require a new workload decision

## Completed tasks

- [x] 1.1 U1 — Record official facts, approved probe evidence, pass/fail criteria, fail-closed fallbacks, provenance, and affected decisions in `docs/infra/survey-reporting/verification-gates.md`.
- [x] 1.2 U2 — Add the isolated local-only PostgreSQL harness, fixed subprocess boundary, deterministic cleanup, and canonical dependency-free Node 22 test command.
- [x] 1.3 U3 — Prove the nine Appendix-05 renderer criteria with Recharts, ECharts 6.1 SVG SSR, pinned Chromium, deterministic PDFs, and synthetic parity fixtures.
- [x] 2.1 U4 — Complete exact Strapi persistence services/routes, additive constraints and indexes, lifecycle contracts, generated-type regeneration, and local PostgreSQL proof.
- [x] 2.2 U5 — Preserve deny-by-default permissions and add the exact initial catalog plus deterministic transactional local/test fixtures.
- [x] 2.3 U6 — Complete the pure reporting core, including independent recurrent/minority evidence classification and explicit unsupported categories.

## Remaining tasks

- [ ] 3.1 U7
- [ ] 3.2 U8
- [ ] 3.3 U9
- [ ] 4.1 U10
- [ ] 4.2 U11
- [ ] 4.3 U12
- [ ] 4.4 U13
- [ ] 5.1 U14
- [ ] 5.2 U15

## S06a Permission Deny-Baseline Evidence

- Scope: completed only direct deny-by-default tests and operational documentation. Task 2.2 remained unchecked at that point and is now complete through S06b.
- All six survey route arrays and controllers expose zero Content API actions. Registered survey actions, application-role survey grants, API-token survey actions, and current D31 rows are zero.
- Public, Authenticated, and every other application role remain denied. Super Admin is excluded from application-role reads and mutation. D31 names remain future U8 application capabilities rather than current Strapi action IDs.
- Inspection issues only read queries and always destroys Strapi; isolated PostgreSQL containers and volumes are removed on completion.
- No seed, fixture, U6, dependency, lockfile, environment, schema, generated-type, app, remote, deployment, or effective permission mutation occurred.

### S06a TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `s06a-permission-deny-baseline-tests-docs` | `test/feedback/permissions/{permissions,postgres-permissions}.test.js` | Static contract + isolated PostgreSQL/real Strapi | Lifecycle 10/10, catalog 6/6, harness 21/21 passed | Interrupted script-based candidate exited 1, 4/5; revised direct suite then exited 1, 2/4 on stale docs and unavailable plugin query metadata | Direct selector exited 0, 4/4 | Intermediate REDs exposed multiline ownership wording, query count assumptions, and Knex non-write query methods; assertions now cover every route/controller, all application permission rows, token rows, and failure cleanup | Shared inspection cleanup was extracted; final 4/4 remained green |

### S06a Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `npm --prefix teleferico-cms test -- feedback/permissions`; exit 0; 4/4 passed, 0 failed/skipped/cancelled/todo. |
| Runtime harness command/scenario and exact result | The focused selector started only local PostgreSQL project `tb113_test_permissions`, synchronized real Strapi against `tb113_test_feedback`, directly registered Strapi, proved zero survey/D31 action rows across registered routes, all application-role permissions, and API-token permissions, then destroyed Strapi and ended with zero owned containers/volumes. The inspection query ledger contained no write or Admin Panel role/permission query. |
| Rollback boundary | Remove the two focused test files and their selector registration; revert the S06a permissions documentation, S06 split amendments, and this S06a evidence. Preserve all S01-S05b implementation and evidence. |

### S06a Verification

- Permissions: exit 0, 4/4. Lifecycle: exit 0, 10/10. Catalog: exit 0, 6/6. Harness: exit 0, 21/21.
- `git diff --check`: exit 0, no output.
- Complete authored changed-line total: 304 (288 additions, 16 deletions), below the 400-line ceiling.

## S06b Seed and Fixture Evidence

- Scope: exact Appendix-01 ordered 13-key plus `other` ES/EN/PT catalog, a separate production-bootstrap descriptor, and deterministic local/test fixture ownership under `tb113-fixture-v1`.
- Parent-first fixture creation, repeat application, child-first cleanup, and every cleanup guard execute inside the injected transaction boundary.
- Cleanup also validates the fixture parent's draft status and synthetic flag before deletion. Any ownership mismatch aborts without deleting unrelated data.
- S06a remains unchanged: no route, controller, action, role, API-token, grant, or permission mutation was added.

### S06b TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `s06b-seed-fixtures` correction | `test/feedback/seed/{seed,postgres-seed}.test.js` | Unit + isolated PostgreSQL/real Strapi | Seed 7/7 passed before correction | Exit 1: status/synthetic mismatches were accepted and `runProductionSeed` was absent | Final seed selector exited 0, 10/10 | Production CLI create/replay, failure cleanup, and both omitted ownership fields exercised distinct paths | Final 10/10 remained green |

### S06b Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `npm --prefix teleferico-cms test -- feedback/seed`; exit 0; 10/10 passed, 0 failed/skipped/cancelled/todo. |
| Runtime harness command/scenario and exact result | Local project `tb113_test_seed` ran the direct production CLI twice against real Strapi/PostgreSQL, observed create then replay with one version/14 aspects, and ended with zero owned containers, volumes, or seed child processes. |
| Rollback boundary | Remove `teleferico-cms/scripts/seed-surveys.js`, `teleferico-cms/test/feedback/seed/**`, and only the `feedback/seed` selector; revert task 2.2 and this S06b evidence while preserving S01-S06a. |

### S06b Verification

- Seed: exit 0, 10/10. Permissions: exit 0, 4/4. Lifecycle: exit 0, 10/10. Catalog: exit 0, 6/6. Harness: exit 0, 21/21.
- `git diff --check`: exit 0, no output.
- Complete authored changed-line total: 459 (452 additions, 7 deletions); the approximately 152-line RDD correction stayed within its authorized 172-line budget, and the complete candidate is covered by its specific `size:exception`.
- Native RDD approved and acknowledged lineage `review-9493ffd813868f58` for target `sha256:6517bdb7e823f3c053a26c331f6f0c5badad198bc56882916e78dd0188aa05af` before this passive evidence-only update.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | Inline Python S01 structural validator | Documentation contract | RED/pre-completion PASS: diff clean; 93 decisions; 15 tasks with 0 checked; 24 slices | PASS: validator failed with `missing S01 verification-gates.md` before creation | PASS: 9 complete gates; required sections and blockers present | Skipped: this is a structural evidence artifact with one required document contract and no production branching | None needed; the first complete document structure passed |
| 1.2 | `teleferico-cms/test/feedback/harness/process-boundary.test.js` | Unit plus local PostgreSQL integration | N/A (new harness); prior attempt established the missing canonical test script | PASS: exact focused command entered Node 22 test execution and failed with `MODULE_NOT_FOUND` for `./postgres-harness`; 0 passing, 1 failing | PASS: exact focused command completed 21/21 tests with 0 failures | PASS: 21 cases cover local/remote targets, marker rejection, seven metacharacter paths, alternate Compose path, fixed arrays, stale cleanup, child failure, SIGTERM cleanup, and orphan detection | PASS: 21/21 after local-socket isolation and stale-resource runtime refinement |
| 1.3 | `src/components/administration/feedback/__tests__/renderer-poc.test.ts` | Unit + local Chromium/PDF integration | PASS: package-policy 4/4; exact dependency commands succeeded; typecheck passed | PASS: missing `renderer-poc` import failed; digest/artifact triangulation later failed on absent fields | PASS: 2/2; all nine criteria true | PASS: zero/one, five charts, null/zero/negative, long ES/PT labels, and 200-point scatter | PASS: 2/2 after Node-environment cleanup |
| 2.1 | `teleferico-cms/test/feedback/lifecycle/{lifecycle,postgres-lifecycle}.test.js` | Unit + local PostgreSQL integration | PASS: catalog 6/6 and harness 21/21 before production edits | PASS: lifecycle selector exited 1 with missing migration; later REDs proved missing routes and submission lifecycle | PASS: final lifecycle selector exited 0 with 9/9 tests | PASS: complete/incomplete publication, activation/repoint, QR deactivate/reactivate, valid/invalid submissions, CAS/terminal transitions, idempotent migration, duplicate/range/check rollback paths | PASS: final 9/9 after route/service alignment and PostgreSQL cleanup assertions |

### Test Summary

- Total tests written: 2 structural contract validators, 21 Node cases/subtests, and 2 renderer POC tests.
- Total tests passing: 2 structural validators, 4/4 package-policy tests, 21/21 Node cases, and 2/2 renderer POC tests.
- Layers used: documentation contracts/readback, unit/process-boundary tests, local PostgreSQL integration, and local Chromium/PDF integration.
- Approval tests: none; no existing runtime behavior was refactored.
- Pure functions created: renderer-neutral semantic and HTML/SVG adapter projections.
- S05b additions: 9 lifecycle/migration tests pass; pure lifecycle preparation functions cover publication, activation, QR state, immutable submission snapshots, generation CAS, and report eligibility.

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

## S05a Cloud Build Remediation Evidence

- Scope: corrected only the real-auth login cold-start timing contract and its repository guard test. Task 2.1 remains unchecked and no product behavior, schema, permission, dependency, lockfile, image pin, cleanup rule, SHA gate, or acceptance-count rule changed.
- Proven cause: the server-side Strapi credential probe succeeded. The first browser login then spent 74,659 ms in cold navigation while the test shared one 75,000 ms deadline between navigation and hydration, leaving at most 341 ms for hydration. The app log recorded no subsequent dashboard or authenticated browser request before Playwright exited 1. The lifecycle therefore withheld the internal 3/3 signal, performed synthetic and service cleanup, and correctly selected primary failure.
- Non-cause evidence: PostgreSQL missing-index messages preceded successful Strapi startup and the successful credential probe, so they did not terminate readiness, provisioning, or authentication and are not causal for this failure.
- Correction: navigation now has a 90,000 ms budget and hydration has an independent 30,000 ms budget. The 180,000 ms per-test ceiling remains unchanged and leaves 60,000 ms for authentication assertions after both cold-start phases.
- Package-security boundary: package-manager pinning, frozen installs, dependencies, lifecycle scripts, and lockfiles are unchanged.

### S05a Remediation TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `s05a-cloud-build-remediation` | `.github/scripts/playwright-e2e.test.js` | Repository contract test over the real Playwright spec/config | `node --test .github/scripts/playwright-real-stack-lifecycle.test.js .github/scripts/playwright-e2e.test.js .github/scripts/playwright-real-auth-provisioner.test.js`: exit 0, 61/61 passed | Focused command exited 1, 0/1 passed; the login navigation had no independent timeout budget | Focused command exited 0, 1/1 passed after separate navigation and hydration budgets were implemented | The same test reproduces the observed branch: 75,000 − 74,659 = 341 ms, then proves the independent hydration budget exceeds that remainder and the global timeout exceeds both phase budgets | Focused command exited 0, 1/1 passed after adding the observed-duration boundary assertions |

### S05a Remediation Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `node --test --test-name-pattern="real-auth login reserves independent navigation and hydration budgets" .github/scripts/playwright-e2e.test.js`; final exit 0, 1/1 passed, 0 failed. RED was exit 1, 0/1 passed, with `The login navigation must have its own timeout budget.` |
| Runtime harness command/scenario and exact result | `PLAYWRIGHT_REAL_AUTH_BASE_URL=http://127.0.0.1:3200 <synthetic required contract variables> pnpm --dir teleferico-app exec playwright test --config=playwright.real-auth.config.ts --list`; exit 0, exactly 3 tests discovered in the one real-auth file. Full PostgreSQL/Strapi/Next.js execution was not rerun because reproducing Cloud Build is the independently authorized remote verification step. |
| Rollback boundary | Revert only `.github/scripts/playwright-e2e.test.js` and `teleferico-app/tests/e2e-real-auth/real-auth.spec.ts`, then remove this remediation section/status adjustment. Preserve the S01-S05a persistence candidate and all historical evidence. |

### S05a Remediation Verification

- `bash -n scripts/run-playwright-real-auth.sh`: exit 0, no output.
- `node --test .github/scripts/playwright-real-stack-lifecycle.test.js .github/scripts/playwright-e2e.test.js .github/scripts/playwright-real-auth-provisioner.test.js`: exit 0, 62/62 passed, 0 failed/skipped/cancelled/todo.
- `git diff --check`: exit 0, no output.
- `pnpm --dir teleferico-app run typecheck`: exit 0, TypeScript reported no errors.
- Real-auth discovery command: exit 0, exactly 3 tests in 1 file.
- Remote Cloud Build: not run; local authorization explicitly excludes remote build triggers and mutations.

## S05b U4 Completion Evidence

- Scope: completed only task 2.1/U4. Added the approved additive migration, eight uniqueness indexes, four check constraints, disabled singleton bootstrap, aligned controllers/services/routes with zero generic content routes, and pure lifecycle contracts for versions, activation, QR points, submissions, generations, and report eligibility.
- Authorization: schema/migration/generated-type work was explicitly approved. No permission grant, dependency, lockfile, environment, app contract, deployment, or remote resource changed.
- Contract review: `teleferico-app/src/types/{cms,api}` has no current survey consumer to update. `docs/STRAPI_PERMISSIONS.md` already states all six survey types have no API-token or Users & Permissions grants; access expectations remain unchanged, so no permissions-document edit was required.
- Generated artifacts: `npm --prefix teleferico-cms run strapi -- ts:generate-types` exited 0 with 0 warnings/errors. Both generated declaration files remained byte-identical because S05a already contained the complete schemas.

### S05b RED, GREEN, TRIANGULATE, and REFACTOR

| Phase | Command | Exact result |
|---|---|---|
| Safety net | `npm --prefix teleferico-cms test -- feedback/catalog` and `npm --prefix teleferico-cms test -- feedback/harness` | Before production edits: catalog exit 0, 6/6 passed; harness exit 0, 21/21 passed. |
| RED | `npm --prefix teleferico-cms test -- feedback/lifecycle` | Exit 1, 0 passing/1 failing because `2026.09.11T0001-tb113-constraints` did not exist. Later scoped REDs failed on missing route modules and missing submission lifecycle preparation. |
| GREEN | `npm --prefix teleferico-cms test -- feedback/lifecycle` | Final exit 0; 9 tests passed, 0 failed/skipped/cancelled/todo. |
| TRIANGULATE | Same lifecycle selector | Covered complete and incomplete publication, duplicate ordering, activation/repoint/no-op predecessor, QR deactivate/reactivate/invalid status, standard plus `other` snapshots, duplicate selections, CAS conflict, valid/invalid terminal transitions, migration statement ownership, idempotent rerun, uniqueness conflicts, range/terminal checks, and transaction rollback. |
| REFACTOR | Same lifecycle selector after route/service alignment and runtime cleanup assertions | Exit 0; 9/9 remained green. |

### S05b Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `npm --prefix teleferico-cms test -- feedback/lifecycle`; exit 0; 9/9 passed. The selector includes unit contracts plus a real PostgreSQL 16.8 migration/invariant test. |
| Runtime harness command/scenario and exact result | The lifecycle selector started only local Compose project `tb113_test_lifecycle` against database `tb113_test_feedback`, applied and reapplied the migration, observed `8|4|1` for indexes/constraints/disabled singleton, proved duplicate submission and active-range rejection, proved failed multi-write rollback (`1|0`), and exited 0. Post-run Docker container and volume queries for `tb113_test_lifecycle` and `tb113_test_runtime_stale` were empty. |
| Rollback boundary | Remove `teleferico-cms/database/migrations/2026.09.11T0001-tb113-constraints.js`; remove only the new `controllers`, `routes`, and `services` directories under the six survey APIs; remove `teleferico-cms/test/feedback/lifecycle/**`; revert only the catalog/test-runner changes, task 2.1 checkbox, and this S05b evidence. Preserve all S01-S05a definitions, generated declarations, permissions documentation, and evidence. |

### S05b Required Verification

- `npm --prefix teleferico-cms test -- feedback/catalog`: exit 0; 6/6 passed.
- `npm --prefix teleferico-cms test -- feedback/lifecycle`: exit 0; 9/9 passed.
- `npm --prefix teleferico-cms test -- feedback/harness`: exit 0; 21/21 passed.
- `npm --prefix teleferico-cms run build`: exit 0; Strapi admin build completed. It emitted only the pre-existing stale Browserslist-data advisory.
- `git diff --check`: exit 0; no output.

### S05b Review Boundary

- Size: 746 implementation changed lines before SDD evidence persistence (743 additions, 3 deletions); generated declarations had zero delta. Required cumulative task/apply evidence brings the complete correction candidate to exactly 807 changed lines (794 additions, 13 deletions). The maintainer explicitly extended the S05b `size:exception` from 800 to exactly 807 complete changed lines after the former attempt settled failed.
- Sequential boundary: starts from merged PR #301 on `development` and ends with U4 complete. Task 2.2/U5 and all later work remain untouched.
- Deviations: none. Exact browser/admin/worker endpoints remain deferred to their assigned U7/U8/U9/U10 slices; S05b exposes no generic CRUD or invented endpoint.

## S05b Cloud Build Startup Remediation Evidence

- Failed evidence: Cloud Build `12413529-44d6-495e-b50f-9c3cc8b24a29` ran user migrations before Strapi schema synchronization, so the TB-113 migration asserted columns that did not yet exist and stopped readiness.
- Correction: the migration now defers only when its complete required-column surface is absent. Strapi's user bootstrap, which runs after `db.schema.sync()`, reapplies the same idempotent statements inside one transaction. Existing databases still apply the migration before sync; every startup revalidates/reapplies the same eight indexes, four checks, and disabled singleton.
- Security boundary: the fresh-start process receives only fixed local PostgreSQL/test values, `ENV_PATH=/dev/null`, and a minimal environment. No dependency, lockfile, permission, credential, remote service, or deployment changed.

### Remediation TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `s05b-cloud-build-remediation` | `test/feedback/lifecycle/{lifecycle,postgres-lifecycle}.test.js` | Unit + isolated PostgreSQL/real Strapi startup | Lifecycle 9/9 passed before edits | Fresh-start test exited 1 with the exact `TB-113 schema mismatch` missing-column list; migration deferral unit test also exited 1 before implementation | Focused fresh-start test exited 0, 1/1; migration deferral test exited 0, 1/1 | Full lifecycle covers both fresh startup and pre-existing schema paths; 10/10 passed with catalog `8|4|1` | 10/10 remained green after minimal environment and dynamic loopback-port hardening |

### Remediation Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `npm --prefix teleferico-cms test -- feedback/lifecycle`; exit 0; 10/10 passed, including a real empty-database Strapi startup and the existing-database invariant path. |
| Runtime harness command/scenario and exact result | The lifecycle selector started PostgreSQL 16.8 in `tb113_test_lifecycle`, launched real `strapi start` against the empty database, reached `/admin/init`, and observed `8|4|1`. Final owned container, volume, and process checks were empty. |
| Rollback boundary | Revert only the migration readiness gate, post-sync bootstrap application, loopback-only random PostgreSQL test port, fresh-start regression test, and this remediation evidence. Preserve U4 schemas, lifecycle behavior, indexes/checks, singleton semantics, and all prior S01-S05b evidence. |

### Remediation Verification

- Lifecycle: exit 0, 10/10. Catalog: exit 0, 6/6. Harness: exit 0, 21/21.
- `ENV_PATH=/dev/null npm --prefix teleferico-cms run build`: exit 0; only the noncausal stale Browserslist advisory appeared.
- U5 and every later task remain unchecked and untouched. Parent attempt settlement remains outside this apply execution.

## S07a Partial U6 Evidence

- Scope: package-local Vitest/typecheck boundary, reporting contract identities and exact route-filter scopes, `tb-json.v1` canonical serialization primitives, and Buenos Aires local-calendar day/week/month periods. Metrics, populations, snapshots, chart models, formatting, and empty states remain deferred; task 2.3 stays unchecked.
- The root Vitest configuration and every dependency, manifest, workspace declaration, lockfile, CMS, runtime UI, and excluded path remain unchanged.

### S07a TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `U6-S07a-package-test-boundary-and-contracts-periods` | `packages/survey-reporting-core/src/reporting-core.test.ts` | Pure unit | N/A — new package | Missing `canonical-json` suite failed before implementation; day-bucket triangulation later failed 1/11 | Final package selector passed 11/11 | Exact routes, valid/invalid canonical values, equal previous range, and clipped day/week/month paths | Final 11/11 remained green after scalar-validation correction and package export boundary |

### S07a Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `pnpm --dir teleferico-app exec vitest run --config packages/survey-reporting-core/vitest.config.ts`; exit 0; 1 file and 11/11 tests passed. |
| Runtime harness command/scenario and exact result | N/A — pure dependency-free library; no runtime boundary in S07. |
| Rollback boundary | Remove only `teleferico-app/packages/survey-reporting-core/**` and this S07a evidence/status update; preserve S01-S06 and task 2.3 unchecked. |

## Corrected S08 Partial U6 Evidence
- Rescope remediation for failed revision `sha256:1aa9c7cccfee066fbd775fb5dc867db74229b14f7341e4066239ce8b50a03491`: eligible populations plus exact KPI, aspect, related-rating, day/week/month trend, threshold, dominance, matrix, association, and `other` formulas; S09 snapshots, chart models, formatting, and empty states remain deferred, so task 2.3 stays unchecked.
### S08 TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `U6-S08-reporting-metrics` | `src/metrics.test.ts` | Pure unit | Correction baseline 16/16 passed; original RED was missing `./metrics` | Corrective trend assertion failed because `trend` was absent | 5/5 passed | Related-rating cohort count/average; Buenos Aires day/week/month buckets and sentiment denominators; no S09 result keys; all original arithmetic/population/aspect/matrix/association cases retained | 5/5 remained green after cohesive helper refactor |
### S08 Work Unit Evidence
| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `pnpm --dir teleferico-app exec vitest run src/metrics.test.ts --config packages/survey-reporting-core/vitest.config.ts`; corrective RED exit 1 with absent trend; final exit 0, 1 file and 5/5 passed. |
| Runtime harness command/scenario and exact result | N/A — S08 remains a dependency-free pure TypeScript library with no runtime, I/O, framework, browser, CMS, or Node boundary. |
| Rollback boundary | Remove `src/metrics.ts` and `src/metrics.test.ts`, revert the metrics barrel export and only this S08 status/evidence; preserve S07 and keep task 2.3 unchecked. |

## S09 Snapshot Slice Evidence — U6 Remains Open

- Scope: deterministic immutable `survey-snapshot.v1` envelopes, canonical SHA-256 population/payload digests, complete current/previous comments, calendar and QR-point projections, validation, deep freezing, five ordered renderer-neutral report charts, exact one-decimal formatting, and explicit empty states. Terminal S09 settlement revision: `sha256:4c0c8157d956eda3dedc7535567c2e176912f10f4635d22efe2e1e6cd1f20f78`.
- Reconciliation finding: source/test inspection proves only the separate 5% aspect threshold and aspect `insufficient_evidence` state; no recurrent/minority implementation or tests prove D64-D67 (`max(10,ceil(2%))`, four unique refs, distinct signals, recurrent overlap precedence, unsupported category). Task 2.3 is therefore reopened. Production imports remain relative-only and contain no React, Next.js, Strapi, ECharts, Recharts, browser, or Node dependency, supporting D85.
- Partial closure: S09 is a partial U6 slice; D64-D67 are deferred to the next ordered slice, and task 2.3 remains unchecked.

### S09 TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `U6-S09-reporting-snapshots` | `src/snapshot.test.ts` | Pure unit | Package baseline exit 0, 16/16 passed | Exit 1 before production code: missing `./snapshot`; 0 tests collected | Focused selector exit 0, 3/3 passed | Non-empty and empty populations, both periods, canonical digest fixture, altered digest rejection, five ordered charts, accessible tables, unavailable values, signed percentages, and half-up rating formatting | Full package exit 0, 19/19 passed after runtime-neutral SHA-256 and chart-kind refinement |

### S09 Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `pnpm --dir teleferico-app exec vitest run packages/survey-reporting-core/src/snapshot.test.ts --config packages/survey-reporting-core/vitest.config.ts`; exit 0; 1 file and 3/3 tests passed. |
| Runtime harness command/scenario and exact result | N/A — S09 is a pure dependency-free TypeScript library with no I/O, framework, browser, CMS, Node, process, or remote boundary. |
| Rollback boundary | Remove `src/snapshot.ts` and `src/snapshot.test.ts`, revert their barrel export, task 2.3 checkbox, and this S09/status evidence; preserve all S07/S08 behavior and evidence. |

### S09 Verification and Cleanup

- Package tests: exit 0, 3 files and 19/19 tests passed. Root app typecheck: exit 0 after aligning the TypeScript target with the core's exact BigInt contract at ES2020 and cleaning the stale local incremental cache. `git diff --check`: exit 0, no output. Pure-core inspection: 6 production files, 12 relative-only imports, 0 prohibited dependencies. Corrected candidate: 388 authored changed lines (384 additions, 4 deletions).
- Test-created package-local `node_modules` was removed; no child process, container, volume, temporary artifact, dependency, manifest, lockfile, runtime, remote service, or credential remained or changed.

## S10 D64-D67 Evidence Rules — U6 Complete

- Scope: added only renderer-neutral pure-core recurrent/minority evidence thresholds and classification. S07-S09 behavior is preserved, U7 and later tasks remain untouched, and task 2.3 is now complete.
- Recurrent thresholds are calculated independently per period as `max(10, ceil(2% of unique eligible comments))`; minority support requires four unique eligible comments.
- Required categories are always projected in caller-provided deterministic order. Missing or weak categories explicitly return `insufficient_evidence`; recurrent takes precedence when the same category also qualifies as minority.
- Candidate references are deduplicated and only eligible period references contribute to support, so evidence cannot leak across periods.

### S10 TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `S10-D64-D67-report-evidence` | `packages/survey-reporting-core/src/metrics.test.ts` | Pure unit | Focused baseline exit 0, 5/5 passed | Exit 1, 3/8 failed because both new production exports were absent; the existing 5 tests remained green | Focused exit 0, 8/8 passed after the minimum threshold and classification implementation | Covered 0/500/501/1,001 eligible-comment boundaries, 21-ref recurrence, four-ref minority, recurrent overlap precedence, duplicate refs, three-ref weakness, absent required categories, and current/previous isolation | Extracted the signal decision into one pure rule; focused exit 0, 8/8 remained green |

### S10 Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `pnpm --dir teleferico-app exec vitest run packages/survey-reporting-core/src/metrics.test.ts --config packages/survey-reporting-core/vitest.config.ts`; exit 0; 1 file, 8/8 passed. |
| Runtime harness command/scenario and exact result | N/A — this slice changes a dependency-free pure TypeScript calculation with no runtime, I/O, framework, browser, CMS, process, or remote boundary. |
| Rollback boundary | Revert only the evidence contracts/functions in `src/metrics.ts`, the D64-D67 tests in `src/metrics.test.ts`, task 2.3's checkbox, and this S10 evidence/status. Preserve every S07-S09 contract, metric, snapshot, chart, and test behavior. |

### S10 Verification and Cleanup

- Focused metrics: exit 0, 1 file and 8/8 tests passed.
- Full core: exit 0, 3 files and 22/22 tests passed.
- Core TypeScript: exit 0, no diagnostics.
- App TypeScript: exit 0, no diagnostics.
- `git diff --check`: exit 0, no output.
- Authored scope: 158 changed lines (152 additions, 6 deletions), including cumulative SDD task/progress persistence; no size exception.
- Evidence revision: `sha256:8c19bf2599e0679316db8586fa759faed14a5313c3e21231098dd0475f17e871`, derived from canonical `tb113-apply-evidence.v1` JSON containing the two implementation-file SHA-256 digests, exact verification outcomes, completed task identity, runtime boundary, and harness state.
- The existing package-local Vitest harness was reused and not invalidated; no configuration, dependency, manifest, lockfile, generated artifact, runtime service, process, container, volume, remote operation, or credential was created or changed.

## S11 U7 Intake HTTP Boundary — U7 Remains Open

- Scope: added pure server-usable validation for canonical QR public codes, canonical UUID draft identifiers, and the public submission request envelope.
- The envelope fails closed on method, UTF-8 JSON media type, actual/declared 32 KiB size, query parameters, malformed UTF-8/JSON, contract version, required fields, and unknown fields.
- Typed deterministic results expose only safe status/code/field metadata. No Route Handler, CMS call, token/draft lifecycle, origin/session/CSRF/capability enforcement, Redis guard, receipt, UI, worker transport, or E2E flow was added.
- Task 3.1/U7 remains unchecked. Remaining U7 work is the QR resolver and signed session; exact answer/domain validation; origin/fetch-site, CAPTCHA, token/version/grace, idempotency and guard ordering; authoritative acceptance/receipt and Redis degradation; QR-bound draft and localized responsive UI; and visitor E2E proof.

### S11 TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| `S11-U7-intake-http-boundary` | `src/lib/feedback/intake-boundary.test.ts` | Pure unit | Public-form route baseline exit 0, 4/4 passed | Exit 1 before production code; unresolved `./intake-boundary`, 0 tests collected | Focused exit 0, 22/22 passed | Canonical and encoded/malformed/overlong/dot/extra-segment identifiers; valid envelope plus method/media/charset/query/size/length/UTF-8/JSON/field branches | Unified path validation helper; focused exit 0, 22/22 remained green |

### S11 Work Unit Evidence

| Evidence | Exact value |
|---|---|
| Focused test command and exact result | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/intake-boundary.test.ts`; exit 0; 1 file, 22/22 passed. |
| Runtime harness command/scenario and exact result | N/A — this slice is a pure request-boundary library with no Route Handler, network, persistence, process, browser, CMS, or other runtime integration. |
| Rollback boundary | Remove `src/lib/feedback/intake-boundary.ts` and its focused test, then remove only this S11 progress/status update; preserve S01-S10 and keep task 3.1 unchecked. |

### S11 Verification, Cleanup, and Settlement Evidence

- Safety net: `pnpm --dir teleferico-app exec vitest run src/app/api/__tests__/public-form-routes.test.ts`; exit 0; 1 file, 4/4 passed.
- Focused test: exit 0; 1 file, 22/22 passed. App typecheck: exit 0; no diagnostics. `git diff --check`: exit 0; no output.
- Authored scope: 351 changed lines (348 additions, 3 deletions), including cumulative OpenSpec persistence; no size exception.
- No source-mutating formatter ran. No process remained after foreground Vitest/TypeScript commands; no container, volume, temporary artifact, dependency, manifest, lockfile, generated artifact, runtime service, remote operation, or credential was created or changed.
- Evidence revision: `sha256:7d8deb330a4009a1282dd18acff30862afcc04652a4f4934eb7fbb8a6bf4f757`, derived from canonical `tb113-apply-evidence.v1` JSON containing the two implementation-file SHA-256 digests, exact verification outcomes, incomplete task state, runtime disposition, and harness cleanup state.
- Settlement diagnosis: passed for this partial U7 slice; task 3.1 correctly remains open, and native attempt settlement remains parent-owned.
