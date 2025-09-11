"use client";

import { useLocale } from "@/hooks";
import { ADMIN_ROUTES } from "@/utils/routes.const";

const titles: Record<
  Exclude<
    keyof typeof ADMIN_ROUTES,
    "LOGIN" | "LOGOUT" | "EDIT_ACCESS_TICKET" | "EDIT_ACTIVITY_TICKET"
  >,
  { path: string; title: string }
> = {
  ADMIN_GALLERY: { path: ADMIN_ROUTES.ADMIN_GALLERY, title: "Multimedia" },
  ADMIN_USERS: { path: ADMIN_ROUTES.ADMIN_USERS, title: "Usuarios" },
  BUSES: { path: ADMIN_ROUTES.BUSES, title: "Buses" },
  DASHBOARD: { path: ADMIN_ROUTES.DASHBOARD, title: "Inicio" },
  NEWS: { path: ADMIN_ROUTES.NEWS, title: "Noticias" },
  PRICES: { path: ADMIN_ROUTES.PRICES, title: "Tarifas" },
  RECRUITMENT: { path: ADMIN_ROUTES.RECRUITMENT, title: "Trabajo" },
  ZONES: { path: ADMIN_ROUTES.ZONES, title: "Horarios Zonas" },
  NEW_ACTIVITY_TICKET: {
    path: ADMIN_ROUTES.NEW_ACTIVITY_TICKET,
    title: "Tarifa De Actividad",
  },
  NEW_ACCESS_TICKET: {
    path: ADMIN_ROUTES.NEW_ACCESS_TICKET,
    title: "Tarifa De Acceso",
  },
  EDIT_BUS_TRIP: {
    path: ADMIN_ROUTES.EDIT_BUS_TRIP,
    title: "Editar Viaje de Bus",
  },
  NEW_BUS_TRIP: {
    path: ADMIN_ROUTES.NEW_BUS_TRIP,
    title: "Nuevo Viaje de Bus",
  },
  NEW_USER: {
    path: ADMIN_ROUTES.NEW_USER,
    title: "Formulario de Usuario",
  },
  REVALIDATE: {
    path: ADMIN_ROUTES.REVALIDATE,
    title: "Revalidación de caché",
  },
};

export default function HeaderTitle() {
  const { pathname } = useLocale();

  const headerTitle = Object.values(titles).find(
    (item) => item.path === pathname,
  )?.title;

  return <div className="hidden w-full md:block">{headerTitle}</div>;
}
