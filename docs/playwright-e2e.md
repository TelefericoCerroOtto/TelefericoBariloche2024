# Playwright E2E testing

## Pre-merge happy path

1. The trusted dispatcher derives `smoke` for an internal implementation PR to `development` or `full` for the exact internal `development -> staging` route.
2. Cloud Build verifies that `COMMIT_SHA^{commit}` equals the checked-out `HEAD^{commit}`, runs the selected fixture profile, and proves independent real-stack readiness.
3. The unconditional real-auth step creates only isolated synthetic resources and runs the three serial authentication and authorization scenarios.
4. The outer finalizer emits the sanitized marker `TB122 real-auth acceptance=scenarios:3/3` only after the exact three-scenario report, inner verification and cleanup, outer final readiness, owned-container cleanup and absence checks, diagnostic cleanup, and selected exit `0` all succeed. Merge evidence requires that marker and terminal Cloud Build success for the exact PR SHA.

This repository change activates the gate but does not prove a runtime 3/3 result. Production smoke, deployment, persistent resources, IAM, Secret Manager, and staging or production data remain outside the gate.

## Test layers

- `teleferico-app` Vitest remains the fast unit, component, guard, and Route Handler layer. `pnpm run test` discovers only `src/**/*.{test,spec}.{ts,tsx}`, as configured in `teleferico-app/vitest.config.ts`; tests outside `src` and JavaScript or JSX test files do not join automatically.
- Playwright runs Chromium-only browser checks for locale routing and cookies, unauthenticated administration and login validation, maintenance rendering/navigation, and CMS proxy origin protection.
- Successful Gmail, reCAPTCHA, CV-storage, broad content administration, and unmodeled app-to-CMS paths are intentionally excluded.

### Playwright discovery and composition

- Standard fixture-backed E2E tests use `teleferico-app/tests/e2e/**/*.spec.ts`. `playwright.config.ts` discovers them automatically except `maintenance.spec.ts` and the `production/**` subtree.
- Maintenance coverage must keep the exact filename `maintenance.spec.ts`; `playwright.maintenance.config.ts` selects that filename under a separate fixture-backed server configuration.
- Production-safe checks live under `tests/e2e/production/**/*.spec.ts` and are selected only by `playwright.production.config.ts` with `PUBLIC_E2E_BASE_URL`. They are not part of the fixture-backed suite.
- `pnpm run test:e2e:smoke` runs the standard fixture-backed config. `pnpm run test:e2e` composes that suite with `pnpm run test:e2e:maintenance`. Therefore, a new standard or maintenance spec integrates automatically when it follows the path and filename contracts above; production specs remain isolated.

## Local agent workflow

```bash
pnpm --dir teleferico-app run test:e2e:smoke
pnpm --dir teleferico-app run test:e2e:maintenance
pnpm --dir teleferico-app run test:e2e
```

Playwright starts or reuses local Next.js and test-only fixture servers. The fixture server is configured only through the test process and is never reachable from a production application. No pre-commit or pre-push hook runs E2E tests, and developers are not required to run these commands manually.

## GitHub Actions policy

- Relevant same-repository implementation pull requests targeting `development` dispatch the exact PR head SHA to Cloud Build with the server-derived `smoke` suite. The redundant GitHub-hosted fixture-backed smoke job was removed after parity acceptance.
- The dispatcher workflow on default `main` and the live WIF condition permit only same-repository `development` to `staging` promotion pull requests to dispatch the exact PR head SHA with the server-derived `full` suite. Unrelated heads targeting `staging` skip the privileged dispatcher. PR #273 proved this automatic path for exact head SHA `16fab46f3781088ea4b310d6bb4e265c170372a9`: GitHub dispatcher run [34409554758](https://github.com/TelefericoCerroOtto/TelefericoBariloche2024/actions/runs/34409554758) and Cloud Build `dcf5a6e9-b9b1-430d-a41e-cf98a9e84ade` succeeded with matching source revision and `COMMIT_SHA` and `_PLAYWRIGHT_SUITE=full`. The parallel GitHub `Playwright Chromium full` job and all governance checks passed before PR #273 merged to staging as `983c933f9b0a77ccdbb8472d0bcecd3bc425eb8e`.
- A successful GitHub `deployment_status` event for the `production` environment runs a read-only public smoke check only after a trusted workflow checks out `main` with full history, validates that the event SHA is a full commit SHA contained in `origin/main`, and then checks out that exact SHA. This prevents an arbitrary deployment event from selecting code for dependency installation or test execution. GitHub production `PRODUCTION_E2E_BASE_URL` must use the canonical production origin, `https://telefericobariloche.com.ar`. The Cloud Build deployment bridge emits success only after `gcloud run deploy` completes.
- No staging smoke job is triggered by deployment status. Promotion PRs are covered by the proven Cloud Build full-suite dispatcher; the GitHub-hosted full-suite parity job and the workflow's now-unused `pull_request` trigger were removed after acceptance.

The retained production workflow uses `pnpm install --frozen-lockfile` and the lockfile-backed `pnpm exec playwright` command. It never uses `npx` or `pnpm dlx`. Production smoke failures upload Playwright traces, screenshots, videos, and HTML reports.

GitHub GraphQL reported no `branchProtectionRules` before cutover, so no required status context was configured for replacement when the two parity jobs were removed.

## Cloud Build fixture executor

- `cloudbuild.playwright-e2e.json` is the versioned Cloud Build application-test executor for fixture-backed Chromium. Its pinned `alpine/git` image verifies Git is executable, rejects the all-zero SHA, verifies `COMMIT_SHA^{commit}`, and fails closed unless that commit exactly equals `HEAD^{commit}` before package execution.
- `_PLAYWRIGHT_SUITE` accepts exactly `smoke` or `full` and defaults safely to `smoke` for manual fallback. Revision validation rejects any other value before package execution. The browser container maps `smoke` to `pnpm run test:e2e:smoke` and `full` to `pnpm run test:e2e`.
- The executor uses the Node 22.23.2 Bookworm image pinned by immutable digest, Corepack with the repository's `pnpm@10.33.0`, `pnpm install --frozen-lockfile`, and the lockfile-backed Playwright CLI. Chromium and its required system dependencies are installed immediately before the selected fixture-backed suite in the same Cloud Build container because operating-system libraries do not persist across build-step containers.
- Each setup and test stage has its own timeout; the selected browser suite and readiness are each bounded to 900 seconds, real-auth acceptance is bounded to 1200 seconds, and the whole build is bounded to 3900 seconds (65 minutes). The dispatcher polls for at most 4200 seconds inside a 75-minute job. A command failure remains a Cloud Build failure and is visible in Cloud Build logs.
- Real-stack teardown is deterministic across both container and service boundaries. The outer harness accepts only bounded safe `BUILD_ID` input and maps it to an opaque 24-hex SHA-256 prefix used by both names and the ownership label; normalized aliases and equal long prefixes therefore cannot share a namespace, and the raw ID is not logged. It creates named PostgreSQL and runner containers, registers them only after Docker returns a valid container ID, verifies the exact ID, name, and build label before cleanup, then attempts bounded stop, force-remove, and absence verification in reverse creation order. Absence is accepted only for Docker's explicit not-found response; timeout, daemon, permission, and other inspection failures remain cleanup failures with bounded redacted evidence. It never enumerates or removes containers outside that namespace. The runner is intentionally named instead of relying on `--rm`, so its state and cleanup outcome remain observable, and only the runner uses Docker's minimal init/subreaper to reap orphaned descendants.
- `scripts/playwright-real-stack-lifecycle.js` owns service-process supervision inside the runner container. Strapi and Next.js run in separate process groups; cleanup sends `SIGTERM`, waits up to 5 seconds, escalates to `SIGKILL`, waits up to 5 more seconds, and reaps each leader. Before success it checks both process groups, both bounded HTTP probes, a bounded PostgreSQL TCP connection from the runner, and both process groups again; the outer harness then repeats `pg_isready`. PostgreSQL startup readiness uses one 55-second wall-clock deadline that caps every probe, state inspection, and sleep to the remaining budget; each initial HTTP readiness wait remains bounded to 90 seconds. The outer harness gives setup and runner execution only the first 720 seconds of the 900-second step, reserving the remaining 180 seconds for bounded diagnostics and teardown; individual Docker cleanup operations are capped at 8 seconds.
- The first command, readiness, or signal failure is the primary result. Actual outer command statuses are preserved. Cleanup failures are recorded separately with resource and operation names; they never replace an existing primary exit code. A successful primary run with any cleanup failure exits `1`. Signal handlers remain active throughout diagnostics, cleanup, and final evidence; the first `SIGINT` or `SIGTERM` identity is retained as exit `130` or `143` unless an earlier non-signal primary failure already governs. Repeated or cleanup-time signals do not reenter cleanup. Cloud Logging records explicit primary, cleanup, resource-state, and final result lines.
- Failure diagnostics are allowlisted and bounded: each Strapi, Next.js, runner, PostgreSQL, or PostgreSQL-readiness excerpt is at most 80 lines and 32 KiB. Diagnostics reject symlinks and non-regular service logs, redact the generated readiness secret plus credential-shaped values, and distinguish missing or not-created resources. No artifact bucket, arbitrary workspace collection, environment dump, database dump, or external diagnostic sink is used; `CLOUD_LOGGING_ONLY` remains the evidence channel.
- Historical native-trigger evidence is preserved: the fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707` (`a4b071a2-2e78-428c-9d6d-854487f888da`, check `101890859299`). Earlier real-stack pilots exposed the production GCS upload-provider, Next CLI delimiter, and synthetic image-input failures; the isolated runner now uses `NODE_ENV=test`, default local upload storage, and `BUILD_STRAPI_BUCKET_HOSTNAME=127.0.0.1` with `BUILD_STRAPI_BUCKET_PATHNAME=/uploads/**`.
- Cloud Build `92e24a70-69f1-48a3-ba0f-adbbd868b254` passed for commit `2f143badb095d9e6f141fd150c6348a4532e2884` (check `102114323463`), started `2026-09-08T15:01:02Z`, completed `2026-09-08T15:09:59Z`, duration `8m57s`. It proves isolated PostgreSQL, Strapi under `NODE_ENV=test` with local upload storage, and Next.js `/api/auth/providers` readiness. It predates real-auth activation and is not 3/3 acceptance evidence.
- Cloud Build `ca50eb99-440f-4b81-9372-82f6f8fa2ce8` at commit `50433ca000fb95c3dede9289caf81c222e0a8388` proved PostgreSQL, Strapi, Next.js, and final readiness, but cleanup failed because both service process groups remained observable after `SIGKILL` while Node ran as PID 1 without an init/subreaper. The runner `--init` correction has passed only focused stub/static verification and has not yet been exercised through real Docker or Cloud Build. Cloud Logging remains the only durable runtime evidence channel when that execution is authorized.
- The GitHub-to-Cloud-Build dispatcher is implemented on default `main` for trusted same-repository pull requests to `development` and the exact internal `development` to `staging` promotion route, with App/CMS/runtime and CI-contract path filters. It validates repository provenance and the lowercase full head SHA before OIDC, derives `smoke` or `full` only from trusted base/head refs, performs no PR-code checkout or application-test command in GitHub, invokes manual trigger `playwright-e2e-dispatch` (`3946c022-59cf-42cc-97cf-827c19f73291`) with the exact SHA and suite substitution, and propagates the terminal result.
- PR #268 proved this route at SHA `8a0185fa70ee0dedc53573f0f6dafbffd9a4199c`. GitHub run `34373237590` passed `validate-trusted-pr`, OIDC/WIF authentication, and `dispatch-and-wait` without a service-account key. Cloud Build `b29e46c1-10a4-4d28-bf2b-21b7d985b22d` passed all five steps with matching `COMMIT_SHA` and `REVISION_ID`; the GitHub-hosted Chromium smoke passed on the same SHA.
- Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same SHA and five steps, and its historical PR check reached success. Native trigger `playwright-e2e-pr` (`c2133674-afdc-46ae-87d0-afe06e605ca6`) remains disabled and retained for rollback; do not delete it during bootstrap. The manual exact-SHA trigger remains the fallback executor.
- Manual same-SHA bootstrap is complete. PR #269 merged into `development`; PR #270 used head SHA `317483acb566fbeb6077a0c10a8c70f721e1c2ca`, where GitHub full run `34399083297` and manual Cloud Build full build `b2639432-a76e-4c65-b2f3-5c6fd779afc6` passed. PR #270 then merged into `staging` as `d46a448d996d24a421b4d4a320cb6f3e84f58506`, and PR #271 merged into `main` as `465f1f02262a67c14a2a4c8fe0c0ed16fcdbbdd2`.
- The live WIF provider condition preserves repository ID `857375731`, owner ID `181292897`, event `pull_request_target`, and the trusted default-branch dispatcher workflow while allowing base `development` or the exact `development -> staging` route. PR #273 supplied the accepted automatic staging proof described above.
- After that acceptance, GitHub-hosted `chromium-smoke` and temporary `chromium-full` were removed; `production-public-smoke` remains unchanged. Deterministic real-stack teardown and bounded Cloud Logging diagnostics are now repository-defined. Exact-SHA real-auth 3/3 runtime evidence, production-smoke migration, and deletion of the disabled legacy trigger remain pending or out of scope under issue #261. This repository activation alone does not complete TB-122.
- GitHub cancellation does not cancel the remote build, which remains bounded by the 65-minute Cloud Build timeout.

### Teardown-slice repository rollback

The repository-only rollback boundary is the real-stack lifecycle implementation and its direct contracts: restore `scripts/run-playwright-real-stack-readiness.sh`, remove `scripts/playwright-real-stack-lifecycle.js` and `.github/scripts/playwright-real-stack-lifecycle.test.js`, restore the related assertions in `.github/scripts/playwright-e2e.test.js`, remove the two added dispatcher path entries in `.github/workflows/cloud-build-playwright-dispatch.yml`, and restore the teardown paragraphs in this document, `docs/INFRA.md`, and `docs/infra/cloud-build/{README.md,playwright-e2e-manual-dispatcher.md}`. This boundary describes repository files only; it does not authorize a commit, pull request, trigger change, build, deployment, or any GCP/IAM operation.

### Read-only configuration validation

```bash
node --test .github/scripts/playwright-e2e.test.js
```

This validates the repository-owned Cloud Build configuration without installing packages, submitting a build, or accessing GCP.

## Troubleshooting

- Inspect the uploaded `playwright-report` and `test-results` artifacts for failed CI jobs.
- The test-only Strapi fixture responds only to the CMS reads required by this smoke suite; add fixture data only for a new in-scope browser scenario.
- Do not replace the fixture with staging or production Strapi, and do not disable application security controls to make a browser test pass.
- The first Cloud Build pilots exposed Node, Corepack, Chromium dependency, production upload-provider, Next CLI, and image-input failures. The successful real-stack readiness build is `92e24a70-69f1-48a3-ba0f-adbbd868b254` for `2f143badb095d9e6f141fd150c6348a4532e2884` (check `102114323463`): it proves only isolated PostgreSQL, Strapi under `NODE_ENV=test` with local upload storage, and Next.js `/api/auth/providers` readiness. It does not prove users, roles, permissions, credentials login, protected reads/writes/denials, logout, JWT non-exposure, artifact upload, or GitHub Actions cutover; authenticated E2E behavior is separate future work.
