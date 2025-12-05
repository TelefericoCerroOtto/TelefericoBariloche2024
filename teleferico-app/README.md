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

<img src="../public/gmail-oauth-flow.svg"/>

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

## Seguridad de formularios públicos y Route Handlers

A continuación se describe cómo está diseñada la **arquitectura de seguridad** alrededor de los formularios públicos (como contacto y postulaciones) y de los **Route Handlers internos de Next.js** (`/api/proxy`, `/api/contact` y `/api/postualtions`). El objetivo es entender qué problemas intenta resolver este sistema (orígenes externos, abuso de formularios, consumo indebido de endpoints internos, etc.) y cómo se combinan las distintas capas de seguridad (origen, API key interna, rate limit, honeypot, validaciones, proxy) para proteger la aplicación.

### ¿Por qué existen estas capas de seguridad?

Estas capas cubren casos concretos:

- Cuando **otro sitio web** intenta hacer `fetch` a los Route Handlers.
- Cuando el cliente **no es un navegador** (curl, Postman, otro backend), donde **no aplica CORS** y no hay protección del browser.
- Proteccion de endpoints para que sean consumidos a través de **`server-to-server`**, y no directamente desde el navegador.
- Abuso de **formularios públicos** (contacto, postulaciones) por spam, bots, altas tasas de requests.
- Consumo de Strapi desde el cliente sin **exponer la URL de Strapi** ni su **JWT** en el frontend (caso `useProxy` + `/api/proxy`).

A partir de estos escenarios se construyó un set de conceptos y capas reutilizables.

### Conceptos clave

- **Same-Origin Policy / CORS**
  Protege a los navegadores frente a requests cross-origin; no protege frente a scripts o backends (server-to-server).

- **Clientes navegador vs no navegador**

  - El navegador agrega headers como `Origin`, `Referer`, `sec-fetch-site` y aplica CORS.
  - Un backend/shell (curl, Node, etc.) puede mandar cualquier header y no respeta CORS.

- **Origen de la request**
  Se reconstruye con:

  - `Origin`,
  - `Referer`,
  - o `x-forwarded-proto` + (`x-forwarded-host` o `host`).

- **API key interna (`x-internal-api-key`)**
  Header que se setea a traves de la variable de entorno `INTERNAL_API_KEY`, y solo puede ser consumida desde el lado del servidor (Server Actions o servicios).
  Sirve para marcar endpoints que **no deberían ser llamados directamente desde el navegador**.

- **ensureTrustedOrigin**
  Helper central que combina:

  - extracción del origin,
  - construcción de `allowedOrigins` (a partir de `NEXT_PUBLIC_BASE_URL` y orígenes extra),
  - y la decisión de permitir o rechazar la request con un `403`.

- **Orquestador de guards (`runFormGuards` + `withFormGuards`)**
  HOF que agrupa varias validaciones de seguridad (origen, API key, rate limit, tamaño de body, etc.) antes de llegar a la lógica de negocio de cada formulario.

### Capas de seguridad disponibles

Estas capas se pueden aplicar:

- directamente en un Route Handler, o
- de forma centralizada a través de `runFormGuards` / `withFormGuards`.

Capas:

- **Validación de origen**

  - `ensureTrustedOrigin(req, allowedOrigins?)`
  - Verifica que el origin calculado esté en el set de orígenes permitidos (por defecto incluye `NEXT_PUBLIC_BASE_URL`).

- **API key interna**

  - Validada con `requireInternalApiKey(req)`.
  - Marca endpoints que solo deberían ser consumidos desde Server Actions / servicios internos.

- **Rate limit por IP**

  - `getClientIp(req)` + `isRateLimited(ip, store, maxHits, windowMs)`.
  - Evita abuso de formularios públicos desde la misma IP. El mapeo se hace a traves de una variable, con lo cual los registros son por instancia de aplicación.

- **Límite de tamaño de body**

  - `checkContentLength(req, maxBodyBytes)`.
  - Bloquea payloads demasiado grandes sin necesidad de parsear el body completo.

- **Honeypot**

  - Campo oculto en el formulario (`honeypot`).
  - Si viene con contenido, se asume bot y se responde “como si” fuera éxito sin revelar el truco.

- **Edad del formulario (`formLoadedAt`)**

  - `validateFormAge(formLoadedAt, { minAgeMs, maxAgeMs })`.
  - Filtra submissions demasiado rápidas (probable bot) o demasiado viejas.

- **Validación de esquema (Yup)**

  - `buildContactSchema`, `buildPostulationSchema`, etc.
  - Aseguran tipos y rangos válidos antes de tocar servicios externos (Gmail, Strapi).

- **Captcha (reCAPTCHA)**

  - `verifyCaptchaToken` en las Server Actions.
  - Previene automatización masiva desde bots.

### Helpers de origen: ensureTrustedOrigin

Toda la lógica de origen se centraliza en `ensureTrustedOrigin` (en `lib/http/origin.ts`).

#### ensureTrustedOrigin(req, allowedOrigins?)

Firma simplificada:

- `ensureTrustedOrigin(req: NextRequest, allowedOrigins?: Set<string>)`
  devuelve:

  - `{ ok: true; origin: string }` si el origen es válido.
  - `{ ok: false; res: NextResponse<{ ok: false; message: string }> }` si se debe bloquear (403).

Uso típico en un route handler:

```ts
const result = ensureTrustedOrigin(req);
if (!result.ok) return result.res;

// origin confiable disponible:
const origin = result.origin;
```

Si no se pasa `allowedOrigins`, la función construye un set por defecto a partir de:

- `NEXT_PUBLIC_BASE_URL` (sin `/` final),
- y opcionalmente orígenes extra que se añadan mediante `buildAllowedOrigins`.

Lógica interna (resumen):

1. `extractOrigin(req)`:

   - Intenta leer `Origin`.
   - Si no hay, intenta `Referer`.
   - Si no hay, reconstruye con `x-forwarded-proto` + (`x-forwarded-host` o `host`).

2. `buildAllowedOrigins()`:

   - Crea un `Set<string>` con:

     - `NEXT_PUBLIC_BASE_URL` normalizado,
     - y orígenes extra si se pasan.

3. `isOriginAllowed(origin, allowedOrigins)`:

   - Si el set está vacío → todo permitido.
   - Si no hay `origin` → bloquea.
   - Si `origin` no está en el set → bloquea.

4. Si el origen no es válido:

   - devuelve `{ ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) }`.

5. Si es válido:

   - devuelve `{ ok: true, origin }`.

#### Notas de desarrollo (origins en red local)

En desarrollo, Next.js suele exponer dos URLs:

- `http://localhost:3000`
- `http://<ip-de-la-red-local>:3000` (para acceder desde otros dispositivos en la LAN, como el celular)

Como `ensureTrustedOrigin` valida el `origin` contra un set de orígenes permitidos, se agregó una regla especial para evitar tener que actualizar el `.env` cada vez que cambia la IP de la red local:

- En **producción**, solo se aceptan orígenes que estén en `allowedOrigins` (por ejemplo, `NEXT_PUBLIC_BASE_URL`).
- En **desarrollo**, además de `allowedOrigins`, `ensureTrustedOrigin` acepta cualquier `origin` cuya hostname pertenezca a una red privada (`localhost`, `127.0.0.1`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`).

Esto permite:

- Entrar con `http://localhost:3000` desde la misma máquina.
- Entrar con `http://192.168.x.x:3000` (o `http://10.x.x.x:3000`) desde un celular u otro dispositivo de la LAN.

La lógica de producción se mantiene estricta y no se ve afectada por esta relajación para entornos de desarrollo.

### runFormGuards y withFormGuards

Para los formularios públicos se usa un orquestador de seguridad:

- `runFormGuards(req, options)`:

  - Valida API key interna (opcional).
  - Llama a `ensureTrustedOrigin(req, allowedOrigins)`.
  - Aplica límites de tamaño de body.
  - Aplica rate limit por IP.
  - Devuelve:

    - `{ ok: false, res: NextResponse }` si alguna validación falla.
    - `{ ok: true }` si todo está OK.

- `withFormGuards(options, handler)`:

  - Wrappea tu handler de negocio:

    - ejecuta `runFormGuards`,
    - si algo falla devuelve el `NextResponse` de error,
    - si todo pasa ejecuta `handler(...)`.

La ventaja de este enfoque es que **todas las rutas de formularios públicos comparten una misma capa de seguridad**, dejando a cada handler solo la lógica específica de su formulario.

### Flujo de formularios públicos

Ejemplo genérico (contacto / postulación):

1. El usuario completa el formulario en el navegador.

2. El submit llama una **Server Action** (`contactUsAction`, `sendPostulationAction`, etc.).

3. La Server Action:

   - Verifica reCAPTCHA.
   - Arma un payload tipado (datos del form).
   - Agrega campos de seguridad (`honeypot`, `formLoadedAt`, `clientIp` si aplica).
   - Llama a un **servicio del lado servidor** (`sendEmail`, `sendPostulation`, etc.).

4. El servicio:

   - Construye la URL del Route Handler interno (`NEXT_PUBLIC_BASE_URL + ROUTE_HANDLERS.X`).

   - Adapta el payload a JSON o `FormData` (por ejemplo, para subir un CV).

   - Setea headers:

     - `Origin: NEXT_PUBLIC_BASE_URL` (para `ensureTrustedOrigin`).
     - `x-internal-api-key: INTERNAL_API_KEY` (para marcar que viene de nuestro backend).

   - Hace `fetch` al Route Handler con timeout.

5. El Route Handler:

   - Está envuelto con `withFormGuards` (usa `runFormGuards` internamente).
   - Valida API key, origen, rate limit, tamaño de body, etc.
   - Si todo es válido, ejecuta el handler real del formulario:

     - Lee el body (`JSON` o `formData`).
     - Valida honeypot.
     - Valida la edad del formulario.
     - Convierte strings a numbers / `File` según corresponda.
     - Valida con Yup.
     - Llama a los servicios externos necesarios (Gmail, Strapi Upload, creación de registros).
     - Devuelve un JSON consistente al frontend.

### API Proxy hacia Strapi (`/api/proxy` + useProxy)

Objetivo:

- Exponer una API interna de Next (`/api/proxy`) que:

  - sea el **único punto de acceso** hacia Strapi desde el cliente,
  - oculte la URL real de Strapi,
  - gestione el JWT de sesión en el servidor (no en el navegador).

Arquitectura:

- El cliente **no llama directamente** a Strapi.
- En su lugar, usa un custom hook `useProxy` (o un `fetch` a `/api/proxy/...`) para pedir recursos.
- El Route Handler `/api/proxy`:

  - Llama a `ensureTrustedOrigin(req)` al inicio:

    - si la request no viene de un origen permitido, devuelve 403.

  - Reconstruye la URL de Strapi: `BUILD_STRAPI_BASE_URL + endpointPath + query params` a partir de `[...endpoint]` y `searchParams`.

  - Obtiene la sesión con `auth()` y, si hay `jwt`, agrega `Authorization: Bearer <jwt>` a la request hacia Strapi.

  - Hace `fetch` a Strapi desde el backend.

  - Devuelve el JSON de Strapi (y el `status` correspondiente) al cliente.

Beneficios:

- El cliente nunca ve la **URL de Strapi** ni el **JWT**.
- Se puede cambiar la infraestructura de Strapi (host, proxies, etc.) sin tocar el cliente.
- Se reutiliza la misma lógica de origen confiable (`ensureTrustedOrigin`) que en los formularios públicos, manteniendo criterios de seguridad consistentes en todos los Route Handlers sensibles.

## Desarrollo local (rápido)

1. Asegurá tener el CMS corriendo en `http://localhost:1337` (Strapi)

2. Crear `./teleferico-app/.env.local` con las variables de entorno detalladas en el archivo `./teleferico-app/.env.example`, por ejemplo:

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
