# Proposal: TB-74 pnpm build scripts hardening

## Intent

Staging build of `teleferico-app` fails at `pnpm install` with `ERR_PNPM_IGNORED_BUILDS` because pnpm 10 enforces `strictDepBuilds: true` and three transitive packages run lifecycle scripts missing from `allowBuilds`. Unblock the pipeline without weakening supply-chain security and without breaking `next build`.

## Scope

### In Scope
- Remove unused `msw` devDependency from `teleferico-app/package.json` and refresh `pnpm-lock.yaml`.
- Add `@heroui/shared-utils` and `unrs-resolver` to `allowBuilds` in `teleferico-app/pnpm-workspace.yaml` with justifying comments.
- Keep `strictDepBuilds: true` unchanged.
- Verify Cloud Build `pack build` continues without `NODE_ENV=production`.
- Track this as follow-up work under existing Notion row TB-74 (no duplicate).

### Out of Scope
- Setting `NODE_ENV=production` in Cloud Build (breaks `next build` — Next 15 needs `tailwindcss` and `typescript` from devDependencies).
- Moving `tailwindcss`/`typescript` to `dependencies` (anti-pattern).
- Editing `cloudbuild.yaml` or infra scripts unless verification reveals an actual gap.
- Changes to `teleferico-cms` install flow.

## Capabilities

### New Capabilities
None — build/infra hardening, no spec-level change.

### Modified Capabilities
None — no product requirements change.

## Approach

Exploration's Approach 2:
1. Delete `msw` from `devDependencies`; refresh lockfile.
2. Append `@heroui/shared-utils: true` and `unrs-resolver: true` to `allowBuilds` with comments.
3. Run `pnpm install` locally to confirm `strictDepBuilds: true` passes.
4. Run the verify set from `openspec/config.yaml`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `teleferico-app/package.json` | Modified | Remove `msw` from `devDependencies`. |
| `teleferico-app/pnpm-lock.yaml` | Modified | Lockfile refresh. |
| `teleferico-app/pnpm-workspace.yaml` | Modified | Two new `allowBuilds` entries. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `unrs-resolver` postinstall compiles native bindings. | Low | `trustPolicy: no-downgrade` + `minimumReleaseAge` already in place; document rationale inline. |
| Removing `msw` breaks a hidden fixture. | Very Low | No imports found; verify runs `pnpm --dir teleferico-app run test`. |
| Cloud Build still fails on another unsurfaced script. | Low | Reproduce locally with `pnpm install --frozen-lockfile=false` before merge. |

## Rollback Plan

Revert the three modified files. No schema, runtime artifact, or infra change to undo.

## Dependencies

- Local pnpm 10.x (matches `engines.pnpm`).
- Existing backlog item **TB-74** stays as the single Notion source of truth.

## Success Criteria

- [ ] `pnpm --dir teleferico-app install --frozen-lockfile=false` exits 0 with `strictDepBuilds: true` intact.
- [ ] `pnpm --dir teleferico-app run check` passes.
- [ ] `pnpm --dir teleferico-app run build` produces valid Next.js output.
- [ ] `pnpm --dir teleferico-app run test` passes (form-guard coverage preserved).
- [ ] Cloud Build staging runs `pack build` without `NODE_ENV=production`.
- [ ] TB-74 Notion row updated with a follow-up note; no duplicate created.
- [ ] PR is created manually once changes land in a branch (no automation).
