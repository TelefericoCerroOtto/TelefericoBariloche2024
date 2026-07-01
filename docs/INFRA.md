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

| Component        | Staging                  | Production                   |
| ---------------- | ------------------------ | ---------------------------- |
| Next.js          | `app-staging-teleferico` | `app-production-teleferico`  |
| Strapi           | `cms-staging-teleferico` | `cms-production-teleferico`  |
| Region           | `southamerica-east1`     | `southamerica-east1`         |
| Database         | Cloud SQL via connector  | Cloud SQL via private IP/VPC (zonal) |
| Upload bucket    | `cms_staging_bucket`     | `cms_production_bucket`      |

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

### Pipelines

There are four active Cloud Build triggers, all regional in `southamerica-east1` and connected to the project's GitHub repository:

- app staging
- app production
- cms staging
- cms production

There may also be legacy triggers paused in the console. They are purposefully kept disabled and are not part of the operational flow.

Documentary snapshots of their configurations are versioned in [infra/cloud-build/README.md](infra/cloud-build/README.md).

### 6.1 Documentary snapshots

- `docs/infra/cloud-build/app-staging.yaml`
- `docs/infra/cloud-build/app-production.yaml`
- `docs/infra/cloud-build/cms-staging.yaml`
- `docs/infra/cloud-build/cms-production.yaml`

These files are for reference only. The operational triggers remain defined inline in GCP.

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

| Domain                       | Cloud DNS Zone          | Name servers                                                                                                                        |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `telefericobariloche.com.ar` | `telefericobariloche`   | `ns-cloud-d1.googledomains.com.` `ns-cloud-d2.googledomains.com.` `ns-cloud-d3.googledomains.com.` `ns-cloud-d4.googledomains.com.` |
| `telefericobariloche.com`    | `telefericobarilochecom`| `ns-cloud-e1.googledomains.com.` `ns-cloud-e2.googledomains.com.` `ns-cloud-e3.googledomains.com.` `ns-cloud-e4.googledomains.com.` |

Operational rule:

- DNS changes are made in `teleferico-bariloche`, not in the GCP project associated with this repo.

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