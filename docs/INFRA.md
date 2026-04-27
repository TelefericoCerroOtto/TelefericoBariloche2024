# Teleférico Bariloche 2024 — Infrastructure Overview (Staging + Production)

- **Fecha:** 2026-02-16

---

## 1) Resumen ejecutivo

El sistema se compone de **2 servicios principales desplegados en Google Cloud Run**:

- **teleferico-app (Next.js):** sitio público (institucional) + dashboard administrativo
- **teleferico-cms (Strapi):** CMS / API backend

Además:

- Strapi persiste datos en **Cloud SQL (PostgreSQL)** y guarda binarios (uploads) en **Cloud Storage**.
- El build y deploy se automatiza con **Cloud Build (4 triggers)** y **Artifact Registry**.
- **Secret Manager** centraliza secretos.
- Integraciones externas: **reCAPTCHA** y un servicio de **Gmail vía OAuth 2.0** para envío de emails (contacto).

---

## 2) Regiones / ubicación

| Componente             | Región / Zona                                                  |
| ---------------------- | -------------------------------------------------------------- |
| Cloud Run (Strapi)     | `southamerica-east1`                                           |
| Cloud Run (Next.js)    | `southamerica-east1`                                           |
| Cloud SQL (PostgreSQL) | `southamerica-east1-c` (zonal, dentro de `southamerica-east1`) |

---

## 3) Entornos (staging y production)

Se mantienen entornos separados para:

- **Cloud SQL:** 2 instancias (staging y prod)
- **Cloud Storage:** 2 buckets (staging y prod)
- **Cloud Run:** servicios desplegados por entorno (al menos 1 servicio por app/cms por entorno)
- **Cloud Build:** triggers separados por entorno

### 3.1) Cloud SQL (PostgreSQL)

- **Instancia STAGING:** sin requerimiento explícito de backup (por ahora)
- **Instancia PROD:** con backups habilitados (requisito)

**Conectividad desde Strapi en Cloud Run:**

- Se asume el uso de **Cloud SQL connector** (integración Cloud Run ↔ Cloud SQL).
- En el pipeline se define la instancia mediante variable tipo `INSTANCE_CONNECTION_NAME`.
- Strapi se configura para conectarse mediante socket:

`/cloudsql/<INSTANCE_CONNECTION_NAME>`

### 3.2) Cloud Storage (uploads)

- **Bucket STAGING:** binarios/uploads del entorno de pruebas
- **Bucket PROD:** binarios/uploads del entorno productivo

**Nota:** se evaluará protección/“backup” para bucket PROD (ej.: versioning / retención / replicación) si se considera necesario.

---

## 4) Servicios (Cloud Run)

### 4.1) teleferico-cms (Strapi)

- **Rol:** CMS + API para contenido y operaciones de backend
- **Fuente de datos:**
  - **Cloud SQL (PostgreSQL):** datos estructurados
  - **Cloud Storage:** binarios/uploads (provider de GCS en Strapi)
- **Accesos:**
  - El dashboard de Next.js realiza operaciones de **escritura** en Strapi.
  - La sección institucional consume **lecturas** (principalmente GET) desde el server.

### 4.2) teleferico-app (Next.js)

- **Rol:** frontend único con dos áreas:
  - Institucional (pública)
  - Administrativa (dashboard)
- **Política de acceso a Strapi:**
  - Ninguna solicitud a Strapi se hace desde componentes client.
  - Toda solicitud a Strapi se ejecuta **server-side**.
- **Tráfico típico:**
  - **Institucional:** mayoritariamente **GET** a Strapi (lectura de contenido).
    - Excepción: **POST** para postulación/solicitud de empleo.
  - **Administrativa:** requests de **escritura** a Strapi, restringidas por permisos del rol de la sesión iniciada.

---

## 5) Autenticación y sesión

- **Frontend:** manejo de sesión con **Auth.js**
- **Strapi:** autenticación devuelve **JWT** con `exp` (tiempo de vida)

**Requisito funcional:**

- Mantener sincronizado el **TTL** de la sesión de Auth.js con el JWT (`exp`) emitido por Strapi.
- **Refresh token:** planificado pero aún no implementado.

---

## 6) CI/CD (Cloud Build + Artifact Registry + Cloud Run)

### 6.1) Triggers (4)

- **CMS - staging**
- **CMS - prod**
- **APP - staging**
- **APP - prod**

### 6.2) Pipeline estándar

1. Build de imagen (pack/buildpacks)
2. Push a Artifact Registry
3. Deploy a Cloud Run (variables de entorno + configuración del servicio)

### 6.3) Variables sensibles

- Administradas vía **Secret Manager** (keys, salts, JWT/ADMIN secrets, etc.)

---

## 7) Service Accounts e IAM

### Estado actual (simplificado)

- Se utiliza una única **Service Account** con permisos amplios (acceso a todo) para acelerar iteración.

### Estado futuro (objetivo)

Separar por servicio/caso de uso y aplicar **least privilege**:

- SA para **teleferico-app** (mínimos permisos necesarios)
- SA para **teleferico-cms** (mínimos permisos necesarios)
- SA para **Cloud Build/deploy**
- Permisos específicos para acceso a:
  - Cloud SQL
  - Cloud Storage
  - Secret Manager

---

## 8) Integraciones externas (independientes de Strapi)

- **reCAPTCHA:**
  - Se usa desde el frontend para protección anti-bots en formularios públicos (sección institucional).
  - No consume Strapi.
- **Gmail (OAuth 2.0):**
  - Servicio autorizado con OAuth 2.0 según estándares de Google.
  - Se usa para enviar emails desde el formulario de contacto (sección institucional).
  - No consume Strapi.

---

## 9) Esquema de alto nivel

```text
Usuarios
  -> Cloud Run (teleferico-app / Next.js)
       - Institucional (server-side GET a Strapi; POST empleo)
       - Admin/Dashboard (writes a Strapi según permisos/rol)
  -> Cloud Run (teleferico-cms / Strapi)
       -> Cloud SQL (PostgreSQL) [staging / prod]
       -> Cloud Storage (uploads) [bucket staging / prod]
```

---

## 10) Notas / pendientes

- Implementar refresh tokens y estrategia completa de renovación de sesión (Auth.js ↔ Strapi).
- Endurecer IAM: separar service accounts, mínimos permisos por servicio, y revisión de acceso a secretos/buckets/SQL.
- Definir estrategia de protección de bucket PROD (versioning/retención/replicación) si el riesgo lo amerita.
