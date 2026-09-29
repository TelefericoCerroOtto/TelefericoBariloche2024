# TB-113 private report worker

This package owns the private Node worker process for authenticated report-task execution. It does not belong to the public Next.js runtime. The app retains administration, task dispatch, and mediated downloads; Strapi retains lifecycle state, action scopes, checkpoint validation, and independent CountTokens/evidence-key authority. Shared reporting code is under `../../packages/`.

## Local build and run

Use Node `v22.22.0` and pnpm `10.33.0` with this package's lockfile:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run build
pnpm test
pnpm start
```

The install must follow the worker package's `pnpm-workspace.yaml` policy. Playwright browser installation is disabled; `build` copies only the locally available, SHA-256-pinned Chromium revisions and DejaVuSans font, then bundles the worker and shared TypeScript packages with the pinned esbuild version. It does not pull a container image or download browser binaries. Missing or mismatched local assets fail the build.

The build output is `dist/`:

- `server.cjs`: bundled worker and shared package source; declared runtime packages remain external and are resolved from the package's installed dependencies.
- `run-worker.mjs`: executable Node entrypoint that sets the package-local browser path, injects the packaged font path, validates configuration, and only then listens on `PORT` (default `8080`).
- `browsers/chromium-1228/` and `browsers/chromium_headless_shell-1228/`: complete pinned Playwright Chromium directories.
- `assets/fonts/DejaVuSans.ttf`: pinned font copied from the verified local system path.

`pnpm start` runs `node --conditions=react-server dist/run-worker.mjs`. The listener accepts only `POST /internal/v1/report-runs:execute`; signature/audience/principal/time validation precedes request-body reads. The built-in `node:test` suite uses fake OIDC and CMS dependencies, exercises invalid OIDC and terminal replay over loopback HTTP, and launches the built entrypoint with missing configuration. It makes no Google or CMS calls.

## Runtime boundary

The worker requires the existing TB-113 worker settings, Cloud Run-provided `K_SERVICE`/`K_REVISION`, and `PORT`. It fails closed without approved configuration and rejects `GOOGLE_APPLICATION_CREDENTIALS`; do not add service-account keys, fake production defaults, or diagnostic/notifier fallbacks. Runtime dependencies and configuration names are defined by the package source and shared `@teleferico/tb113-runtime-contracts` package.

No Cloud Run service, image, Cloud Build trigger, queue, service identity, IAM grant, or staging deployment is created by this package. Those are separate, explicitly approved operator gates. Keep the app's `FEEDBACK_CAPABILITY_ENABLED` deployment default `false`.
