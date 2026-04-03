# AGENTS.md — teleferico-app

## Purpose

Frontend web del proyecto Teleferico Bariloche, construido con Next.js (App Router).
Combina sitio institucional, dashboard administrativo y route handlers internos/publicos.
Integra Strapi (CMS), Auth.js, formularios protegidos y flujo OAuth de Gmail.
Este archivo es la fuente package-local de guardrails para `teleferico-app`: complementa `../AGENTS.md`, no lo reemplaza, y refina reglas cuando el scope toca este paquete o sus limites sensibles.

## Governance usage

- Aplicar junto con `../AGENTS.md`
- Este archivo es contexto obligatorio cuando el scope toca `teleferico-app`, sus limites client/server, sus APIs, sus formularios o sus flujos administrativos.
- Sus guardrails no reducen requisitos de aprobacion, separacion entre exploracion/planificacion/escritura/finalizacion, ni limites de finalizacion definidos en el root.

## Repo context

- Paquete: `teleferico-app`
- Monorepo: consume contenido/operaciones del CMS (`../teleferico-cms`) via Strapi y endpoints proxy internos.
- Despliegue: `cloudbuild.yaml` build/deploy a Cloud Run con variables/secrets de entorno.
- Runtime esperado: Node `22.x` y pnpm `10.x` segun `package.json`.

## Key paths

- `src/app/[locale]/(institutional)`: paginas publicas del sitio con segmentacion por locale.
- `src/app/[locale]/(administration)`: UI del dashboard administrativo.
- `src/app/api`: route handlers (proxy, formularios, admin, auth, oauth).
- `src/app/api/oauth/google`: setup one-time de OAuth para Gmail (`init` y `callback`).
- `src/components/institutional`: componentes de UI para vistas institucionales.
- `src/components/administration`: componentes del panel administrativo.
- `src/components/forms`: piezas compartidas de formularios (incluye anti-bot UX).
- `src/lib/actions/forms.ts`: server actions de formularios publicos.
- `src/lib/services/cms`: servicios server-side para requests al CMS.
- `src/lib/services/postulation.ts`: servicios de consumo de api interna (route handlers).
- `src/lib/services/contact.ts`: servicio de API de Google para enviar mails a través del formulario de contacto.
- `src/lib/http/clients/auth-internal-fetch.ts`: cliente para requests internas autenticadas del dashboard.
- `src/lib/http/guards`: guards de seguridad (origin, csrf, rate-limit, internal key, etc.).
- `src/lib/schemas/forms`: validaciones de payload para formularios.
- `src/hooks`: hooks reutilizables de cliente.
- `src/types`: capa central de tipos compartidos entre UI, servicios y route handlers.
- `src/types/api`: contratos tipados base para endpoints internos/publicos del app.
- `src/types/api/admin`: tipos de request/response para operaciones administrativas (`/api/admin/*`).
- `src/types/api/public-forms`: contratos de formularios publicos (contacto/postulacion y guards asociados).
- `src/types/cms`: modelos de contenido de Strapi consumidos por componentes y servicios.
- `src/types/cms/api`: tipos de envelopes/respuestas del API de CMS.
- `src/types/cms/api/translations`: estructuras tipadas de traducciones/localizaciones del contenido CMS.
- `src/utils`: utilidades puras reutilizables.

## Guardrails (non-negotiables)

### App Router / estructura

- Mantener la estructura App Router con `[locale]` y route groups, excepto pedido explícito.

### Security (APIs, formularios, admin)

- No debilitar ni saltar capas de seguridad existentes en APIs (`origin`, `csrf`, `internal-api-key`, `rate-limit`, `honeypot`).
- Endpoints server-to-server (`/api/contact`, `/api/postulation`) solo se consumen desde server actions/servicios con `x-internal-api-key`.
- Endpoints admin (`/api/admin/*`) deben mantener `auth()` + `x-csrf-token` + validacion de origen.
- Formularios publicos mantienen pipeline de seguridad completo: `runFormGuards`/`withFormGuards`, honeypot, `formLoadedAt`, schema validation y captcha.
- Flujo OAuth Gmail (`/api/oauth/google/*`) es de configuracion puntual: no convertirlo en endpoint publico ni quitar `INIT_TOKEN`/`state` firmado.

### Client/Server boundaries

- No se realizan llamadas directas a Strapi desde componentes de cliente: usar `/api/proxy` (via `useProxy`) o servicios server-side.
- `src/lib/services/*` y `src/lib/http/*` son **server-only**: no importarlos desde Client Components (`"use client"`).

### Secrets / configuración sensible

- No exponer secretos en cliente ni hardcodear credenciales; `.env.local` nunca se versiona.

### Infra / build config

- No cambiar `next.config.mjs` ni `cloudbuild.yaml` salvo tareas explicitas de infraestructura/despliegue.

### Types / calidad

- Mantener tipado centralizado en `src/types`; evitar introducir `any` innecesario.
- Cualquier utilidad agnóstica y reutilizable nueva debe vivir en `src/utils`.

### Dependencias / artefactos

- No tocar dependencias o lockfiles (`package.json`, `pnpm-lock.yaml`) sin solicitud explicita.
- No editar artefactos generados (`.next/`, `tsconfig.tsbuildinfo`) ni carpetas pesadas.

## Architecture & conventions

- Stack principal: Next.js 15 + React 18 + TypeScript estricto + Tailwind CSS.
- Import alias disponible: `@/*` mapea a `src/*` (`tsconfig.json`); preferirlo sobre rutas relativas largas.
- Organizacion por dominio UI en `components/{institutional,administration,forms,shared,ui}`.
- Logica de negocio/red fuera de componentes: usar `src/lib/{actions,services,adapters,http}`.
- Guards HTTP centralizados en `src/lib/http/guards`; reutilizar helpers existentes antes de crear nuevos.
- Esquemas de formularios en `src/lib/schemas/forms`, en sincronia con tipos de `src/types/forms.d.ts`.
- Constantes transversales en `src/lib/constants`; evitar duplicar strings criticos (rutas, tags, enums).
- Donde existan `index.ts` de barrel export, mantener ese patron.
- Flujo recomendado en formularios publicos: componente -> server action -> servicio -> route handler interno -> proveedor externo.
- En llamadas internas a route handlers, incluir `Origin: NEXT_PUBLIC_BASE_URL` y `x-internal-api-key` cuando corresponda.
- `ensureTrustedOrigin` es la puerta de entrada para validacion de origen; en desarrollo acepta hostnames de red privada y en produccion mantiene validacion estricta.
- Proxy CMS: el cliente consume `/api/proxy/[...endpoint]`; el handler resuelve URL de Strapi y aplica token de sesion en servidor.
- Respetar tokens y paleta actual (`tailwind.config.ts`, `src/app/globals.css`).
- Reutilizar componentes existentes (`src/components/ui`, `src/components/shared`) y `heroui` cuando aplique.
- Si aún no está implementado, mejorar la accesibilidad del componente (contraste, roles ARIA, texto alternativo, estados de foco, etc.).
- Middleware y auth son puntos sensibles (`src/middleware.ts`, `src/auth.ts`); cambios allí requieren validacion extra.

## Shared rules

Aplican reglas de:

- `../docs/RULES/TS.md`

## Context loading guidance

- Este archivo aplica cuando el scope toca `teleferico-app`, sus limites client/server, o sus flujos sensibles.
- Las secciones de **Security**, **Client/Server boundaries**, **Secrets**, **Infra / build config**, y los puntos sensibles de **Architecture & conventions** son contexto esencial cuando el trabajo afecta esas areas.
- Las secciones `Commands` y `Read if needed` son referencias de soporte. No deben cargarse por defecto si el brief ya cubre el contexto causal necesario.

## Commands (from package.json)

- Dev: `pnpm run dev`
- Build: `pnpm run build`
- Lint: `pnpm run lint`
- Test: no existe script `test` en `package.json`.
- Start: `pnpm start`
- Typecheck: `pnpm run typecheck`

## “Read if needed” references

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

## Output expectations (package-specific)

- Además, en este paquete: remarcar riesgos/consideraciones de **seguridad**, **i18n**, y cambios que afecten **config/deploy**.
