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

## Flujos

### Gmail OAuth setup (Gmail API via OAuth2)

Este proyecto puede enviar correos desde el formulario de contacto usando Gmail API. Para ello se realiza una autorización de una sola vez para obtener un `refresh_token` que luego se guarda como variable de entorno.

Rutas (Next.js App Router):

- `GET /api/oauth/google/init`: genera la URL de consentimiento y redirige. Protegida con token admin.
- `GET /api/oauth/google/callback`: callback de Google, intercambia el `code` por tokens y devuelve el `access_token` y el `refresh_token`.

Flujo:

1. Un admin ejecuta `/api/oauth/google/init` con el encabezado `Authorization: Bearer <INIT_TOKEN>` o el query parameter `?token=<INIT_TOKEN>`.
2. Se abre la pantalla de consentimiento con `access_type=offline` y `prompt=consent` para obtener un `code`.
3. Google redirige a `/api/oauth/google/callback?code=...&state=...`.
4. Si es exitoso, la respuesta JSON muestra los valores `refresh_token`, `access_token` y `expiry_date`. Copiarlo a las variables de entorno `OAUTH_REFRESH_TOKEN`, `OAUTH_ACCESS_TOKEN` y `OAUTH_TOKEN_EXPIRY_DATE` respectivamente (no commitear).

<img src="../gmail-oauth-flow.svg"/>

Notas de seguridad:

- El scope está limitado a `https://www.googleapis.com/auth/gmail.send`.
- Se usa `state` firmado (HMAC) y cookie httpOnly para evitar CSRF.
- El endpoint `init` requiere `INIT_TOKEN` para evitar uso público.

Middleware/i18n:

- La `middleware.ts` ya excluye rutas bajo `/api` en su `matcher`, por lo que `/api/oauth/*` no será afectado por redirecciones de locales.

**Para mas información sobre las vairables de entorno chequear el archivo .env.example**

Cómo ejecutar la autorización una vez:

1. Levantar la app (`npm run dev`).
2. Abrir: `curl -i -H "Authorization: Bearer $INIT_TOKEN" http://localhost:3000/api/oauth/google/init`
3. Completar el consentimiento en Google.
4. En la redirección a `/api/oauth/google/callback` se devuelve el `refresh_token` (si es la primera vez o con `prompt=consent`).
5. Copiar `refresh_token` y `access_token`:

- Para desarrollo local pegar los valores en `.env.local` .

Si Google no devuelve `refresh_token`:

- Asegurarse de usar `prompt=consent` y que no haya un otorgamiento previo. Revocar acceso en la cuenta de Google y reintentar.

## Desarrollo local (rápido)

1. Asegurá tener el CMS corriendo en `http://localhost:1337` (Strapi)

2. Crear `./teleferico-app/.env.local` con, por ejemplo:

```env
BUILD_STRAPI_BASE_URL=http://localhost:1337
BUILD_STRAPI_BUCKET_HOSTNAME=localhost
BUILD_STRAPI_BUCKET_PATHNAME=/uploads/*
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

3. Ejecutar:

```bash
npm run dev
```

Configuración de imágenes y rewrites: `teleferico-app/next.config.mjs`.
