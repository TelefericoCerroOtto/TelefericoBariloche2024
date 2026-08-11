import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import { describe, expect, it } from "vitest";
import { getDashboardShellProjection } from "./dashboard-shell-projection";

describe("getDashboardShellProjection", () => {
  it("omits every content-management entry during maintenance", () => {
    const projection = getDashboardShellProjection({
      currentRole: "Administrator",
      isMaintenanceMode: true,
    });

    expect(projection.contentNavigation).toEqual([]);
    expect(
      projection.contentNavigation.filter((item) => !item.isDisabled),
    ).toEqual([]);
  });

  it("retains the operator shell controls during maintenance", () => {
    const projection = getDashboardShellProjection({
      currentRole: "Operations Supervisor",
      isMaintenanceMode: true,
    });

    expect(projection).toMatchObject({
      dashboardHref: ADMIN_ROUTES.DASHBOARD,
      showLogout: true,
      showProfile: true,
      showServiceStateControl: true,
      showSessionWatcher: true,
    });
  });

  it("preserves complete role-appropriate navigation in normal mode", () => {
    const projection = getDashboardShellProjection({
      currentRole: "Operations Supervisor",
      isMaintenanceMode: false,
    });

    expect(projection.contentNavigation.map((item) => item.url)).toEqual([
      ADMIN_ROUTES.ZONES,
      ADMIN_ROUTES.PRICES,
      ADMIN_ROUTES.BUSES,
      ADMIN_ROUTES.NEWS,
      ADMIN_ROUTES.FAQS,
      ADMIN_ROUTES.RECRUITMENT,
      ADMIN_ROUTES.ADMIN_GALLERY,
      ADMIN_ROUTES.ADMIN_USERS,
      ADMIN_ROUTES.REVALIDATE,
    ]);
    expect(
      projection.contentNavigation
        .filter((item) => !item.isDisabled)
        .map((item) => item.url),
    ).toEqual([ADMIN_ROUTES.ZONES, ADMIN_ROUTES.PRICES, ADMIN_ROUTES.BUSES]);
  });
});
