import type { Locales } from "@/types";

export type ColumnKeys = "name" | "openTime" | "closeTime" | "status";

export const columns: Record<
  Locales,
  { key: ColumnKeys; label: string; align?: "start" | "center" | "end" }[]
> = {
  "es-AR": [
    { key: "name", label: "Zona", align: "start" },
    { key: "openTime", label: "Apertura", align: "center" },
    { key: "closeTime", label: "Cierre", align: "center" },
    { key: "status", label: "Estado", align: "center" },
  ],
  en: [
    { key: "name", label: "Zone", align: "start" },
    { key: "openTime", label: "Open time", align: "center" },
    { key: "closeTime", label: "Close time", align: "center" },
    { key: "status", label: "Status", align: "center" },
  ],
  pt: [
    { key: "name", label: "Setor", align: "start" },
    { key: "openTime", label: "Abertura", align: "center" },
    { key: "closeTime", label: "Fechamento", align: "center" },
    { key: "status", label: "Status", align: "center" },
  ],
};

export const dictionaries = {
  "es-AR": {
    table: {
      ariaLabel: "Tabla de zonas y horarios",
    },
    eyebrow: {
      zone: "Sector",
      open: "Apertura",
      close: "Cierre",
    },
    status: {
      open: "Abierta",
      closed: "Cerrada",
    },
  },
  en: {
    table: {
      ariaLabel: "Zones and schedules table",
    },
    eyebrow: {
      zone: "Area",
      open: "Opening",
      close: "Closing",
    },
    status: {
      open: "Open",
      closed: "Closed",
    },
  },
  pt: {
    table: {
      ariaLabel: "Tabela de setores e horários",
    },
    eyebrow: {
      zone: "Área",
      open: "Abertura",
      close: "Fechamento",
    },
    status: {
      open: "Aberta",
      closed: "Fechada",
    },
  },
};
