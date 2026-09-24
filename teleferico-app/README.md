# Teleférico Bariloche 2024 — Web (Next.js)

Frontend application of the project, implemented with Next.js (App Router).

- Monorepo overview: [../README.md](../README.md)
- Infrastructure, CI/CD and GCP deployments: [../docs/INFRA.md](../docs/INFRA.md)
- This README: scripts, variables and frontend-specific flows

## Useful scripts

- `pnpm run dev`: Runs the development server at `http://localhost:3000`
- `pnpm run build`: Builds the app
- `pnpm start`: Starts the built app
- `pnpm run lint`: Lints the files
- `pnpm run typecheck`: Checks that files included in `tsconfig.json` comply with TypeScript rules
- `pnpm run test`: Runs the Vitest unit, component, guard, and Route Handler suite
- `pnpm run test:e2e:smoke`: Runs the local Chromium smoke suite with deterministic server-side CMS fixtures
- `pnpm run test:e2e:maintenance`: Runs the local Chromium maintenance-mode smoke suite
- `pnpm run test:e2e`: Runs both local E2E suites; Playwright starts or reuses the local fixture and Next.js servers
- `pnpm run test:e2e:production`: Runs the read-only public production smoke suite; requires `PUBLIC_E2E_BASE_URL`

## Browser E2E testing

Playwright is Chromium-only in the initial browser test layer. Its local fixtures run as a separate HTTP server and are supplied to the Next.js server through `BUILD_STRAPI_BASE_URL`; no test route or production-accessible bypass is added to the application.

Feedback pages, APIs, and dashboard navigation are closed unless the server-side `FEEDBACK_CAPABILITY_ENABLED` value is exactly `true`. The same explicit flag controls local, staging, and production; no runtime or deployment label overrides it. Playwright's fixture app process opts in explicitly. The flag is server-only and must never use a `NEXT_PUBLIC_` name. While TB-113 remains incomplete, Cloud Build deployment snapshots explicitly reset it to `false`; an approved bounded operational test window may set it to `true`, but the next deployment resets it. A future, separately approved feature-completion change is required to make deployment defaults `true`.

Agents run `pnpm run test:e2e` while implementing or diagnosing browser behavior. Developers are not required to run E2E commands manually, and no pre-commit or pre-push hook runs the suite.

Playwright writes failure traces, screenshots, videos, and HTML reports to `test-results/` and `playwright-report/`. Both paths are ignored by Git.

See [../docs/playwright-e2e.md](../docs/playwright-e2e.md) for the pull-request, promotion, and production-smoke execution policy.

## Environment variables

The `.env.example` file documents each environment variable of the package.

---

## Flows

### Gmail OAuth setup (Gmail API via OAuth2)

This project can send emails from the contact form using Gmail API. For this, a one-time authorization is performed to obtain a `refresh_token` that is then saved as an environment variable.

Routes (Next.js App Router):

- `GET /api/oauth/google/init`: generates the consent URL and redirects. Protected with admin token.
- `GET /api/oauth/google/callback`: Google callback, exchanges the `code` for tokens and returns the `access_token` and `refresh_token`.

Flow:

1. An admin executes `/api/oauth/google/init` with the header `Authorization: Bearer <INIT_TOKEN>` or the query parameter `?token=<INIT_TOKEN>`.
2. The consent screen opens with `access_type=offline` and `prompt=consent` to obtain a `code`.
3. Google redirects to `/api/oauth/google/callback?code=...&state=...`.
4. If successful, the JSON response shows the `refresh_token`. Copy it to the environment variable `OAUTH_REFRESH_TOKEN` (do not commit).

<img src="../public/gmail-oauth-flow.svg"/>

Security notes:

- Scope is limited to `https://www.googleapis.com/auth/gmail.send`.
- Signed `state` (HMAC) and httpOnly cookie are used to prevent CSRF in the OAuth flow.
- The `init` endpoint requires `INIT_TOKEN` to prevent public usage.

Operational decision per environments:

- Currently `staging` and `production` share the same external integration for Gmail OAuth and reCAPTCHA.
- For this reason, the following secrets may have the same value in both environments:
  - `RECAPTCHA_SECRET_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `OAUTH_REFRESH_TOKEN`
- This is valid if both environments use the same authenticated Gmail account, the same Google OAuth Client and the same reCAPTCHA configuration.
- Tradeoff: simplifies operation, but reduces isolation between `staging` and `production`.
- Even sharing those values, the Google OAuth client must have authorized redirect URIs from both environments.

Middleware/i18n:

- The `middleware.ts` already excludes routes under `/api` in its `matcher`, so `/api/oauth/*` will not be affected by locale redirects.

How to execute the authorization once:

1. Start the app (`pnpm run dev`).
2. Open: `curl -i -H "Authorization: Bearer $INIT_TOKEN" http://localhost:3000/api/oauth/google/init`
3. Complete consent in Google.
4. In the redirect to `/api/oauth/google/callback` the `refresh_token` is returned (if it's the first time or with `prompt=consent`).
5. Copy `refresh_token`:
   - For local development paste the value in `.env.local`.

If Google does not return `refresh_token`:

- Make sure to use `prompt=consent` and that there is no previous grant. Revoke access in the Google account and retry.

---

## Endpoint and form security architecture

### Feedback report task identity

The server-side feedback dispatch seam derives queue names only from valid
report-run UUIDs: `tb113-report-<UUID without hyphens>`. Invalid CMS run
identifiers fail closed before dispatch. This deterministic identity is not a
browser contract or proof that a task was created. The CMS exposes an additive
authenticated reservation/outcome contract, but the app does not yet use it
and no Cloud Tasks adapter is configured. It records only reservation, created,
or unknown states and rejects caller-asserted absence. The default dispatcher
leaves the generation queued as `DISPATCH_UNAVAILABLE`; no verified absence or
real dispatch path exists yet.

Below describes how the **security architecture** is designed around:

- public forms (like contact and applications),
- the **API Proxy** to Strapi,
- and the **administrative endpoints** consumed from the dashboard.

The goal is to understand:

- What types of endpoints exist.
- What problems each layer tries to solve (external origins, form abuse, CSRF, unauthorized consumption of internal endpoints, etc.).
- How they combine: origin, internal API key, Auth.js session, CSRF token, rate limit, honeypot, validations, proxy, etc.

### Endpoint types and security model

Conceptually, the Next.js backend exposes four main types of endpoints:

1. **Public read-only endpoints**

Routes:

- `GET /api/proxy/[...endpoint]` (when used only for reading).
- `GET /api/proxy-files/[...endpoint]` (when used only for reading).

Characteristics:

- Publicly accessible.
- Only perform read operations (GET).
- Do not modify state in Strapi or other services.
- Used to feed the institutional part.

Main security layers:

- `ensureTrustedOrigin` to limit requests from browsers to trusted origins.
- Soft rate limit to prevent excessive abuse/scraping.
- Do not require session or internal API key.

2. **Internal server-to-server endpoints**

   Routes:
   - `/api/contact`
   - `/api/postulations`
   - Other internal endpoints that should only be called by Server Actions / internal services.

   Characteristics:
   - Not consumed directly from the browser.
   - The public frontend triggers **Server Actions**, which in turn call these endpoints from the server.
   - Use an **internal API key** (`x-internal-api-key`) that is never exposed to the client.

   Main security layers:
   - `requireInternalApiKey(req)`:
     - Verifies that the header `x-internal-api-key` matches the environment variable `INTERNAL_API_KEY`.
     - Ensures only the own backend (Server Actions/services) can invoke the endpoint.

   - `ensureTrustedOrigin` (as additional defense for requests coming from browser or reused patterns).
   - Aggressive rate limit by IP.
   - Body size limit (to avoid huge payloads).
   - Honeypot, minimum/maximum form age.
   - Schema validation (Yup).
   - Server-side verified reCAPTCHA.

3. **Administrative endpoints**

   Routes:
   - `/api/admin/postulations/[id]/favorite`
   - `/api/admin/postulations/bulk-status`
   - Any endpoint that operates on the administrative part `/api/admin/*` and is consumed exclusively from the dashboard.

   Characteristics:
   - Only accessible for authenticated users in the dashboard.
   - Potentially expose **CRUD** operations. Currently defined endpoints only operate with the `update` permission of Strapi's role interface.
   - Consumed from the dashboard client, but always with Auth.js session and a CSRF token.

   Main security layers:
   - **Auth.js session (`auth()`)**:
     - Verification that the user has a valid session.
     - Role/permission information available in the token/session.

   - **CSRF token**:
     - Generated in Auth.js's `jwt` callback and stored in the JWT.
     - Exposed in the Auth.js `session` as `session.csrfToken`.
     - Published in the dashboard pages' `<head>` via `generateMetadata` as:

       ```html
       <meta name="csrf-token" content="..." />
       ```

     - Read on the client and sent in a `x-csrf-token` header in each mutating request from the dashboard through the `authenticatedInternalApiFetch` function.
     - Verified in a helper like `requireCsrf(req)` that compares the header with `session.csrfToken`.

   - `ensureTrustedOrigin`:
     - To ensure mutating requests come from the dashboard itself and not from external sites.

   - Rate limit (optional) for sensitive operations.

4. **Infrastructure / specific configuration endpoints**

   These are endpoints that are not part of the normal application flow for end users, but are necessary to integrate authentication services and external APIs.

   Examples:
   - **Auth.js endpoint**  
     Auth.js route (e.g., `/api/auth/[...nextauth]`), used internally by the library for:
       - handling login/logout flow,
       - resolving login/logout redirects from the dashboard with `NEXT_PUBLIC_SITE_URL` to not depend on internal host,
       - emitting and refreshing the session cookie,
       - resolving Auth.js own callbacks.
       Characteristics:
     - Does not contain project business logic.
     - Its security (httpOnly cookies, JWT signing, internal CSRF protection for its own routes, etc.) is managed by Auth.js.
     - It is invoked as part of the authentication flow, but not consumed directly from business code (forms, proxy, dashboard, etc.).

   - **Gmail OAuth endpoints (one-time setup)**  
     Routes under `/api/oauth/google/*` (`/init` and `/callback`) used to complete **a single time** the OAuth2 flow with Gmail and obtain the `refresh_token` needed to use `gmail.send` in the contact form.  
     Characteristics:
     - Executed only in configuration scenarios (e.g., when preparing a new environment or updating credentials).
     - Protected via:
       - an `INIT_TOKEN` (admin token) for the `init` endpoint,
       - signed `state` and httpOnly cookie in the callback to prevent CSRF in the OAuth flow,
       - scope limited to `https://www.googleapis.com/auth/gmail.send`.
     - Once the `refresh_token` is obtained and saved in environment variables, these endpoints are not used in the normal application flow.

- Which endpoints should be anonymously accessible and only read data.
- Which should only be accessible "from inside" (server-to-server).
- Which represent administrative actions and require session + CSRF.

---

## Key concepts

- **Same-Origin Policy / CORS**
  Protects browsers from cross-origin requests; does not protect against scripts or backends (server-to-server).

- **Browser vs non-browser clients**
  - The browser adds headers like `Origin`, `Referer`, `sec-fetch-site` and applies CORS.
  - A backend/shell (curl, Node, etc.) can send any header and does not respect CORS.

- **Request origin**
  Reconstructed with:
  - `Origin`,
  - `Referer`,
  - or `x-forwarded-proto` + (`x-forwarded-host` or `host`).

- **Internal API key (`x-internal-api-key`)**
  Header set via the environment variable `INTERNAL_API_KEY`, and can only be consumed from the server side (Server Actions or services).
  Used to mark endpoints that **should not be called directly from the browser** (type 2: server-to-server).

- **ensureTrustedOrigin**
  Central helper that combines:
  - origin extraction,
  - building `allowedOrigins` (from `NEXT_PUBLIC_SITE_URL` and extra origins),
  - and the decision to allow or reject the request with a `403`.

- **Auth.js session + CSRF token (admin endpoints)**
  - Auth.js manages the httpOnly session cookie and internal JWT.
  - In the `jwt` callback a random `csrfToken` is generated and stored in the token.
  - In the `session` callback that `csrfToken` is exposed as `session.csrfToken`.
  - The dashboard segment uses `generateMetadata` to inject:

    ```ts
    other: { "csrf-token": session.csrfToken }
    ```

  - A client helper (e.g. `authenticatedInternalApiFetch`) reads `<meta name="csrf-token">` and sends `x-csrf-token`.
  - A server helper (`requireCsrf(req)`) compares `x-csrf-token` with the value of `session.csrfToken`.

- **Guard orchestrator (`runFormGuards` + `withFormGuards`)**
  Primarily intended for public forms (type 2), groups several validations before reaching business logic.

---

## Available security layers

These layers can be applied:

- directly in a Route Handler, or
- centrally through `runFormGuards` / `withFormGuards` (for public forms).

Layers:

- **Origin validation** (all types where it makes sense)
  - `ensureTrustedOrigin(req, allowedOrigins?)`
  - Verifies that the calculated origin is in the set of allowed origins (by default includes `NEXT_PUBLIC_SITE_URL`).
  - Used:
    - In read-only endpoints (type 1) to filter requests from browser.
    - In server-to-server endpoints (type 2) as additional defense.
    - In admin endpoints (type 3), along with CSRF token, to reinforce protection against CSRF/cross-site.

- **Internal API key** (only type 2)
  - Validated with `requireInternalApiKey(req)`.
  - Marks endpoints that should only be consumed from Server Actions / internal services.

- **Rate limit by IP**
  - `getClientIp(req)` + `isRateLimited(ip, store, maxHits, windowMs)`.
  - Prevents abuse of public forms from the same IP and can also be applied in read-only and admin endpoints.

- **Body size limit**
  - `checkContentLength(req, maxBodyBytes)`.
  - Blocks too large payloads without needing to parse the entire body.

- **Honeypot** (mainly type 2)
  - Hidden field in the form (`honeypot`).
  - If it comes with content, it's assumed to be a bot and responds "as if" it were successful without revealing the trick.

- **Form age (`formLoadedAt`)** (type 2)
  - `validateFormAge(formLoadedAt, { minAgeMs, maxAgeMs })`.
  - Filters submissions that are too fast (likely bot) or too old.

- **Schema validation (Yup)**
  - `buildContactSchema`, `buildPostulationSchema`, etc.
  - Ensure valid types and ranges before touching external services (Gmail, Strapi).

- **Captcha (reCAPTCHA)**
  - `verifyCaptchaToken` in Server Actions.
  - Prevents mass automation from bots in public forms.

- **CSRF token (only admin endpoints, type 3)**
  - Verified on the server comparing `x-csrf-token` with `session.csrfToken`.
  - Complemented with `ensureTrustedOrigin`.

---

## Origin helpers: ensureTrustedOrigin

All origin logic is centralized in `ensureTrustedOrigin` (in `lib/http/origin.ts`).

### ensureTrustedOrigin(req, allowedOrigins?)

Simplified signature:

- `ensureTrustedOrigin(req: NextRequest, allowedOrigins?: Set<string>)`
  returns:
  - `{ ok: true; origin: string }` if the origin is valid.
  - `{ ok: false; res: NextResponse<{ ok: false; message: string }> }` if it should be blocked (403).

Typical usage in a route handler:

```ts
const result = ensureTrustedOrigin(req);
if (!result.ok) return result.res;

// trusted origin available:
const origin = result.origin;
```

If `allowedOrigins` is not passed, the function builds a default set from:

- `NEXT_PUBLIC_SITE_URL` (without trailing `/`),
- and optionally extra origins added via `buildAllowedOrigins`.

Internal logic (summary):

1. `extractOrigin(req)`:
   - Tries to read `Origin`.
   - If not present, tries `Referer`.
   - If not present, reconstructs with `x-forwarded-proto` + (`x-forwarded-host` or `host`).

2. `buildAllowedOrigins()`:
   - Creates a `Set<string>` with:
     - normalized `NEXT_PUBLIC_SITE_URL`,
     - and extra origins if passed.

3. `isOriginAllowed(origin, allowedOrigins)`:
   - If the set is empty → everything allowed.
   - If there's no `origin` → blocks.
   - If `origin` is not in the set → blocks.

4. If the origin is not valid:
   - returns `{ ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) }`.

5. If valid:
   - returns `{ ok: true, origin }`.

### Development notes (origins on local network)

In development, Next.js usually exposes two URLs:

- `http://localhost:3000`
- `http://<local-network-ip>:3000` (to access from other devices on the LAN, like a cell phone)

Since `ensureTrustedOrigin` validates the `origin` against a set of allowed origins, a special rule was added to avoid having to update the `.env` every time the local network IP changes:

- In **production**, only origins that are in `allowedOrigins` are accepted (for example, `NEXT_PUBLIC_SITE_URL`).
- In **development**, besides `allowedOrigins`, `ensureTrustedOrigin` accepts any `origin` whose hostname belongs to a private network (`localhost`, `127.0.0.1`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`).

This allows:

- Entering with `http://localhost:3000` from the same machine.
- Entering with `http://192.168.x.x:3000` (or `http://10.x.x.x:3000`) from a cell phone or another device on the LAN.

Production logic remains strict and is not affected by this relaxation for development environments.

---

## runFormGuards and withFormGuards (public forms – type 2)

For public forms, a security orchestrator is used:

- `runFormGuards(req, options)`:
  - Validates internal API key (if configured).
  - Calls `ensureTrustedOrigin(req, allowedOrigins)`.
  - Applies body size limits.
  - Applies rate limit by IP.
  - Returns:
    - `{ ok: false, res: NextResponse }` if any validation fails.
    - `{ ok: true }` if everything is OK.

- `withFormGuards(options, handler)`:
  - Wraps your business handler:
    - Executes `runFormGuards`.
    - If something fails returns the error `NextResponse`.
    - If everything passes executes `handler(...)`.

The advantage of this approach is that **all public form routes share the same security layer**, leaving each handler only its specific form logic.

---

## Public form flow (type 2)

Generic example (contact / application):

1. The user completes the form in the browser.

2. The submit calls a **Server Action** (`contactUsAction`, `sendPostulationAction`, etc.).

3. The Server Action:
   - Verifies reCAPTCHA.
   - Builds a typed payload (form data).
   - Adds security fields (`honeypot`, `formLoadedAt`, etc.).
   - Calls a **server-side service** (`sendEmail`, `sendPostulation`, etc.).

4. The service:
   - Builds the internal Route Handler URL (`APP_INTERNAL_BASE_URL + ROUTE_HANDLERS.X`).
   - Adapts the payload to JSON or `FormData`.
   - Sets headers:
      - `Origin: NEXT_PUBLIC_SITE_URL` (for `ensureTrustedOrigin`).
     - `x-internal-api-key: INTERNAL_API_KEY` (for `requireInternalApiKey`).

   - Makes `fetch` to the Route Handler with timeout.

5. The Route Handler:
   - Is wrapped with `withFormGuards` (uses `runFormGuards` internally).
   - Validates API key, origin, rate limit, body size, etc.
   - If everything is valid, executes the real form handler:
     - Reads the body.
     - Validates honeypot.
     - Validates form age.
     - Validates with Yup.
     - Calls external services (Gmail, Strapi Upload, record creation).
     - Returns consistent JSON to the frontend.

---

## API Proxy to Strapi (`/api/proxy` + useProxy)

### Objective

Expose an internal Next API (`/api/proxy`) that:

- is the **only access point** to Strapi from the client,
- hides the real Strapi URL,
- manages the session JWT on the server (not in the browser).

### Architecture

- The client **does not call Strapi directly**.
- Instead, it uses a custom hook `useProxy` (or a `fetch` to `/api/proxy/...`) to request resources.
- The Route Handler `/api/proxy`:
  - Is considered, in practice, a **public read-only endpoint (type 1)** when limited to GET.
  - Calls `ensureTrustedOrigin(req)` at the start:
    - if the request does not come from an allowed origin, returns 403.

  - Reconstructs the Strapi URL: `BUILD_STRAPI_BASE_URL + endpointPath + query params` from `[...endpoint]` and `searchParams`.
  - Classifies the requested endpoint before sending credentials to Strapi:
    - public read endpoints (`activities`, `bus-trips`, `component-translations`, `faqs`, `news`, `service-state`, `tickets`, `zones`) use `BUILD_STRAPI_CONTENT_TOKEN` from the server;
    - private endpoints (`postulations`) require session and use `Authorization: Bearer <session.jwt>`;
    - private endpoints without session return 401 and never fall back to the public token.
  - Makes `fetch` to Strapi from the backend.
  - Returns Strapi's JSON (and the corresponding `status`) to the client.

### Benefits

- The client never sees the **Strapi URL** or the **JWT**.
- Strapi infrastructure can be changed (host, proxies, etc.) without touching the client.
- The same trusted origin logic (`ensureTrustedOrigin`) is reused as in public forms and admin endpoints, maintaining consistent security criteria across all sensitive Route Handlers.

---

## Static locale generation

The segment `src/app/[locale]` defines `generateStaticParams()` and `dynamicParams` based on the environment variable `ENABLE_STATIC_LOCALE_PARAMS`.

- `ENABLE_STATIC_LOCALE_PARAMS=true`: `generateStaticParams()` returns `i18n.locales`, `dynamicParams` is set to `false` and Next.js only accepts known/pre-generated locales.
- Any other value, or missing variable: `generateStaticParams()` returns `[]`, `dynamicParams` is set to `true` and locale routes are resolved dynamically on demand.

This toggle is evaluated during build/deploy; changing it in an environment requires rebuilding/redeploying the application to modify the generated behavior.

---

## Local development (quick)

1. Make sure the CMS is running at `http://localhost:1337` (Strapi).

2. Create `./teleferico-app/.env.local` with the environment variables detailed in the file `./teleferico-app/.env.example`, for example:

```env
BUILD_STRAPI_BASE_URL=http://localhost:1337
BUILD_STRAPI_BUCKET_HOSTNAME=localhost
BUILD_STRAPI_BUCKET_PATHNAME=/uploads/*
NEXT_PUBLIC_SITE_URL=http://localhost:3000
APP_INTERNAL_BASE_URL=http://localhost:3000
ENABLE_STATIC_LOCALE_PARAMS=false
```

3. Execute:

```bash
pnpm run dev
```
