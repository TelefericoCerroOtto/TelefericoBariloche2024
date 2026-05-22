import { i18n } from "@/i18n";
import { ENV_KEYS } from "@/lib/constants/env.const";

export const PUBLIC_ROUTES = {
  ACTIVITIES: "/activities",
  CONTACT: "/contact",
  EXPLORE: "/explore",
  FAQS: "/faqs",
  FOUNDATION: "/foundation",
  HOME: "/",
  JOBS: "/jobs",
  LOCATION: "/location",
  NEWS: "/news",
  POLICIES: "/policies",
  POSTULATION_PRIVACY: "/postulation-privacy",
  PRICINGSCHEDULES: "/pricing-schedules",
} as const;

export const ROUTE_HANDLERS = {
  PROXY: "/api/proxy", // TODO: public endpoint
  PROXY_FILE: "/api/proxy-file", // public endpoint
  MEDIA: "/api/media", // public endpoint
  CONTACT: "/api/contact", // server endpoint
  POSTUALTION: "/api/postulation", // server endpoint
  POSTULATION_CV: (documentId: string) =>
    `/api/admin/postulations/${documentId}/cv` as const,
  POSTULATIONS_FAVORITE: (documentId: string) =>
    `/api/admin/postulations/${documentId}/favorite` as const, // admin endpoint
  POSTULATIONS_BULK_STATUS: "/api/admin/postulations/bulk-status", // admin endpoint
} as const;

export const ADMIN_ROUTES = {
  ADMIN_GALLERY: "/dashboard/admin-gallery",
  ADMIN_USERS: "/dashboard/admin-users",
  BUSES: "/dashboard/buses",
  DASHBOARD: "/dashboard",
  EDIT_ACCESS_TICKET: "/dashboard/prices/access-ticket",
  EDIT_ACTIVITY_TICKET: "/dashboard/prices/activity-ticket",
  EDIT_FAQS: "/dashboard/faqs",
  EDIT_NEWS: "/dashboard/news",
  EDIT_BUS_TRIP: "/dashboard/buses",
  FAQS: "/dashboard/faqs",
  LOGIN: "/login",
  LOGOUT: "/logout",
  NEWS: "/dashboard/news",
  NEW_NEWS: "/dashboard/news/new",
  NEW_ACCESS_TICKET: "/dashboard/prices/access-ticket/new",
  NEW_ACTIVITY_TICKET: "/dashboard/prices/activity-ticket/new",
  NEW_BUS_TRIP: "/dashboard/buses/new",
  NEW_FAQ: "/dashboard/faqs/new",
  NEW_USER: "/dashboard/admin-users/new-user",
  NEW_ZONE: "/dashboard/zones/new",
  PRICES: "/dashboard/prices",
  RECRUITMENT: "/dashboard/recruitment",
  REVALIDATE: "/dashboard/revalidate",
  ZONES: "/dashboard/zones",
} as const;

export const ADMIN_LOGIN_QUERY_PARAMS = {
  REASON: "reason",
} as const;

export const ADMIN_LOGIN_REASONS = {
  SESSION_EXPIRED: "session-expired",
} as const;

export type AdminLoginReason =
  (typeof ADMIN_LOGIN_REASONS)[keyof typeof ADMIN_LOGIN_REASONS];

const ADMIN_LOGIN_BASE_URL = process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL]?.replace(
  /\/$/,
  "",
);
const ADMIN_LOGIN_PATH = `/${i18n.defaultLocale}${ADMIN_ROUTES.LOGIN}`;

export const getAdminLoginUrl = (reason?: AdminLoginReason) => {
  const searchParams = reason
    ? new URLSearchParams({
        [ADMIN_LOGIN_QUERY_PARAMS.REASON]: reason,
      })
    : null;

  const path = searchParams
    ? `${ADMIN_LOGIN_PATH}?${searchParams.toString()}`
    : ADMIN_LOGIN_PATH;

  if (!ADMIN_LOGIN_BASE_URL) return path;

  return new URL(path, ADMIN_LOGIN_BASE_URL).toString();
};

export const STRAPI_ENDPOINTS = {
  ACTIVITIES: "/api/activities",
  ACTIVITY_TRANSLATIONS: "/api/activity-translations",
  AUTH: "/api/auth/local",
  BUS_TRIPS: "/api/bus-trips",
  COMPONENT_TRANSLATIONS: "/api/component-translations",
  FAQS: "/api/faqs",
  GLOBAL_INTL: "/api/global-institutional-translation",
  NEWS: "/api/news",
  PAGES: "/api/pages",
  FORM_PROTECTION_SUBMISSIONS: "/api/form-protection-submissions",
  POSTULATIONS: "/api/postulations",
  ROLES: "/api/users-permissions/roles",
  SECTORS: "/api/sectors",
  SERVICE_STATE: "/api/service-state",
  STATIONS: "/api/stations",
  TICKETS: "/api/tickets",
  UPLOAD_API: "/api/upload",
  UPLOAD_ASSETS: "/uploads",
  USERS: "/api/users",
  USERS_ME: "/api/users/me",
  ZONES: "/api/zones",
  ZONE_TRANSLATIONS: "/api/zone-translations",
} as const;
