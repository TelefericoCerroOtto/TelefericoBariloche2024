# Playwright E2E testing

## Test layers

- `teleferico-app` Vitest remains the fast unit, component, guard, and Route Handler layer. `pnpm run test` discovers only `src/**/*.{test,spec}.{ts,tsx}`, as configured in `teleferico-app/vitest.config.ts`; tests outside `src` and JavaScript or JSX test files do not join automatically.
- Playwright runs Chromium-only browser checks for locale routing and cookies, unauthenticated administration and login validation, maintenance rendering/navigation, and CMS proxy origin protection.
- Successful Gmail, reCAPTCHA, CV-storage, authenticated Strapi administration, and broad app-to-CMS success paths are intentionally excluded.

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

- Relevant same-repository implementation pull requests targeting `development` dispatch the exact PR head SHA to Cloud Build with the server-derived `smoke` suite. GitHub still runs the Chromium smoke suite for temporary parity.
- Once the dispatcher workflow reaches the default `main` branch, only same-repository `development` to `staging` promotion pull requests can dispatch the exact PR head SHA with the server-derived `full` suite. Unrelated heads targeting `staging` skip the privileged dispatcher. The retained GitHub `chromium-full` parity job already checks out that same PR head SHA with persisted credentials disabled and runs the complete local Chromium suite, including maintenance mode.
- A successful GitHub `deployment_status` event for the `production` environment runs a read-only public smoke check only after a trusted workflow checks out `main` with full history, validates that the event SHA is a full commit SHA contained in `origin/main`, and then checks out that exact SHA. This prevents an arbitrary deployment event from selecting code for dependency installation or test execution. During the 2026-09-09 domain incident, GitHub `PRODUCTION_E2E_BASE_URL` uses the temporary Cloud Run origin documented in [INFRA.md](INFRA.md#101-temporary-production-origin-recovery); restore the public domain only through that recovery procedure. The Cloud Build deployment bridge emits success only after `gcloud run deploy` completes.
- No staging smoke job is triggered by deployment status. The promotion PR is covered by GitHub `chromium-full`; Cloud Build full-suite coverage follows the bootstrap and automatic-dispatch sequence below.

The workflow uses `pnpm install --frozen-lockfile` and the lockfile-backed `pnpm exec playwright` command. It never uses `npx` or `pnpm dlx`. Failed jobs upload Playwright traces, screenshots, videos, and HTML reports.

Repository administrators must mark the `Playwright Chromium smoke` and `Playwright Chromium full` checks as required for their respective `development` and `staging` branch protection rules.

## Cloud Build fixture executor

- `cloudbuild.playwright-e2e.json` is the versioned Cloud Build application-test executor for fixture-backed Chromium. Its pinned `alpine/git` image verifies Git is executable, rejects the all-zero SHA, verifies `COMMIT_SHA^{commit}`, and fails closed unless that commit exactly equals `HEAD^{commit}` before package execution.
- `_PLAYWRIGHT_SUITE` accepts exactly `smoke` or `full` and defaults safely to `smoke` for manual fallback. Revision validation rejects any other value before package execution. The browser container maps `smoke` to `pnpm run test:e2e:smoke` and `full` to `pnpm run test:e2e`.
- The executor uses the Node 22.23.2 Bookworm image pinned by immutable digest, Corepack with the repository's `pnpm@10.33.0`, `pnpm install --frozen-lockfile`, and the lockfile-backed Playwright CLI. Chromium and its required system dependencies are installed immediately before the selected fixture-backed suite in the same Cloud Build container because operating-system libraries do not persist across build-step containers.
- Each setup and test stage has its own timeout; the selected browser suite is bounded to 900 seconds and the whole build to 2700 seconds (45 minutes). A command failure remains a Cloud Build failure and is visible in Cloud Build logs.
- Historical native-trigger evidence is preserved: the fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707` (`a4b071a2-2e78-428c-9d6d-854487f888da`, check `101890859299`). Earlier real-stack pilots exposed the production GCS upload-provider, Next CLI delimiter, and synthetic image-input failures; the isolated runner now uses `NODE_ENV=test`, default local upload storage, and `BUILD_STRAPI_BUCKET_HOSTNAME=127.0.0.1` with `BUILD_STRAPI_BUCKET_PATHNAME=/uploads/**`.
- Cloud Build `92e24a70-69f1-48a3-ba0f-adbbd868b254` passed for commit `2f143badb095d9e6f141fd150c6348a4532e2884` (check `102114323463`), started `2026-09-08T15:01:02Z`, completed `2026-09-08T15:09:59Z`, duration `8m57s`. It proves isolated PostgreSQL, Strapi under `NODE_ENV=test` with local upload storage, and Next.js `/api/auth/providers` readiness. The same-SHA GitHub `Playwright Chromium smoke` check `102113652044` also passed. This remains unauthenticated, write-free, synthetic, and isolated on the `cloudbuild` Docker network; staging/production GCS, IAM, secrets, Cloud SQL, Cloud Run, staging, and production remain untouched. Authenticated E2E behavior is a separate future work unit.
- The GitHub-to-Cloud-Build dispatcher is implemented for trusted same-repository pull requests to `development` and the exact internal `development` to `staging` promotion route, with App/CMS/runtime and CI-contract path filters. It validates repository provenance and the lowercase full head SHA before OIDC, derives `smoke` or `full` only from trusted base/head refs, performs no PR-code checkout or application-test command in GitHub, invokes manual trigger `playwright-e2e-dispatch` (`3946c022-59cf-42cc-97cf-827c19f73291`) with the exact SHA and suite substitution, and propagates the terminal result. Because `pull_request_target` uses workflow code from the default branch, the staging route is not active until this workflow reaches `main`.
- PR #268 proved this route at SHA `8a0185fa70ee0dedc53573f0f6dafbffd9a4199c`. GitHub run `34373237590` passed `validate-trusted-pr`, OIDC/WIF authentication, and `dispatch-and-wait` without a service-account key. Cloud Build `b29e46c1-10a4-4d28-bf2b-21b7d985b22d` passed all five steps with matching `COMMIT_SHA` and `REVISION_ID`; the GitHub-hosted Chromium smoke passed on the same SHA.
- Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same SHA and five steps, and its historical PR check reached success. Native trigger `playwright-e2e-pr` (`c2133674-afdc-46ae-87d0-afe06e605ca6`) remains disabled and retained for rollback; do not delete it during bootstrap. The manual exact-SHA trigger remains the fallback executor.
- Secure bootstrap: merge PR #269 to `development` only after review. On the first `development` to `staging` promotion, require GitHub `chromium-full` to pass on the exact promotion head SHA. With explicit operational approval, invoke the existing regional manual trigger on that same SHA with `_PLAYWRIGHT_SUITE=full` and record the result as initial full-suite parity. This manual run does not prove automatic GitHub OIDC staging dispatch. Continue the ordinary promotion through `staging` and then `main`.
- Only after the dispatcher workflow reaches default `main` and an approved operator separately expands the Workload Identity Provider condition to allow `assertion.base_ref == 'development' || (assertion.base_ref == 'staging' && assertion.head_ref == 'development')`, while preserving the repository ID, owner ID, `pull_request_target`, and trusted `workflow_ref` restrictions, can a later `development` to `staging` promotion prove automatic GitHub OIDC full-suite dispatch. PR #269 checks prove only the existing development smoke route. No automatic full-suite parity evidence exists yet.
- Production-smoke migration, authenticated E2E, diagnostic artifacts, redundant GitHub job removal, Vitest migration, deployments, and deletion of the disabled legacy trigger remain out of scope under issue #261.
- GitHub cancellation does not cancel the remote build, which remains bounded by the 45-minute Cloud Build timeout.

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
