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