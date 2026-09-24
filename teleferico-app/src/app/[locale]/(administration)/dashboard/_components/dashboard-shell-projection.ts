import { ADMIN_ROUTES } from "@/lib/constants/routes.const";
import type { UserRole } from "@/types";

type SidebarIconName =
  | "admin-gallery"
  | "admin-users"
  | "buses"
  | "faqs"
  | "feedback"
  | "news"
  | "prices"
  | "recruitment"
  | "revalidate"
  | "zones";

type DashboardContentItemDefinition = {
  name: string;
  url: string;
  icon: SidebarIconName;
  implemented: boolean;
  tooltip?: string;
  allowedRoles?: readonly UserRole["name"][];
};

export type DashboardContentNavigationItem = Omit<
  DashboardContentItemDefinition,
  "allowedRoles"
> & {
  isDisabled: boolean;
};

export type DashboardShellProjection = {
  dashboardHref: typeof ADMIN_ROUTES.DASHBOARD;
  contentNavigation: readonly DashboardContentNavigationItem[];
  showLogout: true;
  showProfile: true;
  showServiceStateControl: true;
  showSessionWatcher: true;
};

const CONTENT_ITEMS: readonly DashboardContentItemDefinition[] = [
  {
    name: "Horarios Zonas",
    url: ADMIN_ROUTES.ZONES,
    icon: "zones",
    implemented: true,
    tooltip: "Gestionar horarios y zonas del complejo",
    allowedRoles: ["Administrator", "Operations Supervisor"],
  },
  {
    name: "Tarifas",
    url: ADMIN_ROUTES.PRICES,
    icon: "prices",
    implemented: true,
    tooltip: "Gestionar tarifas de ascenso y actividades",
    allowedRoles: ["Administrator", "Operations Supervisor"],
  },
  {
    name: "Buses",
    url: ADMIN_ROUTES.BUSES,
    icon: "buses",
    implemented: true,
    tooltip: "Gestionar horarios de viajes de buses",
    allowedRoles: ["Administrator", "Operations Supervisor"],
  },
  {
    name: "Noticias",
    url: ADMIN_ROUTES.NEWS,
    icon: "news",
    implemented: true,
    tooltip: "Gestionar noticias del sitio web",
    allowedRoles: ["Administrator", "Media Manager"],
  },
  {
    name: "Preguntas Frecuentes",
    url: ADMIN_ROUTES.FAQS,
    icon: "faqs",
    implemented: true,
    tooltip: "Gestionar preguntas frecuentes del sitio web",
    allowedRoles: ["Administrator", "Media Manager"],
  },
  {
    name: "Feedback del público",
    url: ADMIN_ROUTES.FEEDBACK,
    icon: "feedback",
    implemented: true,
    tooltip: "Analizar las opiniones de visitantes",
    allowedRoles: ["Administrator"],
  },
  {
    name: "Trabajo",
    url: ADMIN_ROUTES.RECRUITMENT,
    icon: "recruitment",
    implemented: true,
    tooltip: "Gestionar curriculums de postulantes",
    allowedRoles: ["Administrator", "Recruiter"],
  },
  {
    name: "Multimedia",
    url: ADMIN_ROUTES.ADMIN_GALLERY,
    icon: "admin-gallery",
    implemented: false,
    tooltip: "Gestión de recursos multimedia",
    allowedRoles: ["Administrator", "Media Manager"],
  },
  {
    name: "Usuarios",
    url: ADMIN_ROUTES.ADMIN_USERS,
    icon: "admin-users",
    implemented: false,
    tooltip: "Gestión de usuarios del sistema",
    allowedRoles: ["Administrator"],
  },
  {
    name: "Revalidar",
    url: ADMIN_ROUTES.REVALIDATE,
    icon: "revalidate",
    implemented: false,
    tooltip: "Revalidar la caché del sitio web",
    allowedRoles: ["Administrator"],
  },
];

export function getDashboardShellProjection({
  currentRole,
  isMaintenanceMode,
  isFeedbackEnabled,
}: {
  currentRole: UserRole["name"];
  isMaintenanceMode: boolean;
  isFeedbackEnabled: boolean;
}): DashboardShellProjection {
  const contentNavigation = isMaintenanceMode
    ? []
    : CONTENT_ITEMS.filter(
        (item) => item.icon !== "feedback" || isFeedbackEnabled,
      ).map(({ allowedRoles, ...item }) => ({
        ...item,
        isDisabled:
          !item.implemented ||
          (allowedRoles !== undefined && !allowedRoles.includes(currentRole)),
      }));

  return {
    dashboardHref: ADMIN_ROUTES.DASHBOARD,
    contentNavigation,
    showLogout: true,
    showProfile: true,
    showServiceStateControl: true,
    showSessionWatcher: true,
  };
}
