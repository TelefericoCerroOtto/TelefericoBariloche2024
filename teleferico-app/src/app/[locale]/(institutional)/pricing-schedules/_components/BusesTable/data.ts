import type { Locales } from "@/types";

export type ColumnKeys = "depTime" | "arrTime" | "origin" | "destination";

export const columns: Record<
  Locales,
  { key: ColumnKeys; label: string; align?: "start" | "center" | "end" }[]
> = {
  "es-AR": [
    { key: "depTime", label: "Horario de salida", align: "center" },
    { key: "origin", label: "Estación de salida", align: "start" },
    { key: "destination", label: "Estación de llegada", align: "start" },
  ],
  en: [
    { key: "depTime", label: "Departure time", align: "center" },
    { key: "origin", label: "Origin station", align: "start" },
    { key: "destination", label: "Destination station", align: "start" },
  ],
  pt: [
    { key: "depTime", label: "Horário de saída", align: "center" },
    { key: "origin", label: "Estação de saída", align: "start" },
    { key: "destination", label: "Estação de chegada", align: "start" },
  ],
};

export const dictionaries = {
  "es-AR": {
    table: {
      ariaLabel: "Tabla de horarios de buses",
    },
    eyebrow: {
      departure: "Salida",
      arrival: "Llegada",
      station: "Estación",
    },
    timeHint: "hora estimada",
  },
  en: {
    table: {
      ariaLabel: "Bus schedules table",
    },
    eyebrow: {
      departure: "Departure",
      arrival: "Arrival",
      station: "Station",
    },
    timeHint: "estimated time",
  },
  pt: {
    table: {
      ariaLabel: "Tabela de horários de ônibus",
    },
    eyebrow: {
      departure: "Saída",
      arrival: "Chegada",
      station: "Estação",
    },
    timeHint: "horário estimado",
  },
} as const;
