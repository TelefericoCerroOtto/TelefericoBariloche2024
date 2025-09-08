import { auth } from "@/auth";
import { i18n } from "@/i18n";
import { verifySession } from "@/lib/services";
import type { Locales } from "@/types";
import { NextResponse } from "next/server";
import { ADMIN_ROUTES } from "./utils/routes.const";

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

  const pickLocale = (): Locales => {
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

  const segments = pathname.split("/");
  const maybeLocale = segments[1] as string | undefined;
  const hasLocalePrefix = i18n.locales.includes(maybeLocale as Locales);
  const adminPath = "/" + (hasLocalePrefix ? segments.slice(2).join("/") : segments.slice(1).join("/"));
  const adminRoots = [ADMIN_ROUTES.DASHBOARD, ADMIN_ROUTES.LOGIN, ADMIN_ROUTES.LOGOUT];
  const isAdminPath = adminRoots.some((route) => adminPath === route || adminPath.startsWith(`${route}/`));

  // Handle Administration routes (with or without locale prefix)
  if (isAdminPath) {
    // Force administration routes to use only the default locale
    const forcedLocale = i18n.defaultLocale as Locales;

    // Redirect any non-prefixed or wrong-locale admin path to the default locale
    if (!hasLocalePrefix || maybeLocale !== forcedLocale) {
      const redirectURL = new URL(`/${forcedLocale}${adminPath}`, url);
      const res = NextResponse.redirect(redirectURL);
      res.cookies.set("NEXT_LOCALE", forcedLocale, { path: "/" });
      return res;
    }

    // At this point, path is locale-prefixed. Proceed with auth gating.
    if (req.auth !== null) {
      const { isLogged } = await verifySession(req.auth.jwt);
      if (isLogged) {
        // Restrict login/logout for authenticated users
        if (adminPath === ADMIN_ROUTES.LOGIN || adminPath === ADMIN_ROUTES.LOGOUT) {
          const newUrl = new URL(`/${i18n.defaultLocale}${ADMIN_ROUTES.DASHBOARD}`, url);
          return Response.redirect(newUrl);
        }
        return;
      } else {
        // Avoid infinite redirection loop to logout page
        if (adminPath !== ADMIN_ROUTES.LOGOUT) {
          const newUrl = new URL(`/${i18n.defaultLocale}${ADMIN_ROUTES.LOGOUT}`, url);
          const response = Response.redirect(newUrl);
          return response;
        }
        return;
      }
    }

    // Not authenticated user wants to access a protected route
    if (adminPath !== ADMIN_ROUTES.LOGIN) {
      const newUrl = new URL(`/${i18n.defaultLocale}${ADMIN_ROUTES.LOGIN}`, url);
      return Response.redirect(newUrl);
    }
    return;
  }

  // Public paths
  // Only redirect the root path to a locale-prefixed homepage
  if (url.pathname === "/") {
    const locale = pickLocale();
    const redirectURL = new URL(`/${locale}`, url);
    const res = NextResponse.redirect(redirectURL);
    res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
    return res;
  }

  // If the current path already has a locale prefix, persist it in the cookie for future redirects.
  if (hasLocalePrefix) {
    const cookieLocale = req.cookies.get("NEXT_LOCALE")?.value;
    if (cookieLocale !== maybeLocale) {
      const res = NextResponse.next();
      res.cookies.set("NEXT_LOCALE", maybeLocale as Locales, { path: "/" });
      return res;
    }
  }

  // Do not redirect any other path. Let Next.js route or 404.
  return;
});

// export const config = { matcher: ["/dashboard/:path*", "/login", "/logout"] };

export const config = {
  // Skip Next internals, API routes, and all static assets (including favicon)
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
