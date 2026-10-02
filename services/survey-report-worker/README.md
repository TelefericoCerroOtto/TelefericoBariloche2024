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
