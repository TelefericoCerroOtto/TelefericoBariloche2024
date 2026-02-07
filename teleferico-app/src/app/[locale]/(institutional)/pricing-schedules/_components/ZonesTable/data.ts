import type { Locales } from "@/types";

export type ColumnKeys = "name" | "openTime" | "closeTime" | "status";

export const columns: Record<Locales, { key: ColumnKeys; label: string }[]> = {
  "es-AR": [
    { key: "name", label: "Zona" },
    { key: "openTime", label: "Apertura" },
    { key: "closeTime", label: "Cierre" },
    { key: "status", label: "Estado" },
  ],
  en: [
    { key: "name", label: "Zone" },
    { key: "openTime", label: "Open time" },
    { key: "closeTime", label: "Close time" },
    { key: "status", label: "Status" },
  ],
  pt: [
    { key: "name", label: "Setor" },
    { key: "openTime", label: "Abertura" },
    { key: "closeTime", label: "Fechamento" },
    { key: "status", label: "Status" },
  ],
};

export const dictionaries = {
  "es-AR": {
    status: {
      open: "Abierta",
      closed: "Cerrada",
    },
  },
  en: {
    status: {
      open: "Open",
      closed: "Closed",
    },
  },
  pt: {
    status: {
      open: "Aberta",
      closed: "Fechada",
    },
  },
};
