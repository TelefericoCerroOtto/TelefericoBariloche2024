import { auth } from "@/auth";
import { verifySession } from "@/lib/services";
import { ADMIN_ROUTES } from "./utils/routes.const";
import { NextResponse } from "next/server";
import { i18n } from "@/i18n";

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
    const { defaultLocale } = i18n;

    // Check if the default locale is in the pathname
    if (pathname.startsWith(`/${defaultLocale}`)) {
      // e.g. incoming request is /es-AR/about
      // The new URL is now /about
      const url = new URL(
        pathname.replace(`/${defaultLocale}`, ""),
        process.env.NEXT_PUBLIC_BASE_URL,
      );

      return NextResponse.redirect(url);
    }

    const pathnameIsMissingLocale = i18n.locales.every(
      (locale) =>
        !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
    );

    if (pathnameIsMissingLocale) {
      // We are on the default locale
      // Rewrite so Next.js understands

      // e.g. incoming request is /about
      // Tell Next.js it should pretend it's /en/about
      return NextResponse.rewrite(
        new URL(`/${defaultLocale}${pathname}`, req.url),
      );
    }
  }
});

// export const config = { matcher: ["/dashboard/:path*", "/login", "/logout"] };

export const config = {
  // Do not run the middleware on the following paths
  // prettier-ignore
  matcher:
  '/((?!api|static|data|css|scripts|.*\\..*|_next).*|robots.txt|sitemap.xml|favicon.ico)',
};
