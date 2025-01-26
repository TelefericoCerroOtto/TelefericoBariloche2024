import { auth } from "@/auth";
import { verifySession } from "@/lib/services";
import { ADMIN_ROUTES } from "./utils/routes.const";

export default auth(async (req) => {
  // Check if user is logged in Authjs
  if (req.auth !== null) {
    const { isLogged } = await verifySession(req.auth.jwt);
    // Check if jwt saved within authjs session is still valid (logged in Strapi)
    if (isLogged) {
      // Restric routes from authenticated users
      if (
        req.nextUrl.pathname === ADMIN_ROUTES.LOGIN ||
        req.nextUrl.pathname === ADMIN_ROUTES.LOGOUT
      ) {
        const newUrl = new URL(ADMIN_ROUTES.DASHBOARD, req.nextUrl.origin);
        return Response.redirect(newUrl);
      }
      return;
    } else {
      // Avoid infinite redirection loop to logout page
      if (req.nextUrl.pathname !== ADMIN_ROUTES.LOGOUT) {
        const newUrl = new URL(ADMIN_ROUTES.LOGOUT, req.nextUrl.origin);
        const response = Response.redirect(newUrl);

        return response;
      }
      return;
    }
  }

  // Not authenticated user wants to access to a protected route
  if (req.nextUrl.pathname !== ADMIN_ROUTES.LOGIN) {
    const newUrl = new URL(ADMIN_ROUTES.LOGIN, req.nextUrl.origin);
    return Response.redirect(newUrl);
  }
  return;
});

export const config = { matcher: ["/dashboard/:path*", "/login", "/logout"] };
