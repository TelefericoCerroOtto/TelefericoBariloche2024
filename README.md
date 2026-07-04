# Teleférico Bariloche 2024

Monorepo for the public site, administrative dashboard, CMS, and image tooling of the Teleférico Cerro Otto project.

This README serves as the repository entry point. It summarizes the general structure, minimal local startup, and points to canonical documentation for each area. Operational details, infrastructure, and specific workflows are in each package's documents and in `docs/`.

## Main packages

| Path | Role | Runtime / package manager | Documentation |
| --- | --- | --- | --- |
| `teleferico-app` | Institutional site + administrative dashboard in Next.js | Node `20.x` + pnpm `9.x` | [teleferico-app/README.md](./teleferico-app/README.md) |
| `teleferico-cms` | CMS/API backend in Strapi | Node `22.x.x` + npm `>=10` | [teleferico-cms/README.md](./teleferico-cms/README.md) |
| `tools/image-pipeline` | Image ingestion and processing tooling | pnpm `9.x` | [tools/image-pipeline/README.md](./tools/image-pipeline/README.md) |

## Monorepo structure

- `public/`: shared repository assets
- `teleferico-app/`: public frontend and administration
- `teleferico-cms/`: Strapi backend and CMS configuration
- `tools/image-pipeline/`: image scripts and utilities
- `docs/`: infrastructure and conventions documentation

## Quick local start

1. Clone the repository and enter the root:

   ```bash
   git clone <repo-url>
   cd TelefericoBariloche2024
   ```

2. Start the CMS:

   ```bash
   cd teleferico-cms
   npm install
   cp .env.example .env
   npm run develop
   ```

   For simple local development you can use SQLite. If you need another database or details about deployment/transfer, see [teleferico-cms/README.md](./teleferico-cms/README.md).

3. Start the web app in another terminal:

   ```bash
   cd teleferico-app
   pnpm install
   cp .env.example .env.local
   pnpm run dev
   ```

   Adjust `.env.local` to point to the local CMS before starting the app. Details about variables and specific workflows are in [teleferico-app/README.md](./teleferico-app/README.md).

4. Default local URLs:

   - CMS: `http://localhost:1337`
   - App: `http://localhost:3000`

## Infrastructure and deployment

The current project topology is:

- `teleferico-app` deployed on Cloud Run
- `teleferico-cms` deployed on Cloud Run
- Strapi persisting data in Cloud SQL (PostgreSQL)
- Uploads served from Cloud Storage
- CI/CD resolved with Cloud Build, Artifact Registry and Secret Manager

The canonical reference for infrastructure, environments, and deployment is [docs/INFRA.md](./docs/INFRA.md).

## Documentation map

- [teleferico-app/README.md](./teleferico-app/README.md): scripts, variables, frontend workflows, Gmail OAuth and endpoint security architecture
- [teleferico-cms/README.md](./teleferico-cms/README.md): local development, CMS deployment, transfers and image editorial guides
- [tools/image-pipeline/README.md](./tools/image-pipeline/README.md): image pipeline usage
- [docs/INFRA.md](./docs/INFRA.md): infrastructure, environments, CI/CD and cloud topology
- [docs/CONVENTIONS.md](./docs/CONVENTIONS.md): commit and pull request conventions
- [docs/todo-workflow.md](./docs/todo-workflow.md): shared backlog governance between Notion and GitHub
- [docs/backlog-branch-pr-policy.md](./docs/backlog-branch-pr-policy.md): backlog, branch and implementation PR association policy
- [docs/CI-AUTOMATION.md](./docs/CI-AUTOMATION.md): automation and CI governance in GitHub Actions
- [docs/cerro-otto-business-context.md](./docs/cerro-otto-business-context.md): business domain context — physical zones, facilities, organization, and operations of Teleférico Cerro Otto
- [AGENTS.md](./AGENTS.md): operational rules for agents working in the repo

## Work conventions

- There is no single installation flow at root level; each package maintains its own scripts and variables.
- For code or documentation changes, use the conventions defined in [docs/CONVENTIONS.md](./docs/CONVENTIONS.md).
- For infrastructure or deployment decisions, take [docs/INFRA.md](./docs/INFRA.md) as the source of truth.