import { auth } from "@/auth";
import { i18n } from "@/i18n";
import { verifySession } from "@/lib/services";
import type { Locales } from "@/types";
import { NextResponse } from "next/server";
import { ADMIN_ROUTES } from "./utils/routes.const";

export default auth(async (req) => {
  const pathname = req.nextUrl.pathname;
  const matchingAdminSegments = [
    ADMIN_ROUTES.DASHBOARD,
    ADMIN_ROUTES.LOGIN,
    ADMIN_ROUTES.LOGOUT,
  ];
  // Trying to access administration routes
  if (matchingAdminSegments.some((route) => pathname.startsWith(route))) {
    // Check if user is logged in Authjs
    if (req.auth !== null) {
      const { isLogged } = await verifySession(req.auth.jwt);
      // Check if jwt saved within authjs session is still valid (logged in Strapi)
      if (isLogged) {
        // Restric routes from authenticated users
        if (
          pathname === ADMIN_ROUTES.LOGIN ||
          pathname === ADMIN_ROUTES.LOGOUT
        ) {
          const newUrl = new URL(ADMIN_ROUTES.DASHBOARD, req.nextUrl.origin);
          return Response.redirect(newUrl);
        }
        return;
      } else {
        // Avoid infinite redirection loop to logout page
        if (pathname !== ADMIN_ROUTES.LOGOUT) {
          const newUrl = new URL(ADMIN_ROUTES.LOGOUT, req.nextUrl.origin);
          const response = Response.redirect(newUrl);

          return response;
        }
        return;
      }
    }

    // Not authenticated user wants to access to a protected route
    if (pathname !== ADMIN_ROUTES.LOGIN) {
      const newUrl = new URL(ADMIN_ROUTES.LOGIN, req.nextUrl.origin);
      return Response.redirect(newUrl);
    }
    return;
  } else {
    // Locale detection: cookie -> Accept-Language -> default
    const url = req.nextUrl;
    const { locales } = i18n;
    const hasLocalePrefix = locales.some(
      (l) => url.pathname === `/${l}` || url.pathname.startsWith(`/${l}/`),
    );

    const normalize = (
      lang: string | undefined,
    ): (typeof locales)[number] | undefined => {
      if (!lang) return undefined;
      const l = lang.toLowerCase();
      if (l.startsWith("es")) return "es-AR" as Locales;
      if (l.startsWith("en")) return "en" as Locales;
      if (l.startsWith("pt")) return "pt" as Locales;
      return undefined;
    };

    const pickLocale = () => {
      const rawCookie = req.cookies.get("NEXT_LOCALE")?.value;
      const cookieLocale = normalize(rawCookie);
      if (cookieLocale) return cookieLocale;

      const header = req.headers.get("accept-language") || "";
      const preferred = header
        .split(",")
        .map((part) => part.split(";")[0].trim())
        .map(normalize)
        .find((v): v is (typeof locales)[number] => Boolean(v));
      return preferred || i18n.defaultLocale;
    };

    if (url.pathname === "/") {
      const locale = pickLocale();
      const redirectURL = new URL(`/${locale}`, url);
      const res = NextResponse.redirect(redirectURL);
      res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
      return res;
    }

    if (!hasLocalePrefix) {
      const locale = pickLocale();
      const redirectURL = new URL(`/${locale}${url.pathname}`, url);
      redirectURL.search = url.search; // preserve query
      const res = NextResponse.redirect(redirectURL);
      res.cookies.set("NEXT_LOCALE", locale, { path: "/" });
      return res;
    }
  }
});

// export const config = { matcher: ["/dashboard/:path*", "/login", "/logout"] };

export const config = {
  // Skip Next internals and all static assets (files with extensions)
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
