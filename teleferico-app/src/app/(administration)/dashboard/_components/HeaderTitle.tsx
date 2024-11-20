"use client";

import { ADMIN_ROUTES } from "@/utils/routes.const";
import { usePathname } from "next/navigation";

const titles: Record<
  keyof typeof ADMIN_ROUTES,
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
};

export default function HeaderTitle() {
  const pathname = usePathname();

  const headerTitle = Object.values(titles).find(
    (item) => item.path === pathname,
  )?.title;

  return <div>{headerTitle}</div>;
}
