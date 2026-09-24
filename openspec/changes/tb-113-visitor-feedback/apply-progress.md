# Apply Progress: TB-113 Visitor Feedback

## Status

- Change: `tb-113-visitor-feedback`
- Apply mode: Strict TDD; U6 complete and U7 foundations through U7-B5 are implemented
- Delivery mode: bounded chained slice under `ask-on-risk`
- Chain strategy: `stacked-to-main`; draft child previews may target the exact immediate parent, then the same PR retargets to `development` after parent merge
- Review budget: mandatory sequential B3a/B3b split; current U8-B remediation must remain at or below 1,600 authored additions+deletions against `dcda03d`
- Current slice/work unit: `U8-B-admin-report-commands`; native Strapi core boundary remediation
- Progress: 7 of 15 parent tasks complete; U8-A and U8-B subtasks complete and U8 parent/UI work remains pending
- Generation status: disabled
- Vertex gate: G03 passed for sanitized comments with `gemini-3.8-flash` in `us`; no fallback
- Apply outcome: U8-B native-core remediation is focused-green and ready for independent SDD verification; parent-owned settlement remains separate. The exact candidate delta is 1,457 authored additions+deletions against `dcda03d`; U8 parent remains unchecked because UI and admin E2E are separate work units.

## Completed tasks

- [x] 1.1 U1 — Record official facts, approved probe evidence, pass/fail criteria, fail-closed fallbacks, provenance, and affected decisions in `docs/infra/survey-reporting/verification-gates.md`.
- [x] 1.2 U2 — Add the isolated local-only PostgreSQL harness, fixed subprocess boundary, deterministic cleanup, and canonical dependency-free Node 22 test command.
- [x] 1.3 U3 — Prove the nine Appendix-05 renderer criteria with Recharts, ECharts 6.1 SVG SSR, pinned Chromium, deterministic PDFs, and synthetic parity fixtures.
- [x] 2.1 U4 — Complete exact Strapi persistence services/routes, additive constraints and indexes, lifecycle contracts, generated-type regeneration, and local PostgreSQL proof.
- [x] 2.2 U5 — Preserve deny-by-default permissions and add the exact initial catalog plus deterministic transactional local/test fixtures.
- [x] 2.3 U6 — Complete the pure reporting core, including independent recurrent/minority evidence classification and explicit unsupported categories.

## Remaining tasks

- [x] 3.1 U7 — U7-B3a CMS transport and U7-B3b HTTP composition are complete; U7-B4 drafts/UI is complete under its explicit exception; U7-B5 E2E is complete.
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

| Task                                       | Test File                                                              | Layer                                             | Safety Net                                         | RED                                                                                                                                           | GREEN                         | TRIANGULATE                                                                                                                                                                                                                     | REFACTOR                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `s06a-permission-deny-baseline-tests-docs` | `test/feedback/permissions/{permissions,postgres-permissions}.test.js` | Static contract + isolated PostgreSQL/real Strapi | Lifecycle 10/10, catalog 6/6, harness 21/21 passed | Interrupted script-based candidate exited 1, 4/5; revised direct suite then exited 1, 2/4 on stale docs and unavailable plugin query metadata | Direct selector exited 0, 4/4 | Intermediate REDs exposed multiline ownership wording, query count assumptions, and Knex non-write query methods; assertions now cover every route/controller, all application permission rows, token rows, and failure cleanup | Shared inspection cleanup was extracted; final 4/4 remained green |

### S06a Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npm --prefix teleferico-cms test -- feedback/permissions`; exit 0; 4/4 passed, 0 failed/skipped/cancelled/todo.                                                                                                                                                                                                                                                                                                                                            |
| Runtime harness command/scenario and exact result | The focused selector started only local PostgreSQL project `tb113_test_permissions`, synchronized real Strapi against `tb113_test_feedback`, directly registered Strapi, proved zero survey/D31 action rows across registered routes, all application-role permissions, and API-token permissions, then destroyed Strapi and ended with zero owned containers/volumes. The inspection query ledger contained no write or Admin Panel role/permission query. |
| Rollback boundary                                 | Remove the two focused test files and their selector registration; revert the S06a permissions documentation, S06 split amendments, and this S06a evidence. Preserve all S01-S05b implementation and evidence.                                                                                                                                                                                                                                              |

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

| Task                            | Test File                                         | Layer                                  | Safety Net                        | RED                                                                                  | GREEN                               | TRIANGULATE                                                                                               | REFACTOR                   |
| ------------------------------- | ------------------------------------------------- | -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------- |
| `s06b-seed-fixtures` correction | `test/feedback/seed/{seed,postgres-seed}.test.js` | Unit + isolated PostgreSQL/real Strapi | Seed 7/7 passed before correction | Exit 1: status/synthetic mismatches were accepted and `runProductionSeed` was absent | Final seed selector exited 0, 10/10 | Production CLI create/replay, failure cleanup, and both omitted ownership fields exercised distinct paths | Final 10/10 remained green |

### S06b Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused test command and exact result             | `npm --prefix teleferico-cms test -- feedback/seed`; exit 0; 10/10 passed, 0 failed/skipped/cancelled/todo.                                                                                                                          |
| Runtime harness command/scenario and exact result | Local project `tb113_test_seed` ran the direct production CLI twice against real Strapi/PostgreSQL, observed create then replay with one version/14 aspects, and ended with zero owned containers, volumes, or seed child processes. |
| Rollback boundary                                 | Remove `teleferico-cms/scripts/seed-surveys.js`, `teleferico-cms/test/feedback/seed/**`, and only the `feedback/seed` selector; revert task 2.2 and this S06b evidence while preserving S01-S06a.                                    |

### S06b Verification

- Seed: exit 0, 10/10. Permissions: exit 0, 4/4. Lifecycle: exit 0, 10/10. Catalog: exit 0, 6/6. Harness: exit 0, 21/21.
- `git diff --check`: exit 0, no output.
- Complete authored changed-line total: 459 (452 additions, 7 deletions); the approximately 152-line RDD correction stayed within its authorized 172-line budget, and the complete candidate is covered by its specific `size:exception`.
- Native RDD approved and acknowledged lineage `review-9493ffd813868f58` for target `sha256:6517bdb7e823f3c053a26c331f6f0c5badad198bc56882916e78dd0188aa05af` before this passive evidence-only update.

## TDD Cycle Evidence

| Task | Test File                                                                       | Layer                                  | Safety Net                                                                            | RED                                                                                                                                          | GREEN                                                             | TRIANGULATE                                                                                                                                                                                          | REFACTOR                                                                        |
| ---- | ------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1.1  | Inline Python S01 structural validator                                          | Documentation contract                 | RED/pre-completion PASS: diff clean; 93 decisions; 15 tasks with 0 checked; 24 slices | PASS: validator failed with `missing S01 verification-gates.md` before creation                                                              | PASS: 9 complete gates; required sections and blockers present    | Skipped: this is a structural evidence artifact with one required document contract and no production branching                                                                                      | None needed; the first complete document structure passed                       |
| 1.2  | `teleferico-cms/test/feedback/harness/process-boundary.test.js`                 | Unit plus local PostgreSQL integration | N/A (new harness); prior attempt established the missing canonical test script        | PASS: exact focused command entered Node 22 test execution and failed with `MODULE_NOT_FOUND` for `./postgres-harness`; 0 passing, 1 failing | PASS: exact focused command completed 21/21 tests with 0 failures | PASS: 21 cases cover local/remote targets, marker rejection, seven metacharacter paths, alternate Compose path, fixed arrays, stale cleanup, child failure, SIGTERM cleanup, and orphan detection    | PASS: 21/21 after local-socket isolation and stale-resource runtime refinement  |
| 1.3  | `src/components/administration/feedback/__tests__/renderer-poc.test.ts`         | Unit + local Chromium/PDF integration  | PASS: package-policy 4/4; exact dependency commands succeeded; typecheck passed       | PASS: missing `renderer-poc` import failed; digest/artifact triangulation later failed on absent fields                                      | PASS: 2/2; all nine criteria true                                 | PASS: zero/one, five charts, null/zero/negative, long ES/PT labels, and 200-point scatter                                                                                                            | PASS: 2/2 after Node-environment cleanup                                        |
| 2.1  | `teleferico-cms/test/feedback/lifecycle/{lifecycle,postgres-lifecycle}.test.js` | Unit + local PostgreSQL integration    | PASS: catalog 6/6 and harness 21/21 before production edits                           | PASS: lifecycle selector exited 1 with missing migration; later REDs proved missing routes and submission lifecycle                          | PASS: final lifecycle selector exited 0 with 9/9 tests            | PASS: complete/incomplete publication, activation/repoint, QR deactivate/reactivate, valid/invalid submissions, CAS/terminal transitions, idempotent migration, duplicate/range/check rollback paths | PASS: final 9/9 after route/service alignment and PostgreSQL cleanup assertions |

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

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | The RED/GREEN command above is the smallest structural/traceability check for S01. Final result: exit 0; 9 complete gates with all required sections, evidence fields, and dependency blockers present.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Runtime harness command/scenario and exact result | The approved manual/safe/sensitive evidence path was executed. The manual Vertex `countTokens` result was not rerun: transport exit 0, HTTP/error code 404, `NOT_FOUND`, no token totals. At `2026-09-12T00:55:51Z`, each approved GCP read was attempted exactly once: four named Cloud Run describes succeeded (`ingress=all`, shared-identity boolean true); filtered regional inventory returned 0 queues and 0 services; both bucket describes returned `SOUTHAMERICA-EAST1`, empty lifecycle, and null locationType/UBLA/PAP projections; both bucket IAM projections returned empty binding arrays and were classified as inconclusive. |
| Rollback boundary                                 | Revert the S01 document, this apply-progress artifact, and only the task 1.1 checkbox while preserving the other task text. The autonomous branch boundary also includes the seven authorized pre-existing topology corrections: `design.md`, `design/04-ai-worker-infrastructure.md`, `design/06-migration-testing-rollout.md`, `design/08-d01-d93-traceability.md`, `specs/survey-worker-operations/spec.md`, `specs/vertex-feedback-analysis/spec.md`, and `tasks.md`. No runtime resource or behavior changed.                                                                                                                             |

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

| Phase    | Command                                                | Exact result                                                                                                                                                                              |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED      | `npm --prefix teleferico-cms test -- feedback/harness` | Exit 1 after Node 22 test execution began: 0 passing, 1 failing; `MODULE_NOT_FOUND` for `./postgres-harness`. This replaced the prior missing-script failure with a valid behavioral RED. |
| GREEN    | `npm --prefix teleferico-cms test -- feedback/harness` | Exit 0; 21 tests, 21 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.                                                                                                                    |
| REFACTOR | `npm --prefix teleferico-cms test -- feedback/harness` | Exit 0 after fixed local-socket isolation and stale-runtime refinement; 21 tests, 21 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.                                                    |

### S02 Runtime and Cleanup Evidence

Runtime command:

```bash
node teleferico-cms/test/feedback/harness/runtime-smoke.js && docker ps -aq --filter label=com.docker.compose.project=tb113_test_runtime_stale && docker volume ls -q --filter label=com.docker.compose.project=tb113_test_runtime_stale
```

Result: exit 0. PostgreSQL `16.8` ran from the already-local image with `pull_policy: never`; the harness connected only to database `tb113_test_feedback`, seeded and removed exactly one stale owned container and one stale owned volume, and returned `remoteContactCount:0`, `containerCount:0`, and `volumeCount:0`. Both post-run Docker queries were empty.

The subprocess boundary uses `/usr/local/bin/docker` with argument arrays and `shell:false`. It supplies a fixed non-credential environment, selects only an approved local Unix Docker socket, locks Compose to the repository-owned file, rejects non-loopback database hosts and staging/production markers before spawning, generates or validates only `tb113_test_` project ownership, aborts the active child on `SIGINT`/`SIGTERM`, runs `down --volumes --remove-orphans`, and verifies project-labeled containers and volumes are absent. The 21-case suite proves child exit 37 remains primary after cleanup, signal cleanup is idempotent, and any remaining owned container or volume fails the run.

## S02 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npm --prefix teleferico-cms test -- feedback/harness`; final exit 0; 21/21 passed with 0 failures.                                                                                                                                                                                    |
| Runtime harness command/scenario and exact result | The runtime command above completed against local PostgreSQL 16.8; one stale container and volume existed before the harness, the database identity was `tb113_test_feedback`, no remote target was present, and cleanup ended at 0 containers/0 volumes.                              |
| Rollback boundary                                 | Revert `teleferico-cms/test/feedback/harness/**`, remove only `scripts.test` from `teleferico-cms/package.json`, revert only task 1.2's checkbox, and remove only the S02 additions/status changes from this cumulative apply-progress artifact. Preserve S01 and all other task text. |

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

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/components/administration/feedback/__tests__/renderer-poc.test.ts`; RED unresolved production import, triangulation RED missing six required digests/artifacts, final GREEN/REFACTOR exit 0 with 2/2 passed and all nine criteria true. Package-policy 4/4, typecheck, and `git diff --check` also passed.                                                                                                                                                                                                                                 |
| Runtime harness command/scenario and exact result | The focused command rendered five synthetic charts through Recharts and ECharts SVG SSR, launched pinned Chromium five times (353/283/280/279/307 ms; p95 353 ms), produced one PDF semantic digest and one pagination digest across five renders, extracted every label, found 0 clipping and 0 serious/critical structural violations, emitted 290 selectable SVG text nodes and no chart raster images, excluded worker imports from the public source graph, measured 184,720,835 compressed candidate-worker bytes (<750 MiB), closed all browsers, and removed temporary artifacts. |
| Rollback boundary                                 | Revert the four exact dependency entries and generated lockfile delta; remove `services/survey-report-worker/poc/**`, the parity fixture, and renderer POC test; revert only task 1.3 and S03 evidence/status here. Preserve S01/S02 and G03 reconciliation.                                                                                                                                                                                                                                                                                                                              |

## S04 Partial Work Unit Evidence

- Scope: first coherent definition/catalog foundation only. Added `survey-version`, `survey-settings`, `survey-qr-point`, and `survey.aspect-definition`; U4 remains unchecked.
- Explicitly deferred at S04: the other three approved collections, `survey.aspect-rating`, migrations/indexes, lifecycle services/routes, and permission bootstrap. PR #300 synchronized S04 generated declarations before S05a.
- Disabled baseline: all three content types set `draftAndPublish:false`; versions default to `draft`; intake and generation default to `false`; no permission grant or custom route was added.

### S04 RED, GREEN, and REFACTOR

| Phase    | Command                                                | Exact result                                                                               |
| -------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| RED      | `npm --prefix teleferico-cms test -- feedback/catalog` | Exit 1; 4 tests failed because the required foundation schema files did not exist.         |
| GREEN    | `npm --prefix teleferico-cms test -- feedback/catalog` | Exit 0; 4 tests passed, 0 failed, 0 skipped.                                               |
| REFACTOR | `npm --prefix teleferico-cms test -- feedback/catalog` | Exit 0; no production refactor was needed after the cohesive schema/test structure passed. |

### S04 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused test command and exact result             | `npm --prefix teleferico-cms test -- feedback/catalog`; exit 0; 4/4 passed with 0 failures. Tests prove approved identities, forbidden identity exclusion, disabled defaults, bounded multilingual definition fields, and constrained QR identity/lifecycle fields.                                                            |
| Runtime harness command/scenario and exact result | `npm --prefix teleferico-cms test -- feedback/harness`; exit 0; 21/21 passed with 0 failures. No PostgreSQL process was started for this static schema subset because migrations and runtime services are explicitly deferred; the harness boundary remains healthy and no cleanup-owned process/container/volume was created. |
| Rollback boundary                                 | Remove the four new schema JSON files and `teleferico-cms/test/feedback/catalog/schema-catalog.test.js`; revert only the selector mapping in `test-runner.js`, the TB-113 no-grant note in `docs/STRAPI_PERMISSIONS.md`, and this S04 partial evidence/status. Preserve all S01-S03 files, evidence, and task checkboxes.      |

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

| Task                           | Test File                                | Layer                                                         | Safety Net                                                                                                                                                                                  | RED                                                                                          | GREEN                                                                                                 | TRIANGULATE                                                                                                                                                                                   | REFACTOR                                                                                    |
| ------------------------------ | ---------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `s05a-cloud-build-remediation` | `.github/scripts/playwright-e2e.test.js` | Repository contract test over the real Playwright spec/config | `node --test .github/scripts/playwright-real-stack-lifecycle.test.js .github/scripts/playwright-e2e.test.js .github/scripts/playwright-real-auth-provisioner.test.js`: exit 0, 61/61 passed | Focused command exited 1, 0/1 passed; the login navigation had no independent timeout budget | Focused command exited 0, 1/1 passed after separate navigation and hydration budgets were implemented | The same test reproduces the observed branch: 75,000 − 74,659 = 341 ms, then proves the independent hydration budget exceeds that remainder and the global timeout exceeds both phase budgets | Focused command exited 0, 1/1 passed after adding the observed-duration boundary assertions |

### S05a Remediation Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `node --test --test-name-pattern="real-auth login reserves independent navigation and hydration budgets" .github/scripts/playwright-e2e.test.js`; final exit 0, 1/1 passed, 0 failed. RED was exit 1, 0/1 passed, with `The login navigation must have its own timeout budget.`                                                                                                                             |
| Runtime harness command/scenario and exact result | `PLAYWRIGHT_REAL_AUTH_BASE_URL=http://127.0.0.1:3200 <synthetic required contract variables> pnpm --dir teleferico-app exec playwright test --config=playwright.real-auth.config.ts --list`; exit 0, exactly 3 tests discovered in the one real-auth file. Full PostgreSQL/Strapi/Next.js execution was not rerun because reproducing Cloud Build is the independently authorized remote verification step. |
| Rollback boundary                                 | Revert only `.github/scripts/playwright-e2e.test.js` and `teleferico-app/tests/e2e-real-auth/real-auth.spec.ts`, then remove this remediation section/status adjustment. Preserve the S01-S05a persistence candidate and all historical evidence.                                                                                                                                                           |

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

| Phase       | Command                                                                                                           | Exact result                                                                                                                                                                                                                                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net  | `npm --prefix teleferico-cms test -- feedback/catalog` and `npm --prefix teleferico-cms test -- feedback/harness` | Before production edits: catalog exit 0, 6/6 passed; harness exit 0, 21/21 passed.                                                                                                                                                                                                                                                                                               |
| RED         | `npm --prefix teleferico-cms test -- feedback/lifecycle`                                                          | Exit 1, 0 passing/1 failing because `2026.09.11T0001-tb113-constraints` did not exist. Later scoped REDs failed on missing route modules and missing submission lifecycle preparation.                                                                                                                                                                                           |
| GREEN       | `npm --prefix teleferico-cms test -- feedback/lifecycle`                                                          | Final exit 0; 9 tests passed, 0 failed/skipped/cancelled/todo.                                                                                                                                                                                                                                                                                                                   |
| TRIANGULATE | Same lifecycle selector                                                                                           | Covered complete and incomplete publication, duplicate ordering, activation/repoint/no-op predecessor, QR deactivate/reactivate/invalid status, standard plus `other` snapshots, duplicate selections, CAS conflict, valid/invalid terminal transitions, migration statement ownership, idempotent rerun, uniqueness conflicts, range/terminal checks, and transaction rollback. |
| REFACTOR    | Same lifecycle selector after route/service alignment and runtime cleanup assertions                              | Exit 0; 9/9 remained green.                                                                                                                                                                                                                                                                                                                                                      |

### S05b Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `npm --prefix teleferico-cms test -- feedback/lifecycle`; exit 0; 9/9 passed. The selector includes unit contracts plus a real PostgreSQL 16.8 migration/invariant test.                                                                                                                                                                                                                                                             |
| Runtime harness command/scenario and exact result | The lifecycle selector started only local Compose project `tb113_test_lifecycle` against database `tb113_test_feedback`, applied and reapplied the migration, observed `8                                                                                                                                                                                                                                                            | 4   | 1` for indexes/constraints/disabled singleton, proved duplicate submission and active-range rejection, proved failed multi-write rollback (`1 | 0`), and exited 0. Post-run Docker container and volume queries for `tb113_test_lifecycle`and`tb113_test_runtime_stale` were empty. |
| Rollback boundary                                 | Remove `teleferico-cms/database/migrations/2026.09.11T0001-tb113-constraints.js`; remove only the new `controllers`, `routes`, and `services` directories under the six survey APIs; remove `teleferico-cms/test/feedback/lifecycle/**`; revert only the catalog/test-runner changes, task 2.1 checkbox, and this S05b evidence. Preserve all S01-S05a definitions, generated declarations, permissions documentation, and evidence. |

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

| Task                           | Test File                                                        | Layer                                          | Safety Net                        | RED                                                                                                                                                     | GREEN                                                                         | TRIANGULATE                                                                                          | REFACTOR |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- | --- | ---------------------------------------------------------------------------------- |
| `s05b-cloud-build-remediation` | `test/feedback/lifecycle/{lifecycle,postgres-lifecycle}.test.js` | Unit + isolated PostgreSQL/real Strapi startup | Lifecycle 9/9 passed before edits | Fresh-start test exited 1 with the exact `TB-113 schema mismatch` missing-column list; migration deferral unit test also exited 1 before implementation | Focused fresh-start test exited 0, 1/1; migration deferral test exited 0, 1/1 | Full lifecycle covers both fresh startup and pre-existing schema paths; 10/10 passed with catalog `8 | 4        | 1`  | 10/10 remained green after minimal environment and dynamic loopback-port hardening |

### Remediation Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --- | ----------------------------------------------------------------- |
| Focused test command and exact result             | `npm --prefix teleferico-cms test -- feedback/lifecycle`; exit 0; 10/10 passed, including a real empty-database Strapi startup and the existing-database invariant path.                                                                                                                         |
| Runtime harness command/scenario and exact result | The lifecycle selector started PostgreSQL 16.8 in `tb113_test_lifecycle`, launched real `strapi start` against the empty database, reached `/admin/init`, and observed `8                                                                                                                        | 4   | 1`. Final owned container, volume, and process checks were empty. |
| Rollback boundary                                 | Revert only the migration readiness gate, post-sync bootstrap application, loopback-only random PostgreSQL test port, fresh-start regression test, and this remediation evidence. Preserve U4 schemas, lifecycle behavior, indexes/checks, singleton semantics, and all prior S01-S05b evidence. |

### Remediation Verification

- Lifecycle: exit 0, 10/10. Catalog: exit 0, 6/6. Harness: exit 0, 21/21.
- `ENV_PATH=/dev/null npm --prefix teleferico-cms run build`: exit 0; only the noncausal stale Browserslist advisory appeared.
- U5 and every later task remain unchecked and untouched. Parent attempt settlement remains outside this apply execution.

## S07a Partial U6 Evidence

- Scope: package-local Vitest/typecheck boundary, reporting contract identities and exact route-filter scopes, `tb-json.v1` canonical serialization primitives, and Buenos Aires local-calendar day/week/month periods. Metrics, populations, snapshots, chart models, formatting, and empty states remain deferred; task 2.3 stays unchecked.
- The root Vitest configuration and every dependency, manifest, workspace declaration, lockfile, CMS, runtime UI, and excluded path remain unchanged.

### S07a TDD Cycle Evidence

| Task                                                  | Test File                                                   | Layer     | Safety Net        | RED                                                                                                     | GREEN                               | TRIANGULATE                                                                                          | REFACTOR                                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------- | --------- | ----------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `U6-S07a-package-test-boundary-and-contracts-periods` | `packages/survey-reporting-core/src/reporting-core.test.ts` | Pure unit | N/A — new package | Missing `canonical-json` suite failed before implementation; day-bucket triangulation later failed 1/11 | Final package selector passed 11/11 | Exact routes, valid/invalid canonical values, equal previous range, and clipped day/week/month paths | Final 11/11 remained green after scalar-validation correction and package export boundary |

### S07a Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run --config packages/survey-reporting-core/vitest.config.ts`; exit 0; 1 file and 11/11 tests passed.  |
| Runtime harness command/scenario and exact result | N/A — pure dependency-free library; no runtime boundary in S07.                                                                               |
| Rollback boundary                                 | Remove only `teleferico-app/packages/survey-reporting-core/**` and this S07a evidence/status update; preserve S01-S06 and task 2.3 unchecked. |

## Corrected S08 Partial U6 Evidence

- Rescope remediation for failed revision `sha256:1aa9c7cccfee066fbd775fb5dc867db74229b14f7341e4066239ce8b50a03491`: eligible populations plus exact KPI, aspect, related-rating, day/week/month trend, threshold, dominance, matrix, association, and `other` formulas; S09 snapshots, chart models, formatting, and empty states remain deferred, so task 2.3 stays unchecked.

### S08 TDD Cycle Evidence

| Task                       | Test File             | Layer     | Safety Net                                                             | RED                                                          | GREEN      | TRIANGULATE                                                                                                                                                                                          | REFACTOR                                          |
| -------------------------- | --------------------- | --------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `U6-S08-reporting-metrics` | `src/metrics.test.ts` | Pure unit | Correction baseline 16/16 passed; original RED was missing `./metrics` | Corrective trend assertion failed because `trend` was absent | 5/5 passed | Related-rating cohort count/average; Buenos Aires day/week/month buckets and sentiment denominators; no S09 result keys; all original arithmetic/population/aspect/matrix/association cases retained | 5/5 remained green after cohesive helper refactor |

### S08 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/metrics.test.ts --config packages/survey-reporting-core/vitest.config.ts`; corrective RED exit 1 with absent trend; final exit 0, 1 file and 5/5 passed. |
| Runtime harness command/scenario and exact result | N/A — S08 remains a dependency-free pure TypeScript library with no runtime, I/O, framework, browser, CMS, or Node boundary.                                                                            |
| Rollback boundary                                 | Remove `src/metrics.ts` and `src/metrics.test.ts`, revert the metrics barrel export and only this S08 status/evidence; preserve S07 and keep task 2.3 unchecked.                                        |

## S09 Snapshot Slice Evidence — U6 Remains Open

- Scope: deterministic immutable `survey-snapshot.v1` envelopes, canonical SHA-256 population/payload digests, complete current/previous comments, calendar and QR-point projections, validation, deep freezing, five ordered renderer-neutral report charts, exact one-decimal formatting, and explicit empty states. Terminal S09 settlement revision: `sha256:4c0c8157d956eda3dedc7535567c2e176912f10f4635d22efe2e1e6cd1f20f78`.
- Reconciliation finding: source/test inspection proves only the separate 5% aspect threshold and aspect `insufficient_evidence` state; no recurrent/minority implementation or tests prove D64-D67 (`max(10,ceil(2%))`, four unique refs, distinct signals, recurrent overlap precedence, unsupported category). Task 2.3 is therefore reopened. Production imports remain relative-only and contain no React, Next.js, Strapi, ECharts, Recharts, browser, or Node dependency, supporting D85.
- Partial closure: S09 is a partial U6 slice; D64-D67 are deferred to the next ordered slice, and task 2.3 remains unchecked.

### S09 TDD Cycle Evidence

| Task                         | Test File              | Layer     | Safety Net                            | RED                                                                    | GREEN                               | TRIANGULATE                                                                                                                                                                                                      | REFACTOR                                                                                  |
| ---------------------------- | ---------------------- | --------- | ------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `U6-S09-reporting-snapshots` | `src/snapshot.test.ts` | Pure unit | Package baseline exit 0, 16/16 passed | Exit 1 before production code: missing `./snapshot`; 0 tests collected | Focused selector exit 0, 3/3 passed | Non-empty and empty populations, both periods, canonical digest fixture, altered digest rejection, five ordered charts, accessible tables, unavailable values, signed percentages, and half-up rating formatting | Full package exit 0, 19/19 passed after runtime-neutral SHA-256 and chart-kind refinement |

### S09 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run packages/survey-reporting-core/src/snapshot.test.ts --config packages/survey-reporting-core/vitest.config.ts`; exit 0; 1 file and 3/3 tests passed. |
| Runtime harness command/scenario and exact result | N/A — S09 is a pure dependency-free TypeScript library with no I/O, framework, browser, CMS, Node, process, or remote boundary.                                                                |
| Rollback boundary                                 | Remove `src/snapshot.ts` and `src/snapshot.test.ts`, revert their barrel export, task 2.3 checkbox, and this S09/status evidence; preserve all S07/S08 behavior and evidence.                  |

### S09 Verification and Cleanup

- Package tests: exit 0, 3 files and 19/19 tests passed. Root app typecheck: exit 0 after aligning the TypeScript target with the core's exact BigInt contract at ES2020 and cleaning the stale local incremental cache. `git diff --check`: exit 0, no output. Pure-core inspection: 6 production files, 12 relative-only imports, 0 prohibited dependencies. Corrected candidate: 388 authored changed lines (384 additions, 4 deletions).
- Test-created package-local `node_modules` was removed; no child process, container, volume, temporary artifact, dependency, manifest, lockfile, runtime, remote service, or credential remained or changed.

## S10 D64-D67 Evidence Rules — U6 Complete

- Scope: added only renderer-neutral pure-core recurrent/minority evidence thresholds and classification. S07-S09 behavior is preserved, U7 and later tasks remain untouched, and task 2.3 is now complete.
- Recurrent thresholds are calculated independently per period as `max(10, ceil(2% of unique eligible comments))`; minority support requires four unique eligible comments.
- Required categories are always projected in caller-provided deterministic order. Missing or weak categories explicitly return `insufficient_evidence`; recurrent takes precedence when the same category also qualifies as minority.
- Candidate references are deduplicated and only eligible period references contribute to support, so evidence cannot leak across periods.

### S10 TDD Cycle Evidence

| Task                          | Test File                                            | Layer     | Safety Net                          | RED                                                                                                     | GREEN                                                                                    | TRIANGULATE                                                                                                                                                                                                             | REFACTOR                                                                             |
| ----------------------------- | ---------------------------------------------------- | --------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `S10-D64-D67-report-evidence` | `packages/survey-reporting-core/src/metrics.test.ts` | Pure unit | Focused baseline exit 0, 5/5 passed | Exit 1, 3/8 failed because both new production exports were absent; the existing 5 tests remained green | Focused exit 0, 8/8 passed after the minimum threshold and classification implementation | Covered 0/500/501/1,001 eligible-comment boundaries, 21-ref recurrence, four-ref minority, recurrent overlap precedence, duplicate refs, three-ref weakness, absent required categories, and current/previous isolation | Extracted the signal decision into one pure rule; focused exit 0, 8/8 remained green |

### S10 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run packages/survey-reporting-core/src/metrics.test.ts --config packages/survey-reporting-core/vitest.config.ts`; exit 0; 1 file, 8/8 passed.                                                          |
| Runtime harness command/scenario and exact result | N/A — this slice changes a dependency-free pure TypeScript calculation with no runtime, I/O, framework, browser, CMS, process, or remote boundary.                                                                                            |
| Rollback boundary                                 | Revert only the evidence contracts/functions in `src/metrics.ts`, the D64-D67 tests in `src/metrics.test.ts`, task 2.3's checkbox, and this S10 evidence/status. Preserve every S07-S09 contract, metric, snapshot, chart, and test behavior. |

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

| Task                          | Test File                                  | Layer     | Safety Net                                    | RED                                                                              | GREEN                        | TRIANGULATE                                                                                                                                                  | REFACTOR                                                             |
| ----------------------------- | ------------------------------------------ | --------- | --------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `S11-U7-intake-http-boundary` | `src/lib/feedback/intake-boundary.test.ts` | Pure unit | Public-form route baseline exit 0, 4/4 passed | Exit 1 before production code; unresolved `./intake-boundary`, 0 tests collected | Focused exit 0, 22/22 passed | Canonical and encoded/malformed/overlong/dot/extra-segment identifiers; valid envelope plus method/media/charset/query/size/length/UTF-8/JSON/field branches | Unified path validation helper; focused exit 0, 22/22 remained green |

### S11 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                        |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/intake-boundary.test.ts`; exit 0; 1 file, 22/22 passed.                                                |
| Runtime harness command/scenario and exact result | N/A — this slice is a pure request-boundary library with no Route Handler, network, persistence, process, browser, CMS, or other runtime integration.              |
| Rollback boundary                                 | Remove `src/lib/feedback/intake-boundary.ts` and its focused test, then remove only this S11 progress/status update; preserve S01-S10 and keep task 3.1 unchecked. |

### S11 Verification, Cleanup, and Settlement Evidence

- Safety net: `pnpm --dir teleferico-app exec vitest run src/app/api/__tests__/public-form-routes.test.ts`; exit 0; 1 file, 4/4 passed.
- Focused test: exit 0; 1 file, 22/22 passed. App typecheck: exit 0; no diagnostics. `git diff --check`: exit 0; no output.
- Authored scope: 351 changed lines (348 additions, 3 deletions), including cumulative OpenSpec persistence; no size exception.
- No source-mutating formatter ran. No process remained after foreground Vitest/TypeScript commands; no container, volume, temporary artifact, dependency, manifest, lockfile, generated artifact, runtime service, remote operation, or credential was created or changed.
- Evidence revision: `sha256:7d8deb330a4009a1282dd18acff30862afcc04652a4f4934eb7fbb8a6bf4f757`, derived from canonical `tb113-apply-evidence.v1` JSON containing the two implementation-file SHA-256 digests, exact verification outcomes, incomplete task state, runtime disposition, and harness cleanup state.
- Settlement diagnosis: passed for this partial U7 slice; task 3.1 correctly remains open, and native attempt settlement remains parent-owned.

## S12 U7 QR Session Contract — U7 Remains Open

- Scope: injected-record resolution of only an active QR point plus the current published version, and an HMAC-SHA256 session token bound to point, hashed code, version/revision, capability, nonce, issuance, and exact two-hour expiry.
- Fail-closed coverage includes unavailable QR/version state, malformed or tampered tokens, expiry, future issuance, wrong context/revision, and wrong capability. Signing material is accepted only as function input.
- Task 3.1 remains unchecked. Grace handling, guards/idempotency/acceptance, drafts/UI, Route Handlers, transports, persistence, and E2E remain deferred.

### S12 TDD Cycle Evidence

| Task                         | Test File                             | Layer                      | Safety Net                   | RED                                     | GREEN        | TRIANGULATE                                                                                                                 | REFACTOR                                          |
| ---------------------------- | ------------------------------------- | -------------------------- | ---------------------------- | --------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `S12-U7-qr-session-contract` | `src/lib/feedback/qr-session.test.ts` | Unit + Node crypto runtime | Intake boundary 22/22 passed | Missing `./qr-session`; exit 1, 0 tests | 15/15 passed | Active/unavailable records; valid/last-second/expired/future/tampered/malformed; wrong QR/point/version/revision/capability | Deterministic tamper helper; 15/15 remained green |

### S12 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/qr-session.test.ts`; exit 0; 1 file, 15/15 passed.                                                              |
| Runtime harness command/scenario and exact result | The focused suite executed Node `crypto` HMAC-SHA256, SHA-256, and constant-time signature comparison across valid and adversarial session scenarios; exit 0, 15/15 passed. |
| Rollback boundary                                 | Remove `qr-session.ts`, `qr-session.test.ts`, and this S12 evidence/status update; preserve S01-S11 and keep task 3.1 unchecked.                                            |

### S12 Verification, Cleanup, and Settlement Evidence

- Focused: 15/15; S11+S12 safety suite: 37/37; app typecheck: exit 0; `git diff --check`: exit 0.
- Authored scope: 395 changed lines (392 additions, 3 deletions), including OpenSpec persistence; no size exception.
- No formatter, dependency, manifest, lockfile, environment, credential, network, persistence, process, container, volume, temporary artifact, Route Handler, or remote operation changed or remained.
- Implementation SHA-256: `qr-session.ts=0f4690ce79079e3d34f24cb22b310bdaf6d13d4c7343cefba91a4f7aaf8f8332`; `qr-session.test.ts=531ab9807ca41e909625a8bfeb82fa86fcc69e28fb9fbe6d6bd266be3b8b168a`.
- Evidence revision: `sha256:65de30b6e598ed421cdb1a43d0245451ee067622b6f1b7754cf9b503a2b6bd7c`; passed partial-slice diagnosis, runtime harness exercised, parent owns settlement.

## U7-A3 Answer Domain Validation — U7 Remains Open

- Scope: pure validation of D15-D18 against injected active-version definitions. It accepts integer ratings 1-5, one to three combined unique selections, explicit sentiments, separated bounded `other` and comment text, then returns locale-specific snapshots ordered by `sortOrder,aspectKey`.
- Failures aggregate sorted safe field paths for malformed shapes, unknown/duplicate/reserved keys, invalid sentiments, cardinality, locale, rating, nested unknown fields, and text bounds. No I/O or mutation occurs.
- Deferred: version grace, security/CAPTCHA, Route Handlers, CMS transport, persistence, idempotency, Redis/guards, acceptance/receipt, drafts/UI, browser behavior, and E2E. Task 3.1 remains unchecked.

### U7-A3 TDD Cycle Evidence

| Task                             | Test File                                    | Layer     | Safety Net           | RED                                            | GREEN      | TRIANGULATE                                                                                              | REFACTOR                                            |
| -------------------------------- | -------------------------------------------- | --------- | -------------------- | ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `U7-A3-answer-domain-validation` | `src/lib/feedback/answer-validation.test.ts` | Pure unit | S11+S12 37/37 passed | Missing `./answer-validation`; exit 1, 0 tests | 1/1 passed | 8/10 failed before generalization; final 10/10 passed across valid snapshots and malformed/bounded cases | No structural extraction needed; rerun 10/10 passed |

### U7-A3 Work Unit and Settlement Evidence

- Focused: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/answer-validation.test.ts`; exit 0, 1 file, 10/10 passed.
- Combined safety: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/intake-boundary.test.ts src/lib/feedback/qr-session.test.ts src/lib/feedback/answer-validation.test.ts`; exit 0, 3 files, 47/47 passed.
- Typecheck: `pnpm --dir teleferico-app run typecheck`; exit 0, no diagnostics. `git diff --check`: exit 0, no output.
- Runtime harness: N/A — the final implementation is deterministic pure TypeScript with injected data and no network, persistence, process, browser, CMS, environment, clock, crypto, or other I/O boundary.
- Rollback boundary: remove `answer-validation.ts`, its focused test, `src/types/api/feedback.d.ts`, and only this U7-A3 status/evidence update; preserve S01-S12 and task 3.1 unchecked.
- Cleanup/process: all commands ran in the foreground and exited; no formatter, dependency, manifest, lockfile, generated artifact, environment, credential, service, child process, container, volume, temporary artifact, remote operation, S11, or S12 file changed or remained.
- Authored scope: 383 changed lines (379 additions, 4 deletions). SHA-256: `answer-validation.ts=6273c3349c0e54fe68413ddc97e58db191ed9c859112833181b3b30100dd9ca2`; `answer-validation.test.ts=3c68e20fdfdf1d871734d30efa48e53442da8e5b6eb624c54ac66e77ba7a825b`; `feedback.d.ts=7f797347bce0a52bf0e86bde414170e648b66452c28760aa843598e317061eae`.
- Evidence revision: `sha256:0483d3d5b2f8ee2c245a5e0e6ddb501a601faa9f6e5d012752e5f63f5df04492`, from canonical `tb113-apply-evidence.v1` implementation hashes, verification outcomes, unchecked task state, runtime/cleanup disposition, branch/base, and authored count. Proposed settlement diagnosis: passed partial U7 slice; harness N/A; parent owns settlement.

## U7-A4 Version Grace Validation — U7 Remains Open

- Scope: pure D10 submission eligibility over injected lifecycle records and explicit epoch-second inputs. The current published version is eligible; a published superseded version remains eligible through exactly 1,800 elapsed seconds and returns `SESSION_EXPIRED` only after that boundary.
- Untrusted lifecycle records fail closed as `SURVEY_UNAVAILABLE` for invalid clocks, future or malformed supersession times, missing/draft/unknown versions, unavailable active context, unknown statuses, and duplicate version identities. This remains distinct from an otherwise valid superseded session beyond grace.
- Deferred: security/origin/fetch-site guards, form age, honeypot, CAPTCHA, Route Handlers, CMS transport, persistence, idempotency, Redis, acceptance/receipt, drafts/UI, browser behavior, and E2E. S11, S12, U7-A3, S11/S12 modules, and task 3.1 remain unchanged.

### U7-A4 TDD Cycle Evidence

| Task                             | Test File                                      | Layer     | Safety Net                                     | RED                                                        | GREEN                                               | TRIANGULATE                                                                                                                                                              | REFACTOR                                                                           |
| -------------------------------- | ---------------------------------------------- | --------- | ---------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `U7-A4-version-grace-validation` | `src/lib/feedback/version-eligibility.test.ts` | Pure unit | S11+S12+U7-A3 exit 0, 3 files and 47/47 passed | Missing `./version-eligibility`; exit 1, 0 tests collected | Initial current-version behavior exit 0, 1/1 passed | Expanded suite first exited 1 with 5/14 failures, then final 14/14 passed across exact grace, expiry, unavailable context, malformed lifecycle, and duplicate identities | No further structural extraction was justified; focused rerun remained 14/14 green |

### U7-A4 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/version-eligibility.test.ts`; exit 0; 1 file, 14/14 passed.                                                                                                        |
| Runtime harness command/scenario and exact result | N/A — the final implementation is deterministic pure TypeScript with injected lifecycle records and an injected epoch-second clock, with no I/O, network, persistence, process, browser, CMS, environment, or crypto boundary. |
| Rollback boundary                                 | Remove `version-eligibility.ts`, its focused test, and only this U7-A4 status/evidence update; preserve S01-U7-A3 and keep task 3.1 unchecked.                                                                                 |

### U7-A4 Verification, Cleanup, and Settlement Evidence

- Combined safety: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/intake-boundary.test.ts src/lib/feedback/qr-session.test.ts src/lib/feedback/answer-validation.test.ts src/lib/feedback/version-eligibility.test.ts`; exit 0, 4 files and 61/61 passed.
- Typecheck: `pnpm --dir teleferico-app run typecheck`; exit 0 with no diagnostics. `git diff --check 62c84ca9822c5e994b8d21f2761769b41477e382 --`; exit 0 with no output.
- Cleanup/process: all commands ran in the foreground and exited; no formatter, dependency, manifest, lockfile, generated artifact, environment, credential, service, child process, container, volume, temporary artifact, remote operation, S11, S12, or U7-A3 module changed or remained.
- Branch/base: `feat/app-tb-113-feedback-version-grace` from exact `62c84ca9822c5e994b8d21f2761769b41477e382`. Path/budget proof passed: exactly three changed paths, 295 additions, 3 deletions, 298 authored lines, ceiling 400.
- Authored scope: 298 changed lines (295 additions, 3 deletions), including cumulative OpenSpec persistence; no size exception. Implementation SHA-256: `version-eligibility.ts=dac8b90b4f590d41ad41597fa88163b54316d853639001ddc0719f89ac04e1e9`; `version-eligibility.test.ts=3faadcfcc7026bfccecacc805989b2e56a9ef927f81cc35a9eb8546e4910d3bd`.
- Evidence revision: `sha256:cf6f31bed879df3b63868df9d21a99909aa7b15786a733458186442136e16f46`, from canonical `tb113-apply-evidence.v1` implementation hashes, exact TDD/verification outcomes, unchecked task state, runtime/cleanup disposition, branch/base, changed paths, and authored count. Proposed settlement diagnosis: passed partial U7 slice; runtime harness N/A; task 3.1 remains open; parent owns settlement.

## U7-A4 Future-Timestamp Correction — U7 Remains Open

- Defect corrected: the current published version previously returned success before validating its future `lastSupersededAtEpochSeconds`; lifecycle timestamp validation now precedes the current-version success path and fails closed as 410 `SURVEY_UNAVAILABLE`.
- Scope remains pure D10 eligibility only. Task 3.1/U7 remains unchecked, generation remains disabled, and all deferred U7 behavior is unchanged.

### U7-A4 Correction TDD Cycle Evidence

| Task                                        | Test File                                      | Layer     | Safety Net                            | RED                                                                                                                                      | GREEN                                                                                        | TRIANGULATE                                                                                                                                                                  | REFACTOR                                                                          |
| ------------------------------------------- | ---------------------------------------------- | --------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `U7-A4-version-grace-validation-correction` | `src/lib/feedback/version-eligibility.test.ts` | Pure unit | Focused baseline exit 0, 14/14 passed | Focused exit 1, 1/15 failed: current version with a future supersession timestamp returned `current` instead of 410 `SURVEY_UNAVAILABLE` | Focused exit 0, 15/15 passed after timestamp validation moved before current-version success | Existing current-version success and superseded-version future-timestamp rejection exercise distinct valid and invalid paths; no additional production branch was introduced | No structural refactor justified; final focused verification remained 15/15 green |

### U7-A4 Correction Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/version-eligibility.test.ts`; exit 0; 1 file, 15/15 passed.                                                                                                                |
| Runtime harness command/scenario and exact result | N/A — deterministic pure TypeScript over injected lifecycle records and an injected epoch-second clock; no runtime, I/O, network, persistence, process, browser, CMS, environment, or crypto boundary exists.                          |
| Rollback boundary                                 | Revert only the future-current-version test, restore the prior current-version return ordering in `version-eligibility.ts`, and remove this correction evidence; preserve the original U7-A4 slice, S01-U7-A3, and task 3.1 unchecked. |

### U7-A4 Correction Verification, Cleanup, and Revision Input

- Authoritative parent spot-check: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/intake-boundary.test.ts src/lib/feedback/qr-session.test.ts src/lib/feedback/answer-validation.test.ts src/lib/feedback/version-eligibility.test.ts`; exit 0, 4 files and 62/62 passed.
- Typecheck: `pnpm --dir teleferico-app run typecheck`; exit 0, no diagnostics. Exact base-relative four-path `git diff --check` exited 0 with no output.
- Path/budget proof: exactly three changed paths; 345 additions, 3 deletions, 348 authored lines relative to `62c84ca9822c5e994b8d21f2761769b41477e382`; below 400 with no size exception.
- Cleanup/process: every command ran in the foreground and exited; no formatter, dependency, manifest, lockfile, generated artifact, environment, credential, service, child process, container, volume, temporary artifact, remote operation, branch operation, or unrelated file changed or remained.
- Corrected implementation SHA-256: `version-eligibility.ts=d899added4939499d9646f7efc992ef65a117e7b7ab8f18fb5198f954913f13a`; `version-eligibility.test.ts=20d0320f857b6c83f277ea37565b552441e3100e661c2fe299727c2a79340626`.
- Proposed deterministic revision input: canonical `tb113-apply-evidence.v1` JSON over change/work-unit identity, branch/base, corrected implementation hashes, exact RED/GREEN/authoritative-parent-combined/typecheck/diff outcomes, sorted changed paths, authored additions/deletions, unchecked task 3.1, runtime N/A reason, cleanup disposition, and parent-owned attempt token; proposed evidence revision `sha256:f147c52c4c65e333b0e00213f55c7823688deff7ded675194a454070e3e7f23a`.
- Proposed settlement diagnosis: passed bounded correction to a partial U7 slice; task 3.1 remains open and parent owns attempt settlement.

## U7-A5 Pre-Persistence Security Pipeline — U7 Remains Open

- Scope: composed transport/media/size, trusted origin/fetch metadata, closed JSON and D15-D18 answers, 3-second-to-2-hour form age, honeypot, injected CAPTCHA, QR session, and D10 version-grace checks into one fail-closed pipeline.
- Ordering stops at the first failure. CAPTCHA is never called before its stage; the successful result exposes validated context only and has no persistence, CMS, Redis, cookie, receipt, or other downstream capability.
- An absent `Sec-Fetch-Site` remains allowed only after trusted-origin validation; `cross-site` is rejected as 403 `UNTRUSTED_REQUEST`.
- Task 3.1/U7 remains unchecked. No Route Handler, transport adapter, persistence, guard state, draft/UI, or E2E behavior was added.

### U7-A5 TDD Cycle Evidence

| Task                                      | Test File                                       | Layer                                    | Safety Net                                   | RED                                               | GREEN                        | TRIANGULATE                                                                                                                                                      | REFACTOR                                                                                              |
| ----------------------------------------- | ----------------------------------------------- | ---------------------------------------- | -------------------------------------------- | ------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `U7-A5-pre-persistence-security-pipeline` | `src/lib/feedback/submission-preflight.test.ts` | Unit + synthetic NextRequest/Node crypto | Four foundation files exited 0, 62/62 passed | Missing `./submission-preflight`; exit 1, 0 tests | Focused exit 0, 11/11 passed | Intermediate run exited 1, 8/11; final cases prove each ordered stop, absent/cross-site fetch metadata, CAPTCHA rejection, QR failure, grace expiry, and success | Split transport from parsing without changing the existing composed API; focused 11/11 remained green |

### U7-A5 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/submission-preflight.test.ts`; exit 0; 1 file, 11/11 passed.                                                                                                                                                          |
| Runtime harness command/scenario and exact result | Node/Vitest constructed synthetic request metadata, executed real origin/fetch-site and HMAC session checks, and used injected mock CAPTCHA verification; no external network, credential, CMS, Redis, browser, container, or persistence boundary exists in this preflight unit. |
| Rollback boundary                                 | Remove `submission-preflight.ts` and its test; revert only the transport/parse exports in `intake-boundary.ts` and this U7-A5 progress/status. Preserve S01-U7-A4 and task 3.1 unchecked.                                                                                         |

### U7-A5 Verification, Cleanup, and Revision Input

- Combined command: exit 0; 5 files and 73/73 tests passed. App typecheck: exit 0, no diagnostics. Exact base-relative five-path `git diff --check`: exit 0, no output.
- Authored path/budget proof: 383 additions, 7 deletions, 390 total; only `submission-preflight.ts`, its test, `intake-boundary.ts`, and this cumulative progress file changed; `intake-boundary.test.ts` remained unchanged.
- Cleanup/process: all commands ran in the foreground and exited; no formatter, dependency, manifest, lockfile, generated artifact, environment, credential, child process, service, container, volume, temporary artifact, remote operation, or unrelated file changed or remained.
- SHA-256: `submission-preflight.ts=4f6cb61637f3cf31c3f4f92c81a6332f684e75a2f7b37aaf9ce672e99218e637`; `submission-preflight.test.ts=6a6383c010d11dd1755433af3c586824479d317a9865e3be3fc65f678ec17631`; `intake-boundary.ts=efc05771864f3dc79c69731f06334312116277b5eaa0d5da785ac054dfd8d930`.
- Deterministic revision input: canonical `tb113-apply-evidence.v1` JSON over change/work-unit identity, exact branch/base and parent-owned attempt token, the three hashes above, RED/intermediate/GREEN/combined/typecheck/diff outcomes, sorted changed paths, 383 additions/7 deletions, unchecked task 3.1, runtime harness boundary, and cleanup disposition; evidence revision `sha256:aeb5ac5c7247f7a5c197ca94c0433a2e1846cfbac290a1be8373dc344ac31f85`. Parent owns settlement.

## U7-A6 Durable Idempotency and Acceptance — U7 Remains Open

- Scope: transaction-port contract for pair locking, canonical SHA-256 payload identity excluding the signed token, authoritative receipt/time/context, identical replay, conflict, guard ordering, and rollback-safe persistence failure.
- The adapter must lock an absent or existing `(sessionNonceHash,idempotencyKey)` pair. Redis, rate limiting, cookies, CMS transport, Route Handlers, drafts/UI, and E2E remain deferred.
- Task 3.1/U7 remains unchecked.

### U7-A6 TDD Cycle Evidence

| Task                                   | Test File                                        | Layer                                | Safety Net          | RED                             | GREEN       | TRIANGULATE                                                                    | REFACTOR                                            |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------ | ------------------- | ------------------------------- | ----------- | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `U7-A6-durable-idempotency-acceptance` | `src/lib/feedback/submission-acceptance.test.ts` | Unit + transactional runtime harness | Five U7 files 74/74 | Missing module; exit 1, 0 tests | Focused 6/6 | Claim-order RED 1/7, then 7/7; replay/conflict/concurrency/guard/failure paths | Pair-lock port named explicitly; 7/7 remained green |

### U7-A6 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/submission-acceptance.test.ts`; exit 0; 1 file, 7/7 passed.                                                                                                                       |
| Runtime harness command/scenario and exact result | Vitest exercised a serialized transactional store with commit/rollback behavior, concurrent identical retries, stable receipts, guard ordering, and injected persistence failure; 7/7 passed. No external CMS/Redis/network process was used. |
| Rollback boundary                                 | Remove `submission-acceptance.ts` and its focused test, then revert only this U7-A6 progress/status. Preserve S01-U7-A5 and task 3.1 unchecked.                                                                                               |

### U7-A6 Verification and Cleanup

- Cumulative U7 intake suite: exit 0; 6 files and 81/81 tests passed. Typecheck and diff checks passed. Authored scope: 388 additions, 4 deletions, 392 total; no size exception.
- Cleanup: foreground commands exited; no formatter, dependency, manifest, lockfile, generated artifact, environment, credential, service, child process, container, volume, temporary artifact, remote operation, or unrelated change remained.
- Implementation SHA-256: `submission-acceptance.ts=ec70d1dc0be657857ab561e163e78abe4f717aeaf1bdf349471a42489b9981ee`; test `d19ac9d05721ffb7bc2727b1048bd508edd36184465a24e454aaae19825ade2c`. Settled evidence revision: `sha256:2c6888824b4623e0393aab1e572a22e49306249bfb451b23f2494dda229ddd2b`; native attempt state `complete`.

## Remaining-work planning state

- PR #318 was retargeted to `development`, and implementation governance passed. No functional or Cloud Build evidence is claimed by this planning record.
- The 22-slice remaining-work baseline in `tasks.md` replaces legacy S11–S24 for future work only. Historical S01–S10 and completed U7 foundation evidence remain unchanged.
- The next proposed unit is U7-B1 persistence adapter on `feat/app-cms-tb-113-feedback-persistence-adapter`, with U7-A6/PR #318 as predecessor.
- Canonical payload identity includes stable signed session/domain claims, `browserTokenHash`, locale, standard aspects, optional other aspect, and comment. It excludes `sessionToken`, `pointDocumentId`, and `versionDocumentId`; the persistence IDs must resolve and validate against signed stable point/version claims before transaction/insert.
- No remaining `size:exception` has been granted. Every concrete 401–800-line candidate requires fresh explicit candidate-scoped approval; forecasts or final counts above 800 stop and require reslicing.
- This passive planning edit completes no U7–U15 task and records no implementation progress.

## U7-B1 Persistence Adapter — U7 Remains Open

- Scope: corrected durable identity to include `browserTokenHash` while keeping signed token and Strapi document IDs excluded, then added the concrete Strapi transaction adapter behind the existing custom submission service.
- The adapter resolves point/version documents before opening the transaction and validates active point key/code hash plus published version key against signed stable claims.
- PostgreSQL advisory transaction locking serializes absent and existing nonce/idempotency pairs. Equal digests replay the original receipt/time; differing digests fail with `IDEMPOTENCY_CONFLICT`.
- A new row atomically persists server-authored identity, source, browser/nonce/digest binding, point/version relations, and ordered immutable answer snapshots. Generic CRUD routes and survey grants remain absent.
- Redis, browser-token issuance, rate limiting, Route Handler composition, UI/drafts, and E2E remain deferred. Task 3.1/U7 stays unchecked.

### U7-B1 TDD Cycle Evidence

| Task                        | Test File                                                                 | Layer                                  | Safety Net                   | RED                                                                                                         | GREEN                                      | TRIANGULATE                                                                                                                                                        | REFACTOR                                                                                      |
| --------------------------- | ------------------------------------------------------------------------- | -------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `U7-B1-persistence-adapter` | `submission-acceptance.test.ts`; `submission/postgres-submission.test.js` | Unit + isolated PostgreSQL/real Strapi | App 7/7; CMS lifecycle 10/10 | App 1/8 failed on missing browser binding; CMS exited 1 on missing adapter; aggregate CMS selector rejected | Focused app 8/8 and CMS adapter 1/1 passed | Document-ID-independent replay, browser conflict, concurrent replay, digest conflict, claim mismatch, relation/snapshot integrity, and duplicate-snapshot rollback | Active-point validation and full CMS selector were retained; all focused tests remained green |

### U7-B1 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/submission-acceptance.test.ts`: exit 0, 1 file and 8/8 passed. `npm --prefix teleferico-cms test -- feedback/submission`: exit 0, 1/1 passed.                                                                                                                                                                         |
| Runtime harness command/scenario and exact result | The CMS selector started an isolated PostgreSQL 16.8 container, loaded real Strapi, created real point/version/component rows, issued concurrent identical accepts, verified one submission with both relations and ordered snapshots, exercised replay/conflict/domain mismatch and transactional component failure, destroyed Strapi, and proved zero owned containers/volumes. |
| Rollback boundary                                 | Revert `persistence.js`, its custom-service wiring, submission selector/test, the one-line browser digest correction and focused test, and this U7-B1 evidence/exception update. Preserve U7-A1–A6 and keep task 3.1 unchecked.                                                                                                                                                   |

### U7-B1 Verification and Cleanup

- Required CMS suite: `npm --prefix teleferico-cms test -- feedback`; exit 0, 52/52 passed.
- Required app suite: `pnpm --dir teleferico-app exec vitest run src/lib/feedback`; exit 0, 6 files and 82/82 passed.
- App typecheck: exit 0 with no diagnostics. `git diff --check`: exit 0 with no output.
- Harness disposition: reused and extended without invalidation. Every foreground process exited; Strapi was destroyed and owned Docker container/volume queries were empty.
- No dependency, manifest, lockfile, schema, permission, migration, generated type, environment, credential, remote, Redis, route, UI, or deployment change occurred.
- Authored scope: 332 changed lines (307 additions, 25 deletions), including the retained planning delta and cumulative OpenSpec evidence; candidate-specific `size:exception` is accepted up to 800 lines for U7-B1 only. Deterministic revision `sha256:255ff84cf5c97db1272338f81b751199f0839de1351bea26c70d41de98f41ca1` uses canonical `tb113-apply-evidence.v1` JSON with apply-progress normalized out of its self-reference. Parent owns native attempt settlement.

## U7-B2 Browser Guard Degradation — U7 Remains Open

- Scope: added the 24-hour cross-point browser guard port, Redis lookup/persistence adapter, fail-open degradation, and bounded degradation telemetry without adding Route Handlers, cookies, environment configuration, UI, drafts, or E2E behavior.
- Durable replay remains first. A fresh request checks Redis only after the durable `(sessionNonceHash,idempotencyKey)` lookup; an accepted insert commits before Redis persistence begins. Identical replay neither reads nor extends Redis state.
- Redis keys contain a second SHA-256 projection rather than the persisted browser token hash. Telemetry contains only event identity, operation, reason, backend, and a double-hashed identity; backend error details and browser hashes are excluded.
- Redis lookup or persistence failure accepts after authoritative validation and persistence. Telemetry failure is also nonblocking. Expired guard deadlines are not recreated.
- Task 3.1/U7 stays unchecked. U7-B3 HTTP composition, U7-B4 form/draft/UI, and U7-B5 visitor E2E remain deferred.

### U7-B2 TDD Cycle Evidence

| Task                      | Test File                                                | Layer                         | Safety Net                                        | RED                                                                                                                                           | GREEN                                                                            | TRIANGULATE                                                                                                                                                                          | REFACTOR                                                                                                                |
| ------------------------- | -------------------------------------------------------- | ----------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `U7-B2-guard-degradation` | `browser-guard.test.ts`; `submission-acceptance.test.ts` | Unit + local TCP/RESP runtime | Acceptance and form guards exited 0, 14/14 passed | Focused exit 1: missing `browser-guard`; acceptance had 2 failures because post-commit persistence was absent and lookup failure returned 503 | Focused exit 0, 14/14 passed after minimal guard adapter and acceptance ordering | Final focused exit 0, 16/16 passed across Redis inactive/active, protocol errors, lookup/persist degradation, telemetry failure, expiry, post-commit order, replay, and active guard | Extracted one nonthrowing `FeedbackBrowserGuard` port around the Redis store; final 16/16 and full 90/90 remained green |

### U7-B2 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/browser-guard.test.ts src/lib/feedback/submission-acceptance.test.ts`; exit 0; 2 files and 16/16 tests passed.                                                                                                                                                                                                      |
| Runtime harness command/scenario and exact result | The focused browser-guard suite opened loopback-only ephemeral TCP servers, exercised the production RESP/EVAL socket path for inactive lookup, 24-hour PX persistence, active lookup, and Redis protocol errors, then closed every server. Success and failure/degradation paths passed 5/5. No external Redis, container, dependency, credential, or remote service was used. |
| Rollback boundary                                 | Remove `browser-guard.ts` and its test; revert the two Redis command exports, the browser-guard port/order additions in `submission-acceptance.ts`, their focused tests, and only this U7-B2 status/evidence. Preserve U7-A1 through U7-B1 and keep task 3.1 unchecked.                                                                                                         |

### U7-B2 Verification, Cleanup, and Revision

- Focused guard/acceptance: exit 0, 2 files and 16/16 passed. Full feedback suite: exit 0, 7 files and 90/90 passed.
- App typecheck: exit 0, no diagnostics. Prettier check for all five implementation/test paths: exit 0. `git diff --check`: exit 0, no output. Modified-guard regression selector: exit 0, 3 files and 22/22 passed. Package-wide `pnpm --dir teleferico-app run test`: exit 1 with 245/247 passing; two unrelated existing `form-protection.test.ts` assertions expect `TOO_MANY_REQUESTS` while unchanged production returns `EMAIL_LIMIT_EXCEEDED`. The U7-B2 files are absent from both failures and no out-of-scope correction was attempted.
- CMS suite: N/A because no CMS file changed. Browser/UI E2E: deferred to U7-B5 by the approved slice boundary.
- Cleanup/process: all Vitest, TypeScript, and formatting processes exited; the loopback TCP fixtures closed in `afterEach`; no Redis server, child process, container, volume, dependency, lockfile, manifest, generated artifact, environment value, credential, remote operation, or temporary artifact was created or remained.
- Authored scope: 591 additions and 60 deletions = 651 lines, including cumulative OpenSpec persistence, within the candidate-specific 800-line U7-B2 exception. Implementation SHA-256: `browser-guard.ts=16c3d8c181567354ad6e025cfe00e8be66c96b95a5c512418770db94a309224c`; `browser-guard.test.ts=9df0e128fc2608196edc7441f085344cc7bf5ef72bdd1db61164503598c9b7f1`; `submission-acceptance.ts=694d3c2b61be6159ba3710fc9acafec15341c3ff9919a247c298b2b473d30bc8`; `submission-acceptance.test.ts=450a99a00c97682ae9c7ed23838eba0827d59871e9f240d3ead43b9b0cd1b1b9`; `rate-limit.ts=ef8e4080c29f70de62dcdf12ca8000f7639e92d29865e19c9eef07b3920b2cdf`. Deterministic revision: `sha256:0d4475bce7f73c97969d99120ae908c65a426be08b3a7e1bd1d3ec3ef958e4c5`, derived from canonical `tb113-apply-evidence.v1` JSON over branch/base, sorted implementation paths, all exact verification outcomes including the package-wide non-U7 failure, runtime/cleanup outcomes, authored count, and unchecked task 3.1. Parent owns native attempt settlement.

## U7-B2 Independent Baseline Validation Correction

- Correction remediates failed evidence revision `sha256:0d4475bce7f73c97969d99120ae908c65a426be08b3a7e1bd1d3ec3ef958e4c5`; parent retains attempt `sha256:da657cd875f39d14a947406bbb63562c598098e0f06c1b2b47b6da0275ec8523` and owns settlement with the exact remediated revision.
- Independent read-only validation classified the package-suite failure as `base-only`. `src/lib/services/form-protection.ts` and `src/lib/services/__tests__/form-protection.test.ts` are byte-identical to base HEAD `380ca97631325c173f01cc838422c95502bbaeef`; ancestor commit `7220e728` changed production to `EMAIL_LIMIT_EXCEEDED` without updating the two assertions.
- Exact baseline confirmation: `pnpm exec vitest run src/lib/services/__tests__/form-protection.test.ts -t "email limit" --reporter=verbose`; exit 1; exactly 2 selected tests failed and 2 were skipped. Both failures expected `TOO_MANY_REQUESTS` and received `EMAIL_LIMIT_EXCEEDED`; no additional failure occurred.
- The package-wide app suite remains red at 245/247 and MUST NOT be described as passing. Its only accepted failures are `blocks contact email limit after five submissions in 24 hours` and `blocks postulation email limit after two submissions in 30 days`.
- Correction verification: focused U7-B2 exit 0, 2 files and 16/16 passed; full feedback exit 0, 7 files and 90/90 passed; app typecheck exit 0; `git diff --check` exit 0. No production or test behavior changed.
- Task 3.1/U7 remains unchecked. U7-B3 HTTP composition, U7-B4 form/draft/UI, and U7-B5 visitor E2E remain deferred.
- Runtime/cleanup and rollback boundaries remain those recorded for U7-B2. The correction candidate changes cumulative evidence only; no owned process, Redis server, container, volume, or temporary artifact remains.
- Corrected authored scope: 602 additions and 60 deletions = 662 lines, including cumulative OpenSpec evidence, within the approved 800-line U7-B2 exception. Corrected evidence revision: `sha256:dd4882f3ad430c396bdf00ccd88f5aae539cd8f466c4f02bb15f29289cbe0fe8`, derived from canonical `tb113-apply-evidence.v1` JSON binding the `base-only` diagnosis, failed revision `sha256:0d4475bce7f73c97969d99120ae908c65a426be08b3a7e1bd1d3ec3ef958e4c5`, branch/base, unchanged implementation hashes, exact correction verification, runtime/cleanup state, authored count, and unchecked task 3.1. Parent owns settlement.

## U7-B3a CMS Transport Contract Evidence

- Scope: closed `feedback-cms-submission.v1` lookup/acceptance commands; exactly survey GET and submission POST CMS routes; authoritative lookup, replay/conflict, and atomic acceptance; deny-by-default token-family documentation; one server-only app transport with bounded streamed responses, strict nested validation, and bounded status/code mapping.
- The B3b Route Handlers, public composition/runtime, ordered public ingress, stable browser-cookie behavior, CAPTCHA logging, public status mapping, and signing-key configuration were removed. U7-A1 through U7-B2 remain unchanged.
- Task 3.1 remains unchecked. U7-B3b, U7-B4, and U7-B5 remain deferred. No dependency, lockfile, schema, migration, generated type, deployment, remote, credential, GCP, or IAM change occurred.

### U7-B3a TDD Cycle Evidence

| Task                           | Test File                                                           | Layer                                         | Safety Net                                                                     | RED                                                                                                                                                                                             | GREEN                                                                          | TRIANGULATE                                                                                                                                                                                                                                   | REFACTOR                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CMS transport/command contract | `cms-transport.test.ts`; CMS lifecycle/permission/persistence tests | Unit + isolated Strapi/PostgreSQL integration | Transport 7/7 and retained CMS baseline passed before the streaming correction | Original B3 correction failed transport/CMS contract cases before the closed command and exact route surface; final bounded-stream RED failed 1/8 because the response reader was not cancelled | Transport 8/8; app transport plus acceptance 19/19; CMS feedback harness 53/53 | Oversized declared/materialized/streamed bodies, malformed top-level/nested responses, unavailable survey, lookup/accept commands, replay, conflict/gone mapping, malformed/unknown commands, permission registration, and atomic persistence | Survey context moved to the centralized API type boundary and streamed response reading replaced post-buffer measurement; focused tests remained 19/19 |

### U7-B3a Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm exec vitest run src/lib/feedback/cms-transport.test.ts src/lib/feedback/submission-acceptance.test.ts`; exit 0, 2 files and 19/19 passed. `pnpm typecheck`; exit 0, no diagnostics. `git diff --check`; exit 0, no output.                                                                                                                                                                      |
| Runtime harness command/scenario and exact result | `npm test -- feedback`; final exit 0, 53/53 passed. The isolated real Strapi/PostgreSQL path proved exact registered actions, malformed/unknown command rejection, authoritative lookup, replay/conflict, atomic acceptance, and deterministic process/container/volume cleanup. An intermediate run failed only the documentation line-wrap assertion and was corrected before the final full rerun. |
| Rollback boundary                                 | Remove `cms-transport.ts` and its focused test; revert the centralized survey-context types, partial acceptance-store port, `FEEDBACK_STRAPI_TOKEN` example, CMS controller/routes/persistence deltas and their tests, permission documentation, B3a/B3b task split, and this evidence. Preserve U7-A1 through U7-B2.                                                                                 |

### U7-B3a Verification and Boundary

- Complete authored scope: 545 additions and 27 deletions = 572 lines. This is below the mandatory 800-line ceiling; no size exception is used.
- Fresh corrected evidence revision: `sha256:644a6d4c51fedcb3a7eca26f4c15ab42833911cd921dc747c28674045065db63`, explicitly remediating failed combined revision `sha256:e17422b6dcad9326282955939c3b850653598708e86c0b8f122b325d6d5db2c8` through the autonomous B3a/B3b split.
- Intended review boundary starts after U7-B2 and ends with the independently usable CMS transport contract. B3b starts from this exact boundary and owns all public HTTP composition.

## U7-B3a Commit-Time Replay Correction

- This correction remediates failed evidence revision `sha256:4b706c73f2c2ec49085bf432cf4d0a2af2a041e6630d6ce93f1675209a39ccb7` under native attempt `sha256:e47e8b7a1f2750a6ffaa809f4f6239f74410e40a8a5dd5877d274aad9deb6566`; the parent retains settlement authority.
- Root cause: the CMS transport represented a successful commit-time identical replay as an ad hoc thrown object, while `acceptSubmission` mapped every thrown transaction result to `503 UPSTREAM_UNAVAILABLE`.
- Correction: `IdempotencyReplayError` is now the explicit stable typed adapter/domain contract. The acceptance service maps only that class to status 200 with the authoritative CMS receipt and timestamp; unrelated persistence failures retain the generic 503 result. No error-message matching is used.
- Task 3.1/U7 remains unchecked. B3b Route Handlers, public composition/runtime, stable browser cookies, public status mapping, and signing-key configuration remain absent.

### U7-B3a Correction TDD Cycle Evidence

| Task                         | Test File                                                | Safety Net                                                 | RED                                                                                                                                                         | GREEN                                                                                | REFACTOR                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit-time identical replay | `submission-acceptance.test.ts`; `cms-transport.test.ts` | Focused pre-change selector passed 2 files and 19/19 tests | Composed acceptance/CMS regression exited 1 with exactly 1 failed and 11 skipped: expected authoritative status 200 and received `503 UPSTREAM_UNAVAILABLE` | Exact RED selector passed 1/1; focused transport/acceptance passed 2 files and 20/20 | Replaced the ad hoc replay object with one exported typed error carrying a stable code, receipt, and timestamp; focused tests remained 20/20 |

### U7-B3a Correction Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/cms-transport.test.ts src/lib/feedback/submission-acceptance.test.ts`; exit 0, 2 files and 20/20 passed.                                                                                                                                  |
| Runtime harness command/scenario and exact result | `npm test -- feedback` in `teleferico-cms`; exit 0, 53/53 passed, including isolated Strapi/PostgreSQL acceptance, replay, rollback, and deterministic container/volume cleanup. The generated POC result touched by the harness was restored exactly and is absent from the candidate.               |
| Rollback boundary                                 | Revert the `IdempotencyReplayError` contract and catch mapping in `submission-acceptance.ts`, restore the transport's previous replay throw in `cms-transport.ts`, and remove only the composed regression from `submission-acceptance.test.ts`. Preserve all other B3a work and U7-A1 through U7-B2. |

### U7-B3a Correction Verification and Identity

- Broader feedback regression: `pnpm --dir teleferico-app exec vitest run src/lib/feedback`; exit 0, 8 files and 99/99 passed. App typecheck: `pnpm --dir teleferico-app run typecheck`; exit 0, no diagnostics. `git diff --check`; exit 0, no output.
- An attempted safety-net invocation through `pnpm --dir teleferico-app run test -- ...` ran the package suite rather than the requested selector and exited 1 with 253/255 passing. Its only failures were the already evidenced base-only `form-protection.test.ts` expectations for `TOO_MANY_REQUESTS` versus unchanged `EMAIL_LIMIT_EXCEEDED`; the corrected focused selector then passed 19/19 before RED.
- A non-gating Prettier readback reports the four pre-existing B3a app source/test files are not format-clean. No broad restyle was performed because it would exceed this autonomous remediation boundary and the hard review ceiling; the correction hunks follow the surrounding TypeScript style.
- Candidate path set: 15 paths including this cumulative evidence artifact; every path has Git mode `100644`. Candidate implementation identity excluding this self-referential evidence file: `sha256:5d994ac8abe7dc44ba6ae85912399c4fb746bdebba840f86d528e116d9856d5e`, derived from canonical `tb113-candidate.v1` JSON over branch, base, sorted path, mode, and content SHA-256.
- Complete base-relative authored scope: 637 additions and 28 deletions = 665 lines. This remains below the mandatory 800-line ceiling and preserves the autonomous B3a boundary.
- Fresh correction evidence revision: `sha256:60ac871db4142dbe1bde52e78a407288a5b36020d880f9bec37373bafe0cb048`, derived from canonical `tb113-apply-evidence.v1` JSON binding the failed revision, native attempt, prior B3a revision, candidate identity, exact RED/GREEN/focused/broader/typecheck/CMS/diff outcomes, package-suite baseline diagnosis, formatting readback, final authored count, rollback boundary, and unchecked task 3.1. Parent owns settlement.

## U7-B4 Form, Draft, and UI — Normalized Complete Candidate / U7 Remains Open

- Scope implemented: QR-bound visitor page and root layout, responsive Q1–Q4 journey, ES/EN/PT semantic copy fallback telemetry, ordered validation and focus/status feedback, client-only expiring drafts keyed by survey version/point/pseudonymous browser context, privacy notice without a consent event, real reCAPTCHA verification, and authoritative receipt/guard success gating.
- Scope explicitly deferred: U7-B5 visitor acceptance E2E and any U8+ work. The B4-only responsive browser harness below is included; task 3.1 remains unchecked.
- Implementation files are limited to `teleferico-app/src/app/qr/**`, `teleferico-app/src/lib/feedback/{draft,ui-contract}.*`, and the feedback component styles in `src/app/globals.css`. No dependency, lockfile, CMS, schema, migration, generated type, environment, deployment, credential, or remote change occurred.

### U7-B4 TDD Cycle Evidence

| Task                            | Test File                                                | Layer                   | Safety Net                                | RED                                                                                                              | GREEN                                                                                                                     | REFACTOR                                                                    |
| ------------------------------- | -------------------------------------------------------- | ----------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Draft lifecycle and UI contract | `src/lib/feedback/{draft,ui-contract}.test.ts`           | Pure Vitest             | Existing feedback selector 129/129 passed | Missing `draft` and `ui-contract` modules; 0 tests collected                                                     | 2 files, 6/6 passed                                                                                                       | 6/6 remained green after validation, expiry, and fallback refinements       |
| Responsive visitor form         | `src/app/qr/feedback/[publicCode]/FeedbackForm.test.tsx` | jsdom component/Vitest  | Pure contract selector 6/6 passed         | Missing `FeedbackForm` module; 0 tests collected                                                                 | 1 file, 2/2 passed                                                                                                        | 2/2 remained green after the explicit `other` aspect control and lint fixes |
| B4 responsive browser harness   | `tests/e2e/feedback-ui-responsive.spec.ts`               | Chromium mobile/desktop | Component selector 2/2 passed             | First browser run exited 1: mobile draft assertion targeted a hidden Q1 control after reload; desktop 1/1 passed | Focused browser selector exited 0, 2/2 passed after asserting the persisted draft envelope and preserving the stage check | 2/2 remained green after typecheck/ESLint and the required smoke invocation |

### U7-B4 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback 'src/app/qr/feedback/[publicCode]/FeedbackForm.test.tsx'`; exit 0; 11 files, 115/115 passed.                                                                                                                                                                                                                                                                                                          |
| Runtime harness command/scenario and exact result | B4 selector `pnpm --dir teleferico-app exec playwright test tests/e2e/feedback-ui-responsive.spec.ts --project=chromium`; exit 0; 2/2 passed, proving mobile draft restoration at 390×844 and desktop verification/privacy layout at 1440×900. Required command `pnpm --dir teleferico-app run test:e2e:smoke -- --grep "visitor feedback"`; exit 0; 7/7 Chromium smoke tests passed, including both B4 scenarios. U7-B5 visitor acceptance E2E remains deferred. |
| Rollback boundary                                 | Remove `src/app/qr/layout.tsx`, `src/app/qr/feedback/[publicCode]/**`, `src/lib/feedback/draft.*`, `src/lib/feedback/ui-contract.*`, and the feedback component rules appended to `src/app/globals.css`. Preserve all U7-A1–B3b behavior and the cumulative SDD evidence.                                                                                                                                                                                         |

### U7-B4 Verification and Size Boundary

- App typecheck: exit 0 with no diagnostics. Changed-file ESLint: exit 0. `git diff --check`: exit 0.
- Package Vitest: exit 1; 292/294 passed. The only failures are the pre-existing `form-protection.test.ts` expectations for `TOO_MANY_REQUESTS` versus unchanged `EMAIL_LIMIT_EXCEEDED`; no U7-B4 test failed.
- Build: route compilation succeeded; the build stopped at the unchanged B3b `src/lib/feedback/browser-guard.ts` unused-parameter lint findings. No new B4 lint finding remains.
- The Prettier-normalized implementation/test/style scope is 1,573 additions and 5 deletions, 1,578 changed lines total, within the explicit candidate-scoped 1,600-line exception. The generated POC result mutated by the browser harness was restored exactly and is not part of the candidate.
- This continuation remediates failed evidence revision `sha256:f39ada3653113924c09cfd323c03ba5b58cd4e8d32bb2709457863befb0ab7d7` under parent-owned attempt token `sha256:12e8f9094e83d301bde2d831eaf35cfade9ca28ccc735d3ae85d50fd5dabf63d`. Fresh evidence revision: `sha256:7d44b2db2c62c9582bd8090f4b72b0d33b14e83cb588589945525ccb01a1d17f`, derived from canonical `tb113-apply-evidence.v1` JSON over the 10 implementation/test/style paths, exact command outcomes, base-only diagnosis, cumulative task state, rollback boundary, and final line count. Parent owns native settlement.
- The normalized successor must remediate evidence revision `sha256:4815722e51b422431303858c524d0868111bf089aec81b48ec8495dface5d462`; its final evidence revision and settlement remain parent-owned after verification.

## U7-B5 Visitor E2E Evidence

- Scope: added the focused Playwright acceptance spec `teleferico-app/tests/e2e/visitor-feedback.spec.ts` for the QR-only public visitor journey. The fixture stack intercepts the synthetic survey and submission contracts, injects synthetic reCAPTCHA callbacks, captures browser requests, and never contacts CMS, worker, or external QR services.
- Coverage: mobile Chromium proves QR-only entry, no public links, ES-to-EN locale switching, Q1-Q4 completion, comment submission, authoritative receipt success, payload shape, synthetic CAPTCHA, and the absence of direct CMS/worker calls. Desktop Chromium proves unavailable-code handling, back navigation, verification/privacy presentation, and no horizontal overflow at 1440×900.
- No production, dependency, lockfile, CMS, schema, migration, generated type, environment, credential, deployment, remote, GCP, or IAM change occurred.

### U7-B5 TDD Cycle Evidence

| Task                       | Test File                            | Layer                                                   | RED                                                                                                                                        | GREEN                                          | REFACTOR                                                                                                                                                                    |
| -------------------------- | ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visitor QR-only acceptance | `tests/e2e/visitor-feedback.spec.ts` | Chromium Playwright with synthetic QR/CMS/CAPTCHA stack | Initial focused run exited 1 because the new spec could not find the visitor heading before the fixture-driven implementation was complete | Exact focused command exited 0; 2 tests passed | Replaced automatic CAPTCHA timing with an explicit synthetic callback, aligned unavailable-survey copy, and retained 2/2 after typecheck, ESLint, Prettier, and diff checks |

### U7-B5 Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `CI=1 pnpm --dir teleferico-app exec playwright test tests/e2e/visitor-feedback.spec.ts`; exit 0; 2 passed, 0 failed, 0 skipped.                                                                                                                                                                                                              |
| Runtime harness command/scenario and exact result | The same Chromium command ran the mobile and desktop scenarios against synthetic survey/submission routes and synthetic CAPTCHA. The assertions proved QR-only browser behavior, payload/receipt flow, unavailable-code mapping, back navigation, privacy/verification UI, and responsive overflow safety; no external service was contacted. |
| Rollback boundary                                 | Remove `teleferico-app/tests/e2e/visitor-feedback.spec.ts`, revert the U7-B5 checkbox and this evidence/status addition, and preserve U7-B4 production/UI behavior plus all prior U7-A1–B4 evidence.                                                                                                                                          |

### U7-B5 Verification and Boundary

- App typecheck: exit 0 with no diagnostics. Changed-file ESLint: exit 0. Changed-file Prettier check: exit 0. `git diff --check`: exit 0 with no output.
- The implementation candidate contains 306 authored additions and 0 deletions; it remains below the 400-line autonomous review ceiling. The task/evidence persistence additions stay within the same bounded slice.
- U7 is complete. U8 task 3.2 remains unchecked and incomplete; later tasks remain unchecked and were not implemented.

## U8-A Admin Read Routes Evidence

- Scope: route-scoped admin read contracts, bounded filter parsing, authenticated Next.js mediation, CMS reader, focused unit/Route Handler tests, and the authenticated synthetic-data runtime harness. No UI, report commands, generation mutation, download route, CMS schema, dependency, environment, or deployment work was added.
- Security boundary: admin reads run trusted-origin validation, CSRF-bound Auth.js session validation, capability checks, and server-held JWT mediation. Upstream errors are mapped to bounded `UPSTREAM_UNAVAILABLE` responses.
- TDD cycle: RED focused test `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-read.test.ts` failed before implementation with the expected missing `./admin-read` module; GREEN/REFACTOR focused selector passed 13 files and 121 tests after the route harness was added; typecheck and changed-file ESLint passed.

### U8-A TDD Cycle Evidence

| Task                             | Test file                                            | Layer                                      | RED                                                                        | GREEN                                      | REFACTOR                                                                          |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| U8-A filter/projection contracts | `src/lib/feedback/admin-read.test.ts`                | Pure Vitest                                | Exit 1: expected unresolved `./admin-read` import before implementation    | 3/3 passed                                 | 3/3 remained green after bounded date/filter and projection refinements           |
| U8-A authenticated read routes   | `src/app/api/admin/feedback/summary/route.test.ts`   | Route Handler/Vitest                       | Initial route test was added before the shared route/reader implementation | 4/4 passed                                 | 4/4 remained green after CSRF, safe-error, and capability enforcement refinements |
| U8-A route matrix harness        | `src/app/api/admin/feedback/runtime-harness.test.ts` | Authenticated synthetic-data route runtime | Initial route matrix had no implementation to load                         | 1/1 scenario passed across 5/5 read routes | 1/1 remained green after all route wrappers and JWT mediation assertions          |

### U8-A Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback src/app/api/admin/feedback`; exit 0; 13 test files, 121 tests passed, 0 failed/skipped.                                                                                                                                                                                                                                                |
| Runtime harness command/scenario and exact result | `pnpm --dir teleferico-app exec vitest run src/app/api/admin/feedback/runtime-harness.test.ts`; exit 0; 1 authenticated synthetic-data scenario passed across Summary, Aspects, QR-points comparison, Comments, and Reports. The harness used a synthetic CSRF-bound session/JWT, synthetic feedback envelopes, capability checks, and no external service.                                        |
| Rollback boundary                                 | Remove `teleferico-app/src/app/api/admin/feedback/**`, `teleferico-app/src/lib/feedback/admin-read.*`, `teleferico-app/src/lib/feedback/admin-reader.ts`, `teleferico-app/src/lib/feedback/admin-route.ts`, `teleferico-app/src/types/api/admin/feedback.d.ts`, the admin barrel export, and U8-A focused tests; revert only the U8-A task/evidence additions. Preserve U7 and all prior evidence. |

### U8-A Verification and Boundary

- App typecheck: exit 0 with no diagnostics.
- Changed-file ESLint: exit 0 with no diagnostics.
- Candidate-scoped explicit Prettier check: exit 0 across all 13 U8-A code files. The broader historical feedback glob still reports exactly 16 pre-existing files outside U8-A; none were modified.
- `git diff --check`: exit 0 with no output.
- Full app Vitest: exit 1, 300/302 passed; the two failures are unchanged `src/lib/services/__tests__/form-protection.test.ts` expectations for `TOO_MANY_REQUESTS` versus actual `EMAIL_LIMIT_EXCEEDED`. No U8-A test failed.
- Authored implementation/test scope: 1,158 lines. This is within the inherited change-level `review_budget_lines: 1600`; no obsolete per-slice exception was requested or used.
- Incidental `services/survey-report-worker/poc/poc-result.json` test output was restored exactly and is not part of the candidate.
- U8-A is complete. The U8 parent remains unchecked: UI, write/generation/download commands, and admin E2E remain for later work units.

## U8-A Reliability Remediation — Complete

- Scope: corrected exactly the three acknowledged non-blocking reliability findings without changing the U8 parent task or adding UI, write/generation/download commands, CMS schema, dependencies, environment, deployment, or remote behavior.
- Duplicate single-valued query parameters now fail closed instead of becoming omitted/default values. Repeatable ratings and QR comparison point keys remain accepted and normalized.
- The CMS reader now requires object data, object filters, and bounded nonnegative safe-integer population counts in the `feedback-admin.v1` envelope. Upstream fetches use a 10-second `AbortSignal` deadline; aborts remain mapped to `UPSTREAM_UNAVAILABLE` without exposing details.
- The generated `services/survey-report-worker/poc/poc-result.json` mutation from the package-wide test run was restored exactly with `git restore`; it is absent from the final worktree delta.

### U8-A Reliability Remediation TDD Cycle Evidence

| Task                                                      | Test file                               | Layer                             | Safety Net                    | RED                                                                                                           | GREEN                                                                                                       | TRIANGULATE                                                                                  | REFACTOR                                                                                                |
| --------------------------------------------------------- | --------------------------------------- | --------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Reject ambiguous single-valued query parameters           | `src/lib/feedback/admin-read.test.ts`   | Pure Vitest                       | Existing selector: 3/3 passed | 3 new duplicate-parameter cases failed; each returned an accepted default/omitted filter                      | Focused remediation selector: 12/12 passed after rejecting repeated `pointKey`, `locale`, and `page` values | Final 14/14 also proves repeatable `rating` and QR `pointKeys` remain accepted               | No structural extraction justified; final focused selector remained 14/14 after Prettier normalization  |
| Validate the minimum `feedback-admin.v1` runtime envelope | `src/lib/feedback/admin-reader.test.ts` | Node/Vitest reader integration    | N/A — dedicated new test file | 4 malformed-shape cases failed to reject (including array data, missing filters, negative, and unsafe counts) | Reader selector: 5/5 passed after object/data/meta/population validation                                    | Added fractional-count rejection and a valid bounded envelope; final reader coverage was 6/6 | Type guard was tightened to preserve strict TypeScript narrowing; final focused selector remained green |
| Bound upstream fetches and map aborts safely              | `src/lib/feedback/admin-reader.test.ts` | Node/Vitest transport integration | N/A — dedicated new test file | Abort mapping passed, but the fetch received no `AbortSignal`                                                 | Reader selector: 5/5 passed with a signal passed to fetch and `UPSTREAM_UNAVAILABLE` mapping                | Re-ran through the combined 4-file selector and runtime harness; 19/19 and 1/1 passed        | No additional transport abstraction was justified; final focused selector remained green                |

### U8-A Reliability Remediation Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-read.test.ts src/lib/feedback/admin-reader.test.ts src/app/api/admin/feedback/summary/route.test.ts src/app/api/admin/feedback/runtime-harness.test.ts`; exit 0; 4 files, 19/19 tests passed, 0 failed/skipped.                                                                                                                                                                                 |
| Runtime harness command/scenario and exact result | `pnpm --dir teleferico-app exec vitest run src/app/api/admin/feedback/runtime-harness.test.ts`; exit 0; 1 authenticated synthetic-data scenario passed across Summary, Aspects, QR-points comparison, Comments, and Reports.                                                                                                                                                                                                                                      |
| Typecheck                                         | `pnpm --dir teleferico-app run typecheck`; exit 0; TypeScript reported no errors.                                                                                                                                                                                                                                                                                                                                                                                 |
| Changed-file ESLint                               | `pnpm --dir teleferico-app exec eslint src/lib/feedback/admin-read.ts src/lib/feedback/admin-read.test.ts src/lib/feedback/admin-reader.ts src/lib/feedback/admin-reader.test.ts`; exit 0; no diagnostics.                                                                                                                                                                                                                                                        |
| Changed-file Prettier                             | `pnpm --dir teleferico-app exec prettier --check src/lib/feedback/admin-read.ts src/lib/feedback/admin-read.test.ts src/lib/feedback/admin-reader.ts src/lib/feedback/admin-reader.test.ts ../openspec/changes/tb-113-visitor-feedback/apply-progress.md`; exit 1 because the cumulative `apply-progress.md` is not Prettier-clean; all four TypeScript files passed. The HEAD baseline check also exited 1, so no broad historical Markdown restyle was applied. |
| Package-wide test                                 | `pnpm --dir teleferico-app test`; exit 1; 311/313 passed, with only the two acknowledged baseline `form-protection.test.ts` failures (`TOO_MANY_REQUESTS` expected versus `EMAIL_LIMIT_EXCEEDED` actual). No new failure occurred.                                                                                                                                                                                                                                |
| Diff check and cleanup                            | `git diff --check`; exit 0 with no output after restoring `teleferico-app/services/survey-report-worker/poc/poc-result.json` exactly.                                                                                                                                                                                                                                                                                                                             |
| Rollback boundary                                 | Revert the duplicate-value checks in `admin-read.ts`, the envelope/deadline checks in `admin-reader.ts`, remove `admin-reader.test.ts`, revert the focused additions in `admin-read.test.ts`, and remove only this remediation evidence. Preserve the prior U8-A read routes, tests, types, and cumulative evidence; keep U8 unchecked.                                                                                                                           |

### U8-A Reliability Remediation Boundary

- Complete authored remediation impact: 255 lines — 223 implementation/test lines plus 32 cumulative evidence lines — with no dependency, lockfile, CMS, environment, infrastructure, credential, generated-type, remote, branch, commit, push, PR, or U8-parent change.
- The subtask `3.2a` remains checked from the prior U8-A slice. The U8 parent task remains unchecked; UI, write/generation/download commands, and admin E2E are still pending.

## U8-A Response-Cap Removal Successor Evidence

- Scope: removed the arbitrary manual response-size cap from the authenticated CMS reader while preserving the 10-second upstream timeout and existing `feedback-admin.v1` envelope validation. No streaming complexity, configurable cap, UI, write/generation/download command, CMS schema, dependency, environment, deployment, or U8-parent change was added.
- The reader now delegates body decoding to `Response.json()`. Malformed JSON and invalid envelopes still fail closed as `FeedbackAdminReaderError`; valid JSON larger than 1 MiB is accepted.

### U8-A Response-Cap Removal TDD Cycle Evidence

| Task                                            | Test file                               | Layer                          | Safety Net                    | RED                                                                                                              | GREEN                                              | TRIANGULATE                                                                                                                                                          | REFACTOR                                                                              |
| ----------------------------------------------- | --------------------------------------- | ------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Remove the arbitrary upstream response-size cap | `src/lib/feedback/admin-reader.test.ts` | Node/Vitest reader integration | Existing selector: 9/9 passed | Exit 1: 10 tests, 9 passed, 1 failed because the valid response larger than 1 MiB was rejected by the finite cap | Exit 0: 10/10 passed after removing the manual cap | Final cases cover a valid bounded envelope, five invalid envelope shapes, malformed JSON, a valid response larger than 1 MiB, and the exact 10-second timeout signal | Exit 0: combined reader/route selector 15/15; no additional abstraction was justified |

### U8-A Response-Cap Removal Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm exec vitest run src/lib/feedback/admin-reader.test.ts src/app/api/admin/feedback/summary/route.test.ts src/app/api/admin/feedback/runtime-harness.test.ts`; exit 0; 3 files, 15/15 tests passed, 0 failed/skipped.                                                                                                                                                  |
| Runtime harness command/scenario and exact result | `pnpm exec vitest run src/app/api/admin/feedback/runtime-harness.test.ts`; exit 0; 1/1 authenticated synthetic-data route scenario passed across the five read routes.                                                                                                                                                                                                    |
| Rollback boundary                                 | Revert only `teleferico-app/src/lib/feedback/admin-reader.ts`, `teleferico-app/src/lib/feedback/admin-reader.test.ts`, this successor evidence, and the U8-A line-total wording in `tasks.md`; restore the prior finite-cap behavior only if explicitly required. Preserve the preceding U8-A routes, adapters, types, tests, and cumulative evidence; keep U8 unchecked. |

### U8-A Response-Cap Removal Verification and Cleanup

- Full Vitest: exit 1, 314/316 passed; only the two acknowledged base-only form-protection failures remained (`TOO_MANY_REQUESTS` expected versus `EMAIL_LIMIT_EXCEEDED` actual). No new failure occurred.
- TypeScript: `pnpm exec tsc --noEmit` exit 0 with no output.
- Changed-file ESLint: `pnpm exec eslint src/lib/feedback/admin-reader.ts src/lib/feedback/admin-reader.test.ts` exit 0 with no output.
- Changed-file Prettier: `pnpm exec prettier --check src/lib/feedback/admin-reader.ts src/lib/feedback/admin-reader.test.ts` exit 0; both files matched.
- `git diff --check`: exit 0 with no output.
- The full Vitest run changed `teleferico-app/services/survey-report-worker/poc/poc-result.json`; it was restored exactly. SHA-256 before and after cleanup: `d0a02f73fa29ade5d68725960bd433d7e733d60477920d82a4da83bc91f81ff4`.
- Successor authored impact: 44 changed implementation/test lines (22 additions, 22 deletions); cumulative U8-A authored changed implementation/test scope is 1,425 lines, within the inherited 1,600-line budget. No process, credential, remote, branch, commit, push, PR, dependency, lockfile, CMS, environment, or generated-type mutation occurred.
- The native attempt authority is retained unchanged: `sha256:97f0b624f8eca2155623bf6741d2b580aa0a1cc7d498fed6ac2e9e8c87d172ea`.

## U8-B Admin Report Commands Evidence — Historical Pre-Remediation (Superseded)

- Historical scope only: authenticated Next.js generation/retry/download mediation, bounded `feedback-admin.v1` command envelopes, CMS generation/retry/history/download service/controller contracts, immutable PDF response mediation, route-permission contract updates, and isolated PostgreSQL/Strapi runtime coverage. This pre-remediation custom-CMS/history/download evidence is retained for chronology and is superseded; it is NOT current U8-B scope.
- Historical security claim only: Next.js mutations required trusted origin, CSRF-bound Auth.js session, and `feedback.reports.generate`; downloads required `feedback.reports.download`. The superseded CMS custom-handler claim required an authenticated application user. The current U8-B boundary does not use that application-user attribution model.
- Corrective discovery: Strapi custom Content API routes authenticate through the default route boundary; explicit `config: { auth: true }` entries were removed after the isolated runtime exposed the incompatible route configuration. Controllers retain an explicit authenticated-user guard.

### U8-B TDD Cycle Evidence

| Task                                                | Test file                                                                             | Layer                                                 | RED                                                                                                                                           | GREEN                                                                                                                    | REFACTOR                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Bounded generation/retry/download command contracts | `teleferico-app/src/lib/feedback/admin-command.test.ts`                               | Pure Vitest transport/parser                          | Initial RED had the missing `./admin-command` module; the later bounded-range regression also failed before the 366-day guard                 | Final selector: 5/5 passed                                                                                               | Final transport coverage preserves exact envelopes, conflict mapping, independent range semantics, and storage-header stripping     |
| Authenticated generation Route Handler              | `teleferico-app/src/app/api/admin/feedback/generations/route.test.ts`                 | Next.js Route Handler/Vitest                          | Initial RED had the missing generation route/command implementation                                                                           | Combined app selector: 7/7 passed                                                                                        | Origin/session/capability checks remain before CMS access                                                                           |
| CMS command service and authenticated runtime       | `teleferico-cms/test/feedback/admin-report-commands.test.js`                          | Node contract plus isolated PostgreSQL/Strapi         | Initial RED had the missing `admin-commands` service; the first runtime attempt failed until route authentication configuration was corrected | `npm test -- feedback/admin-report-commands`: 4/4 passed, including authenticated generation against isolated PostgreSQL | Retry state, immutable history ordering, PDF mediation, owned-resource cleanup, and zero leftover containers/volumes remain covered |
| Route and permission contract alignment             | `teleferico-cms/test/feedback/permissions/{permissions,postgres-permissions}.test.js` | Static route registry plus isolated Strapi inspection | Existing deny-baseline assertions failed when the intentional U8-B custom routes appeared                                                     | `npm test -- feedback/permissions`: 4/4 passed                                                                           | Assertions distinguish custom mediated handlers from Strapi action/grant rows                                                       |

### U8-B Work Unit Evidence

| Evidence                                          | Exact value                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | App: `pnpm exec vitest run src/lib/feedback/admin-command.test.ts src/app/api/admin/feedback/generations/route.test.ts`; exit 0; 2 files, 7/7 passed. CMS: `npm test -- feedback/admin-report-commands`; exit 0; 4/4 passed. Supporting lifecycle: 12/12 passed. Supporting permissions: 4/4 passed. |
| Runtime harness command/scenario and exact result | `npm test -- feedback/admin-report-commands`; exit 0; Strapi 5 loaded against isolated local PostgreSQL, authenticated generation persisted one queued row, and cleanup ended with zero owned containers and zero owned volumes.                                                                     |
| Rollback boundary                                 | Revert U8-B app command/route/type files and tests; revert CMS admin command service/controllers/routes and the U8-B test-runner/permission/lifecycle/doc expectation updates. Preserve U8-A readers/routes/types/tests and all prior U7 evidence.                                                   |

### U8-B Verification and Boundary

- App typecheck: `pnpm run typecheck`; exit 0 with no diagnostics.
- Required broad app ESLint: `pnpm exec eslint src/app/api/admin/feedback src/lib/feedback`; exit 1 only on seven pre-existing `no-unused-vars` diagnostics in `src/lib/feedback/browser-guard.ts`. Candidate-scoped ESLint over all U8-B app source/tests/types exited 0.
- `git diff --check`: exit 0 with no output.
- Full app Vitest: exit 1, 321/323 passed; only the two acknowledged baseline `form-protection.test.ts` expectations remain (`TOO_MANY_REQUESTS` expected versus `EMAIL_LIMIT_EXCEEDED` actual). No U8-B test failed.
- Exact CMS aggregate: `node --test test/feedback/*.test.js`; final exit 0; 4/4 top-level feedback tests passed. The first aggregate attempt exposed a candidate-caused trailing `module.exports = {}` override in both new controllers; removing those overrides corrected Strapi route registration before the final rerun.
- Exact authenticated CMS/PostgreSQL runtime: `node --test --test-name-pattern="authenticated controller queues" test/feedback/admin-report-commands.test.js`; final exit 0; 1/1 passed. Strapi shut down cleanly, and post-run owned-resource checks found no `tb113_test_*` containers or volumes.
- Candidate-owned app/CMS source, new tests, documentation, and OpenSpec artifacts were normalized with the installed Prettier writer and their scoped checks pass. Historical CMS harness/lifecycle/permission files retain their parent formatting outside the U8-B authored lines to avoid unrelated rewrites.
- U8-B remains separate from the U8 parent: UI and admin E2E are not implemented. No commit, push, PR, merge, rebase, dependency, schema, migration, environment, credential, deployment, or remote mutation occurred.

## U8-B Pre-Native Remediation Verification — Historical (Superseded)

- Focused app selector: `pnpm --dir teleferico-app exec vitest run src/lib/feedback/admin-command.test.ts src/app/api/admin/feedback/generations/route.test.ts`; exit 0; 2 files and 12/12 tests passed.
- App typecheck: `pnpm --dir teleferico-app run typecheck`; exit 0. Candidate-scoped ESLint for all U8-B app source/tests/types; exit 0. Candidate-scoped Prettier; exit 0. `git diff --check`; exit 0.
- Full app Vitest: exit 1; 326/328 passed. The only failures are the two acknowledged base-only `form-protection.test.ts` expectations for `TOO_MANY_REQUESTS` versus unchanged `EMAIL_LIMIT_EXCEEDED`; no U8-B test failed.
- CMS focused contract/runtime selector: `npm --prefix teleferico-cms test -- feedback/admin-report-commands`; one isolated run exited 0 with 5/5 passed, including Strapi/PostgreSQL generation and cleanup. A later rerun after the aggregate suite hit a Knex pool timeout; no owned Docker container or volume remained afterward.
- CMS aggregate selector: `npm --prefix teleferico-cms test -- feedback`; exit 1 with 57/59 passed. The two failures were Docker/Strapi readiness or pool-resource failures in existing PostgreSQL migration/permission suites; the U8-B command test passed. The aggregate was not run concurrently with another test after the focused rerun.
- The current non-SDD authored delta is 1,689 lines relative to `HEAD`, exceeding the requested 1,600-line ceiling by 89 lines. The implementation was not compressed by deleting tests, documentation, comments, or blank lines. This slice requires an explicit `size:exception` or reslicing before publication.
- Status: not ready for independent verification settlement. U8-B task `3.2b` remains checked because implementation and focused evidence are complete; U8 parent `3.2` remains unchecked.

## U8-B Pre-Native Remediation Continuation — Historical (Superseded)

- Removed the deferred CMS report listing/download controller and route files, plus the corresponding app download Route Handler and report-history/download command paths. The retained U8-A report read projection is unchanged.
- Replaced the CMS generation/retry route's default Strapi permission boundary with `config: { auth: false }` plus an explicit controller JWT verification against `plugin::users-permissions.user`; anonymous requests return `401`, authenticated requests execute, and generic Strapi CRUD/action grants remain absent.
- Propagated immutable `requestedBy` attribution through both generation and retry persistence paths. The isolated HTTP/PostgreSQL harness now proves `401` unauthenticated denial, `202` authenticated generation, queued persistence, populated `requestedBy`, and owned-resource cleanup.
- Focused evidence after this continuation: app command/generation selector `10/10`; CMS command/runtime selector `4/4`; CMS permissions selector `4/4`; CMS syntax checks and `git diff --check` passed.
- Documentation now describes the explicit bearer-JWT application-user check and keeps Next.js capability enforcement as the application authorization boundary.
- Mechanical current candidate delta relative to `HEAD`, excluding OpenSpec artifacts but including the permissions documentation, is `1,804` changed lines (`1,682` additions and `122` deletions) when untracked implementation files are included. This exceeds the authorized `1,600`-line change-level ceiling; no code, test, comment, or documentation compression was performed.
- Full app and CMS aggregate suites were not rerun after this continuation. The last aggregate evidence remains `326/328` app tests with only the two acknowledged baseline form-protection failures and `57/59` CMS feedback tests with existing Docker/Strapi readiness or pool-resource failures.
- Status: implementation evidence is focused-green, but apply is blocked from final settlement until the maintainer authorizes `size:exception` or selects a reslice/chain boundary for the over-ceiling candidate.

## U8-B Native Strapi Boundary Remediation — Current Scope

- Binding correction: U8-B no longer owns custom CMS command code. Generation uses the native Strapi core controller/router; `survey-report` controller/routes were restored to the pre-U8-B empty factory state; `services/admin-commands.js` was removed.
- App ownership: `teleferico-app/src/lib/feedback/admin-command.ts` now owns date validation, overlap detection/disclosure, generation/retry decisions, core CRUD payload construction, and safe native-core error mapping. The server-side transport targets `/api/survey-report-generations` and never exposes the CMS token to browser code. U8-B current scope is app-owned generation/retry only; report history and PDF download are not implemented here.
- Native actor alignment: the core Content API test provisions only a native Strapi Authenticated Role/API Token actor with `find` and `create` grants in an isolated database. The persisted `requestedBy: null` relation is asserted, with no synthetic attribution and no custom CMS controller invocation.

### U8-B Native Boundary TDD Evidence

| Task | Safety-net RED | GREEN | TRIANGULATE | REFACTOR |
| --- | --- | --- | --- | --- |
| Remove custom CMS command boundary | App command selector failed 1/5 after the expected core endpoint path was asserted; CMS native runtime failed with 404; static CMS boundary test failed because custom controller/routes/service remained | App command/generation selector passed 12/12; native CMS runtime passed 1/1; permissions selector passed 4/4; lifecycle selector passed 12/12 | Native runtime proved unauthenticated core GET `403`, role-authorized core POST `201`, authorized core GET `200`, persistence, null `requestedBy`, and cleanup with no custom controller invocation | App typecheck, candidate-scoped ESLint, candidate-scoped Prettier, CMS focused Prettier, diff check, and exact line-count proof pass; historical CMS lifecycle/harness files retain baseline formatting outside the one-line boundary assertions |

### U8-B Native Boundary Work Unit Evidence

| Evidence | Exact value |
| --- | --- |
| Focused test command and exact result | `pnpm exec vitest run src/lib/feedback/admin-command.test.ts src/app/api/admin/feedback/generations/route.test.ts`; exit 0; 2 files, 12/12 passed. `npm test -- feedback/admin-report-commands`; exit 0; 1/1 passed. `npm test -- feedback/permissions`; exit 0; 4/4 passed. `npm test -- feedback/lifecycle`; exit 0; 12/12 passed. |
| Runtime harness command/scenario and exact result | Native core Strapi/PostgreSQL scenario started isolated local services, denied unauthenticated core access with `403`, authorized native-role create with `201`, authorized native-role read with `200`, asserted persisted `requestedBy` is null, and ended with zero owned containers and volumes. |
| Rollback boundary | Revert the U8-B app command helper/tests and Route Handler retry test; restore the custom CMS files only if the maintainer explicitly rejects native core CRUD; revert native permission tests/docs and this remediation section. Preserve pre-U8-B lifecycle services, schemas, migrations, U8-A readers, and U8 parent/UI pending state. |

### U8-B Current Status

- U8-B custom CMS production code remaining: none. Pre-existing custom CMS lifecycle code remains only for named CAS/terminal/report-creation invariants in `survey-report-generation/services/lifecycle.js` and the pre-U8-B submission boundary; it is outside this remediation.
- PDF download, report history implementation, U9 lifecycle/CAS/worker behavior, schema/migration/config/dependency/infrastructure changes remain out of scope.
- Final apply evidence: app typecheck and candidate-scoped ESLint/Prettier pass; CMS native/core and focused runtime selectors pass; `git diff --check` passes; exact authored delta is 1,457 lines against `dcda03d`; no `tb113_test_*` containers, volumes, or owned test processes remain. The full app suite still has two unrelated baseline `form-protection.test.ts` expectation failures (`TOO_MANY_REQUESTS` expected versus `EMAIL_LIMIT_EXCEEDED` actual); no U8-B test fails. Historical CMS lifecycle/harness files are intentionally excluded from the formatting check because their unchanged parent formatting is outside this slice.
