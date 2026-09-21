"use client";

import { useLocale } from "@/hooks";
import { ADMIN_ROUTES } from "@/lib/constants/routes.const";

const titles: Record<
  Exclude<
    keyof typeof ADMIN_ROUTES,
    | "LOGIN"
    | "LOGOUT"
    | "EDIT_ACCESS_TICKET"
    | "EDIT_ACTIVITY_TICKET"
    | "EDIT_FAQS"
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
  FAQS: { path: ADMIN_ROUTES.FAQS, title: "Preguntas Frecuentes" },
  FEEDBACK: { path: ADMIN_ROUTES.FEEDBACK, title: "Opiniones" },
  NEW_FAQ: { path: ADMIN_ROUTES.NEW_FAQ, title: "Nueva Pregunta Frecuente" },
  ZONES: { path: ADMIN_ROUTES.ZONES, title: "Horarios Zonas" },
  NEW_ACTIVITY_TICKET: {
    path: ADMIN_ROUTES.NEW_ACTIVITY_TICKET,
    title: "Tarifa De Actividad",
  },
  NEW_ACCESS_TICKET: {
    path: ADMIN_ROUTES.NEW_ACCESS_TICKET,
    title: "Tarifa De Acceso",
  },
  NEW_NEWS: { path: ADMIN_ROUTES.NEW_NEWS, title: "Nueva noticia" },
  EDIT_BUS_TRIP: {
    path: ADMIN_ROUTES.EDIT_BUS_TRIP,
    title: "Editar Viaje de Bus",
  },
  EDIT_NEWS: { path: ADMIN_ROUTES.EDIT_NEWS, title: "Editar noticia" },
  NEW_BUS_TRIP: {
    path: ADMIN_ROUTES.NEW_BUS_TRIP,
    title: "Nuevo Viaje de Bus",
  },
  NEW_USER: {
    path: ADMIN_ROUTES.NEW_USER,
    title: "Formulario de Usuario",
  },
  NEW_ZONE: {
    path: ADMIN_ROUTES.NEW_ZONE,
    title: "Crear nueva zona",
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
