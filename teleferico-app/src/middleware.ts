import { auth } from "@/auth";
import { i18n } from "@/i18n";
import {
  ADMIN_LOGIN_QUERY_PARAMS,
  ADMIN_LOGIN_REASONS,
  ADMIN_ROUTES,
  type AdminLoginReason,
} from "@/lib/constants/routes.const";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { verifySession } from "@/lib/services/cms/users-permissions/auth";
import type { Locales } from "@/types";
import { NextResponse } from "next/server";

const PUBLIC_SITE_URL = process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL]?.replace(
  /\/$/,
  "",
);

export default auth(async (req) => {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Locale helpers
  const normalize = (lang: string | undefined): Locales | undefined => {
    if (!lang) return undefined;
    const l = lang.toLowerCase();
    if (l.startsWith("es")) return "es-AR" as Locales;
    if (l.startsWith("en")) return "en" as Locales;
    if (l.startsWith("pt")) return "pt" as Locales;
    return undefined;
  };

  // TODO: re-implement this function to pick locale from cookie or Accept-Language header. Cookie default language was "en".
  const pickLocale = (): Locales => {
    // const rawCookie = req.cookies.get("NEXT_LOCALE")?.value;
    // const cookieLocale = normalize(rawCookie);
    // if (cookieLocale) return cookieLocale;

    // const header = req.headers.get("accept-language") || "";
    // const preferred = header
    //   .split(",")
    //   .map((part) => part.split(";")[0].trim())
    //   .map(normalize)
    //   .find((v): v is Locales => Boolean(v));
    // return preferred || i18n.defaultLocale;
    return i18n.defaultLocale as Locales;
  };

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
  ) => {
    const pathname = `/${i18n.defaultLocale}${route}`;
    const redirectUrl = PUBLIC_SITE_URL
      ? new URL(pathname, PUBLIC_SITE_URL)
      : req.nextUrl.clone();
    redirectUrl.pathname = pathname;

    req.nextUrl.searchParams.forEach((value, key) => {
      redirectUrl.searchParams.set(key, value);
    });

    if (reason) {
      redirectUrl.searchParams.set(ADMIN_LOGIN_QUERY_PARAMS.REASON, reason);
    } else {
      redirectUrl.searchParams.delete(ADMIN_LOGIN_QUERY_PARAMS.REASON);
    }

    return NextResponse.redirect(redirectUrl);
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

      req.nextUrl.searchParams.forEach((value, key) => {
        redirectURL.searchParams.set(key, value);
      });

      const res = NextResponse.redirect(redirectURL);
      res.cookies.set("NEXT_LOCALE", forcedLocale, { path: "/" });
      return res;
    }

    // At this point, path is locale-prefixed. Proceed with auth gating.
    if (req.auth !== null) {
      const { isLogged } = await verifySession(req.auth.jwt);

      if (isLogged) {
        // Restrict login/logout for authenticated users
        if (
          adminPath === ADMIN_ROUTES.LOGIN ||
          adminPath === ADMIN_ROUTES.LOGOUT
        ) {
          return buildAdminRedirect(ADMIN_ROUTES.DASHBOARD);
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
  const host = req.headers.get("host") || "";
  if (host.startsWith("en.") || host.startsWith("pt.")) {
    const targetLocale = host.startsWith("en.") ? "en" : "pt";
    
    const redirectURL = PUBLIC_SITE_URL
      ? new URL(pathname, PUBLIC_SITE_URL)
      : req.nextUrl.clone();
      
    const rest = hasLocalePrefix ? segments.slice(2).join("/") : segments.slice(1).join("/");
    redirectURL.pathname = rest && rest.length > 0 ? `/${targetLocale}/${rest}` : `/${targetLocale}`;
    
    req.nextUrl.searchParams.forEach((value, key) => {
      redirectURL.searchParams.set(key, value);
    });

    return NextResponse.redirect(redirectURL, 301);
  }

  // 1) Si la ruta NO tiene un locale válido como prefijo, la redirigimos a un locale.
  if (!hasLocalePrefix) {
    // Si el primer segmento parece un idioma corto (es, en, pt),
    // lo normalizamos al locale completo.
    const normalized = normalize(maybeLocale);

    const targetLocale = normalized ?? pickLocale();
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
});

export const config = {
  // Skip Next internals, API routes, and all static assets (including favicon)
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
