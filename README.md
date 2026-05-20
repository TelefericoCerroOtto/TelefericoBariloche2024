# Teleférico Bariloche 2024

Monorepo del sitio público, dashboard administrativo, CMS y tooling de imágenes del proyecto Teleférico Cerro Otto.

Este README funciona como puerta de entrada del repositorio: resume la estructura general, el arranque local mínimo y apunta a la documentación canónica de cada área. Los detalles operativos, de infraestructura y de flujos específicos viven en los documentos de cada paquete y en `docs/`.

## Paquetes principales

| Path | Rol | Runtime / package manager | Documentación |
| --- | --- | --- | --- |
| `teleferico-app` | Sitio institucional + dashboard administrativo en Next.js | Node `20.x` + pnpm `9.x` | [teleferico-app/README.md](./teleferico-app/README.md) |
| `teleferico-cms` | CMS/API backend en Strapi | Node `22.x.x` + npm `>=10` | [teleferico-cms/README.md](./teleferico-cms/README.md) |
| `tools/image-pipeline` | Tooling para ingesta y procesamiento de imágenes | pnpm `9.x` | [tools/image-pipeline/README.md](./tools/image-pipeline/README.md) |

## Estructura del monorepo

- `public/`: assets compartidos del repositorio
- `teleferico-app/`: frontend público y administración
- `teleferico-cms/`: backend Strapi y configuración del CMS
- `tools/image-pipeline/`: scripts y utilidades para imágenes
- `docs/`: documentación de infraestructura y convenciones

## Inicio rápido local

1. Clonar el repositorio y entrar al root:

   ```bash
   git clone <repo-url>
   cd TelefericoBariloche2024
   ```

2. Levantar el CMS:

   ```bash
   cd teleferico-cms
   npm install
   cp .env.example .env
   npm run develop
   ```

   Para desarrollo local simple podés usar SQLite. Si necesitás otra base o detalles de deploy/transfer, ver [teleferico-cms/README.md](./teleferico-cms/README.md).

3. Levantar la app web en otra terminal:

   ```bash
   cd teleferico-app
   pnpm install
   cp .env.example .env.local
   pnpm run dev
   ```

   Ajustá `.env.local` para apuntar al CMS local antes de iniciar la app. El detalle de variables y flujos específicos vive en [teleferico-app/README.md](./teleferico-app/README.md).

4. URLs locales por defecto:

   - CMS: `http://localhost:1337`
   - App: `http://localhost:3000`

## Infraestructura y despliegue

La topología vigente del proyecto es:

- `teleferico-app` desplegada en Cloud Run
- `teleferico-cms` desplegado en Cloud Run
- Strapi persistiendo datos en Cloud SQL (PostgreSQL)
- Uploads servidos desde Cloud Storage
- CI/CD resuelto con Cloud Build, Artifact Registry y Secret Manager

La referencia canónica para infraestructura, entornos y despliegue es [docs/INFRA.md](./docs/INFRA.md).

## Mapa de documentación

- [teleferico-app/README.md](./teleferico-app/README.md): scripts, variables, flujos del frontend, OAuth Gmail y arquitectura de seguridad de endpoints
- [teleferico-cms/README.md](./teleferico-cms/README.md): desarrollo local, deploy del CMS, transferencias y guías editoriales de imágenes
- [tools/image-pipeline/README.md](./tools/image-pipeline/README.md): uso del pipeline de imágenes
- [docs/INFRA.md](./docs/INFRA.md): infraestructura, entornos, CI/CD y topología cloud
- [docs/CONVENTIONS.md](./docs/CONVENTIONS.md): convenciones de commits y pull requests
- [docs/todo-workflow.md](./docs/todo-workflow.md): gobernanza del backlog compartido entre Notion y GitHub
- [docs/backlog-branch-pr-policy.md](./docs/backlog-branch-pr-policy.md): política de asociación entre backlog, ramas e implementation PRs
- [AGENTS.md](./AGENTS.md): reglas operativas para agentes que trabajen en el repo

## Convenciones de trabajo

- No hay un flujo de instalación único a nivel root; cada paquete mantiene sus propios scripts y variables.
- Para cambios de código o documentación, usar las convenciones definidas en [docs/CONVENTIONS.md](./docs/CONVENTIONS.md).
- Para decisiones de infraestructura o despliegue, tomar como fuente de verdad [docs/INFRA.md](./docs/INFRA.md).
