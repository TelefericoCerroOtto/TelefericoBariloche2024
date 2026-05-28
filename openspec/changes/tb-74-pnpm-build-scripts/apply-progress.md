# Apply Progress: TB-74 pnpm build scripts hardening

## Mode
Strict TDD

## Completed Tasks
- [x] 1.1 Add `@heroui/shared-utils` and `unrs-resolver` to `allowBuilds` in `teleferico-app/pnpm-workspace.yaml` with inline rationale comments.
- [x] 1.2 Remove `msw` from `teleferico-app/package.json` `devDependencies`.
- [x] 2.1 Refresh `teleferico-app/pnpm-lock.yaml` via `pnpm --dir teleferico-app install --frozen-lockfile=false`.
- [x] 3.1 Verify frozen install with `pnpm --dir teleferico-app install --frozen-lockfile`.
- [x] 3.2 Verify checks with `pnpm --dir teleferico-app run check`.
- [x] 3.4 Verify build with `pnpm --dir teleferico-app run build`.
- [x] 3.5 Confirm `strictDepBuilds: true` remains enabled.
- [x] 4.1 Update existing TB-74 Notion row with follow-up note and current branch.
- [x] 4.2 Confirm active branch is `fix/app-root-tb-74-pnpm-build-scripts`.

## Reviewed Build Scripts Findings
- `@heroui/shared-utils`: inspected published `scripts/postinstall.js` (1003 bytes). ASCII-only, no hidden/bidirectional characters. It reads local `next`/`react` versions, copies the matching local `dist/demi/*` shim into `dist/`, and patches one relative path in `dist/index.d.ts`. No network and no child process execution.
- `unrs-resolver`: inspected published `package.json` plus the `napi-postinstall` helper it invokes (`lib/cli.js` 985 bytes, `lib/index.js` 10533 bytes). All inspected files are ASCII-only, with no hidden/bidirectional characters. The helper can fall back to `npm install` or direct registry download if the platform binding is missing, but the current Google Buildpack path uses bare `pnpm install` without `--no-optional`, and the committed lockfile includes `@unrs/resolver-binding-linux-x64-gnu@1.11.1`, so the current CI path resolves the locked Linux binding locally before fallback logic is needed.
- `msw`: inspected published `config/scripts/postinstall.js` (1063 bytes). ASCII-only, no hidden/bidirectional characters. The script exits immediately unless the parent project's `package.json` defines `msw.workerDirectory`; this repo does not define that key, so the script is a no-op here. `msw` still appears transitively in the current lockfile via Vitest's optional peer graph, so it is now recorded explicitly as `msw: false` in `allowBuilds` to keep the script blocked while acknowledging it was reviewed.

## Remaining Tasks
- [ ] 3.3 Run `pnpm --dir teleferico-app run test` with all tests green (blocked by pre-existing unrelated failures).
- [ ] 4.3 Stage implementation files as one work-unit commit.
- [ ] 4.4 Push branch (manual PR flow remains unchanged).

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 + 1.2 | `teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts` | Unit | ⚠ `pnpm --dir teleferico-app run test` revealed pre-existing unrelated failures in `src/lib/services/__tests__/form-protection.test.ts` | ✅ Wrote failing assertions first for missing allowBuilds and `msw` presence | ✅ `pnpm --dir teleferico-app run test src/lib/__tests__/pnpm-build-policy.test.ts` passes after config edits | ✅ Policy coverage now focuses on strict flag, reviewed script approvals, and buildpack snapshot hardening; the redundant direct `msw` package.json assertion was removed | ✅ Adjusted assertions and helpers without relaxing the policy intent |
| 2.1 | `teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts` | Unit | N/A (no existing runtime file behavior changed) | ➖ Structural task (lockfile regeneration) | ✅ Lockfile regenerated successfully via install command | ➖ Triangulation skipped: command-driven structural task | ➖ None needed |
| 3.1 + 3.2 + 3.4 + 3.5 | `teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts` | Unit | N/A (verification tasks) | ➖ Verification-only tasks | ✅ Install/check/build commands executed successfully; strict dep build policy still present | ➖ Triangulation skipped: command-driven verification | ➖ None needed |

## Test Summary
- **Total tests written**: 4
- **Total tests passing (policy test file)**: 4
- **Layers used**: Unit (1 file)
- **Approval tests**: None — no refactoring of existing logic
- **Pure functions created**: 0 (config/package policy validation only)

## Verification Command Results
- ✅ `pnpm --dir teleferico-app install --frozen-lockfile=false`
- ✅ `pnpm --dir teleferico-app install --frozen-lockfile`
- ✅ `pnpm --dir teleferico-app run check`
- ❌ `pnpm --dir teleferico-app run test` (pre-existing mismatch: expected `TOO_MANY_REQUESTS`, received `EMAIL_LIMIT_EXCEEDED`)
- ✅ `pnpm --dir teleferico-app run build` (completed; local environment emitted expected Strapi connection warnings)

## Backlog / Issue Artifact Updates
- Updated existing Notion row `TB-74` (`https://www.notion.so/368a58c3fefc818b98a9c9fdedb49018`) with branch and follow-up note.
- Updated existing GitHub issue `#134` via progress comment (`https://github.com/TelefericoCerroOtto/TelefericoBariloche2024/issues/134#issuecomment-4558634634`).
