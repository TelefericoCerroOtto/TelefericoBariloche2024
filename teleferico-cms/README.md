# Teleférico Bariloche 2024 — CMS (Strapi)

Backend (CMS) for the project, implemented with **Strapi**.

- Monorepo overview: [../README.md](../README.md)
- Infrastructure, environments and CI/CD: [../docs/INFRA.md](../docs/INFRA.md)
- This README: local development, CMS deployment and data transfers

---

## Useful scripts

- `npm run develop`: starts Strapi in development mode (with _auto-reload_)
- `npm run start`: starts Strapi in production mode (without _auto-reload_)
- `npm run build`: builds the admin panel
- `npm run seed:postulations -- --count=24`: creates fake postulations to test recruitment admin pagination
- `NODE_ENV=development node scripts/seed-surveys.js --local-feedback`: seeds the persistent local TB-113 survey fixture

### Fake postulations seed

Use this script when you need to quickly populate the recruitment administrative listing without going through the real public form.

```bash
npm run seed:postulations
```

Useful options:

- `npm run seed:postulations -- --count=25`: changes the number of records to generate
- `npm run seed:postulations -- --cleanup`: deletes only the records created by this script

Notes:

- The script requires at least one `sector` to exist in the local database; it reuses the first active one available.
- Records are created as published and with an internal mark in `note` so the cleanup doesn't touch real postulations.

> Note: if `npm run develop` fails with `ENOSPC`, it's usually due to system _watchers_ limit (for example, with VS Code/Warp open). Close heavy processes or adjust `fs.inotify.max_user_watches`.

### TB-113 current configuration and local stack

For normal local TB-113 development, start Strapi bound only to loopback from `teleferico-cms` using either supported host:

```bash
HOST=127.0.0.1 npm run develop
# Or:
HOST=localhost npm run develop
```

The app still uses its ordinary `pnpm dev`; there is no separate app mode. The development checkpoint providers accept only an effective Strapi `HOST` of `127.0.0.1` or `localhost`. If `BUILD_STRAPI_BASE_URL` or `FEEDBACK_CMS_ALLOWED_ORIGIN` is set, both must be present and exactly match the same host and Strapi port. Wildcard binds, LAN addresses, mismatched origins, and other aliases do not activate the local synthetic evidence key. `HOST` controls Strapi's HTTP listener only; the database host remains independently configured through the database settings.

With Strapi's local development database configured, run the fixture commands from `teleferico-cms`:

```bash
NODE_ENV=development node scripts/seed-surveys.js --local-feedback
NODE_ENV=development node scripts/seed-surveys.js --cleanup-local-feedback
```

The seed creates one published synthetic survey version, one active synthetic QR point, and two accepted synthetic submissions. Re-running a complete seed is idempotent. Cleanup accepts only a subset of the known marker-owned identities (so it can recover an interrupted seed) and aborts if any row is unexpected or duplicated; it deletes submissions before their QR point and survey version. The command refuses non-development mode and non-loopback database connections. It does not modify roles, permissions, production catalog rows, or report data.

TB-113 checkpoint CountTokens and evidence-key checks remain CMS-owned and independently validate the approved model configuration and exact CountTokens request/result. Production requests the pinned Secret Manager key version using the configured project-ID path, only under the full approved configuration and keyless Cloud Run identity. An access response is accepted only when its complete resource name exactly matches the configured path or uses the verified project-number alias `384535443802` with the same secret and numeric version; other names and malformed/short payloads fail closed. Synthetic local RED/GREEN tests cover this behavior. The suspected live staging cause remains unconfirmed because no access response or secret value was read. Development instead derives a deterministic 32-byte synthetic evidence key independently in worker and CMS from the existing approved key ID, source revision, secret resource name, and a closed domain tag; it makes no Secret Manager call. This key is predictable, NOT production security evidence, and must only be used with synthetic local data. Local Vertex CountTokens uses lazy GoogleAuth ADC only when an actual checkpoint requires it and rejects Cloud Run identity variables and `GOOGLE_APPLICATION_CREDENTIALS`. `google-auth-library@9.15.1` is a direct dependency for this local OAuth path; that exact version already existed transitively in the package lock and was promoted with an offline-only install. Isolated tests may replace CMS CountTokens/model provider calls in-process, but CMS never delegates its evidence-key derivation or checkpoint validation to the worker. Live local Vertex access remains subject to separate destination/operation/credential authorization.

The CMS consumes `BUILD_STRAPI_BASE_URL`, `FEEDBACK_CMS_ALLOWED_ORIGIN`, `FEEDBACK_WORKER_EVIDENCE_KEY`, and `FEEDBACK_VERTEX_PROJECT_ID` for feedback checkpoint validation. It independently reads the shared profile at `../packages/tb113-runtime-contracts/config/report-generation.json`; the app and worker read that same file. If both origin settings are supplied, they must identify the same exact loopback host and port in development. The CMS does not consume either app or worker Custom Content API token.

The profile owns source/evidence version identifiers and a pricing snapshot version as code-release metadata; its loader projects matching model-config identifiers and derives safety headroom from the input limit. The approved model context-window budget is `1,048,576`; the approved standard non-global PayGo rates are `$1.65` input and `$8.25` output per million tokens, excluding promotional credits, caching, and contract discounts. Public sources: [Gemini 3.8 Flash model details](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash) and [Vertex AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing). The existing planner still reserves output tokens and derives `104,858` safety-headroom tokens, so the context window is a planning budget rather than a prompt allowance. Configuration does not verify live Google access. The old `FEEDBACK_APPROVED_GENERATION_CONFIG_JSON` environment variable is unsupported and cannot override the profile. Increment the pricing version when a verified price changes. Historical generation rows retain their model/pricing snapshots.

`FEEDBACK_WORKER_EVIDENCE_KEY` is a pinned Secret Manager resource name (for example, `projects/<PROJECT_ID>/secrets/<SECRET_NAME>/versions/<VERSION>`) in production; never put secret bytes in an environment variable. Local development derives a deterministic synthetic-only evidence key from approved nonsecret metadata and makes no Secret Manager call. It is not production security evidence.

The authenticated app-to-CMS-to-worker browser regression is an internal test, not a normal startup mode. Run it from `teleferico-app` with `COREPACK_ENABLE_NETWORK=0 pnpm exec playwright test --config playwright.local-feedback.config.ts`. It creates a unique isolated PostgreSQL/Strapi database and synthetic identities/tokens, replaces only external Google-provider calls, and cleans only resources owned by that run. It excludes `.env*` and `.npmrc` from its temporary app/CMS copies and does not use a persistent user database.

### Survey Content Manager collections

The Content Manager extension omits localization population only for the
nonlocalized `survey-version` and `survey-submission` collections. Their nested
required ownership fields remain private; do not change their schema or public
permissions to work around framework validation. This adapter is verified
against Strapi `5.45.1`; rerun
`FEEDBACK_CM_EXPECT=green node --test test/feedback/content-manager/localization-populate.test.js`
when upgrading Strapi. The isolated test covers empty lists and marker-seeded
version/submission rows, plus explicit public REST requests for private fields.
The extension fails closed if the expected `populate-builder` API is unavailable.

### Custom Content API token ownership

Create two separate **Custom Content API tokens** in Strapi. These permission lists are exact; do not enable additional checkboxes. Configure each plain token string only in its owning server process:

| Token variable | Owning process | Enable exactly these Strapi permission checkboxes |
| --- | --- | --- |
| `FEEDBACK_APP_CMS_TOKEN` | `teleferico-app` | `feedbackAdminRead`, `workerSourceRead`, `workerReportDownloadMetadata` |
| `FEEDBACK_WORKER_CMS_TOKEN` | `survey-report-worker` | `workerClaim`, `workerSnapshot`, `workerCheckpoint`, `workerComplete`, `workerFail` |

The app token belongs only to `teleferico-app` and the worker token belongs only to `services/survey-report-worker`. Keep both as plain process environment values and never place either in CMS configuration, browser code, or documentation. The CMS issues and validates the exact action scopes; it does not use either token as its own runtime credential.

---

## Main environment variables

- `DATABASE_CLIENT` (`sqlite` | `mysql` | `postgres`)
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `GCS_BUCKET_NAME`, `GCS_BASE_PATH`, `GCS_BASE_URL`, `GCS_PUBLIC_FILES`, `GCS_UNIFORM` (Google Cloud Storage provider for public assets)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`

The **Google Cloud Storage** upload provider is configured via:

```
@strapi-community/strapi-provider-upload-google-cloud-storage
```

---

## Local development (quick)

1. Install dependencies and define the `.env` file in `./teleferico-cms/` with database configuration:

   - **Simple option:** use SQLite (`DATABASE_CLIENT=sqlite`)
   - **Alternative option:** configure MySQL or PostgreSQL using the variables indicated above

2. Execute:

```bash
npm run develop
```

Strapi starts, by default, at `http://localhost:1337`.

---

## Deployment

Deployment is done on **Cloud Run**. This runtime allows using **Web Sockets**, needed to execute the `transfer` command and migrate data from the local database to the remote one.

The deployment process is done via **Cloud Build**, using a _trigger_ defined in `cloudbuild.yaml`, which listens for changes in the branch corresponding to the deployment environment (`staging` or `production`).

---

## Data migration

Data defined in the local database is transferred to the remote environment (**Cloud Storage** and **Cloud SQL**) via Strapi's `transfer` command.

Transfers can only be done in the following directions:

- **Local → Remote**
- **Remote → Local**

❌ **Remote → Remote** is not allowed.

### Transfer requirements

Two pieces of information are needed:

1. **Remote admin panel URL**
   Example: `https://my-strapi-instance/admin`

2. **Transfer Token**, created in the instance acting as source or destination.
   There are three types:

   - **pull:** to bring data
   - **push:** to send data
   - **full-access:** for both operations

In this case, a **Transfer Token of type `push`** must be created in the **remote** instance.

---

### Previous considerations

Before starting the transfer, ensure the **local** Strapi server is running.
Since the transfer uses **Web Sockets**, the server should not run with active _watcher_ (_fast refresh_).

The simplest way is to start Strapi locally in production mode:

```bash
npm run build
npm run start
```

---

### Cloud Run timeout

Depending on the data volume, the transfer may take several minutes.
For this reason, it is **mandatory** to configure the Cloud Run timeout to **3600 seconds (1 hour)** to avoid unexpected cuts that could corrupt data and leave the transfer in an inconsistent state.

This adjustment is done **once** from **Cloud Shell**:

```bash
gcloud run services update <CLOUD_RUN_SERVICE_NAME> \
  --region southamerica-east1 \
  --timeout=3600
```

If the transfer is interrupted, it will be necessary to manually delete the generated data and restart the entire process.

---

### Transfer command execution

With the local server already running, open a new terminal in the project base directory `teleferico-cms` and execute:

```bash
npm run strapi transfer -- --to <STRAPI_TRANSFER_URL> --to-token <STRAPI_TRANSFER_TOKEN>
```

To simplify the process, it's recommended to define the environment variables:

- `STRAPI_TRANSFER_URL`
- `STRAPI_TRANSFER_TOKEN`

---

⚠️ **IMPORTANT**
While the transfer is in progress, **do not perform any read or write operations in either instance** (local or remote).
Let the process complete entirely to avoid inconsistencies or errors in the data.

---

## Compact convention guide for images in the `variant` field

In the Strapi Content Manager, below the `variant` (enumeration) field of the components `OneImageBlock`, `TwoImageBlock`, `ThreeImageBlock` we show a brief guide for the editor to upload images with the **crop (aspect ratio)** and **minimum recommended resolution** according to the layout in **mobile** and **desktop**.

The guide is written in a single line (or few lines) separating variants with `-`.

### Used format

```text
VARIANT@bp: M AR · MP | D AR · MP
```

An even more compact version is also accepted:

```text
VARIANT@bp: MAR@MP | DAR@MP
```

> Example: `CARD@md: M4:3 · 1.1MP | D24:7 · 1.9MP - PANORAMIC@md: M 2:3 · 1.8MP | D 21:9 · 2.8MP`
> or: `CARD@md: M4:3@1.1 | D24:7@1.9 - PANORAMIC@md: M2:3@1.8 | D21:9@2.8`

### Notation meaning

- **`VARIANT`**: variant name as it appears in the enum (e.g.: `CARD`, `PANORAMIC`, `SINGLE`).
- **`@bp`**: breakpoint from which the layout changes.
  - `@md` = desktop applies at `>= md` (mobile is `< md`)
  - `@lg` = desktop applies at `>= lg` (mobile is `< lg`)
- **`M` / `D`**: recommendations for **Mobile** and **Desktop** respectively.
- **`AR`**: recommended aspect ratio (e.g.: `1:1`, `4:3`, `16:9`, `21:9`, `24:7`).
- **`MP`**: minimum recommended megapixels.
  - In the format with `@`, `@1.1` equals `1.1MP`.

### Variants with multiple images (slots)

When a variant has more than one image and the slots don't share the same crop, slot notation is used:

- **`S0`** = slot 0
- **`S1`** = slot 1
- **`S1-2`** = slots 1 and 2

If **`M/D`** is written it means the recommendation is the same for mobile and desktop in that slot.

> Example: `MASONRY@lg: S0 M/D 9:16 · 2.1MP | S1-2 M/D 1:1 · 1.4MP`

### Usage criteria

- The guide aims to avoid images that are too small and appear blurry on modern screens (including high-DPR).
- Uploading images larger than the minimum is perfectly fine; what's important is respecting the **aspect ratio** so the crop doesn't ruin the framing.
- The guide is editorial (Strapi). Parameters like `quality` and `priority` are controlled in the frontend (Next.js).

### Field description separation

Since the field is an enum and the text should be easily scannable, variants are separated with:

- `-` (hyphen with spaces), instead of line breaks.

### Current values

Below is the current guide for each of the renderable components that include images

```text
CARD@md: M4:3 · 1.1MP | D 24:7 · 1.9MP - PANORAMIC@md: M 2:3 · 1.8MP | D 21:9 · 2.8MP - POSTER@md: M 9:16 · 2.1MP | D 21:9 · 2.8MP - SINGLE@lg: M 2:3 · 2.2MP | D 1:1 · 2.0MP - SPOTLIGHT@md: M 2:1 · 1.0MP | D 4:3 · 1.5MP

HORIZONTAL@md: M 4:5 · 1.2MP | D 1:1 · 2.0MP - LADDER@lg: M 3:4 · 1.2MP | D 9:16 · 2.1MP - MASONRY@lg: S0 M/D 9:16 · 2.1MP | S1-2 M/D 1:1 · 1.4MP - MINIATURES@lg: S0 M/D 1:1 · 2.0MP | S1-2 M/D 4:3 · 0.7MP

CASCADE@lg: S0 M/D 4:5 · 1.8MP | S1 M/D 16:11 · 1.4MP - DOUBLE@lg: M/D 1:1 · 2.0MP

HERO@md: M3:4 · 1.6MP | D21:9 · 2.8MP

CARROUSEL@md: M4:5 · 1.5MP | D21:9 · 2.8MP
```
