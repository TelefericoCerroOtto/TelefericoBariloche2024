# Teleférico Bariloche 2024 — Web (Next.js)

Aplicación frontend del proyecto, implementada con Next.js (App Router). Para documentación completa de local, CI/CD y despliegues, ver el README principal del repositorio:

- ../README.md

## Scripts útiles

- `npm run dev`: Ejecuta el servidor de desarrollo en `http://localhost:3000`
- `npm run build`: Compila la app
- `npm start`: Inicia la app compilada
- `npm run lint`: Linter

## Variables de entorno

Estas variables se usan en código y/o en `next.config.mjs`:

- `BUILD_STRAPI_BASE_URL` (build-time)
- `BUILD_STRAPI_BUCKET_HOSTNAME` (build-time)
- `BUILD_STRAPI_BUCKET_PATHNAME` (build-time)
- `NEXT_PUBLIC_BASE_URL` (runtime)
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` (runtime, opcional)

## Desarrollo local (rápido)

1) Asegurá tener el CMS corriendo en `http://localhost:1337` (Strapi)

2) Crear `./teleferico-app/.env.local` con, por ejemplo:

```env
BUILD_STRAPI_BASE_URL=http://localhost:1337
BUILD_STRAPI_BUCKET_HOSTNAME=localhost
BUILD_STRAPI_BUCKET_PATHNAME=/uploads/*
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3) Ejecutar:

```bash
npm run dev
```

Configuración de imágenes y rewrites: `teleferico-app/next.config.mjs`.
