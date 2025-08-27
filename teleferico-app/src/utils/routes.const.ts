export const ROUTES = {
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
  PRICINGSCHEDULES: "/pricing-schedules",
} as const;

export const ROUTE_HANDLERS = {
  PROXY: "/api/proxy",
  CONTACT: "/api/contact",
} as const;

export const ADMIN_ROUTES = {
  ADMIN_GALLERY: "/dashboard/admin-gallery",
  ADMIN_USERS: "/dashboard/admin-users",
  BUSES: "/dashboard/buses",
  DASHBOARD: "/dashboard",
  EDIT_ACCESS_TICKET: "/dashboard/prices/access-ticket",
  LOGIN: "/login",
  LOGOUT: "/logout",
  NEWS: "/dashboard/news",
  NEW_ACCESS_TICKET: "/dashboard/prices/access-ticket/new",
  NEW_ACTIVITY_TICKET: "/dashboard/prices/new-act-ticket",
  NEW_BUS_TRAVEL: "/dashboard/buses/new-bus-travel",
  NEW_USER: "/dashboard/admin-users/new-user",
  PRICES: "/dashboard/prices",
  RECRUITMENT: "/dashboard/recruitment",
  REVALIDATE: "/dashboard/revalidate",
  ZONES: "/dashboard/zones",
} as const;

export const STRAPI_ENDPOINTS = {
  ACTIVITIES: "/api/activities",
  AUTH: "/api/auth/local",
  BUSTRIPS: "/api/bus-trips",
  COMPONENT_TRANSLATIONS: "/api/component-translations",
  FAQS: "/api/faqs",
  GLOBAL_INTL: "/api/global-institutional-translation",
  NEWS: "/api/news",
  PAGES: "/api/pages",
  POSTULATIONS: "/api/postulations",
  ROLES: "/api/users-permissions/roles",
  SECTORS: "/api/sectors",
  SERVICE_STATE: "/api/service-state",
  TICKETS: "/api/tickets",
  UPLOADS: "/api/upload",
  USERS: "/api/users",
  USERS_ME: "/api/users/me",
  ZONES: "/api/zones",
  ZONE_TRANSLATIONS: "/api/zone-translations",
} as const;
