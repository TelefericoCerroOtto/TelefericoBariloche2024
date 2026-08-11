import { i18n } from "@/i18n";
import {
  ADMIN_ROUTES,
  ROUTE_HANDLERS,
  STRAPI_ENDPOINTS,
} from "@/lib/constants/routes.const";

export const MAINTENANCE_ACCESS = {
  AUTH_API: "auth-api",
  AUTHENTICATED_ADMINISTRATION: "authenticated-administration",
  BLOCKED: "blocked",
  PROTECTED_SERVICE_STATE: "protected-service-state",
  PUBLIC_SERVICE_STATE: "public-service-state",
} as const;

export type MaintenanceAccess =
  (typeof MAINTENANCE_ACCESS)[keyof typeof MAINTENANCE_ACCESS];

export const MAINTENANCE_NAVIGATION_REDIRECT_STATUS = 303;

const PUBLIC_SERVICE_STATE_PATH = `${ROUTE_HANDLERS.PROXY}${STRAPI_ENDPOINTS.SERVICE_STATE}`;

const AUTH_API_METHODS: Readonly<Record<string, readonly string[]>> = {
  "/api/auth/session": ["GET", "POST"],
  "/api/auth/csrf": ["GET"],
  "/api/auth/providers": ["GET"],
  "/api/auth/callback/credentials": ["POST"],
  "/api/auth/signout": ["POST"],
};

function isAdministrationPath(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  const hasLocalePrefix = i18n.locales.includes(
    maybeLocale as (typeof i18n.locales)[number],
  );
  const administrationPath =
    "/" +
    (hasLocalePrefix
      ? segments.slice(2).join("/")
      : segments.slice(1).join("/"));

  return (
    administrationPath === ADMIN_ROUTES.LOGIN ||
    administrationPath === ADMIN_ROUTES.LOGOUT ||
    administrationPath === ADMIN_ROUTES.DASHBOARD ||
    administrationPath.startsWith(`${ADMIN_ROUTES.DASHBOARD}/`)
  );
}

export function isSafeMaintenanceNavigationMethod(method: string) {
  return method === "GET" || method === "HEAD";
}

export function isMaintenanceDashboardDescendant(adminPath: string) {
  return adminPath.startsWith(`${ADMIN_ROUTES.DASHBOARD}/`);
}

export function shouldRedirectMaintenanceDashboardSections(
  isMaintenanceMode: boolean,
) {
  return isMaintenanceMode;
}

export function getMaintenanceAccess(
  pathname: string,
  method: string,
): MaintenanceAccess {
  if (method === "GET" && pathname === PUBLIC_SERVICE_STATE_PATH) {
    return MAINTENANCE_ACCESS.PUBLIC_SERVICE_STATE;
  }

  if (method === "PUT" && pathname === ROUTE_HANDLERS.SERVICE_STATE_ADMIN) {
    return MAINTENANCE_ACCESS.PROTECTED_SERVICE_STATE;
  }

  if (AUTH_API_METHODS[pathname]?.includes(method)) {
    return MAINTENANCE_ACCESS.AUTH_API;
  }

  if (
    isSafeMaintenanceNavigationMethod(method) &&
    isAdministrationPath(pathname)
  ) {
    return MAINTENANCE_ACCESS.AUTHENTICATED_ADMINISTRATION;
  }

  return MAINTENANCE_ACCESS.BLOCKED;
}
