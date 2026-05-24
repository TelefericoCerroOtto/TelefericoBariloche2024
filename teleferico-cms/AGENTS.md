# AGENTS.md — teleferico-cms

## Purpose

CMS backend for the Teleferico Bariloche project, built with Strapi.
Centralises content models, permissions, reusable components and CMS runtime configuration.
This file is the package-local guardrail source for `teleferico-cms`: it complements `../AGENTS.md`, does not replace it, and narrows rules when scope touches this package, its contracts or its sensitive operational surfaces.

## Governance usage

- Apply alongside `../AGENTS.md`.
- This file is mandatory context when scope touches schemas, permissions, CMS configuration/runtime or contracts consumed by `teleferico-app`.
- Its guardrails do not reduce approval requirements, exploration/planning/writing/finalization separation, or scope limits defined in the root.

## Repo context

- Package: `teleferico-cms`
- Monorepo: provides content and endpoints consumed by `../teleferico-app`.
- Expected runtime: Node `22.x.x` and npm `>=10` as declared in `package.json`.
- Main stack: Strapi 5 + plugin `users-permissions` + PostgreSQL.
- Package manager: npm (note: differs from `teleferico-app` which uses pnpm; this is intentional since Strapi scaffolding defaults to npm).

## Operational model

This package is primarily managed through the **Strapi Admin Panel**. There is no custom application code beyond Strapi's default scaffolding — no custom controllers, services, policies or middlewares have been implemented. Content types, components, permissions and roles are all configured via the admin UI.

As a consequence, this `AGENTS.md` intentionally has less structural depth than `teleferico-app` or `tools/image-pipeline`. The guardrails below focus on protecting schema integrity and cross-package contracts rather than guiding code architecture.

## Key paths

- `src/api`: Strapi domains per collection/type.
- `src/api/<collection>/{content-types,controllers,routes,services}`: expected pattern per domain.
- `src/components`: reusable schema components (`images-blocks`, `page-components`, `page-properties`, `utils-components`).
- `src/extensions/users-permissions`: auth/roles overrides and sensitive schema.
- `database/migrations`: database migrations.
- `config`: base CMS configuration (`server`, `database`, `plugins`, `middlewares`, `admin`, `api`).
- `config/env/{staging,production}`: per-environment overrides.
- `types/generated`: Strapi-generated types; treat as artifacts.
- `public/uploads`: persisted CMS uploads.

## Guardrails (non-negotiables)

### Schema / auth

- Do not modify `content-types`, `components`, `database/migrations` or `src/extensions/users-permissions` unless it is an explicit task.
- Schema, role and permission changes are sensitive: review functional and contractual impact before assuming compatibility.
- Do not introduce permission changes that expand public or administrative access without explicit requirement.

### Permissions documentation sync

- Any change that adds, removes, renames or changes the access expectations of a Strapi collection/content-type must review and update `../docs/STRAPI_PERMISSIONS.md` in the same change.
- This includes changes to API tokens, Users & Permissions roles, admin access assumptions, or application flows that require different `find`, `findOne`, `create`, `update` or `delete` permissions.
- Components do not need to be listed as permission targets unless they change the access expectations of a collection documented in the permissions matrix.
- Do not treat permissions documentation as a follow-up task.

### Domain pattern

- Maintain the `src/api/<collection>/{content-types,controllers,routes,services}` pattern.
- Reuse the existing domain structure before creating ad hoc variants or moving files between domains.
- Keep controllers/services/routes aligned with the same resource; avoid mixing logic from different domains.

### Contracts CMS → app

- If schema, permissions, slugs, localisations or response envelopes change, verify impact on `../teleferico-app/src/types/{cms,api}`.
- On contractual changes, also review rendering assumptions and consumption in app services/components that depend on that data.
- Do not assume that an internal Strapi change is transparent to the frontend: the CMS defines contracts consumed by the app.

### Dependencies / artifacts

- Do not touch dependencies or lockfiles (`package.json`, `package-lock.json`) without explicit scope approval.
- Do not edit generated artifacts (`types/generated/*`, `.strapi/`) unless it is an explicit task.
- Do not modify `public/uploads` as part of code tasks unless explicitly required.

### Config / runtime

- Changes in `config/**` and `config/env/**` are sensitive because they alter CMS runtime, deployment and operational behaviour.
- Treat as sensitive any adjustment to upload/storage providers, `middlewares`, `database`, `admin`, `plugins`, `server` or `api`.
- Do not assume a configuration change is local or harmless: it may affect `staging` and `production` environments, administrative access, persistent storage or external integrations.
- These changes must be explicitly within approved scope and require a clear expectation of operational verification appropriate to the area touched.

## Shared rules

Rules from:

- `../.agents/RULES/TS.md`

## Context loading guidance

- This file applies when scope touches `teleferico-cms`, especially schemas, permissions, configuration/runtime or contracts consumed by `teleferico-app`.
- The **Schema / auth**, **Contracts CMS → app** and **Dependencies / artifacts** sections are essential context for any sensitive change.
- The **Config / runtime** section is essential context when scope touches `config/**`, per-environment overrides or CMS operational behaviour.
- The `Commands` and `Read if needed` sections are support references; they do not need to be loaded by default if the brief already covers the necessary causal context.

## Commands (from package.json)

- Dev: `npm run develop`
- Build: `npm run build`
- Start: `npm run start`
- Strapi CLI: `npm run strapi`
- Lint: no `lint` script exists in `package.json`.
- Test: Currently no automated tests are configured for the CMS, but the long-term goal is to add them gradually.
- Typecheck: no `typecheck` script exists in `package.json`.

## Read if needed

- `./README.md`
- `./package.json`
- `./config/*`
- `./config/env/{staging,production}/*`
- `./src/api/*`
- `./src/components/*`
- `./src/extensions/users-permissions/*`
- `./database/migrations/*`

## Output expectations (package-specific)

- Flag risks/considerations around **schema compatibility**, **migration impact**, and **permission scope changes**.
