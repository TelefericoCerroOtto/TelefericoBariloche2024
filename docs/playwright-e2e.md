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
- The live `playwright-e2e-pr` Cloud Build trigger targets pull requests with base branch `development`. It uses `COMMENTS_ENABLED`, so an owner or collaborator must comment `/gcbrun` before execution. The first manually gated pilot for commit `30ef0f3` failed under Node 22.16.0. The second pilot (`aab57dcf-75ff-498a-89db-27c2a520e7af`) proved the Node 22.23.2 fix through Playwright config loading, but the smoke web server could not resolve bare `pnpm` in its final container. The third pilot (`f5b825c6-0ed6-436f-90d5-2101151d9787`) then failed at Chromium launch because `libglib-2.0.so.0` was installed in a separate build-step container. The fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707` (`a4b071a2-2e78-428c-9d6d-854487f888da`, check `101890859299`). The first real-stack readiness pilot (`93242141-7e58-4c2d-b6f6-7673cb5eb33b`) failed before readiness because `NODE_ENV=production` loaded the production GCS upload provider without `GCS_BUCKET_NAME`. The runner now uses `NODE_ENV=test` before the CMS build and start, intentionally retaining Strapi's default local upload storage while leaving staging and production GCS configuration untouched. Its rerun is pending. The digest-pinned Docker builder still starts only isolated PostgreSQL and Node containers on `cloudbuild`, without users, permissions, writes, browser scenarios, application secrets, or IAM redesign. Source-upload builds without Git metadata intentionally fail closed. Failure-artifact storage still requires a separately approved bucket and access policy.
- GitHub Actions remains intact during parity. The Cloud Build baseline does not replace or disable `.github/workflows/playwright-e2e.yml`.

### Read-only configuration validation

```bash
node --test .github/scripts/playwright-e2e.test.js
```

This validates the repository-owned Cloud Build configuration without installing packages, submitting a build, or accessing GCP.

## Troubleshooting

- Inspect the uploaded `playwright-report` and `test-results` artifacts for failed CI jobs.
- The test-only Strapi fixture responds only to the CMS reads required by this smoke suite; add fixture data only for a new in-scope browser scenario.
- Do not replace the fixture with staging or production Strapi, and do not disable application security controls to make a browser test pass.
- The first Cloud Build pilot failed before browser tests on Node 22.16.0 because Playwright 1.61.0 encountered `context.conditions?.includes is not a function` during TypeScript config loading. The second pilot confirmed the Node 22.23.2 fix by loading the config, then failed because Corepack shims do not persist across Cloud Build containers and the Playwright web server invoked bare `pnpm`. The third pilot (`f5b825c6-0ed6-436f-90d5-2101151d9787`) enabled Corepack in every Node step but failed when Chromium could not load `libglib-2.0.so.0`: Playwright browser/system dependencies were installed in a different Cloud Build container. Chromium installation now precedes the smoke suite in that suite's container, and the fourth fixture pilot passed. The first real-stack readiness pilot (`93242141-7e58-4c2d-b6f6-7673cb5eb33b`) failed because production mode loaded the GCS upload provider without its required bucket. The isolated correction selects `NODE_ENV=test`, so the CMS uses default local upload storage instead of accessing staging or production GCS; rerun evidence is pending.
