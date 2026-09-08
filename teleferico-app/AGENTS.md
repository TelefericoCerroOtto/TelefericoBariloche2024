# AGENTS.md — teleferico-app

## Purpose

Frontend web for the Teleferico Bariloche project, built with Next.js (App Router).
Combines institutional public site, administrative dashboard and internal/public route handlers.
Integrates Strapi (CMS), Auth.js, protected forms and Gmail OAuth flow.
This file is the package-local guardrail source for `teleferico-app`: it complements `../AGENTS.md`, does not replace it, and narrows rules when scope touches this package or its sensitive boundaries.

## Governance usage

- Apply alongside `../AGENTS.md`.
- This file is mandatory context when scope touches `teleferico-app`, its client/server boundaries, its APIs, its forms or its administrative flows.
- Its guardrails do not reduce approval requirements, exploration/planning/writing/finalization separation, or scope limits defined in the root.

## Repo context

- Package: `teleferico-app`
- Monorepo: consumes content/operations from the CMS (`../teleferico-cms`) via Strapi and internal proxy endpoints.
- Deployment: `cloudbuild.yaml` builds/deploys to Cloud Run with environment variables/secrets.
- Expected runtime: Node `22.x` and pnpm `10.x` as declared in `package.json`.

## Key paths

- `src/app/[locale]/(institutional)`: public site pages with locale segmentation.
- `src/app/[locale]/(administration)`: administrative dashboard UI.
- `src/app/api`: route handlers (proxy, forms, admin, auth, oauth).
- `src/app/api/oauth/google`: one-time OAuth setup for Gmail (`init` and `callback`).
- `src/components/institutional`: UI components for institutional views.
- `src/components/administration`: administrative panel components.
- `src/components/forms`: shared form pieces (includes anti-bot UX).
- `src/lib/actions/forms.ts`: server actions for public forms.
- `src/lib/services/cms`: server-side services for CMS requests.
- `src/lib/services/postulation.ts`: internal API consumption services (route handlers).
- `src/lib/services/contact.ts`: email sending service via Gmail API (OAuth2).
- `src/lib/http/clients/auth-internal-fetch.ts`: client for authenticated internal dashboard requests.
- `src/lib/http/guards`: security guards (origin, csrf, rate-limit, internal key, etc.).
- `src/lib/schemas/forms`: payload validations for forms.
- `src/hooks`: reusable client-side hooks.
- `src/types`: central type layer shared across UI, services and route handlers.
- `src/types/api`: base typed contracts for internal/public app endpoints.
- `src/types/api/admin`: request/response types for admin operations (`/api/admin/*`).
- `src/types/api/public-forms`: public form contracts (contact/postulation and associated guards).
- `src/types/cms`: Strapi content models consumed by components and services.
- `src/types/cms/api`: CMS API envelope/response types.
- `src/types/cms/api/translations`: typed structures for CMS content translations/localisations.
- `src/utils`: pure reusable utilities.

## Guardrails (non-negotiables)

### App Router / structure

- Maintain App Router structure with `[locale]` and route groups unless explicitly requested otherwise.

### Security (APIs, forms, admin)

- Do not weaken or bypass existing API security layers (`origin`, `csrf`, `internal-api-key`, `rate-limit`, `honeypot`).
- Server-to-server endpoints (`/api/contact`, `/api/postulation`) are only consumed from server actions/services with `x-internal-api-key`.
- Admin endpoints (`/api/admin/*`) must maintain `auth()` + `x-csrf-token` + origin validation.
- Public forms maintain full security pipeline: `runFormGuards`/`withFormGuards`, honeypot, `formLoadedAt`, schema validation and captcha.
- Gmail OAuth flow (`/api/oauth/google/*`) is a one-time setup: do not convert it into a public endpoint or remove `INIT_TOKEN`/signed `state`.

### Client/Server boundaries

- No direct calls to Strapi from client components: use `/api/proxy` (via `useProxy`) or server-side services.
- `src/lib/services/*` and `src/lib/http/*` are **server-only**: do not import them from Client Components (`"use client"`).

### Secrets / sensitive config

- Do not expose secrets to the client or hardcode credentials; `.env.local` is never versioned.

### Infra / build config

- Do not change `next.config.mjs` or `cloudbuild.yaml` unless the task is explicitly about infrastructure/deployment.

### Types / quality

- Keep types centralised in `src/types`; avoid introducing unnecessary `any`.
- Any new agnostic and reusable utility must live in `src/utils`.

### Dependencies / artifacts

- Do not touch dependencies or lockfiles (`package.json`, `pnpm-lock.yaml`) without explicit request.
- Do not edit generated artifacts (`.next/`, `tsconfig.tsbuildinfo`) or heavy folders.

### Brand identity

- Before implementing any new page, visual component, or design-significant UI change, read `docs/brand-implementation-guide.md` for brand identity rules (colors, typography, spacing, logo usage, visual tone, brand motifs).
- Respect the documented color palette, especially the red surface-area rules. Do not introduce new reds outside the documented palette.
- Maintain the documented brand motifs (LogoBadge, HighlightLastWord, red ring cards, cable line motif) when implementing institutional pages.
- Do not decompose or rearrange logo SVG elements. Use the documented variants for the appropriate background context.

### Testing

- Automated tests exist for public forms (postulation/contact) and their guards.
- Any change to `src/lib/http/guards`, `src/lib/services/form-protection.ts`, or the form API routes MUST be backed by passing tests.
- Run `pnpm run test` to verify changes in these domains.
- Playwright E2E tests are Chromium-only. `pnpm run test:e2e` starts or reuses test-only local CMS fixtures and Next.js servers; do not add production-accessible test bypasses.
- The repository-level Cloud Build baseline at `../cloudbuild.playwright-e2e.json` preserves the fixture-backed smoke suite and fails closed when `COMMIT_SHA^{commit}` cannot be verified against `HEAD^{commit}`. Every Node step enables Corepack before package work because Cloud Build containers are isolated. Its fourth fixture pilot passed for `498004d7f065e6b0a43bff42dd95c672efc2b707`; the appended real-stack readiness pilot is not yet run and must stay unauthenticated, write-free, synthetic, and isolated on the `cloudbuild` Docker network. It must not introduce Cloud SQL, Cloud Run, staging, or production dependencies.

## Architecture & conventions

- Main stack: Next.js 15 + React 18 + strict TypeScript + Tailwind CSS v3.
- Import alias available: `@/*` maps to `src/*` (`tsconfig.json`); prefer it over long relative paths.
- UI organised by domain in `components/{institutional,administration,forms,shared,ui}`.
- Business/network logic outside components: use `src/lib/{actions,services,adapters,http}`.
- HTTP guards centralised in `src/lib/http/guards`; reuse existing helpers before creating new ones.
- Form schemas in `src/lib/schemas/forms`, kept in sync with types in `src/types/forms.d.ts`.
- Cross-cutting constants in `src/lib/constants`; avoid duplicating critical strings (routes, tags, enums).
- Where `index.ts` barrel exports exist, maintain that pattern.
- Recommended public form flow: component → server action → service → internal route handler → external provider.
- In internal route handler calls, call `APP_INTERNAL_BASE_URL + /api/...`, include `Origin: NEXT_PUBLIC_SITE_URL`, and send `x-internal-api-key` where applicable.
- `ensureTrustedOrigin` is the entry point for origin validation; in development it accepts private network hostnames and in production it maintains strict validation.
- CMS proxy: the client consumes `/api/proxy/[...endpoint]`; the handler resolves the Strapi URL and applies the session token on the server.
- Respect current tokens and palette (`tailwind.config.ts`, `src/app/globals.css`).
- Reuse existing components (`src/components/ui`, `src/components/shared`) and `heroui` where applicable.
- If not yet implemented, improve component accessibility (contrast, ARIA roles, alt text, focus states, etc.).
- Middleware and auth are sensitive areas (`src/middleware.ts`, `src/auth.ts`); changes there require extra validation.

## Shared rules

Rules from:

- `../.agents/RULES/TS.md`

## Context loading guidance

- This file applies when scope touches `teleferico-app`, its client/server boundaries, or its sensitive flows.
- The **Security**, **Client/Server boundaries**, **Secrets**, **Infra / build config** sections, and the sensitive points in **Architecture & conventions** are essential context when work affects those areas.
- The `Commands` and `Read if needed` sections are support references. They should not be loaded by default if the brief already covers the necessary causal context.

## Commands (from package.json)

- Dev: `pnpm run dev`
- Build: `pnpm run build`
- Lint: `pnpm run lint`
- Test: `pnpm run test`
- E2E: `pnpm run test:e2e`
- Start: `pnpm start`
- Typecheck: `pnpm run typecheck`

## "Read if needed" references

- `./README.md`
- `../README.md`
- `./.env.example`
- `./package.json`
- `./tsconfig.json`
- `./next.config.mjs`
- `./tailwind.config.ts`
- `./postcss.config.mjs`
- `./.prettierrc`
- `./.npmrc`
- `./.eslintrc.json`
- `./components.json`
- `./cloudbuild.yaml`
- `./src/app/[locale]/(institutional)/news/_components/README.md`
- `../docs/brand-implementation-guide.md`

## Output expectations (package-specific)

- Additionally, in this package: flag risks/considerations around **security**, **i18n**, and changes affecting **config/deploy**.
