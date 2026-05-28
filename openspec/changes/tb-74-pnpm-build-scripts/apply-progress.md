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

## Remaining Tasks
- [ ] 3.3 Run `pnpm --dir teleferico-app run test` with all tests green (blocked by pre-existing unrelated failures).
- [ ] 4.3 Stage implementation files as one work-unit commit.
- [ ] 4.4 Push branch (manual PR flow remains unchanged).

## TDD Cycle Evidence
| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 + 1.2 | `teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts` | Unit | ⚠ `pnpm --dir teleferico-app run test` revealed pre-existing unrelated failures in `src/lib/services/__tests__/form-protection.test.ts` | ✅ Wrote failing assertions first for missing allowBuilds and `msw` presence | ✅ `pnpm --dir teleferico-app run test src/lib/__tests__/pnpm-build-policy.test.ts` passes (3/3) after config edits | ✅ 3 behavior assertions (strict flag retained, required build script approvals present, `msw` absent) | ✅ Adjusted assertion to quoted YAML key (`'@heroui/shared-utils'`) without relaxing behavior checks |
| 2.1 | `teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts` | Unit | N/A (no existing runtime file behavior changed) | ➖ Structural task (lockfile regeneration) | ✅ Lockfile regenerated successfully via install command | ➖ Triangulation skipped: command-driven structural task | ➖ None needed |
| 3.1 + 3.2 + 3.4 + 3.5 | `teleferico-app/src/lib/__tests__/pnpm-build-policy.test.ts` | Unit | N/A (verification tasks) | ➖ Verification-only tasks | ✅ Install/check/build commands executed successfully; strict dep build policy still present | ➖ Triangulation skipped: command-driven verification | ➖ None needed |

## Test Summary
- **Total tests written**: 3
- **Total tests passing (new test file)**: 3
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
