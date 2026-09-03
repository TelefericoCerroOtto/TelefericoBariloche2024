import { auth } from "@/auth";
import { i18n } from "@/i18n";
import {
  ADMIN_LOGIN_QUERY_PARAMS,
  ADMIN_LOGIN_REASONS,
  ADMIN_ROUTES,
  type AdminLoginReason,
} from "@/lib/constants/routes.const";
import {
  getMaintenanceAccess,
  isMaintenanceDashboardDescendant,
  isSafeMaintenanceNavigationMethod,
  MAINTENANCE_ACCESS,
  MAINTENANCE_NAVIGATION_REDIRECT_STATUS,
} from "@/lib/maintenance-access";
import {
  isQrNamespacePath,
  shouldSkipMiddleware,
} from "@/lib/middleware-matcher";
import { getServerToken } from "@/lib/auth/auth-token";
import { verifySession } from "@/lib/services/cms/users-permissions/auth";
import type { Locales } from "@/types";
import {
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
  NextResponse,
} from "next/server";

const PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

// Locale helpers — module-level so they are accessible to both the outer
// middleware function (for maintenance) and the inner auth handler.

const normalize = (lang: string | undefined): Locales | undefined => {
  if (!lang) return undefined;
  const l = lang.toLowerCase();
  if (l === "es" || l.startsWith("es-")) return "es-AR" as Locales;
  if (l === "en" || l.startsWith("en-")) return "en" as Locales;
  if (l === "pt" || l.startsWith("pt-")) return "pt" as Locales;
  return undefined;
};

const pickLocale = (req: NextRequest): Locales => {
  const rawCookie = req.cookies.get("NEXT_LOCALE")?.value;
  const cookieLocale = normalize(rawCookie);
  if (cookieLocale) return cookieLocale;

  const header = req.headers.get("accept-language") || "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim())
    .map(normalize)
    .find((v): v is Locales => Boolean(v));
  return preferred || i18n.defaultLocale;
};

// Handles all maintenance-mode responses. Called before any auth overhead.
const handleMaintenance = (req: NextRequest): NextResponse => {
  const pathname = req.nextUrl.pathname;

  // APIs and unsafe navigation methods fail closed without rendering a page.
  if (
    pathname.startsWith("/api/") ||
    !isSafeMaintenanceNavigationMethod(req.method)
  ) {
    return new NextResponse(
      JSON.stringify({ error: "Service unavailable", maintenance: true }),
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "3600",
        },
      },
    );
  }

  // All other routes: rewrite to the maintenance page.
  // NOTE: the `status: 503` passed to NextResponse.rewrite() does NOT reach
  // the browser — Next.js resets it to 200 during page render. Crawler
  // protection relies on the Retry-After header and the `noindex` meta tag
  // present on the maintenance page.
  const maintenanceLocale = pickLocale(req);
  const maintenanceUrl = req.nextUrl.clone();
  maintenanceUrl.pathname = "/maintenance";
  maintenanceUrl.searchParams.set("locale", maintenanceLocale);
  return NextResponse.rewrite(maintenanceUrl, {
    status: 503,
    headers: { "Retry-After": "3600" },
  });
};

// Auth-wrapped handler for administration routes and normal public routing.
// Cast as NextMiddleware so TypeScript resolves the correct overload when we
// forward (req, event) from the outer function.
const authMiddleware = auth(async (req) => {
  const url = req.nextUrl;
  const pathname = url.pathname;

  const segments = pathname.split("/");
  const maybeLocale = segments[1] as string | undefined;
  const hasLocalePrefix = i18n.locales.includes(maybeLocale as Locales);

  const adminPath =
    "/" +
    (hasLocalePrefix
      ? segments.slice(2).join("/")
      : segments.slice(1).join("/"));

  const adminRoots = [
    ADMIN_ROUTES.DASHBOARD,
    ADMIN_ROUTES.LOGIN,
    ADMIN_ROUTES.LOGOUT,
  ];

  const buildAdminRedirect = (
    route: string,
    reason?: AdminLoginReason,
    status = 307,
  ) => {
    const pathname = `/${i18n.defaultLocale}${route}`;
    const redirectUrl = PUBLIC_SITE_URL
      ? new URL(pathname, PUBLIC_SITE_URL)
      : req.nextUrl.clone();
    redirectUrl.pathname = pathname;
    redirectUrl.search = req.nextUrl.search;

    if (reason) {
      redirectUrl.searchParams.set(ADMIN_LOGIN_QUERY_PARAMS.REASON, reason);
    } else {
      redirectUrl.searchParams.delete(ADMIN_LOGIN_QUERY_PARAMS.REASON);
    }

    return NextResponse.redirect(redirectUrl, status);
  };

  const isAdminPath = adminRoots.some(
    (route) => adminPath === route || adminPath.startsWith(`${route}/`),
  );

  // Handle Administration routes (with or without locale prefix)
  if (isAdminPath) {
    // Force administration routes to use only the default locale
    const forcedLocale = i18n.defaultLocale as Locales;

    // Redirect any non-prefixed or wrong-locale admin path to the default locale
    // IMPORTANT: preserve search params when rebuilding the target URL
    if (!hasLocalePrefix || maybeLocale !== forcedLocale) {
      const pathname = `/${forcedLocale}${adminPath}`;
      const redirectURL = PUBLIC_SITE_URL
        ? new URL(pathname, PUBLIC_SITE_URL)
        : req.nextUrl.clone();
      redirectURL.pathname = pathname;
      redirectURL.search = req.nextUrl.search;

      const res = NextResponse.redirect(redirectURL);
      res.cookies.set("NEXT_LOCALE", forcedLocale, { path: "/" });
      return res;
    }

    // At this point, path is locale-prefixed. Proceed with auth gating.
    if (req.auth !== null) {
      let isLogged = false;
      try {
        const token = await getServerToken(req);
        if (token) {
          const session = await verifySession(token.jwt);
          isLogged = session.isLogged;
        }
      } catch (error) {
        console.error("CMS session verification failed in middleware", error);
      }

      if (isLogged) {
        // Restrict login for authenticated users
        if (adminPath === ADMIN_ROUTES.LOGIN) {
          return buildAdminRedirect(ADMIN_ROUTES.DASHBOARD);
        }

        if (
          process.env.MAINTENANCE_MODE === "true" &&
          isMaintenanceDashboardDescendant(adminPath)
        ) {
          return buildAdminRedirect(
            ADMIN_ROUTES.DASHBOARD,
            undefined,
            MAINTENANCE_NAVIGATION_REDIRECT_STATUS,
          );
        }
        return;
      }

      // Not logged: Avoid infinite redirection loop to logout page
      if (adminPath !== ADMIN_ROUTES.LOGOUT) {
        return buildAdminRedirect(
          ADMIN_ROUTES.LOGOUT,
          ADMIN_LOGIN_REASONS.SESSION_EXPIRED,
        );
      }
      return;
    }

    // Not authenticated user wants to access a protected route
    if (adminPath !== ADMIN_ROUTES.LOGIN) {
      return buildAdminRedirect(ADMIN_ROUTES.LOGIN);
    }

    return;
  }

  // 🚩 Public paths

  // 0) Redirección de subdominios legacy (en. / pt.) a la nueva arquitectura de rutas
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    req.nextUrl.host;
  if (host.startsWith("en.") || host.startsWith("pt.")) {
    const targetLocale = host.startsWith("en.") ? "en" : "pt";

    const redirectURL = PUBLIC_SITE_URL
      ? new URL(pathname, PUBLIC_SITE_URL)
      : req.nextUrl.clone();

    if (!PUBLIC_SITE_URL) {
      redirectURL.hostname = redirectURL.hostname.replace(/^(en|pt)\./, "");
    }

    const rest = hasLocalePrefix
      ? segments.slice(2).join("/")
      : segments.slice(1).join("/");
    redirectURL.pathname =
      rest && rest.length > 0 ? `/${targetLocale}/${rest}` : `/${targetLocale}`;
    redirectURL.search = req.nextUrl.search;

    return NextResponse.redirect(redirectURL, 301);
  }

  // 1) Si la ruta NO tiene un locale válido como prefijo, la redirigimos a un locale.
  if (!hasLocalePrefix) {
    // Si el primer segmento parece un idioma corto (es, en, pt),
    // lo normalizamos al locale completo.
    const normalized = normalize(maybeLocale);

    const targetLocale = normalized ?? pickLocale(req);
    const startIndex = normalized ? 2 : 1; // si había "es" lo sacamos, si no, usamos toda la ruta
    const rest = segments.slice(startIndex).join("/");

    const redirectPath =
      rest && rest.length > 0 ? `/${targetLocale}/${rest}` : `/${targetLocale}`;

    // IMPORTANT: preserve search params by cloning nextUrl
    const redirectURL = req.nextUrl.clone();
    redirectURL.pathname = redirectPath; // keeps redirectURL.search
    const res = NextResponse.redirect(redirectURL);
    res.cookies.set("NEXT_LOCALE", targetLocale, { path: "/" });
    return res;
  }

  // 2) Si ya tiene un locale prefijo, persistimos ese locale en la cookie.
  if (hasLocalePrefix) {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    if (cookieLocale !== maybeLocale) {
      const res = NextResponse.next();
      res.cookies.set("NEXT_LOCALE", maybeLocale as Locales, { path: "/" });
      return res;
    }
  }

  // 3) Cualquier otra cosa, dejamos que Next resuelva (o 404).
  return;
}) as unknown as NextMiddleware;

export default async function middleware(
  req: NextRequest,
  event: NextFetchEvent,
) {
  const pathname = req.nextUrl.pathname;
  const isQrPath = isQrNamespacePath(pathname);

  // Fast path: skip non-API static assets, Next.js internals, and root metadata
  // files. API routes must reach the maintenance classifier even when their
  // path ends in a file extension.
  // This also handles the dual concern raised by security + reliability reviews:
  //   - robots.txt / sitemap.xml are excluded here so they never reach locale
  //     redirect logic (reliability fix).
  //   - Admin/dashboard paths ending in extension-like segments (e.g.
  //     /es-AR/dashboard/news/foo.js) are NOT excluded and continue to receive
  //     full middleware processing (security fix).
  // See src/lib/middleware-matcher.ts for the classification rules.
  if (
    !isQrPath &&
    !pathname.startsWith("/api/") &&
    shouldSkipMiddleware(pathname)
  ) {
    return;
  }

  // 1. Maintenance check runs first. The public exception reaches the existing
  // trusted-browser proxy guard; administration still goes through auth.
  if (process.env.MAINTENANCE_MODE === "true") {
    const maintenanceAccess = getMaintenanceAccess(pathname, req.method);

    if (
      maintenanceAccess === MAINTENANCE_ACCESS.PUBLIC_SERVICE_STATE ||
      maintenanceAccess === MAINTENANCE_ACCESS.AUTH_API ||
      maintenanceAccess === MAINTENANCE_ACCESS.PROTECTED_SERVICE_STATE
    ) {
      return;
    }

    if (maintenanceAccess === MAINTENANCE_ACCESS.AUTHENTICATED_ADMINISTRATION) {
      return authMiddleware(req, event);
    }

    return handleMaintenance(req);
  }

  // QR filesystem routes are public and locale-neutral for every HTTP method.
  if (isQrPath) {
    return;
  }

  // 2. API routes skip locale and auth logic entirely.
  if (pathname.startsWith("/api/")) {
    return;
  }

  // 3. Everything else goes through the auth-wrapped handler.
  return authMiddleware(req, event);
}

export const config = {
  // The matcher keeps only the _next/ internals and favicon.ico exclusions —
  // the minimum required to avoid infinite loops from Next.js internal requests.
  //
  // All other skip decisions (static extensions, root metadata files, admin
  // paths with dotted segments) are handled at runtime by shouldSkipMiddleware()
  // inside the middleware function body. This allows the middleware to make
  // context-aware decisions: e.g. /es-AR/dashboard/news/foo.js is an admin path
  // that must be processed, while /static/logo.js is a real asset to skip.
  //
  // API routes are intentionally not excluded so the maintenance check can
  // intercept them (the main middleware short-circuits /api/ immediately anyway).
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
