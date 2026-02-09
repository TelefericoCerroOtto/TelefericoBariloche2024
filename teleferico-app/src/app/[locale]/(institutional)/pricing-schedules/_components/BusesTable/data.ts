import type { Locales } from "@/types";

export type ColumnKeys = "depTime" | "arrTime" | "origin" | "destination";

export const columns: Record<Locales, { key: ColumnKeys; label: string }[]> = {
  "es-AR": [
    { key: "depTime", label: "Horario de salida" },
    { key: "arrTime", label: "Horario de llegada" },
    { key: "origin", label: "Estación de salida" },
    { key: "destination", label: "Estación de llegada" },
  ],
  en: [
    { key: "depTime", label: "Departure time" },
    { key: "arrTime", label: "Arrival time" },
    { key: "origin", label: "Origin station" },
    { key: "destination", label: "Destination station" },
  ],
  pt: [
    { key: "depTime", label: "Horário de saída" },
    { key: "arrTime", label: "Horário de chegada" },
    { key: "origin", label: "Estação de saída" },
    { key: "destination", label: "Estação de chegada" },
  ],
};
