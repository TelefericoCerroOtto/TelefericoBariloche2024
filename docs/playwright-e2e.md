# Playwright E2E testing

## Test layers

- `teleferico-app` Vitest remains the fast unit, component, guard, and Route Handler layer.
- Playwright runs Chromium-only browser checks for locale routing and cookies, unauthenticated administration and login validation, maintenance rendering/navigation, and CMS proxy origin protection.
- Successful Gmail, reCAPTCHA, CV-storage, authenticated Strapi administration, and broad app-to-CMS success paths are intentionally excluded.

## Local agent workflow

```bash
pnpm --dir teleferico-app run test:e2e:smoke
pnpm --dir teleferico-app run test:e2e:maintenance
pnpm --dir teleferico-app run test:e2e
```

Playwright starts or reuses local Next.js and test-only fixture servers. The fixture server is configured only through the test process and is never reachable from a production application. No pre-commit or pre-push hook runs E2E tests, and developers are not required to run these commands manually.

## GitHub Actions policy

- Relevant implementation pull requests targeting `development` run the path-filtered Chromium smoke suite.
- `development` to `staging` promotion pull requests run the complete local Chromium suite, including maintenance mode.
- A successful GitHub `deployment_status` event for the `production` environment runs a read-only public smoke check only after a trusted workflow checks out `main` with full history, validates that the event SHA is a full commit SHA contained in `origin/main`, and then checks out that exact SHA. This prevents an arbitrary deployment event from selecting code for dependency installation or test execution. Set the GitHub `production` environment variable `PRODUCTION_E2E_BASE_URL` to `https://telefericobariloche.com.ar` and ensure the Cloud Build deployment bridge emits the success status only after `gcloud run deploy` completes.
- No staging smoke job is triggered by deployment status. Staging is covered by the complete local Chromium suite on the `development` to `staging` promotion pull request.

The workflow uses `pnpm install --frozen-lockfile` and the lockfile-backed `pnpm exec playwright` command. It never uses `npx` or `pnpm dlx`. Failed jobs upload Playwright traces, screenshots, videos, and HTML reports.

Repository administrators must mark the `Playwright Chromium smoke` and `Playwright Chromium full` checks as required for their respective `development` and `staging` branch protection rules.

## Cloud Build fixture baseline

- `cloudbuild.playwright-e2e.json` is the versioned Cloud Build application-test executor for the existing fixture-backed Chromium smoke suite. Its pinned `alpine/git` image verifies Git is executable, rejects the all-zero SHA, verifies `COMMIT_SHA^{commit}`, and fails closed unless that commit exactly equals `HEAD^{commit}` before package execution.
- The executor uses the Node 22.23.2 Bookworm image pinned by immutable digest, Corepack with the repository's `pnpm@10.33.0`, `pnpm install --frozen-lockfile`, and the lockfile-backed Playwright CLI. Chromium and its required system dependencies are installed immediately before the fixture-backed smoke suite in the same Cloud Build container because operating-system libraries do not persist across build-step containers.
- Each setup and test stage has its own timeout; the whole build is bounded to 2100 seconds (35 minutes). A command failure remains a Cloud Build failure and is visible in Cloud Build logs.
- The live `playwright-e2e-pr` Cloud Build trigger targets pull requests with base branch `development`. It uses `COMMENTS_ENABLED`, so an owner or collaborator must comment `/gcbrun` before execution. The fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707` (`a4b071a2-2e78-428c-9d6d-854487f888da`, check `101890859299`). Earlier real-stack pilots exposed the production GCS upload-provider, Next CLI delimiter, and synthetic image-input failures; the isolated runner now uses `NODE_ENV=test`, default local upload storage, and `BUILD_STRAPI_BUCKET_HOSTNAME=127.0.0.1` with `BUILD_STRAPI_BUCKET_PATHNAME=/uploads/**`.
- Cloud Build `92e24a70-69f1-48a3-ba0f-adbbd868b254` passed for commit `2f143badb095d9e6f141fd150c6348a4532e2884` (check `102114323463`), started `2026-09-08T15:01:02Z`, completed `2026-09-08T15:09:59Z`, duration `8m57s`. It proves isolated PostgreSQL, Strapi under `NODE_ENV=test` with local upload storage, and Next.js `/api/auth/providers` readiness. The same-SHA GitHub `Playwright Chromium smoke` check `102113652044` also passed. This remains unauthenticated, write-free, synthetic, and isolated on the `cloudbuild` Docker network; staging/production GCS, IAM, secrets, Cloud SQL, Cloud Run, staging, and production remain untouched. Authenticated E2E behavior is a separate future work unit.
- GitHub Actions remains intact during parity. The Cloud Build baseline does not replace or disable `.github/workflows/playwright-e2e.yml`.
- The provisioned GitHub-to-Cloud-Build dispatcher uses `pull_request_target` only for trusted same-repository pull requests to `development`, with App/CMS/runtime path filters. Its manual trigger is `playwright-e2e-dispatch` (`3946c022-59cf-42cc-97cf-827c19f73291`), which runs as `cloud-build-playwright-tests@teleferico-bariloche-2024.iam.gserviceaccount.com`; its separate OIDC/WIF invoker is `github-cloud-build-dispatcher@teleferico-bariloche-2024.iam.gserviceaccount.com`. It validates the base, repository, and lowercase full head SHA before OIDC, then runs the exact SHA and waits for the result. It performs no checkout or application-test command in GitHub.
- The WIF provider is constrained by repository and owner IDs, `pull_request_target`, base `development`, and `workflow_ref` for the dispatcher on `main`. No static credential or service-account key exists; credential policy forbids agents and humans from creating one. The manual trigger's successful exact-SHA pilot is recorded in [the dispatcher snapshot](infra/cloud-build/playwright-e2e-manual-dispatcher.md); the local workflow has not reached `main`, so GitHub OIDC/dispatcher behavior remains unproven.
- The native `playwright-e2e-pr` remains enabled and `/gcbrun`-manual because Cloud Build PR triggers do not support path filters. The dispatcher cannot activate until promoted to default branch `main`; after same-SHA parity is proven, disabling the native path requires separate explicit approval. GitHub cancellation does not cancel the remote build, which remains bounded by the 35-minute Cloud Build timeout.

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
