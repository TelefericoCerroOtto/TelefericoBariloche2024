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
  - configured in `teleferico-bariloche-2024` to publish the production app with a fixed IP and managed certificate; the public cutover still depends on DNS changes.
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

### Application-test executor baseline

`cloudbuild.playwright-e2e.json` is the repository-owned Cloud Build configuration for fixture-backed Playwright Chromium smoke and full suites. The active GitHub dispatcher submits it through `playwright-e2e-dispatch`; the disabled legacy `playwright-e2e-pr` trigger references the same file and receives the safe default `smoke` suite. Its non-authoritative metadata snapshot is [infra/cloud-build/playwright-e2e-pr.yaml](infra/cloud-build/playwright-e2e-pr.yaml). It does not deploy an application.

- Its immutable `alpine/git` image verifies Git is executable, rejects the all-zero SHA, verifies that `COMMIT_SHA^{commit}` resolves in `/workspace`, and fails closed unless it equals `HEAD^{commit}`. `_PLAYWRIGHT_SUITE` accepts only `smoke` or `full`, defaults to `smoke`, and maps to `pnpm run test:e2e:smoke` or `pnpm run test:e2e`. Later steps use the immutable Node 22.23.2 Bookworm image, Corepack, the repository-pinned `pnpm@10.33.0`, `pnpm install --frozen-lockfile`, and the lockfile-backed Playwright CLI. Chromium and its operating-system dependencies are installed immediately before the selected suite in the same container because build-step operating-system libraries are not shared.
- The build is bounded to 45 minutes and has separate revision, package-manager, dependency, combined browser-install/test, and real-stack readiness steps. Failures remain in Cloud Build logs without suppression.
- Historical native-trigger evidence is preserved: the fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707` (`a4b071a2-2e78-428c-9d6d-854487f888da`, check `101890859299`). Earlier real-stack pilots exposed production upload-provider, Next CLI, and synthetic image-input failures; the runner now selects `NODE_ENV=test`, default local upload storage, `BUILD_STRAPI_BUCKET_HOSTNAME=127.0.0.1`, and `BUILD_STRAPI_BUCKET_PATHNAME=/uploads/**`.
- Cloud Build `92e24a70-69f1-48a3-ba0f-adbbd868b254` passed for commit `2f143badb095d9e6f141fd150c6348a4532e2884` (check `102114323463`), started `2026-09-08T15:01:02Z`, completed `2026-09-08T15:09:59Z`, duration `8m57s`. It proves isolated PostgreSQL, Strapi under `NODE_ENV=test` with local upload storage, and Next.js `/api/auth/providers` readiness. The runner stays unauthenticated, write-free, synthetic, and isolated on the `cloudbuild` Docker network; it does not prove users, roles, permissions, credentials login, protected reads/writes/denials, logout, JWT non-exposure, artifact upload, or GitHub Actions cutover. Staging/production GCS, IAM, secrets, Cloud SQL, Cloud Run, staging, and production remain untouched. Authenticated E2E behavior is a separate future work unit.
- Historical same-SHA GitHub `Playwright Chromium smoke` check `102113652044` passed. GitHub Actions remains the parity executor; this Cloud Build evidence does not replace application testing or change repository-governance workflows.
- PR #268 proved the active GitHub route at SHA `8a0185fa70ee0dedc53573f0f6dafbffd9a4199c`. GitHub run `34373237590` passed `validate-trusted-pr`, OIDC/WIF authentication, and `dispatch-and-wait` without a service-account key. Trigger `playwright-e2e-dispatch` launched Cloud Build `b29e46c1-10a4-4d28-bf2b-21b7d985b22d`; all five steps passed and both `COMMIT_SHA` and `REVISION_ID` matched the PR SHA. The GitHub-hosted Chromium smoke also passed on that SHA.
- Final legacy `/gcbrun` build `3ce4566d-030c-4dcf-b533-f9c97dc71b7c` passed the same five steps on the same SHA, and its historical PR check reached success. Trigger `playwright-e2e-pr` (`c2133674-afdc-46ae-87d0-afe06e605ca6`) remains disabled and retained for rollback; do not delete it during bootstrap. The manual exact-SHA trigger remains the fallback executor, not the disabled native trigger.
- The dispatcher implementation derives `smoke` for trusted internal PRs to `development` and `full` only for same-repository `development` to `staging` promotions. It passes the exact head SHA and derived suite to Cloud Build; unrelated staging heads skip before OIDC. The retained GitHub full-suite parity job checks out the same exact promotion head SHA. However, `pull_request_target` uses workflow code from default `main`, whose current dispatcher has no staging route; PR #269 checks therefore prove only development smoke.
- Secure bootstrap: merge PR #269 to `development` after review. On the first `development` to `staging` promotion, require GitHub `chromium-full` on the exact promotion head SHA and, with explicit operational approval, manually invoke `playwright-e2e-dispatch` on that SHA with `_PLAYWRIGHT_SUITE=full`. Record this only as initial same-SHA full-suite parity, not proof of automatic GitHub OIDC staging dispatch. Continue through `staging` and then `main` under ordinary promotion policy.
- Only after the workflow reaches default `main` and an approved operator separately expands the Workload Identity Provider condition to allow `assertion.base_ref == 'development' || (assertion.base_ref == 'staging' && assertion.head_ref == 'development')`, preserving repository ID `857375731`, owner ID `181292897`, event `pull_request_target`, and the trusted main-branch dispatcher `workflow_ref`, can a later promotion prove automatic GitHub OIDC full-suite dispatch. No GCP or IAM mutation is part of this repository slice.
- Production-smoke migration, authenticated E2E, diagnostic artifacts, final redundant-job removal, Vitest migration, deployments, and deletion of the disabled legacy trigger remain out of scope under issue #261.

Read-only repository validation is `node --test .github/scripts/playwright-e2e.test.js`; it does not submit a build or access GCP.

### 6.1 Documentary snapshots

- `docs/infra/cloud-build/app-staging.yaml`
- `docs/infra/cloud-build/app-production.yaml`
- `docs/infra/cloud-build/cms-staging.yaml`
- `docs/infra/cloud-build/cms-production.yaml`

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

The `teleferico-bariloche-2024` project already has the new frontend prepared for production:

- **LB global fixed IP**: `130.211.28.132`
- **Load Balancer**: HTTP/HTTPS frontend with HTTP→HTTPS redirect
- **Backend**: `app-production-teleferico` through the serverless NEG `teleferico-app-prod-neg`
- **Managed certificate**: `teleferico-managed-cert` for `.com` and `.com.ar` with and without `www`

As long as the `A`/`CNAME` records in the legacy zone are not changed, public domains continue to resolve to the previous site.

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

### 10.1 Temporary production origin recovery

As of the 2026-09-09 incident, the canonical production origin is temporarily `https://app-production-teleferico-384535443802.southamerica-east1.run.app`. The registrar/parent delegation for `telefericobariloche.com.ar` remained inactive and returned `NXDOMAIN`, although the authoritative Google Cloud DNS records remained present.

The live Cloud Build trigger `app-production-deploy-cr` (`252cd6a2-304b-49db-8e8a-d515cf31afc6`) and GitHub production environment use this temporary state:

- `_NEXT_PUBLIC_SITE_URL` and `_GITHUB_DEPLOYMENTS_ENVIRONMENT_URL` use the Cloud Run origin instead of `https://telefericobariloche.com.ar`.
- `_ALLOWED_PUBLIC_ORIGINS` retains `https://telefericobariloche.com`, `https://www.telefericobariloche.com`, `https://telefericobariloche.com.ar`, and `https://www.telefericobariloche.com.ar`, and appends the Cloud Run origin.
- `_APP_INTERNAL_BASE_URL` remains unchanged because it already uses the Cloud Run origin. **Do not restore this variable to the public domain during recovery.**
- GitHub production `PRODUCTION_E2E_BASE_URL` uses the Cloud Run origin.
- The Cloud Run hostname was added manually to the reCAPTCHA allowlist. Never record reCAPTCHA secret values in this repository.

Evidence for the temporary state:

- Manual production build `3b334e7b-31d2-4ae7-a158-c86413443341` passed for main commit `fb220fc3c8904a14385a7377da5fd96f5fc1375b`.
- Revision `app-production-teleferico-00030-79c` serves 100% of traffic. The previous ready rollback revision is `app-production-teleferico-00029-22l`.
- GitHub deployment `6352989259` and production smoke run `34369735354` passed.
- Forms, reCAPTCHA submission, authenticated administration, and email writes were intentionally not tested. This does not block TB-122 dispatcher verification.

Production mutations always require explicit approval. Recovery checklist:

- [ ] Restore the public domain only after registrar/parent delegation and external DNS resolution are confirmed healthy.
- [ ] Restore `_NEXT_PUBLIC_SITE_URL`, `_GITHUB_DEPLOYMENTS_ENVIRONMENT_URL`, and GitHub `PRODUCTION_E2E_BASE_URL` to the verified public domain.
- [ ] Keep `_APP_INTERNAL_BASE_URL` on the Cloud Run origin.
- [ ] Remove the temporary Cloud Run entry from `_ALLOWED_PUBLIC_ORIGINS` only after the public-domain deployment and smoke verification pass.
- [ ] Review whether the Cloud Run hostname should remain in the reCAPTCHA allowlist.
- [ ] If recovery fails, route traffic to `app-production-teleferico-00029-22l` and restore the temporary substitutions before retrying.

Track registrar/DNS recovery in [TB-124](https://app.notion.com/p/3d6a58c3fefc81a7bcb5eb8a008435a9) and durable origin portability in [TB-125](https://app.notion.com/p/3d6a58c3fefc8135a264c91cd8da32a4).

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
