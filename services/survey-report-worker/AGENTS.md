# AGENTS.md — survey-report-worker

## Purpose and boundary

- This root package owns the private TB-113 Node worker process, its build, and its Node-native package smoke tests.
- `teleferico-app` owns browser routes, administration, task dispatch, and mediated report downloads.
- `teleferico-cms` owns persistence, custom-token actions, checkpoint/CAS validation, and the independent CountTokens/evidence-key authority.
- Shared pure report contracts live in `../../packages/survey-reporting-core`; shared TB-113 runtime contracts and private-object adapters live in their root packages.
- Worker source must not import from `teleferico-app` or `teleferico-cms`.

## Security and runtime invariants

- Keep the exact execute route and signed OIDC verification before body reads.
- Missing/malformed runtime configuration must fail before listener creation or provider/storage operations.
- Use Cloud Run keyless identity only; never add service-account keys or permit `GOOGLE_APPLICATION_CREDENTIALS`.
- Keep all CMS action tokens action-scoped. Do not add session-JWT/public-token fallback.
- Do not log prompts, comments, model output, tokens, key bytes, signed URLs, or raw dependency errors.
- Keep `FEEDBACK_CAPABILITY_ENABLED=false` in app deployment defaults.
- Do not add optional failure diagnostics, alert delivery, verified task-absence compensation, or new Google defaults in this package.

## Dependency and build policy

- Use only exact package versions in `package.json` and the package-local `pnpm-lock.yaml`.
- Preserve `minimumReleaseAge`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`, `strictDepBuilds`, and reviewed `allowBuilds` entries in `pnpm-workspace.yaml`.
- Do not install dependencies or browser binaries from build scripts. Build from the frozen package graph and verified local renderer assets.
- `dist/` is generated and ignored. It contains the runnable bundle and packaged pinned renderer assets; it is not proof of a deployable Cloud Run image or operational readiness.

## Verification

- `pnpm run typecheck`
- `pnpm run build`
- `pnpm test` — Node's built-in `node:test`; requires `dist/` and uses fake runtime dependencies plus loopback HTTP only.
- `pnpm run dev:fixture [--port <port>]` — starts the local fake worker on `127.0.0.1` only; it uses synthetic in-memory CMS and private storage, fake OIDC, CountTokens, and PDF rendering, and never calls external providers or cloud services.
- Keep app/CMS integration tests in their owning packages. Never replace them with package smoke tests.
