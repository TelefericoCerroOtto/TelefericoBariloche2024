# AGENTS.md — teleferico-cms

## Purpose

Backend CMS del proyecto Teleferico Bariloche, construido con Strapi.
Centraliza modelos de contenido, permisos, componentes reutilizables y configuracion de runtime del CMS.
Este archivo es la fuente package-local de guardrails para `teleferico-cms`: complementa `../AGENTS.md`, no lo reemplaza, y refina reglas cuando el scope toca este paquete, sus contratos o sus superficies operativas sensibles.

## Governance usage

- Aplicar junto con `../AGENTS.md`.
- Este archivo es contexto obligatorio cuando el scope toca schemas, permisos, configuracion/runtime del CMS o contratos consumidos por `teleferico-app`.
- Sus guardrails no reducen requisitos de aprobacion, separacion entre exploracion/planificacion/escritura/finalizacion, ni limites de finalizacion definidos en el root.

## Repo context

- Paquete: `teleferico-cms`
- Monorepo: provee contenido y endpoints consumidos por `../teleferico-app`.
- Runtime esperado: Node `22.x.x` y npm `>=10` segun `package.json`.
- Stack principal: Strapi 5 + plugin `users-permissions` + PostgreSQL.

## Key paths

- `src/api`: dominios Strapi por coleccion/tipo.
- `src/api/<collection>/{content-types,controllers,routes,services}`: patron esperado por dominio.
- `src/components`: componentes reutilizables del schema (`images-blocks`, `page-components`, `page-properties`, `utils-components`).
- `src/extensions/users-permissions`: overrides y schema sensible de auth/roles.
- `database/migrations`: migraciones de base de datos.
- `config`: configuracion base del CMS (`server`, `database`, `plugins`, `middlewares`, `admin`, `api`).
- `config/env/{staging,production}`: overrides por entorno.
- `types/generated`: tipos generados de Strapi; tratarlos como artefactos.
- `public/uploads`: uploads persistidos del CMS.

## Guardrails (non-negotiables)

### Schema / auth

- No modificar `content-types`, `components`, `database/migrations` o `src/extensions/users-permissions` salvo tarea explicita.
- Cambios en schemas, roles o permisos son sensibles: requieren revisar impacto funcional y contractual antes de asumir compatibilidad.
- No introducir cambios de permisos que amplien acceso publico o administrativo sin requerimiento explicito.

### Domain pattern

- Mantener el patron `src/api/<collection>/{content-types,controllers,routes,services}`.
- Reutilizar la estructura del dominio existente antes de crear variantes ad hoc o mover archivos entre dominios.
- Mantener controllers/services/rutas alineados con el mismo recurso; evitar mezclar logica de distintos dominios.

### Contracts CMS -> app

- Si cambia schema, permisos, slugs, localizaciones o envelopes de respuesta, verificar impacto en `../teleferico-app/src/types/{cms,api}`.
- Ante cambios contractuales, revisar tambien supuestos de renderizado y consumo en servicios/componentes del app que dependan de esos datos.
- No asumir que un cambio interno de Strapi es transparente para el frontend: el CMS define contratos consumidos por la app.

### Dependencies / artifacts

- No tocar dependencias o lockfiles (`package.json`, `package-lock.json`) sin aprobacion explicita del scope.
- No editar artefactos generados (`types/generated/*`, `.strapi/`) salvo tarea explicita.
- No modificar `public/uploads` como parte de tareas de codigo salvo requerimiento explicito.

### Config / runtime

- Cambios en `config/**` y `config/env/**` son sensibles porque alteran runtime, despliegue y comportamiento operativo del CMS.
- Tratar como cambios sensibles cualquier ajuste de providers de upload/storage, `middlewares`, `database`, `admin`, `plugins`, `server` o `api`.
- No asumir que un cambio de configuracion es local o inocuo: puede afectar entornos `staging` y `production`, accesos administrativos, storage persistente o integraciones externas.
- Estos cambios deben quedar explicitamente dentro del scope aprobado y exigir una expectativa clara de verificacion operativa acorde al area tocada.

## Context loading guidance

- Este archivo aplica cuando el scope toca `teleferico-cms`, especialmente schemas, permisos, configuracion/runtime o contratos consumidos por `teleferico-app`.
- Las secciones de **Schema / auth**, **Contracts CMS -> app** y **Dependencies / artifacts** son contexto esencial para cualquier cambio sensible.
- La seccion **Config / runtime** es contexto esencial cuando el scope toca `config/**`, overrides por entorno o comportamiento operativo del CMS.
- Las secciones `Commands` y `Read if needed` son referencia de soporte; no hace falta cargarlas por defecto si el brief ya cubre el contexto causal necesario.

## Commands (from package.json)

- Dev: `npm run develop`
- Build: `npm run build`
- Start: `npm run start`
- Strapi CLI: `npm run strapi`
- Lint: no existe script `lint` en `package.json`.
- Test: no existe script `test` en `package.json`.
- Typecheck: no existe script `typecheck` en `package.json`.

## Read if needed

- `./README.md`
- `./package.json`
- `./config/*`
- `./config/env/{staging,production}/*`
- `./src/api/*`
- `./src/components/*`
- `./src/extensions/users-permissions/*`
- `./database/migrations/*`
