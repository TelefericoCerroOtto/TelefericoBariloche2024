import type { Activity } from "@/types";

export const seasonOptions: { key: Activity["season"]; label: string }[] = [
  { key: "summer", label: "Verano" },
  { key: "autumn", label: "Otoño" },
  { key: "winter", label: "Invierno" },
  { key: "spring", label: "Primavera" },
  { key: "allSeasons", label: "Todo el año" },
];
