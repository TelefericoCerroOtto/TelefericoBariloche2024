## Exploration: tb-74-pnpm-build-scripts

### Current State
The staging build for `teleferico-app` fails during the `pnpm install` step. 
This occurs because the project uses pnpm v10 and enforces supply-chain security via `strictDepBuilds: true` in `teleferico-app/pnpm-workspace.yaml`. As a result, packages with lifecycle scripts that are not explicitly approved in the `allowBuilds` list cause the installation to fail with `ERR_PNPM_IGNORED_BUILDS`.
The failing packages are:
- `@heroui/shared-utils@2.1.12` (transitive dependency of `@heroui/react`)
- `msw@2.14.6` (unused dev dependency)
- `unrs-resolver@1.11.1` (transitive dependency of `eslint-import-resolver-typescript` within the `eslint` tree)

Cloud Build currently executes `pack build` without explicit `NODE_ENV=production`, meaning `devDependencies` are installed and their postinstall scripts trigger the failure.

### Affected Areas
- `teleferico-app/package.json` — Unused `msw` dependency present.
- `teleferico-app/pnpm-workspace.yaml` — `allowBuilds` needs updates to permit essential scripts.
- `docs/infra/cloud-build/app-staging.yaml` — Validated to ensure `NODE_ENV=production` is NOT appended (as it would incorrectly skip `tailwindcss` and `typescript` needed by Next.js during build).

### Approaches
1. **Approve all failing scripts in `allowBuilds`**
   - Pros: Fixes build, preserves current Next.js linting and typechecking during the build process.
   - Cons: Retains `msw` as unused bloat; allows `unrs-resolver` (a 3rd party resolver) to run scripts.
   - Effort: Low

2. **Remove `msw` and approve `@heroui/shared-utils` & `unrs-resolver`**
   - Pros: Cleans up unused `msw` dependency. Successfully passes `strictDepBuilds: true` by allowing only the necessary remaining scripts. Linting operates correctly during `next build`.
   - Cons: Still allows `unrs-resolver` to execute scripts.
   - Effort: Low

3. **Remove `msw`, separate build from lint, and skip `eslint` install via production mode**
   - Pros: Avoids allowing `unrs-resolver` entirely.
   - Cons: Enforcing `NODE_ENV=production` during Cloud Build's `pack build` skips `tailwindcss` and `typescript`, breaking the `next build`. Moving these to `dependencies` is an anti-pattern. Next.js natively lints during builds so it requires ESLint present.
   - Effort: High

### Recommendation
**Approach 2**: Remove `msw` and approve `@heroui/shared-utils` and `unrs-resolver`. 
- `msw` is confirmed entirely unused in `teleferico-app` (no imports found). 
- Next.js needs `tailwindcss` and `typescript` (and optionally `eslint`) to run correctly during `next build`, so attempting to force `NODE_ENV=production` during the Cloud Build pack phase is inappropriate and will break the build.
- `strictDepBuilds: true` should remain unchanged for security. Explicitly listing the required scripts in `teleferico-app/pnpm-workspace.yaml` is the exact intended workflow for pnpm 10 supply-chain security.

### Risks
- The `unrs-resolver` postinstall script compiles a rust/C binding. Approving it is low-medium risk but required since `eslint` brings it in as a transitive dependency.
- `@heroui/shared-utils` postinstall is local file operations (low risk).

### Ready for Proposal
Yes
