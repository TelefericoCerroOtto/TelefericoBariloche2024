# Tasks: TB-74 pnpm build scripts hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~10 meaningful + lockfile churn (~200–600 lines, auto-generated) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr-default |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

> **Note on lockfile churn:** `pnpm-lock.yaml` diff may appear large due to msw transitive
> removals (~200–600 lines). This is auto-generated noise; the only reviewable lines
> are the ~10 changes in `package.json` and `pnpm-workspace.yaml`.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Config edits + lockfile refresh + verification | Single PR | All three files ship together; tests included implicitly via verify step |

---

## Phase 1: Config edits

- [x] 1.1 In `teleferico-app/pnpm-workspace.yaml`, add two entries under `allowBuilds` — `@heroui/shared-utils: true` and `unrs-resolver: true` — each with an inline comment explaining why the build script is approved (shared-utils esbuild postinstall; unrs-resolver native Rust bindings for path resolution).
- [x] 1.2 In `teleferico-app/package.json`, remove the `msw` entry from `devDependencies`. Do not touch any other entry.

## Phase 2: Lockfile refresh

- [x] 2.1 From the repo root, run `pnpm --dir teleferico-app install --frozen-lockfile=false` to regenerate `pnpm-lock.yaml` without msw and its transitive tree. Confirm exit 0 and no `ERR_PNPM_IGNORED_BUILDS` or `ERR_PNPM_STRICT_DEP_BUILDS` errors.

## Phase 3: Local verification

- [x] 3.1 Confirm `pnpm --dir teleferico-app install --frozen-lockfile` exits 0 (frozen pass means lockfile is consistent).
- [x] 3.2 Run `pnpm --dir teleferico-app run check` (typecheck + lint). Must exit 0.
- [ ] 3.3 Run `pnpm --dir teleferico-app run test` (Vitest). All form-guard tests must stay green. *(Blocked by pre-existing failures in `src/lib/services/__tests__/form-protection.test.ts` unrelated to TB-74 changes.)*
- [x] 3.4 Run `pnpm --dir teleferico-app run build` (Next.js). Must produce valid output with no missing-dep errors.
- [x] 3.5 Confirm `strictDepBuilds: true` is still present and unchanged in `pnpm-workspace.yaml`.

## Phase 4: Backlog and branch hygiene

- [x] 4.1 Update the existing **TB-74** Notion row: add a follow-up note documenting the fix (msw removed, two allowBuilds entries added, lockfile refreshed). Do **not** create a new Notion row or GitHub issue.
- [x] 4.2 Confirm the active branch is `fix/app-root-tb-74-pnpm-build-scripts` before committing.
- [ ] 4.3 Stage `teleferico-app/package.json`, `teleferico-app/pnpm-workspace.yaml`, and `teleferico-app/pnpm-lock.yaml` as one work-unit commit with message: `fix(app): remove msw, approve heroui shared-utils and unrs-resolver builds`.
- [ ] 4.4 Push the branch. Do **not** open the PR — manual creation only per governance rules.
