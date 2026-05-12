# AGENTS.md — TelefericoBariloche2024

This file defines the portable repository-wide governance for agents working in this monorepo under the current GentleAI/OpenCode/SDD workflow.

## Repo shape

- Governed packages in this migration slice:
  - `teleferico-app` (Next.js + TypeScript + Tailwind): public site plus administrative dashboard
  - `teleferico-cms` (Strapi): CMS/API backend
- Separately scoped tooling:
  - `tools/image-pipeline`: local-first image authoring and batch processing. Has its own `AGENTS.md` with self-contained governance. It is NOT part of the public site runtime or the CMS; treat it as an independent tool unless a change explicitly crosses its boundary.
- Root surfaces: `public/`, `teleferico-app/`, `teleferico-cms/`, `tools/`, `docs/`, `.agents/`

## Key paths

### teleferico-app

- Routing/layouts: `teleferico-app/src/app`
- UI: `teleferico-app/src/components/{administration,forms,institutional,shared,ui}`
- Logic/config: `teleferico-app/src/lib/{actions,adapters,auth,constants,google,helpers,http,schemas,services}`
- Types: `teleferico-app/src/types/{api,cms}`
- Custom hooks: `teleferico-app/src/hooks`
- Utilities: `teleferico-app/src/utils`

### teleferico-cms

- Environments: `teleferico-cms/config/env/{staging,production}`
- Migrations: `teleferico-cms/database/migrations`
- API domain: `teleferico-cms/src/api/*/{content-types,controllers,routes,services}`
- Strapi components: `teleferico-cms/src/components/{images-blocks,page-components,page-properties,utils-components}`
- Auth/roles: `teleferico-cms/src/extensions/users-permissions`
- Generated types: `teleferico-cms/types/generated`

## Package-local governance

- `teleferico-app/AGENTS.md`, `teleferico-cms/AGENTS.md` and `tools/image-pipeline/AGENTS.md` are critical package-local guardrail sources.
- Package-local files refine this root guidance for their own package boundaries and sensitive flows; they must not weaken runtime instructions, user approvals, or approved slice boundaries.

## Scope-sensitive changes

The following changes are sensitive and must be explicitly called out in a proposal:

- Dependency and lockfile changes
- Strapi schema/auth changes (`content-types`, `components`, `migrations`, `users-permissions`, generated types)
- Large refactors or architecture changes
- Infrastructure, deployment, credential, or environment-sensitive changes

## GCP CLI operational rules

These rules apply to **all commands** executed through Google Cloud SDK / CLI (and wrappers that ultimately operate on GCP resources for this project).

| Command type | Rule |
|---|---|
| Safe read-only commands | Run without asking. |
| Sensitive reads | Ask first. This includes secrets, secret metadata, IAM-sensitive inspection, or any read that could expose private information directly or indirectly. |
| Mixed batches | Run the safe part first, then stop and ask before any sensitive part. |
| Non-destructive but irreversible / hard-to-revert changes | Ask first. |
| Production changes | Ask first, always. |
| Destructive changes | Ask first, always. |
| Ambiguous commands | Ask first. If you cannot classify a command with confidence, default to confirmation. |

### Required preflight

- If a command offers `dry-run`, `plan`, `preview`, or an equivalent simulation mode, run that mode **before** any real change.
- Dry-run / plan / preview never requires confirmation because it does not apply an effective change.

### Confirmation format

When confirmation is required, ask once with **one consolidated list** of the exact commands to be executed.

For each command, include:

- the exact command
- a brief direct summary of what it will do
- why it needs approval
- the affected environment (`staging`, `production`, etc.)
- the expected result
- the risk level
- rollback options, if any

### Small examples

- `gcloud secrets versions access ...` → sensitive read, ask first.
- `gcloud app deploy` or a production deploy script → production change, ask first.
- `gcloud ... delete ...` / `destroy` / `purge` → destructive, ask first.

## Deployment governance

- Direct deployments from the console are prohibited.
- The only operational path to deploy is through a merge of a pull request into the branch associated with the target environment.
- The agent may prepare the pull request and supporting changes, but it must not decide, approve, or perform the merge.

### Practical default

When a command is not clearly safe, treat it as sensitive and ask before executing.

## Human conventions

- Conventional commits + scopes + PR titles: `docs/CONVENTIONS.md`
- GCP infrastructure: `docs/INFRA.md`

## Documentation maintenance

Whenever code, flows, architecture, contracts or configuration change in a way that affects documented behaviour, update the relevant documentation **in the same change**. This includes but is not limited to:

- Package-local `AGENTS.md` (guardrails, key paths, conventions)
- `README.md` files at any level
- `docs/*` (CONVENTIONS.md, INFRA.md, any domain-specific docs)
- Shared rules under `.agents/RULES/*`

Do not treat documentation as a follow-up task; outdated docs actively mislead agents and humans.
