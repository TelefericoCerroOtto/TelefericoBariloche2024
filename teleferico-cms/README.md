# Teleférico Bariloche 2024 — CMS (Strapi)

Backend (CMS) del proyecto, implementado con Strapi. Para documentación completa de CI/CD y despliegue en GCP (App Engine, Cloud SQL, Cloud Storage), ver el README principal del repositorio:

- ../README.md

## Scripts útiles

- `npm run develop`: Inicia Strapi en modo desarrollo (autoReload)
- `npm run start`: Inicia Strapi sin autoReload
- `npm run build`: Compila el panel de administración

## Variables de entorno (principales)

- `DATABASE_CLIENT` (sqlite|mysql|postgres)
- `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`
- `GCS_BUCKET_NAME`, `GCS_BASE_PATH` (para provider de Google Cloud Storage)
- `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`

El provider de subida a Google Cloud Storage está configurado mediante `@strapi-community/strapi-provider-upload-google-cloud-storage`.

## Desarrollo local (rápido)

1) Instalar dependencias y definir `.env` en `./teleferico-cms/` con tu base de datos:

   - Opción simple: usar SQLite (`DATABASE_CLIENT=sqlite`)
   - Opción alternativa: configurar MySQL/PostgreSQL con las variables anteriores

2) Ejecutar:

```bash
npm run develop
```

Strapi se inicia típicamente en `http://localhost:1337`.

Para despliegue y configuración avanzada (entornos, `app.yaml`, permisos en GCP), consultar el README principal.
