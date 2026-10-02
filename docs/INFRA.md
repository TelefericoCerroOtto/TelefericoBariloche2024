# Teleférico Bariloche 2024 — Infrastructure

- **Date:** 2026-05-04
- **Scope:** staging + production

---

## 1) Purpose

This document summarizes the architecture, environments, and main operational rules of the platform.

It does not attempt to replace GCP or deployment manifests; it only provides the essential information needed to understand how the infrastructure is set up.

---

## 2) Overview

The platform has four main components:

- **Global External HTTPS Load Balancer**:
  - configured in `teleferico-bariloche-2024` to publish the production app with a fixed IP and managed certificate.
- **Cloud Run**:
  - **teleferico-app**: Next.js frontend with institutional site and administrative dashboard.
  - **teleferico-cms**: CMS/API in Strapi.
- **Cloud SQL (PostgreSQL)**: structured CMS data.
- **Cloud Storage**: Strapi uploads/binaries.

Additionally:

- **Cloud Build** builds and deploys.
- **Artifact Registry** stores images.
- **Secret Manager** centralizes secrets.
- External integrations: **reCAPTCHA** and **Gmail OAuth 2.0**.

---

## 3) Environments

Staging and production are separated in:

- Cloud Run services
- database
- upload buckets
- secrets
- deploy pipelines

### 3.1 Quick matrix

| Component     | Staging                  | Production                           |
| ------------- | ------------------------ | ------------------------------------ |
| Next.js       | `app-staging-teleferico` | `app-production-teleferico`          |
| Strapi        | `cms-staging-teleferico` | `cms-production-teleferico`          |
| Region        | `southamerica-east1`     | `southamerica-east1`                 |
| Database      | Cloud SQL via connector  | Cloud SQL via private IP/VPC (zonal) |
| Upload bucket | `cms_staging_bucket`     | `cms_production_bucket`              |

---

## 4) Services

### 4.1 teleferico-app (Next.js)

- **Role:** institutional site + administrative area.
- **Exposure:** public on Cloud Run.
- **Access to Strapi:** always server-side.
- **Build:** uses buildpacks.

#### Traffic pattern to Strapi

- The institutional section mainly consumes content reads.
- Requests to Strapi must not be executed from client components.
- Administrative operations are performed from the server and depend on user session/permissions.
- Dashboard writes must be restricted by the permissions defined for the corresponding role.

#### Staging environment

- `1 vCPU`
- `1 GiB`
- concurrency `20`
- min instances `0`
- max instances `2`
- CMS base URL for staging
- staging bucket/path for assets

#### Production environment

- `2 vCPU`
- `2 GiB`
- concurrency `30`
- min instances `1`
- max instances `10`
- CMS base URL for production
- production bucket/path for assets

#### Relevant variables and secrets

- Base URLs
- extra public origin allowlist for preview/cutover (`ALLOWED_PUBLIC_ORIGINS`)
  - **Technical note:** In the production deployment via Cloud Build, `--env-vars-file` is used instead of `--set-env-vars` to prevent the comma syntax (used to separate multiple origins) from being misinterpreted by the `gcloud` CLI.
- form protection flags by environment:
  - `FORM_PROTECTION_REDIS_URL`, `FORM_PROTECTION_REDIS_NAMESPACE`, `FORM_PROTECTION_REDIS_CONNECT_TIMEOUT_MS`
  - `CONTACT_RATE_LIMIT_ENABLED`, `CONTACT_RATE_LIMIT_MAX`, `CONTACT_RATE_LIMIT_WINDOW_MS`
  - `CONTACT_EMAIL_LIMIT_MAX`, `CONTACT_EMAIL_LIMIT_WINDOW_MS`
  - `POSTULATION_RATE_LIMIT_ENABLED`, `POSTULATION_RATE_LIMIT_MAX`, `POSTULATION_RATE_LIMIT_WINDOW_MS`
  - `POSTULATION_EMAIL_LIMIT_MAX`, `POSTULATION_EMAIL_LIMIT_WINDOW_MS`
  - current safe operational default: shared Redis for IP + Strapi collection for email rules
  - expected origin of `FORM_PROTECTION_REDIS_URL`:
    - local: `redis://127.0.0.1:6379` from a local Redis container; do not use managed Memorystore
    - staging: Secret Manager `APP__STAGING__FORM_PROTECTION_REDIS_URL`
    - production: Secret Manager `APP__PRODUCTION__FORM_PROTECTION_REDIS_URL`
- reCAPTCHA
- build flags
- internal tokens to talk to Strapi
- Auth.js and Google OAuth secrets

#### Policy for application-generated secrets

Applies to secrets defined by us and not issued by external services, for example:

- `AUTH_SECRET`
- `INTERNAL_API_KEY`
- `CSRF_STATE_SECRET`
- `INIT_TOKEN`

Rules:

- They must not be created manually or use memorable text.
- They must be generated with a cryptographically secure generator.
- They must have at least `32 bytes` of real entropy.
- Recommended formats:
  - `hex` of `64` characters
  - `base64url` of `43` or more characters
- They must be stored only in Secret Manager.

Notes:

- Do not use human password rules like "one uppercase, one number, and one symbol"; for system secrets, entropy matters, not appearance.
- If symbols are used, validate beforehand that they don't complicate shell, YAML, URLs, or copy/paste. For operability, prefer `hex` or `base64url`.

---

### 4.2 teleferico-cms (Strapi)

- **Role:** CMS + content API.
- **Exposure:** public on Cloud Run; real security is in Strapi auth/permissions.
- **Persistence:** PostgreSQL + Cloud Storage.
- **Build:** Docker image.

#### Staging environment

- `1 vCPU`
- `1 GiB`
- concurrency `20`
- min instances `0`
- max instances `2`
- connection to Cloud SQL via `INSTANCE_CONNECTION_NAME`
- `DATABASE_HOST=/cloudsql/...`
- bucket `cms_staging_bucket`
- `GCS_BASE_PATH=public/cms`
- `GCS_BASE_URL=https://storage.googleapis.com/cms_staging_bucket`
- `GCS_PUBLIC_FILES=false`
- `GCS_UNIFORM=true`

#### Production environment

- `2 vCPU`
- `2 GiB`
- concurrency `40`
- min instances `1`
- max instances `4`
- connection to PostgreSQL via **private IP** + VPC
- `DATABASE_SSL=true`
- bucket `cms_production_bucket`
- `GCS_BASE_PATH=public/cms`
- `GCS_BASE_URL=https://storage.googleapis.com/cms_production_bucket`
- `GCS_PUBLIC_FILES=false`
- `GCS_UNIFORM=true`

#### Relevant secrets

- database credentials
- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`

### TB-113 private worker (proposed inline-trigger snapshot)

[`docs/infra/cloud-build/worker-staging.yaml`](infra/cloud-build/worker-staging.yaml) is the sole proposed worker staging configuration snapshot. GCP's inline trigger configuration is the operational source of truth; this YAML is documentary only and is intended for an approved operator to copy/configure inline, not as a repository-sourced build file. Its first Node step uses the verified Linux/amd64 Node 22.22.0 image digest, checks pnpm 10.33.0, installs the frozen worker package graph, explicitly installs Chromium through Playwright 1.61.0 (revision 1228) and its Linux dependencies, installs the DejaVu font package, and runs the existing build script to verify the pinned Chromium, headless-shell, and font SHA-256 digests. Pinned Linux/amd64 Docker and Cloud SDK builders then build/push the image and describe a private staging deploy from that same `/workspace` checkout. Generated `dist/` is not tracked in Git and must not be expected in a direct Docker build context.

The snapshot does not create or configure a trigger, nor establish a live image/service. Artifact Registry and runtime inputs remain operator-configured substitutions in the inline trigger. The Node base and Docker/Cloud SDK builder digests are verified against public Docker Hub/GCR metadata. Debian runtime and preparation packages still resolve from their repositories at build time; the image is not promised to be byte-for-byte reproducible.

Worker secret ownership is separate from build inputs. `FEEDBACK_WORKER_CMS_TOKEN` contains secret bytes and must be mounted from Secret Manager by Cloud Run at runtime; it must never enter Cloud Build `secretEnv`, substitutions, files, logs, or image layers. `FEEDBACK_WORKER_EVIDENCE_KEY` is a nonsecret pinned Secret Manager version resource name; the worker runtime identity fetches its bytes at request time. The approved Strapi origin, exact worker URL/audience, task-invoker identity, private bucket, service/region/image name, and resource sizing are nonsecret environment-specific deployment inputs. The task-invoker email and OIDC principal must match, while the Cloud Run worker runtime identity remains separate. `FEEDBACK_VERTEX_PROJECT_ID` is fixed by the runtime contract to `teleferico-bariloche-2024`. The production worker does not require `FEEDBACK_TASK_QUEUE_PATH`; queue dispatch belongs to the app.

The proposed deploy first asserts that Cloud Build's built-in `$PROJECT_NUMBER` is `384535443802`, then derives `FEEDBACK_WORKER_URL` from `feedback-worker-staging` and `southamerica-east1`, following [Cloud Run's deterministic URL format](https://docs.cloud.google.com/run/docs/triggering/https-request). `384535443802` comes from the prior documentary `docs/infra/cloud-build/app-staging.yaml` snapshot (lines 176–177); it is not a fresh GCP audit. The shared validator accepts only this project number with the exact staging/production service-name pattern and region for deterministic URLs, while retaining hash-based `.a.run.app` URLs. HTTPS, the exact execute path, and audience/origin equality remain enforced. The build step checks the hostname label length and fails before package/image build if Cloud Build's actual project number differs. No project number is read from credentials and no GCP query or live operation is part of this change.

The proposed Cloud Run configuration uses internal ingress, private IAM invocation, CPU throttling, `1 vCPU`/`2 GiB`, concurrency `1`, min `0`/max `1`, and an 1800-second request timeout compatible with the bounded Cloud Tasks task deadline. These are unmeasured staging assumptions, not deployed settings. Keep app `FEEDBACK_CAPABILITY_ENABLED=false`.

Before configuring the inline staging-merge trigger from the snapshot, an operator must configure the Artifact Registry repository/location, allowed Strapi URL/origin, separate worker runtime and Cloud Tasks invoker service accounts, pinned worker CMS token `SECRET_NAME:VERSION` reference, pinned evidence-key version resource, private bucket, and app-owned Cloud Tasks queue. The Cloud Build identity needs image-push, Cloud Run deploy, and worker-service-account act-as permissions, but no secret access. The Cloud Tasks invoker needs `roles/run.invoker`; the worker runtime needs only reviewed CMS, Vertex, private-bucket, and Secret Manager access. Verify the app-owned queue uses the same invoker identity and 1800-second dispatch deadline. `FEEDBACK_WORKER_CMS_TOKEN` secret bytes are mounted only at Cloud Run runtime; its pinned reference is a nonsecret deploy input. No app/CMS trigger or live resource was changed; the bounded read-only observations below do not establish full readiness.

On 2026-10-02, approved read-only regional inventory found no worker Cloud Build trigger or Cloud Run service. A separate bounded projection of the four live app/CMS triggers found `BUILD_STRAPI_BASE_URL` in both app build definitions but no `FEEDBACK_*` names; the two CMS trigger builds showed no `FEEDBACK_*` names. The four live app/CMS Cloud Run services each reported a configured runtime identity; the two app services exposed `BUILD_STRAPI_BASE_URL` among the filtered runtime variable names, while none of the four exposed `FEEDBACK_*` names. The identity values, IAM grants, secret references and variable values were not read. This projection did not inspect the triggers' nested substitution dictionaries, so it does not establish which substitutions are configured. The absent app flag keeps the feedback capability disabled under its exact-`true` guard. Repository YAML snapshots are not live configuration; no GCP change was made. App/CMS wiring and CMS shared-package image packaging remain pending before report-capable rollout.

The same region's names-only Cloud Tasks queue list returned no rows; this does not inspect queue policy or other regions. Artifact Registry listed `cloud-run-source-deploy` and `gae-standard` as existing regional repositories; whether either is the approved worker image destination and whether the build identity can push there remain unverified. These are read-only inventories, not resource provisioning or permission evidence.

The CMS image has a proposed monorepo-root build context to supply the runtime import from `packages/tb113-runtime-contracts` without including unrelated root packages. Build with `docker build -f teleferico-cms/Dockerfile .`; `teleferico-cms/Dockerfile.dockerignore` limits the context to the CMS package and that shared package, while excluding credential-like files and generated or uploaded content. The Dockerfile keeps the CMS working directory at `/workspace/teleferico-cms` and copies the shared package to `/workspace/packages/tb113-runtime-contracts`, preserving the existing relative import. The staging and production YAML files remain snapshots of their older CMS-only contexts. They do not change live triggers; a separate operator change is required before either trigger can build this image. This packaging correction does not enable the feedback feature.

---

## 5) Data and storage

### PostgreSQL / Cloud SQL

- Staging and production use separate instances.
- Production uses Cloud SQL PostgreSQL via private IP/VPC with sizing `db-custom-2-8192` and availability `ZONAL`.
- Production has backups and recovery enabled from GCP.
- Staging should not be assumed as an environment with the same recovery guarantees as production.
- Fine details of retention, windows, and restoration are consulted in the GCP console.

### Cloud Storage / uploads

- Each environment uses its own bucket.
- Strapi stores public assets in `public/cms/`.
- The job application form stores private CVs in `private/job-applications/` via the Next.js server.
- The local Strapi Media Library flow continues to use `teleferico-cms/public/uploads` and does not depend on `CV_STORAGE_DRIVER`.
- Reading CMS images goes through the Next.js proxy at `teleferico-app/src/app/api/media/[...path]/route.ts`. The proxy reads from GCS using the server-side service account credentials (ADC) and streams the response. Direct public access (`allUsers`) on `public/cms/` is not granted; the proxy is the only public-facing access point for CMS assets.
- The Strapi admin panel displays images via signed GCS URLs. Strapi generates them server-side on each API response (`GCS_PUBLIC_FILES=false`). The admin browser never receives a raw private GCS URL.
- CV downloads must go through an authenticated endpoint.
- `GCS_SIGNED_URL_TTL_SECONDS` is reserved for the optional `getDownloadUrl()` helper in `teleferico-app/src/lib/services/cv-storage`; the current flow uses direct streaming and does not depend on signed URLs.
- Old records with `resume` media relation require manual migration: copy/move the binary, populate `cv*`, and remove the old relation.
- Production has a backup bucket that copies binaries through "Cross-region bucket replication".
- **Public Access Prevention**: `allUsers` is not granted on any path. The bucket can be evaluated for enforced public access prevention once identity separation between `teleferico-app` and `teleferico-cms` service accounts is complete.

---

## 6) Deployment

### General pattern

1. Build.
2. Push to Artifact Registry.
3. Deploy to Cloud Run.

### GitHub repository ownership and access

- The repository is owned by a standard GitHub user account associated with the company's development mailbox; it is not owned by a GitHub Organization.
- Day-to-day maintenance is performed by the maintainer's personal GitHub account, which has repository collaborator access.
- Local Git operations authenticate over SSH as that personal GitHub account. SSH key management is external to this repository.
- Corporate account identity, recovery information, and access-continuity records are maintained in the restricted Notion "Mapa de activos digitales".
- This intentional arrangement fits the company's current single-maintainer operating model. Reassess it if team size or governance needs grow.

### Pipelines

There are six provisioned Cloud Build triggers, all regional in `southamerica-east1` and connected to the project's GitHub repository:

- app staging
- app production
- cms staging
- cms production
- `playwright-e2e-pr` — disabled legacy `/gcbrun` pull-request trigger retained temporarily for reversible rollback.
- `playwright-e2e-dispatch` — manual exact-SHA fixture executor (`3946c022-59cf-42cc-97cf-827c19f73291`) used by the active GitHub OIDC dispatcher and retained as the fallback executor.

There may also be legacy triggers paused in the console. They are purposefully kept disabled and are not part of the operational flow.

Documentary snapshots of their configurations are versioned in [infra/cloud-build/README.md](infra/cloud-build/README.md).

### Bounded TB-113 feedback test toggle

While TB-113 feedback remains incomplete, every app staging and production Cloud Build deployment explicitly sets the runtime-only `FEEDBACK_CAPABILITY_ENABLED=false`. A deployment therefore closes the feature and resets any prior manual test window. Enabling the flag does not complete the feature or change the deployment default; changing that default requires a separate approved change after feature completion.

A reviewed operator may temporarily enable or disable only this flag on the app service for a bounded test window. Each operation creates a new Cloud Run revision outside the normal PR-to-deploy path, so it requires explicit confirmation for the exact command, environment, and value before execution. No other environment variable, secret, image, service, or deployment setting is covered by this exception.

```bash
gcloud run services update app-staging-teleferico \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars FEEDBACK_CAPABILITY_ENABLED=<true|false>

gcloud run services update app-production-teleferico \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars FEEDBACK_CAPABILITY_ENABLED=<true|false>
```

Production is high risk because enabling exposes the public QR feedback surface and the authenticated administration feature to production users; staging is medium risk and still changes a live service. After the test, execute the same approved command with `false`. Rollback is another revision setting the flag to `false`; the next Cloud Build deployment also resets it to `false`. This exception does not authorize arbitrary direct deployments, other environment changes, secret access, or changing either trigger's default.

### Application-test executor baseline

`cloudbuild.playwright-e2e.json` is the repository-owned pre-merge executor. The active GitHub dispatcher submits the exact PR SHA through `playwright-e2e-dispatch`; the disabled legacy `playwright-e2e-pr` trigger references the same file and receives the safe default `smoke` suite. Every accepted legacy profile runs fixture-backed Playwright, independent real-stack readiness, and blocking real-auth acceptance. It does not deploy an application.

- Its immutable `alpine/git` image verifies Git is executable, rejects the all-zero SHA, verifies that `COMMIT_SHA^{commit}` resolves in `/workspace`, and fails closed unless it equals `HEAD^{commit}`. `_PLAYWRIGHT_SUITE` accepts only `smoke` or `full`, defaults to `smoke`, and maps to `pnpm run test:e2e:smoke` or `pnpm run test:e2e`. Later steps use the immutable Node 22.23.2 Bookworm image, Corepack, the repository-pinned `pnpm@10.33.0`, `pnpm install --frozen-lockfile`, and the lockfile-backed Playwright CLI. Chromium and its operating-system dependencies are installed immediately before the selected suite in the same container because build-step operating-system libraries are not shared.
- The build is bounded to 65 minutes and has separate revision, package-manager, dependency, fixture-browser, Docker-CLI staging, real-stack readiness, and real-auth acceptance steps. Readiness is bounded to 900 seconds. Real-auth is bounded to 1200 seconds and reserves its final 180 seconds for diagnostics and teardown. The dispatcher polls for 4200 seconds within a 75-minute job. Failures remain in Cloud Build logs without suppression.
- Real-auth acceptance is fail-closed. The inner lifecycle records a bounded internal signal only after Playwright exits successfully, its structured report proves exactly three discovered non-skipped passing scenarios, synthetic state is verified and restored, and service cleanup succeeds. The outer finalizer emits `TB122 real-auth acceptance=scenarios:3/3` only after it validates that signal, repeats final PostgreSQL readiness, removes the owned runner and PostgreSQL containers, proves their absence, removes diagnostics, and selects exit `0`. Merge evidence requires that marker and terminal Cloud Build success for the exact PR SHA. This activation alone is not runtime proof.
- Real-stack resources are registered only after successful creation and are scoped by an opaque 24-hex SHA-256 prefix derived from the validated raw `BUILD_ID`, plus exact container ID, exact name, and ownership label. The digest prevents normalized or truncated aliases from sharing ownership while keeping the raw ID out of logs. The named runner and PostgreSQL containers are stopped, force-removed, and checked for absence with bounded Docker operations in reverse creation order. Only the runner uses Docker's minimal init/subreaper to reap orphaned descendants; PostgreSQL creation remains unchanged. Only Docker's explicit not-found response proves absence; timeout, daemon, permission, or other inspection failures are recorded as cleanup failures with bounded redacted evidence. Cleanup continues after individual failures, and no name search or cross-build cleanup is allowed.
- Service descendants are supervised as process groups inside the runner. Teardown uses a 5-second `SIGTERM` grace period, then `SIGKILL`, a second 5-second bound, and leader reaping. Before success, the runner verifies both process groups, Strapi `/admin/init`, Next.js `/api/auth/providers`, bounded PostgreSQL TCP reachability, and both process groups again; the outer harness then repeats `pg_isready`. PostgreSQL startup readiness uses one 55-second wall-clock deadline that caps each probe, state inspection, and sleep to its remaining budget, while each initial HTTP readiness wait is bounded to 90 seconds and fails fast if its process exits.
- Cloud Logging evidence distinguishes the primary result, every cleanup result, resource state, and final exit. Actual outer command statuses are retained. Primary success plus cleanup failure exits `1`; an existing primary command/readiness failure keeps its code. Signal handlers remain installed through diagnostics, exhaustive cleanup, and final evidence; the first `SIGINT`/`SIGTERM` remains `130`/`143` unless an earlier non-signal primary failure governs, and later signals do not reenter cleanup. Diagnostic excerpts are restricted to fixed service/container sources, at most 80 lines and 32 KiB each, with credential-shaped values and the generated readiness secret redacted. No diagnostic artifacts, external sink, environment dump, database dump, or arbitrary workspace collection is configured.
- Historical native-trigger evidence is preserved: the fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707` (`a4b071a2-2e78-428c-9d6d-854487f888da`, check `101890859299`). Earlier real-stack pilots exposed production upload-provider, Next CLI, and synthetic image-input failures; the runner now selects `NODE_ENV=test`, default local upload storage, `BUILD_STRAPI_BUCKET_HOSTNAME=127.0.0.1`, and `BUILD_STRAPI_BUCKET_PATHNAME=/uploads/**`.
- Cloud Build `92e24a70-69f1-48a3-ba0f-adbbd868b254` passed for commit `2f143badb095d9e6f141fd150c6348a4532e2884` (check `102114323463`), started `2026-09-08T15:01:02Z`, completed `2026-09-08T15:09:59Z`, duration `8m57s`. It proves isolated PostgreSQL, Strapi under `NODE_ENV=test` with local upload storage, and Next.js `/api/auth/providers` readiness. The runner stays unauthenticated, write-free, synthetic, and isolated on the `cloudbuild` Docker network; it does not prove users, roles, permissions, credentials login, protected reads/writes/denials, logout, JWT non-exposure, artifact upload, or GitHub Actions cutover. Staging/production GCS, IAM, secrets, Cloud SQL, Cloud Run, staging, and production remain untouched. Authenticated E2E behavior is a separate future work unit.
- Cloud Build `ca50eb99-440f-4b81-9372-82f6f8fa2ce8` at commit `50433ca000fb95c3dede9289caf81c222e0a8388` proved PostgreSQL, Strapi, Next.js, and final readiness, but cleanup failed because both service process groups remained observable after `SIGKILL` while Node ran as PID 1 without an init/subreaper. The runner `--init` correction has passed focused stub/static verification only and has not yet run through real Docker or Cloud Build. Cloud Logging remains the sole durable runtime evidence channel when such execution is authorized.
- Historical same-SHA GitHub `Playwright Chromium smoke` check `102113652044` passed during parity. Cloud Build now owns fixture-backed application testing; repository-governance workflows remain unchanged.
- PR #268 proved the active GitHub route at SHA `8a0185fa70ee0dedc53573f0f6dafbffd9a4199c`. GitHub run `34373237590` passed `validate-trusted-pr`, OIDC/WIF authentication, and `dispatch-and-wait` without a service-account key. Trigger `playwright-e2e-dispatch` launched Cloud Build `b29e46c1-10a4-4d28-bf2b-21b7d985b22d`; all five steps passed and both `COMMIT_SHA` and `REVISION_ID` matched the PR SHA. The GitHub-hosted Chromium smoke also passed on that SHA.
- Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same five steps on the same SHA, and its historical PR check reached success. Trigger `playwright-e2e-pr` (`c2133674-afdc-46ae-87d0-afe06e605ca6`) remains disabled and retained for rollback; do not delete it during bootstrap. The manual exact-SHA trigger remains the fallback executor, not the disabled native trigger.
- The dispatcher on default `main` derives `smoke` for trusted internal PRs to `development` and `full` only for same-repository `development` to `staging` promotions. It passes the exact head SHA and derived suite to Cloud Build, and its path filters include both real-auth lifecycle and entrypoint files; unrelated staging heads skip before OIDC.
- Manual same-SHA bootstrap is complete. PR #269 merged into `development`. PR #270 used head SHA `317483acb566fbeb6077a0c10a8c70f721e1c2ca`; GitHub full run `34399083297` and manual Cloud Build full build `b2639432-a76e-4c65-b2f3-5c6fd779afc6` passed on that SHA. PR #270 merged into `staging` as `d46a448d996d24a421b4d4a320cb6f3e84f58506`, and PR #271 merged into `main` as `465f1f02262a67c14a2a4c8fe0c0ed16fcdbbdd2`.
- The live Workload Identity Provider is ACTIVE with condition `assertion.repository_id=='857375731' && assertion.repository_owner_id=='181292897' && assertion.event_name=='pull_request_target' && (assertion.base_ref=='development' || (assertion.base_ref=='staging' && assertion.head_ref=='development')) && assertion.workflow_ref=='TelefericoCerroOtto/TelefericoBariloche2024/.github/workflows/cloud-build-playwright-dispatch.yml@refs/heads/main'`. PR #273 proved automatic staging OIDC full dispatch at exact head SHA `16fab46f3781088ea4b310d6bb4e265c170372a9`: GitHub run `34409554758` and Cloud Build `dcf5a6e9-b9b1-430d-a41e-cf98a9e84ade` succeeded with matching source revision and `COMMIT_SHA`, `_PLAYWRIGHT_SUITE=full`, and parallel GitHub full-suite and governance checks passing before merge commit `983c933f9b0a77ccdbb8472d0bcecd3bc425eb8e`. No deployment or further IAM change is part of this repository follow-up.
- Maintainer acceptance removed the redundant GitHub-hosted `chromium-smoke` and temporary `chromium-full` jobs and their `pull_request` trigger. `production-public-smoke` remains unchanged. GitHub GraphQL reported no `branchProtectionRules`, so no required status context needed replacement. Deterministic real-stack teardown and bounded Cloud Logging diagnostics are repository-defined; exact-SHA real-auth 3/3 runtime evidence, production-smoke migration, Vitest migration, deployments, and deletion of the disabled legacy trigger remain pending or out of scope under issue #261; TB-122 remains open.

Read-only repository validation is `node --test .github/scripts/playwright-e2e.test.js`; it does not submit a build or access GCP.

Repository-level rollback for this teardown slice is limited to restoring the outer readiness script, removing the inner lifecycle script and focused lifecycle test, restoring the directly related static assertions and dispatcher path filters, and restoring the teardown documentation in `docs/playwright-e2e.md`, this file, and `docs/infra/cloud-build/{README.md,playwright-e2e-manual-dispatcher.md}`. It does not authorize commit, PR, trigger, build, deployment, GCP, or IAM changes.

### 6.1 Documentary snapshots

- `docs/infra/cloud-build/app-staging.yaml`
- `docs/infra/cloud-build/app-production.yaml`
- `docs/infra/cloud-build/cms-staging.yaml`
- `docs/infra/cloud-build/cms-production.yaml`
- `docs/infra/cloud-build/worker-staging.yaml` — proposed only; not installed in GCP.

These files are for reference only. The operational triggers remain defined inline in GCP.

### 6.1.1 GitHub Deployments bridge

The application trigger snapshots include a Cloud Build → GitHub Deployments bridge for the repository `TelefericoCerroOtto/TelefericoBariloche2024`. They create deployments against the exact full commit SHA, keep automatic merging and required deployment contexts disabled, post `in_progress` before the build, and post `success` only after Cloud Run deployment succeeds.

- The verified `staging` and `production` GitHub environments already exist.
- The GitHub App requires **Deployments: Read and write** permission and is installation-scoped to this repository.
- Both Cloud Build triggers use `APP__PRODUCTION__GITHUB_DEPLOYMENTS_APP_PRIVATE_KEY` through `availableSecrets` and reporter-step `secretEnv`. It is one repository-scoped GitHub App credential; duplicating the same PEM would not reduce blast radius and would complicate rotation.
- The Cloud Build execution service account requires `roles/secretmanager.secretAccessor` on that secret. The PEM must never be copied into a repository, trigger field, file path, log, or environment outside the reporter step.
- The deployment reporter is pinned to the immutable linux/amd64 Docker Hub `node:22.16.0-bookworm-slim` OCI image manifest documented in [infra/cloud-build/README.md](infra/cloud-build/README.md).

The snapshots remain documentation. A reviewed operator must manually copy them to the inline Cloud Build triggers. Ordinary build/deploy failures attempt to report GitHub `failure`, but GitHub API/reporting failure can leave the deployment `in_progress`. A whole-build cancellation or timeout can also prevent the final reporter, leaving the same state until an operator resolves it manually.

### 6.2 Managed Redis and manual alerting for `public_form_guard`

Real changes to Memorystore/managed Redis, connection secrets, and alert policies must NOT be executed from this repo or from the console. When that operational step arrives, it must be done through the Docker MCP using the running container `google-cloud-sdk`, with preview/dry-run first when available.

Form protection publishes structured events to Cloud Logging (`event="public_form_guard"`). The log-based metric and alert policy must NOT be created from this repo without explicit approval because they imply a real change in GCP.

Operational rules:

- Any real execution with `gcloud logging metrics create`, `gcloud alpha monitoring policies create` or equivalent requires prior approval.
- Any real change to Redis/Memorystore (`gcloud redis ...`, secrets, or Cloud Run wiring) also requires prior approval and must go through the same Docker MCP `google-cloud-sdk` path.
- Before any real creation, first run the equivalent in preview/inspection mode: log query, filter validation, naming, and recipients.
- The manual limit remains clear: this repository documents the procedure; actual creation remains outside the scope of the change and must be done by an approved operator.

Suggested steps:

1. Validate the filter in Logs Explorer with a query like:

```text
resource.type="cloud_run_revision"
jsonPayload.event="public_form_guard"
jsonPayload.action=("block" OR "degraded")
resource.labels.service_name=("app-staging-teleferico" OR "app-production-teleferico")
```

2. Create a separate log-based metric for `block` and/or `degraded`, for example:
   - `public_form_guard_blocks`
   - `public_form_guard_degraded`

3. Configure an alert policy that notifies `dev@telefericobariloche.com.ar`.

4. Document in the operational PR:
   - final filter used
   - chosen threshold
   - affected environment
   - confirmed recipient
   - rollback: disable the policy or delete the metric/policy manually

Examples of expected scope:

- `too_many_requests` above the defined threshold in a short window
- any `rate_limit_degraded`
- any `missing_client_ip` in production after enabling postulation rate limiting

### Secret Manager

- Non-sensitive variables: substitutions or service env vars.
- Sensitive variables: Secret Manager.
- Staging and production use separate secrets.
- Exception: `APP__PRODUCTION__GITHUB_DEPLOYMENTS_APP_PRIVATE_KEY` is intentionally shared by both app deployment triggers because it belongs to one repository-scoped GitHub App, not to an application runtime environment.

---

## 7) Service Accounts and IAM

The target rule is to separate identities by service and apply **least privilege**.

A single permanent service account for the entire platform should not be assumed. If during iteration there exists a service account with broad permissions, it should be treated as a transient state and not as final design.

### Objective

Separate permissions by use case:

- service account for `teleferico-app`
- service account for `teleferico-cms`
- service account for Cloud Build/deploy
- minimum necessary permissions for:
  - Cloud SQL
  - Cloud Storage
  - Secret Manager

### TB-113 CMS checkpoint identity (future operational gate)

TB-113's CMS checkpoint/completion validators have a local, configuration-gated binding for two independent authorities: exact Vertex AI CountTokens calls and reads of one pinned Secret Manager evidence-key version. If enabled in Cloud Run, these calls use a dedicated user-managed CMS service identity through metadata-server ADC. Do not reuse the worker runtime, app runtime, Cloud Tasks invoker, or deployment identity. This CMS identity must not receive `generateContent`, Cloud Tasks, worker GCS, or unrelated Secret Manager authority.

- Grant only the Vertex permission required for the fixed CountTokens method in project `teleferico-bariloche-2024`; verify the exact API permission/role before any grant.
- Restrict Secret Manager access to the one evidence secret and use an IAM condition for its pinned numeric version where supported. Secret Manager's built-in `roles/secretmanager.secretAccessor` is granted at Secret scope, so a version-specific condition must be reviewed before claiming access is limited to one version.
- Confirm the bound model config and evidence-key ID match the CMS environment's approved generation config. The code rejects `latest`, alternate projects/models/locations/endpoints, unapproved segment/config shapes, and service-account key-file ADC.
- No CMS Vertex/Secret Manager IAM grants, service-identity attachment, secret creation/read, runtime value, or deployment change is authorized or performed by the local adapter implementation. These remain separate operator gates.

### TB-113 worker service-account decision (accounts created; local IAM configured; cloud access pending)

On 2026-10-01, the three service accounts below were created in project `teleferico-bariloche-2024` through the named authenticated `google-cloud-sdk` container after approval of the corrected resource IDs and display names. A subsequent filtered list returned all three with `disabled=False`:

| Service-account ID | Display name | Listed state |
| --- | --- | --- |
| `feedback-worker-local` | `Feedback report worker (local)` | Enabled (`disabled=False`) |
| `feedback-worker-staging` | `Feedback report worker (staging)` | Enabled (`disabled=False`) |
| `feedback-worker-production` | `Feedback report worker (production)` | Enabled (`disabled=False`) |

The IDs describe the feedback-report function and do not carry a backlog identifier as a prefix. Backlog references in tracking documentation remain unchanged. The creation commands assigned no explicit roles or keys. Effective IAM policy was not inspected, so no claim is made about inherited or effective permissions.

All three serve the same worker functions, but separate identities provide meaningful isolation only when their resource grants are scoped independently. The intended local scope is limited to the approved Vertex AI CountTokens and generation operations, with only applicable project quota access; do not grant it Cloud Storage or Secret Manager access. An explicitly approved operator may impersonate only this local identity; do not reuse it for either Cloud Run worker. The staging and production identities are intended for their corresponding private Cloud Run workers and may receive only reviewed access to that environment's report objects and its own evidence key. The current storage adapter also needs bucket metadata and IAM-policy reads, so object-only access must not be assumed sufficient. Confirm exact permissions and least-privilege roles before any grant.

The custom role and local bindings are recorded below. Whether these permissions are the exact minimum for CountTokens or establish actual provider access remains unverified. A read-only `list-testable-permissions` preflight on 2026-10-01 returned `aiplatform.endpoints.predict` and `serviceusage.services.use`, both at stage `GA`; the response's `customRolesSupportLevel` cells were blank. The official [custom-role permissions guide](https://docs.cloud.google.com/iam/docs/creating-custom-roles) says an omitted `customRolesSupportLevel` means full support for custom roles. This confirms those permissions' custom-role support only; it does not attest that `aiplatform.endpoints.predict` is the exact CountTokens permission or establish provider access, quota behavior, or live model access. `roles/aiplatform.user` has not been selected. Staging and production bucket and Secret Manager resource identifiers, and all exact grants, remain unresolved. A prior read-only API-status check reported `aiplatform.googleapis.com` and `iamcredentials.googleapis.com` enabled in this project. Keep the app, CMS, Cloud Tasks invoker, and Cloud Build/deploy identities separate; this decision creates none of those identities. It authorizes no new bucket, secret, queue, service, service update, or deployment.

Before creation, the identity preflight used a filtered service-account list for only the three proposed account emails and returned no rows (exit 0). The permission preflight targeted `//cloudresourcemanager.googleapis.com/projects/teleferico-bariloche-2024` and filtered only the two permissions above. Its first attempt timed out after 30 seconds; one bounded retry with a 120-second deadline completed with exit 0 and returned both rows. These reads do not create or modify identities, grants, or services.

On 2026-10-01, after separate approval of the exact commands, the custom role `projects/teleferico-bariloche-2024/roles/feedbackReportVertexCaller` was created with title `Feedback report Vertex caller`, description `Vertex inference and quota usage for feedback reports.`, and exactly these permissions: `aiplatform.endpoints.predict` and `serviceusage.services.use`. Both preflight results were `GA` and are custom-role supported. The role was bound at the project to `feedback-worker-local` only. `roles/iam.serviceAccountTokenCreator` was separately bound on the `feedback-worker-local` service account policy to the explicitly approved operator; the operator's address is intentionally not recorded here. Each approved operation reported exit 0. These results confirm the requested policy updates, not the effective IAM policy: inheritance and actual CountTokens/provider access were not inspected or tested. No role was bound to staging or production.

Local container authentication has two separate contexts: `gcloud` CLI authentication and Application Default Credentials (ADC) used by the worker libraries. `gcloud auth application-default login` changes ADC without replacing the container's `gcloud` CLI login, but it replaces any existing ADC configuration. Before any replacement, the operator must check whether ADC already exists in the named container using only an existence result, preserve any existing ADC personally, perform login, and manually transfer the resulting file to the host at `~/.config/gcloud/application_default_credentials.json`. Keep that file private with restrictive permissions; do not print it, expose tokens, or give an agent access to it. Do not use a service-account key or `GOOGLE_APPLICATION_CREDENTIALS`. The chosen local method is ADC with impersonation of `feedback-worker-local`; it remains based on the operator's source credentials, not a downloaded service-account private key. The approved operator's Token Creator binding was applied on this service account; ADC login and live provider verification remain pending.

This records confirmed account creation and local IAM policy updates, not verified effective permissions or live provider access. No staging/production report-resource grant or Cloud Run service attachment has been established. Staging/production resource grants and attachments remain deferred until their targets and deployment authorization are established. Further IAM reads and all mutations require separate approval for their exact commands. See the official [ADC login reference](https://docs.cloud.google.com/sdk/gcloud/reference/auth/application-default/login) and [service-account impersonation guidance](https://docs.cloud.google.com/docs/authentication/use-service-account-impersonation).

### Managed folders

If the bucket uses managed folders, the policy must be attached to the prefixes and not to bucket-level conditions.

Example:

```bash
gcloud storage managed-folders add-iam-policy-binding gs://cms_staging_bucket/public/cms \
  --member=serviceAccount:CMS_RUNTIME_SA \
  --role=roles/storage.objectAdmin

gcloud storage managed-folders add-iam-policy-binding gs://cms_staging_bucket/private/job-applications \
  --member=serviceAccount:APP_RUNTIME_SA \
  --role=roles/storage.objectAdmin
```

Current state for CMS images:

- The `/api/media` proxy is deployed and operational in `teleferico-app`. It handles all public access to CMS assets using server-side credentials.
- `allUsers` access is not granted on `public/cms/` or at bucket level. Direct public access to GCS objects is not allowed.
- The CMS service account (`teleferico-bariloche-2024@appspot.gserviceaccount.com`) has `roles/iam.serviceAccountTokenCreator` on itself. This is required for Strapi to generate V4 signed GCS URLs from Cloud Run using ADC. **Reason**: the Strapi admin panel (a browser SPA) cannot use server credentials directly; signed URLs allow it to load private GCS objects. Without this role, signed URL generation fails with "Cannot sign data without a private key".
- `GCS_PUBLIC_FILES=false` is set in both CMS environments so that Strapi's upload provider calls `isPrivate()` → `true` and generates signed URLs in every API response. The signed URLs are consumed server-side by Next.js (transformed to `/api/media/...` proxy URLs before reaching the browser) and directly by the Strapi admin panel (where 15-minute expiry is acceptable given infrequent admin usage).
- `roles/storage.objectAdmin` on `public/cms/` is maintained for the shared service account until identity separation between `teleferico-app` and `teleferico-cms` is complete.

---

## 8) Session and authentication

- **Frontend:** Auth.js.
- **Strapi:** JWT with `exp`.
- Important rule: session TTL must follow the JWT issued by Strapi.
- Refresh token: still pending.

---

## 9) External integrations

External integrations should not be confused with persistence or Strapi's internal permissions.

- **reCAPTCHA:** anti-bot protection in public forms.
- **Gmail OAuth 2.0:** email sending from the contact form.

These integrations are independent of Strapi.

---

## 10) Domains and DNS

The DNS layer does not live in this repo's project. It is configured in the legacy Google Cloud project `teleferico-bariloche`.

The `teleferico-bariloche-2024` project publishes the production frontend through:

- **LB global fixed IP**: `130.211.28.132`
- **Load Balancer**: HTTP/HTTPS frontend with HTTP→HTTPS redirect
- **Backend**: `app-production-teleferico` through the serverless NEG `teleferico-app-prod-neg`
- **Managed certificate**: `teleferico-managed-cert` for `.com` and `.com.ar` with and without `www`

The inventory read from the legacy (DNS, VM, and TLS) is documented in [docs/INFRA-LEGACY.md](docs/INFRA-LEGACY.md).

Contracted domains:

- `telefericobariloche.com` — Don Web
- `telefericobariloche.com.ar` — Nic.ar

Both domains use Google Cloud DNS as name servers. Each has its own independent public zone:

| Domain                       | Cloud DNS Zone           | Name servers                                                                                                                        |
| ---------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `telefericobariloche.com.ar` | `telefericobariloche`    | `ns-cloud-d1.googledomains.com.` `ns-cloud-d2.googledomains.com.` `ns-cloud-d3.googledomains.com.` `ns-cloud-d4.googledomains.com.` |
| `telefericobariloche.com`    | `telefericobarilochecom` | `ns-cloud-e1.googledomains.com.` `ns-cloud-e2.googledomains.com.` `ns-cloud-e3.googledomains.com.` `ns-cloud-e4.googledomains.com.` |

Operational rule:

- DNS changes are made in `teleferico-bariloche`, not in the GCP project associated with this repo.

### 10.1 Production public origin

The canonical production origin is `https://telefericobariloche.com.ar`. Production configuration must use it for `NEXT_PUBLIC_SITE_URL`, the GitHub deployment environment URL, and read-only production E2E checks. `https://telefericobariloche.com`, `https://www.telefericobariloche.com`, and `https://www.telefericobariloche.com.ar` remain allowed public aliases.

`APP_INTERNAL_BASE_URL` intentionally uses the Cloud Run service URL. It is an internal server-to-server origin and must not follow public canonical-domain changes.

On 2026-09-09, registrar delegation failure caused public `.com.ar` DNS queries to return `NXDOMAIN`. Production temporarily used the Cloud Run service URL as its public, deployment, and E2E origin while the custom domain recovered. Build `3b334e7b-31d2-4ae7-a158-c86413443341`, revision `app-production-teleferico-00030-79c`, GitHub deployment `6352989259`, and production smoke run `34369735354` recorded the temporary state. The incident did not validate forms, reCAPTCHA submission, authenticated administration, or email writes.

Repository snapshots now record the restored canonical domain. The inline Cloud Build trigger substitutions and GitHub production `PRODUCTION_E2E_BASE_URL` remain separate operational settings and require explicit approval to update. Track the recovery in [TB-124](https://app.notion.com/p/3d6a58c3fefc81a7bcb5eb8a008435a9) and durable origin portability in [TB-125](https://app.notion.com/p/3d6a58c3fefc8135a264c91cd8da32a4).

---

## 11) Deployment variables that do change by environment

### Next.js

- `BUILD_STRAPI_BASE_URL`
- `BUILD_STRAPI_BUCKET_PATHNAME`
- `NEXT_PUBLIC_SITE_URL`
- `APP_INTERNAL_BASE_URL`
- `ALLOWED_PUBLIC_ORIGINS`
- `CV_STORAGE_DRIVER`
- `CV_LOCAL_STORAGE_DIR`
- `GCS_BUCKET_NAME`
- `GCS_PRIVATE_BASE_PATH`

### Next.js — secrets that can currently be shared between staging and production

In the current configuration, `teleferico-app` reuses the same external integration for Gmail OAuth and reCAPTCHA in both environments. Therefore, these secrets can have the same value in `staging` and `production`:

- `RECAPTCHA_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OAUTH_REFRESH_TOKEN`

This is valid if:

- both environments use the same authenticated Gmail account,
- both use the same Google OAuth Client,
- and both use the same reCAPTCHA configuration.

Tradeoff: this decision simplifies operation but reduces isolation between environments. If a single OAuth Client is maintained, the redirect URIs for `staging` and `production` must be authorized.

### Next.js — secrets that must be generated internally

These secrets do not come from Google, Strapi, or other third parties. They must be generated following the previous policy and, unless an explicit decision to the contrary, must be different per environment:

- `AUTH_SECRET`
- `INTERNAL_API_KEY`
- `CSRF_STATE_SECRET`
- `INIT_TOKEN`

### Strapi

- `NODE_ENV`
- `DATABASE_HOST`
- `GCS_BUCKET_NAME`
- `GCS_BASE_PATH`
- `GCS_BASE_URL`
- `GCS_PUBLIC_FILES`
- `GCS_UNIFORM`

---

## 12) High-level schema

```text
Users
  -> Cloud Run (teleferico-app / Next.js)
       - Institutional: server-side content reads
       - Dashboard: server-side operations according to session/role
       -> Cloud Run (teleferico-cms / Strapi)
            -> Cloud SQL (PostgreSQL)
             -> Cloud Storage (public assets + private CVs)

Public forms
  -> reCAPTCHA
  -> Gmail OAuth 2.0
```

---

## 13) Maintenance mode

teleferico-app supports a maintenance mode that isolates the public site while preserving the authenticated operator control plane and one public read-only service-status capability. It is controlled by a single environment variable.

### Quick operational path

Use `gcloud run services update` when you need Cloud Run to create a **new revision** by changing the maintenance flag on the service.

> **Operational note:** this is a real Cloud Run change. It creates a new revision immediately and sits outside the normal PR → merge → Cloud Build flow. Use it only for maintenance toggles and follow the environment approval/governance rules from the repository.

#### Command pattern

```bash
gcloud run services update <SERVICE_NAME> \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars MAINTENANCE_MODE=<true|false>
```

Replace `<SERVICE_NAME>` with:

- `app-staging-teleferico` (staging)
- `app-production-teleferico` (production)

#### Staging — enable maintenance

```bash
gcloud run services update app-staging-teleferico \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars MAINTENANCE_MODE=true
```

#### Staging — disable maintenance

```bash
gcloud run services update app-staging-teleferico \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars MAINTENANCE_MODE=false
```

#### Production — enable maintenance

```bash
gcloud run services update app-production-teleferico \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars MAINTENANCE_MODE=true
```

#### Production — disable maintenance

```bash
gcloud run services update app-production-teleferico \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --update-env-vars MAINTENANCE_MODE=false
```

#### Verify the current value on the service

```bash
gcloud run services describe <SERVICE_NAME> \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --format='yaml(spec.template.spec.containers[0].env)'
```

#### Verify the latest created revision

```bash
gcloud run revisions list \
  --service <SERVICE_NAME> \
  --project teleferico-bariloche-2024 \
  --region southamerica-east1 \
  --sort-by='~metadata.creationTimestamp' \
  --limit 5
```

Expected result:

- the `services update` command creates a new Cloud Run revision
- `MAINTENANCE_MODE=true` activates the maintenance flow on that revision
- `MAINTENANCE_MODE=false` creates another revision that restores normal traffic behavior

### Automatic reset on deploy

Cloud Build deploys set `MAINTENANCE_MODE=false` explicitly. Any new deploy automatically deactivates maintenance mode.

### Behavior

- `MAINTENANCE_MODE=true` → institutional routes are rewritten to the maintenance page; the narrow exceptions below remain available.
- `MAINTENANCE_MODE` absent or any other value → site runs normally.
- HTML routes: middleware rewrites to `/maintenance` with a `Retry-After` header. Note: the `status: 503` passed to the rewrite does not reach the browser — Next.js resets it to 200 during page render. Crawler protection relies on the `Retry-After` header and the `noindex` meta tag on the maintenance page.
- Public service status: only `GET /api/proxy/api/service-state` is allowed through middleware. The existing proxy still enforces trusted-browser origin checks and uses the server-side content token. Other methods, proxy paths, and public APIs remain blocked with the maintenance `503` response.
- Authentication: only `GET|POST /api/auth/session`, `GET /api/auth/csrf`, `GET /api/auth/providers`, `POST /api/auth/callback/credentials`, and `POST /api/auth/signout` remain available. `POST /api/auth/session` is required by the existing client session refresh after credentials sign-in.
- Administration pages: login, logout, and the exact dashboard root continue through the existing authentication middleware. Authenticated dashboard descendants redirect to `/es-AR/dashboard`; the sections layout enforces the same restriction as defense in depth.
- Operator service-state update: only `PUT /api/admin/service-state` remains available. The route validates trusted browser origin, CSRF-bound session, the `Administrator` or `Operations Supervisor` role, and the service-state enum before using the operator JWT. Upstream errors are not exposed.
- Dashboard projection: maintenance mode omits content-management navigation and content-specific dashboard messaging while preserving the service-state control, profile/session information, and logout.
- The maintenance page always preserves its original maintenance card and reads only `service-state` for a separate localized status card. Loading reserves space below the maintenance card; unavailable or invalid status data omits only the status card and never exposes upstream errors.
- Cloud Run health checks are unaffected (TCP probe, no HTTP endpoint).

### Scope of isolation

This is user-layer isolation. Cloud Run service URLs remain technically accessible. Public visitors cannot access institutional content or APIs beyond the exact read-only service-state capability. Authenticated operators retain only the dashboard root and the protected service-state update needed to manage that state.
