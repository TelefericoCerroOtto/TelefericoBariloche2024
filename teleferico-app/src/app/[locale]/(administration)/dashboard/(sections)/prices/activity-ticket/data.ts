import type { Season } from "@/types";

export const seasonOptions: { key: Season; label: string }[] = [
  { key: "summer", label: "Verano" },
  { key: "autumn", label: "Otoño" },
  { key: "winter", label: "Invierno" },
  { key: "spring", label: "Primavera" },
  { key: "allSeasons", label: "Todo el año" },
];

export const LABEL_TOOLTIP_TEXT_CREATE =
  "Es un nombre único para identificar esta actividad. Se usa para organizar y conectar información del sistema. Una vez creada, no se puede cambiar. Solo puede contener letras minúsculas. Sugerencia: Use una sola palabra en inglés que describa la actividad. Ej.: sledge, circuit, hiking.";

export const LABEL_TOOLTIP_TEXT_EDIT =
  "Es un nombre único para identificar esta actividad. Se usa para organizar y conectar información del sistema. Su valor no se puede cambiar.";

export const MIN_AGE_TOOLTIP_TEXT =
  "Deje este valor en 0 si no hay límite mínimo de edad para esta actividad.";

export const MAX_AGE_TOOLTIP_TEXT =
  "Deje este valor vacío o en 0 si no hay límite máximo de edad para esta actividad.";
