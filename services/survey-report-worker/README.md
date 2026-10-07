# TB-113 private report worker

This package owns the private Node worker process for authenticated report-task execution. It does not belong to the public Next.js runtime. The app retains administration, task dispatch, and mediated downloads; Strapi retains lifecycle state, action scopes, checkpoint validation, and independent CountTokens/evidence-key authority. Shared reporting code is under `../../packages/`.

## Local build and run

Use Node `v22.22.0` and pnpm `10.33.0` with this package's lockfile:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm test
pnpm dev
pnpm start
```

The install must follow the worker package's `pnpm-workspace.yaml` policy. Playwright browser installation is disabled; `build` copies only the locally available, SHA-256-pinned Chromium revisions and DejaVuSans font, then bundles the worker and shared TypeScript packages with the pinned esbuild version. It does not pull a container image or download browser binaries. Missing or mismatched local assets fail the build.

The build output is `dist/`:

- `server.cjs`: bundled worker and shared package source; declared runtime packages remain external and are resolved from the package's installed dependencies.
- `run-worker.mjs`: executable Node entrypoint that sets the package-local browser path, injects the packaged font path, validates configuration, and only then listens on `PORT` (default `8080`).
- `browsers/chromium-1228/` and `browsers/chromium_headless_shell-1228/`: complete pinned Playwright Chromium directories.
- `assets/fonts/DejaVuSans.ttf`: pinned font copied from the verified local system path.

`pnpm start` runs `node --conditions=react-server dist/run-worker.mjs`. The listener accepts only `POST /internal/v1/report-runs:execute`; signature/audience/principal/time validation precedes request-body reads. The built-in `node:test` suite uses fake OIDC and CMS dependencies, exercises invalid OIDC and terminal replay over loopback HTTP, and launches the built entrypoint with missing configuration. It makes no Google or CMS calls.

## Container image build

[`docs/infra/cloud-build/worker-staging.yaml`](../../docs/infra/cloud-build/worker-staging.yaml) is the complete worker Build recipe, formatted for unchanged pasting into the Cloud Build Console trigger's inline YAML editor. It contains root-level `steps`, `substitutions`, `options`, and `timeout` only. Trigger metadata—including repository filters, service account, and approval—is configured separately in GCP. The latest read-only trigger readback confirmed approval is required; the attempted setting update failed and did not change it. The snapshot is not a live export or parity claim. The build installs the frozen package graph, downloads the Playwright-pinned Chromium revision, installs Debian `fonts-dejavu-core=2.37-6`, verifies the Chromium, headless-shell, and font SHA-256 values below, then builds, pushes, and deploys from the same `/workspace` checkout. `dist/` is generated and ignored; it is not expected in Git.

The build verifies these pinned renderer assets before Docker runs:

- Chromium executable: `2d18db9d8608b052b6a552ee00ec1e830f93692e928b65ecc67d693bd33fe801`
- Chromium headless shell: `670ba079b75107746ba41abad131180a31a7c7219aa1bd4061fb471f4535d541`
- DejaVuSans font from Debian `fonts-dejavu-core=2.37-6`: `abdc775b21b1bc470d50c97e790d276f2054b7504e56e5bd3e64f48d68582322`

The image uses the Node `22.22.0` Linux/amd64 image digest recorded in the public [Docker Hub tag metadata](https://hub.docker.com/v2/repositories/library/node/tags/22.22.0-bookworm-slim). The Docker step uses the public Linux/amd64 [`cloud-builders/docker` manifest](https://gcr.io/v2/cloud-builders/docker/manifests/sha256:3d00b6c1a9b862621c30fc74d4f2abfc62bcbdee631ed3febd31e7edbdf6252c), and the deploy step uses the public Linux/amd64 [`google-cloud-cli` manifest](https://gcr.io/v2/google.com/cloudsdktool/google-cloud-cli/manifests/sha256:cf49fc2128c4b140379aeb7532be42fefb5616e59952a99d4b548ca472752a74); both image manifests/configs were verified through the public GCR registry API. The worker package pins pnpm `10.33.0` and Playwright `1.61.0`, which provides Chromium revision `1228`. The Dockerfile enables Corepack and prepares that pinned pnpm version inside the image's dependency-install step; enabling Corepack in a separate Cloud Build container does not carry over to this image. Browser downloads occur only in the explicit Cloud Build preparation step, never in `scripts/build.mjs` or the Dockerfile. The Dockerfile installs Chromium OS runtime dependencies from the pinned Playwright CLI and copies only the generated `dist/`; Debian system package versions are resolved at build time, so byte-for-byte image layers across dates are not promised.

The Dockerfile-specific ignore file whitelists the worker manifests, generated bundle, and only the source/config files required from its three root shared packages. It excludes environment files, `.npmrc`, common key/credential files, `node_modules`, tests, and Git metadata. A direct `docker build -f services/survey-report-worker/Dockerfile .` from a fresh Git checkout is not supported because the required `dist/` does not exist until the Cloud Build preparation step. The versioned Build YAML does not itself create or update the live GCP trigger.

The staging deploy step first asserts that Cloud Build's built-in `$PROJECT_NUMBER` is `384535443802`, then derives `FEEDBACK_WORKER_URL` from service `feedback-worker-staging` and region `southamerica-east1` using Cloud Run's deterministic URL format. That project number is taken from the prior documentary [`app-staging.yaml`](../../docs/infra/cloud-build/app-staging.yaml) snapshot (lines 176–177), not from a fresh GCP audit. The runtime contracts allow only this project number with the deterministic staging/production service-name pattern and region, while retaining existing hash-based `.a.run.app` URLs. HTTPS, exact execute path, and an OIDC audience equal to the URL origin remain required. The config verifies the generated DNS label is within the 63-character limit and fails before package/image build if Cloud Build reports a different project number.

### Runtime configuration ownership

- `FEEDBACK_WORKER_CMS_TOKEN` is the only worker secret value. Mount it from Secret Manager into Cloud Run at runtime; never pass its bytes through Cloud Build `secretEnv`, substitutions, files, logs, or image layers.
- `_WORKER_CMS_TOKEN_SECRET_VERSION` is only the nonsecret `SECRET_NAME:VERSION` reference used by Cloud Run `--set-secrets`; it never contains the token bytes.
- `FEEDBACK_WORKER_EVIDENCE_KEY` is nonsecret metadata: a pinned Secret Manager version resource name, not key bytes. The worker runtime identity fetches the key at request time.
- Nonsecret runtime settings include the approved Strapi URL/origin, actual worker URL and matching OIDC audience, task-invoker email/principal, fixed Vertex project `teleferico-bariloche-2024`, private bucket, service/region/image identifiers, and sizing. The task-invoker email and principal must match each other; the Cloud Run worker runtime service account remains distinct. Do not invent values; obtain the environment-specific values during approved provisioning.
- `FEEDBACK_TASK_QUEUE_PATH` belongs to app task dispatch and is not required by production worker configuration. `PORT` is supplied by Cloud Run. Keep the app's `FEEDBACK_CAPABILITY_ENABLED=false` deployment default.
- Proposed staging sizing only: request-based billing, min `0`, max `1`, concurrency `1`, `1 vCPU`, and `2 GiB`. These are unmeasured hypotheses, not deployed settings.
- Before configuring the staging trigger, an operator must supply the Artifact Registry location/repository, approved Strapi URL/origin, distinct worker runtime and Cloud Tasks invoker service accounts, a pinned worker CMS token secret version reference, pinned evidence-key version resource name, and private bucket. Configure trigger metadata and approval separately in GCP. Grant the Cloud Build identity Artifact Registry push, Cloud Run deploy, and worker-service-account act-as permission, but no secret access. Grant the Cloud Tasks invoker `roles/run.invoker`; grant the worker runtime only the reviewed CMS, Vertex, private-bucket, and Secret Manager access required by its source configuration. Confirm the app-owned Cloud Tasks queue already exists and its dispatcher uses the same invoker identity and 1800-second deadline. No resource, grant, or trigger is created or verified by this documentary snapshot.

`pnpm dev` builds the worker automatically, starts a development-only loopback worker at the exact `FEEDBACK_WORKER_URL`, and starts the minimal local task API on the next port at `/_local-tasks/v2`. It watches worker source and scripts, rebuilding and restarting after edits. The listener validates `FEEDBACK_WORKER_URL` as `http://127.0.0.1:<port>/internal/v1/report-runs:execute` and derives the queue from the existing `FEEDBACK_TASK_QUEUE_PATH`; no additional environment variable is introduced. The app's development task adapter uses the same URL and queue path and authenticates to the loopback task API with its server-only local credential. The queue implements only named task create/readback and HTTP delivery. Its in-memory tasks disappear on restart.

Development delivery uses the real `createReportWorkerNodeServer` and HTTP handler with an ephemeral HMAC-signed local OIDC-like token, a fixed local audience/principal, and authentication before body reads. Both listeners bind only to `127.0.0.1`; the dev entrypoint rejects Cloud Run identity variables and `GOOGLE_APPLICATION_CREDENTIALS`. When all existing CMS and approved-generation settings are configured, the normal worker composition uses the action-scoped Strapi client, actual Vertex CountTokens/generation adapters, the real Playwright renderer, and shared local private bucket. It derives a deterministic synthetic evidence key from the approved key ID, source revision, pinned resource name, and a fixed domain tag; local mode makes no Secret Manager request. This predictable key is NOT production security evidence and must be limited to synthetic local data. GoogleAuth ADC access for Vertex is lazy until an actual report request and is development-only. Without report settings, `pnpm dev` retains the L1 loopback queue but the worker's fail-closed CMS port cannot claim or produce reports. Exact development CMS loopback origins remain unavailable outside `NODE_ENV=development`; production continues to require the allowlisted HTTPS origin. This path is separate from `dev:fixture`, which remains a synthetic report test fixture.

The shared private-report storage package also provides a development-only file bucket for the actual worker artifact contract and the app's existing mediated download reader. Both package entrypoints use the repository-local `.local/tb113-private-reports` directory; it is ignored by Git, requires private directory/file permissions, accepts only deterministic report object keys, rejects symlinked paths, and validates stored identity and PDF digest through the shared storage adapter. Production continues to use the configured private GCS bucket only.

`createDevelopmentReportWorkerDependencies` composes the same real Vertex providers as the production worker, but uses the explicit loopback Strapi origin, the shared local file bucket, lazy local ADC for Vertex, and deterministic synthetic evidence-key derivation. The CMS independently composes its CountTokens provider and derives the same synthetic key from approved metadata; it does not accept key bytes from the worker. Provider ports can replace external Google calls only in isolated tests. No model or report result is hard-coded in the normal worker runtime.

## Runtime boundary

`pnpm start` requires the existing `FEEDBACK_` worker settings, Cloud Run-provided `K_SERVICE`/`K_REVISION`, and `PORT`. It fails closed without approved configuration and rejects `GOOGLE_APPLICATION_CREDENTIALS`; do not add service-account keys, fake production defaults, or diagnostic/notifier fallbacks. `pnpm dev` has a separate, explicitly local-only loopback configuration path and does not alter production validation. Runtime dependencies and configuration names are defined by the package source and shared `@teleferico/tb113-runtime-contracts` package.

No Cloud Run service, image, Cloud Build trigger, queue, service identity, IAM grant, or staging deployment is created by this package. Those are separate, explicitly approved operator gates. Keep the app's `FEEDBACK_CAPABILITY_ENABLED` deployment default `false`.

The local, staging, and production worker identities have been created. The local custom role and operator-impersonation binding are configured; staging/production IAM boundaries and all service attachments remain pending, as recorded in [the infrastructure decision](../../docs/INFRA.md#tb-113-worker-service-account-decision-accounts-created-local-iam-configured-cloud-access-pending). This package does not provision IAM grants or attach identities to services.

## Current worker configuration

The worker process owns a plain `FEEDBACK_WORKER_CMS_TOKEN` Custom Content API token. In Strapi, enable exactly `workerClaim`, `workerSnapshot`, `workerCheckpoint`, `workerComplete`, and `workerFail` for this token. Keep the separate app token in the app process; the worker does not need it.

| Worker-process setting | Purpose |
| --- | --- |
| `BUILD_STRAPI_BASE_URL` | Strapi base URL. |
| `FEEDBACK_CMS_ALLOWED_ORIGIN` | The single approved Strapi origin; must match the base URL. |
| `FEEDBACK_WORKER_CMS_TOKEN` | Plain worker-owned Custom Content API token with exactly the five worker permissions above. |
| `FEEDBACK_WORKER_EVIDENCE_KEY` | Secret Manager resource name and pinned version in production, not key bytes. Development derives a synthetic-only key from approved nonsecret metadata and makes no Secret Manager call. |
| `FEEDBACK_VERTEX_PROJECT_ID`, `FEEDBACK_PRIVATE_BUCKET` | Approved Vertex project and private report bucket. |
| `FEEDBACK_WORKER_URL`, `FEEDBACK_TASK_QUEUE_PATH` | Worker execute endpoint and task queue. In development, the worker URL must be the exact loopback endpoint. |
| `FEEDBACK_WORKER_OIDC_AUDIENCE`, `FEEDBACK_TASK_INVOKER_EMAIL`, `FEEDBACK_WORKER_OIDC_PRINCIPAL` | Production task identity settings. |

`pnpm dev` loads only `services/survey-report-worker/.env` before building or starting its child worker. Existing process environment values take precedence over values in that file, and the dev entrypoint forces `NODE_ENV=development` before startup. Values from the file cannot add child `NODE_OPTIONS`; inherited `NODE_OPTIONS` are preserved. If the optional file is absent, inherited settings are used; other load failures stop startup with a bounded error. Restart `pnpm dev` after editing `.env`; file changes are not watched or reloaded. The normal worker startup is separate from the opt-in authenticated browser regression, which is run from `teleferico-app` with its local-feedback Playwright configuration.

App, CMS, and worker load the same versioned nonsecret profile from `packages/tb113-runtime-contracts/config/report-generation.json`. Do not copy it into environment files. It pins the approved model context-window budget (`1,048,576`) and standard non-global PayGo rates (`$1.65` input / `$8.25` output per million tokens), excluding promotional credits, caching, and contract discounts. Public sources: [Gemini 3.8 Flash model details](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-8-flash) and [Vertex AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing). The existing planner reserves output tokens and derives `104,858` safety-headroom tokens; the context window is a planning budget, not a prompt allowance. Configuration does not verify live Google access. The profile contains code-owned source/evidence identifiers and pricing version; the loader fills their generation-contract copies. Increment `pricingSnapshot.version` when a verified price changes. Existing report runs retain their persisted model and pricing snapshots. The worker build bundles the shared loader/profile; the CMS package runtime must include the root `packages/tb113-runtime-contracts` path.
