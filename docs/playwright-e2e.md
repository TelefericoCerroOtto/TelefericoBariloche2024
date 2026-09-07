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
- The executor uses the Node 22.16.0 Bookworm image pinned by immutable digest, Corepack with the repository's `pnpm@10.33.0`, `pnpm install --frozen-lockfile`, and the lockfile-backed Playwright CLI to install only Chromium with its required system dependencies.
- Each setup and test stage has its own timeout; the whole build is bounded to 20 minutes. A command failure remains a Cloud Build failure and is visible in Cloud Build logs.
- The live `playwright-e2e-pr` Cloud Build trigger targets pull requests with base branch `development`. It uses `COMMENTS_ENABLED`, so an owner or collaborator must comment `/gcbrun` before execution. No build has run and no check outcome is proven. The manual pilot must verify exact-SHA execution, `.git` metadata, logs, and check behavior; source-upload builds without Git metadata intentionally fail closed. Failure-artifact storage still requires a separately approved bucket and access policy; this baseline has no application secrets or IAM redesign.
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
