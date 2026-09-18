import { expect, type Page, test } from "@playwright/test";

type RoleName = "Administrator" | "Media Manager";
type SessionPayload = {
  csrfToken?: string;
  user?: { role?: { name?: string } };
};

const LOGIN_NAVIGATION_TIMEOUT_MS = 90_000;
const LOGIN_HYDRATION_TIMEOUT_MS = 30_000;
const LOGIN_FAILURE_DIAGNOSTIC_MAX_CHARS = 512;
const loginUrl = "http://127.0.0.1:3200/es-AR/login";
const dashboardUrl = "http://127.0.0.1:3200/es-AR/dashboard";

const marker = requiredEnvironment("PLAYWRIGHT_REAL_AUTH_MARKER");
const knownStrapiJwt = requiredEnvironment(
  "PLAYWRIGHT_REAL_AUTH_KNOWN_STRAPI_JWT",
);
const users: Record<
  "administrator" | "mediaManager",
  { email: string; password: string; role: RoleName }
> = {
  administrator: {
    email: requiredEnvironment("PLAYWRIGHT_REAL_AUTH_ADMIN_EMAIL"),
    password: requiredEnvironment("PLAYWRIGHT_REAL_AUTH_ADMIN_PASSWORD"),
    role: "Administrator",
  },
  mediaManager: {
    email: requiredEnvironment("PLAYWRIGHT_REAL_AUTH_MEDIA_EMAIL"),
    password: requiredEnvironment("PLAYWRIGHT_REAL_AUTH_MEDIA_PASSWORD"),
    role: "Media Manager",
  },
};
function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required by the real-auth suite.`);
  return value;
}

async function createLoginReadinessTimeoutError(
  page: Page,
  responseStatus: number | null,
) {
  const form = page.locator("form[data-login-hydrated]");
  const rawHydrationMarker = await form
    .getAttribute("data-login-hydrated", { timeout: 1_000 })
    .catch(() => null);
  const hydrationMarker =
    rawHydrationMarker === "true" || rawHydrationMarker === "false"
      ? rawHydrationMarker
      : rawHydrationMarker === null
        ? null
        : "unexpected";
  const diagnostic = JSON.stringify({
    pathname: diagnosticPathname(page.url()),
    responseStatus,
    hydrationMarker,
  });
  return new Error(
    `Login hydration readiness timed out: ${diagnostic.slice(0, LOGIN_FAILURE_DIAGNOSTIC_MAX_CHARS)}`,
  );
}

function diagnosticPathname(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return pathname === "/es-AR/login" || pathname === "/es-AR/dashboard"
      ? pathname
      : "unexpected";
  } catch {
    return "invalid";
  }
}

async function login(page: Page, user: (typeof users)[keyof typeof users]) {
  const exposedCredentialParameters = new Set<string>();
  const observeNavigation = (request: { isNavigationRequest(): boolean; url(): string }) => {
    if (!request.isNavigationRequest()) return;
    const requestUrl = new URL(request.url());
    if (!requestUrl.pathname.endsWith("/login")) return;
    if (requestUrl.searchParams.has("identifier")) {
      exposedCredentialParameters.add("identifier");
    }
    if (requestUrl.searchParams.has("password")) {
      exposedCredentialParameters.add("password");
    }
  };
  page.on("request", observeNavigation);

  try {
    const loginResponse = await page
      .goto(loginUrl, {
        waitUntil: "domcontentloaded",
        timeout: LOGIN_NAVIGATION_TIMEOUT_MS,
      })
      .catch(async () => {
        throw await createLoginReadinessTimeoutError(page, null);
      });
    const responseStatus = loginResponse?.status() ?? null;
    if (
      !loginResponse ||
      responseStatus !== 200 ||
      loginResponse.url() !== loginUrl ||
      page.url() !== loginUrl
    ) {
      throw new Error(`Login response validation failed: ${JSON.stringify({
        expectedPathname: "/es-AR/login",
        responseStatus,
        responsePathname: loginResponse
          ? diagnosticPathname(loginResponse.url())
          : null,
        pagePathname: diagnosticPathname(page.url()),
      })}`);
    }

    const form = page.locator("form[data-login-hydrated]");
    try {
      await expect(form).toHaveAttribute("data-login-hydrated", "true", {
        timeout: LOGIN_HYDRATION_TIMEOUT_MS,
      });
    } catch {
      throw await createLoginReadinessTimeoutError(page, responseStatus);
    }

    const identifier = page.getByLabel("Correo Electrónico");
    const password = page.getByLabel("Contraseña");
    const submit = page.getByRole("button", { name: "Acceder" });
    await expect(identifier).toBeEnabled();
    await expect(password).toBeEnabled();
    await expect(submit).toBeEnabled();
    await identifier.fill(user.email);
    await password.fill(user.password);
    await submit.click();
    try {
      await page.waitForURL(dashboardUrl, {
        timeout: LOGIN_NAVIGATION_TIMEOUT_MS,
      });
    } catch {
      throw new Error("Login did not reach the dashboard.");
    }
    const currentUrl = new URL(page.url());
    expect({
      pathname: currentUrl.pathname,
      credentialParameters: ["identifier", "password"].filter((name) =>
        currentUrl.searchParams.has(name),
      ),
    }).toEqual({ pathname: "/es-AR/dashboard", credentialParameters: [] });
    expect([...exposedCredentialParameters]).toEqual([]);
    const session = await readSession(page);
    expect(session.user?.role?.name).toBe(user.role);
    return session;
  } finally {
    page.off("request", observeNavigation);
  }
}

async function readSession(page: Page): Promise<SessionPayload> {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Session request failed: ${response.status}`);
    return response.json();
  });
}

async function sameOriginRequest(
  page: Page,
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {},
) {
  return page.evaluate(
    async ({ requestUrl, requestInit }) => {
      const response = await fetch(requestUrl, {
        ...requestInit,
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = await response.json().catch(() => null);
      return { status: response.status, body };
    },
    { requestUrl: url, requestInit: init },
  );
}

function hasNestedKey(value: unknown, key: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value))
    return value.some((entry) => hasNestedKey(entry, key));
  return Object.entries(value).some(
    ([candidate, nested]) =>
      candidate.toLowerCase() === key.toLowerCase() ||
      hasNestedKey(nested, key),
  );
}

async function assertNoBrowserVisibleStrapiJwt(page: Page) {
  const surfaces = await page.evaluate(async () => {
    const sessionResponse = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    const session = await sessionResponse.json();
    return {
      session,
      dom: document.documentElement.outerHTML,
      localStorage: Object.fromEntries(
        Array.from({ length: window.localStorage.length }, (_, index) => {
          const key = window.localStorage.key(index) ?? "";
          return [key, window.localStorage.getItem(key)];
        }),
      ),
      sessionStorage: Object.fromEntries(
        Array.from({ length: window.sessionStorage.length }, (_, index) => {
          const key = window.sessionStorage.key(index) ?? "";
          return [key, window.sessionStorage.getItem(key)];
        }),
      ),
      documentCookie: document.cookie,
    };
  });
  const browserVisibleText = JSON.stringify(surfaces);
  const storageValues = [
    ...Object.values(surfaces.localStorage),
    ...Object.values(surfaces.sessionStorage),
  ];

  expect(hasNestedKey(surfaces.session, "jwt")).toBe(false);
  expect(
    storageValues.some((value) => {
      if (typeof value !== "string") return false;
      try {
        return hasNestedKey(JSON.parse(value), "jwt");
      } catch {
        return false;
      }
    }),
  ).toBe(false);
  expect(browserVisibleText.includes(knownStrapiJwt)).toBe(false);
  expect(
    /authorization\s*:\s*bearer|bearer\s+eyj/i.test(browserVisibleText),
  ).toBe(false);
  expect(
    /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/.test(
      browserVisibleText,
    ),
  ).toBe(false);
}

async function logout(page: Page) {
  await page.goto("/es-AR/logout", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/es-AR\/login$/);
}

test.describe("real Auth.js and Strapi authorization", () => {
  test.describe.configure({ mode: "serial" });

  test("Administrator authenticates, reads marker data, and restores a protected write", async ({
    page,
  }) => {
    const session = await login(page, users.administrator);
    await expect(page.getByRole("link", { name: "Trabajo" })).toBeEnabled();

    const postulations = await sameOriginRequest(
      page,
      "/api/proxy/api/postulations?populate=*",
    );
    expect(postulations.status).toBe(200);
    expect(
      (postulations.body?.data ?? []).some(
        (entry: { note?: string; email?: string }) =>
          entry.note === marker || entry.email?.includes(marker.slice(-24)),
      ),
    ).toBe(true);

    const csrfToken = session.csrfToken;
    expect(typeof csrfToken).toBe("string");
    try {
      const update = await sameOriginRequest(page, "/api/admin/service-state", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken as string,
        },
        body: JSON.stringify({ state: "conditional" }),
      });
      expect(update.status).toBe(200);
      expect(update.body?.data?.state).toBe("conditional");
    } finally {
      const restore = await sameOriginRequest(
        page,
        "/api/admin/service-state",
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-csrf-token": csrfToken as string,
          },
          body: JSON.stringify({ state: "normal" }),
        },
      );
      expect(restore.status).toBe(200);
      expect(restore.body?.data?.state).toBe("normal");
    }
    await logout(page);
  });

  test("Media Manager keeps permitted app access while protected operations are denied", async ({
    page,
  }) => {
    const session = await login(page, users.mediaManager);
    await expect(page.getByRole("link", { name: "Noticias" })).toBeEnabled();
    const read = await sameOriginRequest(page, "/api/proxy/api/postulations");
    expect(read.status).toBe(403);

    const write = await sameOriginRequest(page, "/api/admin/service-state", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.csrfToken as string,
      },
      body: JSON.stringify({ state: "closed" }),
    });
    expect(write.status).toBe(403);
    await logout(page);
  });

  test("Strapi JWT remains server-only and logout removes reusable app authentication", async ({
    context,
    page,
  }) => {
    await login(page, users.administrator);
    await assertNoBrowserVisibleStrapiJwt(page);
    await logout(page);

    const protectedRead = await sameOriginRequest(
      page,
      "/api/proxy/api/postulations",
    );
    expect(protectedRead.status).toBe(401);
    await page.goto("/es-AR/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/es-AR\/login$/);
    const cookies = await context.cookies();
    expect(
      cookies.some(({ name }) => /authjs\.session-token/i.test(name)),
    ).toBe(false);
  });
});
