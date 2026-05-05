# Teleférico Bariloche 2024 — Infraestructura

- **Fecha:** 2026-05-04
- **Alcance:** staging + production

---

## 1) Propósito

Este documento resume la arquitectura, los entornos y las reglas operativas principales de la plataforma.

No intenta reemplazar GCP ni los manifests de despliegue; solo deja lo importante para entender cómo está armada la infraestructura.

---

## 2) Vista general

La plataforma tiene cuatro piezas principales:

- **Cloud Run**:
  - **teleferico-app**: frontend Next.js con sitio institucional y dashboard administrativo.
  - **teleferico-cms**: CMS/API en Strapi.
- **Cloud SQL (PostgreSQL)**: datos estructurados del CMS.
- **Cloud Storage**: uploads/binarios servidos por Strapi.

Además:

- **Cloud Build** construye y despliega.
- **Artifact Registry** guarda las imágenes.
- **Secret Manager** centraliza secretos.
- Integraciones externas: **reCAPTCHA** y **Gmail OAuth 2.0**.

---

## 3) Entornos

Staging y production están separados en:

- servicios Cloud Run
- base de datos
- buckets de uploads
- secretos
- pipelines de deploy

### 3.1 Matriz rápida

| Componente        | Staging                  | Production                   |
| ----------------- | ------------------------ | ---------------------------- |
| Next.js           | `app-staging-teleferico` | `app-production-teleferico`  |
| Strapi            | `cms-staging-teleferico` | `cms-production-teleferico`  |
| Región            | `southamerica-east1`     | `southamerica-east1`         |
| Base de datos     | Cloud SQL por connector  | Cloud SQL por IP privada/VPC |
| Bucket de uploads | `cms_staging_bucket`     | `cms_production_bucket`      |

---

## 4) Servicios

### 4.1 teleferico-app (Next.js)

- **Rol:** sitio institucional + área administrativa.
- **Exposición:** público en Cloud Run.
- **Acceso a Strapi:** siempre server-side.
- **Build:** usa buildpacks.

#### Patrón de tráfico hacia Strapi

- La sección institucional consume principalmente lecturas de contenido.
- Las solicitudes a Strapi no deben ejecutarse desde componentes client.
- Las operaciones administrativas se hacen desde el server y dependen de la sesión/permisos del usuario.
- Las escrituras del dashboard deben quedar restringidas por los permisos definidos para el rol correspondiente.

#### Entorno staging

- `1 vCPU`
- `1 GiB`
- concurrency `20`
- min instances `0`
- max instances `2`
- CMS base URL de staging
- bucket/path de staging para assets

#### Entorno production

- `2 vCPU`
- `2 GiB`
- concurrency `30`
- min instances `1`
- max instances `10`
- CMS base URL de production
- bucket/path de production para assets

#### Variables y secretos relevantes

- URLs de base
- reCAPTCHA
- flags de build
- tokens internos para hablar con Strapi
- secretos de Auth.js y Google OAuth

---

### 4.2 teleferico-cms (Strapi)

- **Rol:** CMS + API de contenido.
- **Exposición:** público en Cloud Run; la seguridad real está en auth/permisos de Strapi.
- **Persistencia:** PostgreSQL + Cloud Storage.
- **Build:** imagen Docker.

#### Entorno staging

- `1 vCPU`
- `1 GiB`
- concurrency `20`
- min instances `0`
- max instances `2`
- conexión a Cloud SQL mediante `INSTANCE_CONNECTION_NAME`
- `DATABASE_HOST=/cloudsql/...`
- bucket `cms_staging_bucket`
- `GCS_BASE_PATH=cms`

#### Entorno production

- `2 vCPU`
- `2 GiB`
- concurrency `40`
- min instances `1`
- max instances `4`
- conexión a PostgreSQL por **IP privada** + VPC
- `DATABASE_SSL=true`
- bucket `cms_production_bucket`
- `GCS_BASE_PATH=cms`

#### Secretos relevantes

- credenciales de base de datos
- `APP_KEYS`
- `API_TOKEN_SALT`
- `ADMIN_JWT_SECRET`
- `TRANSFER_TOKEN_SALT`
- `JWT_SECRET`

---

## 5) Datos y almacenamiento

### PostgreSQL / Cloud SQL

- Staging y production usan instancias separadas.
- Production tiene backups y recuperación habilitados desde GCP.
- Staging no debe asumirse como entorno con las mismas garantías de recuperación que production.
- Los detalles finos de retención, ventanas y restauración se consultan en la consola de GCP.

### Cloud Storage / uploads

- Cada entorno usa su bucket propio.
- Strapi guarda los binarios en el bucket del entorno correspondiente.
- Production tiene un bucket de respaldo que copia los binarios a través de "Replicación entre buckets".

---

## 6) Despliegue

### Patrón general

1. Build.
2. Push a Artifact Registry.
3. Deploy a Cloud Run.

### Pipelines

Hay cuatro pipelines separados:

- app staging
- app production
- cms staging
- cms production

Las snapshots documentales de sus configuraciones están versionadas en [infra/cloud-build/README.md](infra/cloud-build/README.md).

### 6.1 Snapshots documentales

- `docs/infra/cloud-build/app-staging.yaml`
- `docs/infra/cloud-build/app-production.yaml`
- `docs/infra/cloud-build/cms-staging.yaml`
- `docs/infra/cloud-build/cms-production.yaml`

Estos archivos son solo de referencia. Los triggers operativos siguen definidos inline en GCP.

### Secret Manager

- Variables no sensibles: substitutions o env vars del servicio.
- Variables sensibles: Secret Manager.
- Staging y production usan secretos separados.

---

## 7) Service Accounts e IAM

La regla objetivo es separar identidades por servicio y aplicar **least privilege**.

No se debe asumir una única service account permanente para toda la plataforma. Si durante la iteración existe una service account con permisos amplios, debe tratarse como estado transitorio y no como diseño final.

### Objetivo

Separar permisos por caso de uso:

- service account para `teleferico-app`
- service account para `teleferico-cms`
- service account para Cloud Build/deploy
- permisos mínimos necesarios para:
  - Cloud SQL
  - Cloud Storage
  - Secret Manager

---

## 8) Sesión y autenticación

- **Frontend:** Auth.js.
- **Strapi:** JWT con `exp`.
- Regla importante: el TTL de la sesión debe seguir el JWT emitido por Strapi.
- Refresh token: todavía pendiente.

---

## 9) Integraciones externas

Las integraciones externas no deben confundirse con la persistencia ni con los permisos internos de Strapi.

- **reCAPTCHA:** protección anti-bots en formularios públicos.
- **Gmail OAuth 2.0:** envío de emails desde el formulario de contacto.

Estas integraciones son independientes de Strapi.

---

## 10) Variables de deploy que sí cambian por entorno

### Next.js

- `BUILD_STRAPI_BASE_URL`
- `BUILD_STRAPI_BUCKET_PATHNAME`
- `NEXT_PUBLIC_BASE_URL`

### Strapi

- `NODE_ENV`
- `DATABASE_HOST`
- `GCS_BUCKET_NAME`
- `GCS_BASE_PATH`

---

## 11) Esquema de alto nivel

```text
Usuarios
  -> Cloud Run (teleferico-app / Next.js)
       - Institucional: lecturas server-side de contenido
       - Dashboard: operaciones server-side según sesión/rol
       -> Cloud Run (teleferico-cms / Strapi)
            -> Cloud SQL (PostgreSQL)
            -> Cloud Storage (uploads)

Formularios públicos
  -> reCAPTCHA
  -> Gmail OAuth 2.0
```
