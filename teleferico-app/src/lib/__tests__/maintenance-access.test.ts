import { describe, expect, it } from "vitest";
import {
  getMaintenanceAccess,
  isMaintenanceDashboardDescendant,
  isSafeMaintenanceNavigationMethod,
  MAINTENANCE_ACCESS,
  MAINTENANCE_NAVIGATION_REDIRECT_STATUS,
  shouldRedirectMaintenanceDashboardSections,
} from "../maintenance-access";

describe("getMaintenanceAccess", () => {
  it("allows only GET for the exact public service-state proxy path", () => {
    expect(getMaintenanceAccess("/api/proxy/api/service-state", "GET")).toBe(
      MAINTENANCE_ACCESS.PUBLIC_SERVICE_STATE,
    );

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(getMaintenanceAccess("/api/proxy/api/service-state", method)).toBe(
        MAINTENANCE_ACCESS.BLOCKED,
      );
    }
    expect(getMaintenanceAccess("/api/proxy/api/service-state/1", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
    expect(getMaintenanceAccess("/api/proxy/api/service-states", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
  });

  it("keeps unrelated public CMS and API routes blocked", () => {
    expect(getMaintenanceAccess("/api/proxy/api/news", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
    expect(getMaintenanceAccess("/api/media/image.jpg", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
    expect(getMaintenanceAccess("/api/contact", "POST")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
    expect(getMaintenanceAccess("/api/admin/postulations/1/cv", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
  });

  it.each([
    ["/api/auth/session", "GET"],
    ["/api/auth/session", "POST"],
    ["/api/auth/csrf", "GET"],
    ["/api/auth/providers", "GET"],
    ["/api/auth/callback/credentials", "POST"],
    ["/api/auth/signout", "POST"],
  ])("allows the required Auth.js operation %s %s", (pathname, method) => {
    expect(getMaintenanceAccess(pathname, method)).toBe(
      MAINTENANCE_ACCESS.AUTH_API,
    );
  });

  it.each([
    ["/api/auth/session", "PUT"],
    ["/api/auth/csrf", "POST"],
    ["/api/auth/callback/credentials", "GET"],
    ["/api/auth/providers", "POST"],
    ["/api/auth/callback/github", "POST"],
  ])("blocks an unlisted Auth.js operation %s %s", (pathname, method) => {
    expect(getMaintenanceAccess(pathname, method)).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
  });

  it("allows only PUT for the exact protected service-state path", () => {
    expect(getMaintenanceAccess("/api/admin/service-state", "PUT")).toBe(
      MAINTENANCE_ACCESS.PROTECTED_SERVICE_STATE,
    );
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      expect(getMaintenanceAccess("/api/admin/service-state", method)).toBe(
        MAINTENANCE_ACCESS.BLOCKED,
      );
    }
    expect(getMaintenanceAccess("/api/admin/service-state/1", "PUT")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
  });

  it.each([
    ["/login", "GET"],
    ["/es-AR/login", "HEAD"],
    ["/es-AR/login", "GET"],
    ["/logout", "GET"],
    ["/es-AR/logout", "HEAD"],
    ["/es-AR/dashboard", "GET"],
    ["/es-AR/dashboard", "HEAD"],
    ["/en/dashboard/news", "GET"],
    ["/es-AR/dashboard/news", "HEAD"],
  ])(
    "routes administration request %s %s through authentication",
    (pathname, method) => {
      expect(getMaintenanceAccess(pathname, method)).toBe(
        MAINTENANCE_ACCESS.AUTHENTICATED_ADMINISTRATION,
      );
    },
  );

  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "blocks dashboard navigation mutations using %s",
    (method) => {
      expect(getMaintenanceAccess("/es-AR/dashboard", method)).toBe(
        MAINTENANCE_ACCESS.BLOCKED,
      );
      expect(getMaintenanceAccess("/es-AR/dashboard/news", method)).toBe(
        MAINTENANCE_ACCESS.BLOCKED,
      );
    },
  );

  it("uses a non-preserving redirect only for safe navigation", () => {
    expect(isSafeMaintenanceNavigationMethod("GET")).toBe(true);
    expect(isSafeMaintenanceNavigationMethod("HEAD")).toBe(true);
    expect(isSafeMaintenanceNavigationMethod("POST")).toBe(false);
    expect(MAINTENANCE_NAVIGATION_REDIRECT_STATUS).toBe(303);
    expect(MAINTENANCE_NAVIGATION_REDIRECT_STATUS).not.toBe(307);
  });

  it("keeps public pages blocked", () => {
    expect(getMaintenanceAccess("/", "GET")).toBe(MAINTENANCE_ACCESS.BLOCKED);
    expect(getMaintenanceAccess("/en/news", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
  });

  it("blocks administration paths outside login, logout, and dashboard", () => {
    expect(getMaintenanceAccess("/es-AR/login/help", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
    expect(getMaintenanceAccess("/es-AR/logout/complete", "GET")).toBe(
      MAINTENANCE_ACCESS.BLOCKED,
    );
  });

  it("redirects only dashboard descendants from the maintenance operator surface", () => {
    expect(isMaintenanceDashboardDescendant("/dashboard/news")).toBe(true);
    expect(isMaintenanceDashboardDescendant("/dashboard")).toBe(false);
    expect(isMaintenanceDashboardDescendant("/dashboardish/news")).toBe(false);
  });

  it("redirects the dashboard sections layout only during maintenance", () => {
    expect(shouldRedirectMaintenanceDashboardSections(true)).toBe(true);
    expect(shouldRedirectMaintenanceDashboardSections(false)).toBe(false);
  });
});
