// teleferico-app/src/components/institutional/ActivityShowcase/data.ts
import type { Locales, Season } from "@/types";

export function getI18n(locale: Locales) {
  const l = String(locale);
  const isEs = l.startsWith("es");
  const isPt = l.startsWith("pt");

  return {
    eyebrow: isPt ? "Atividade" : isEs ? "Actividad" : "Activity",
    unavailable: isPt
      ? "Não disponível"
      : isEs
        ? "No disponible"
        : "Unavailable",
    available: isPt ? "Disponível" : isEs ? "Disponible" : "Available",
    loading: isPt
      ? "Carregando atividade…"
      : isEs
        ? "Cargando actividad…"
        : "Loading activity…",
    error: isPt
      ? "Não foi possível carregar a atividade."
      : isEs
        ? "No se pudo cargar la actividad."
        : "Could not load the activity.",
    empty: isPt
      ? "Esta atividade não está disponível."
      : isEs
        ? "Esta actividad no está disponible."
        : "This activity is not available.",

    // Labels
    price: isPt ? "Preço" : isEs ? "Precio" : "Price",
    age: isPt ? "Idade" : isEs ? "Edad" : "Age",
    season: isPt ? "Temporada" : isEs ? "Temporada" : "Season",
    availability: isPt
      ? "Disponibilidade"
      : isEs
        ? "Disponibilidad"
        : "Availability",
    requirements: isPt ? "Requisitos" : isEs ? "Requisitos" : "Requirements",

    // Valores “comunes”
    allAges: isPt ? "Todas as idades" : isEs ? "Todas las edades" : "All ages",

    maxAge: isPt ? "Até" : isEs ? "Hasta" : "Up to",

    // Microcopy “de apoyo”
    priceHint: isPt
      ? "Tarifa informativa."
      : isEs
        ? "Tarifa informativa."
        : "Informational rate.",
    ageHint: isPt
      ? "Faixa etária para participar."
      : isEs
        ? "Rango de edad para participar."
        : "Age range to participate.",
    seasonHint: isPt
      ? "Operação conforme a estação."
      : isEs
        ? "Operativa según temporada."
        : "Operates depending on season.",

    // ✅ Ajustado: no promete “tiempo real”
    availabilityHint: isPt
      ? "Sujeito a alterações conforme operação e clima."
      : isEs
        ? "Sujeto a cambios según la operación y el clima."
        : "Subject to change depending on operations and weather.",
  };
}

export function seasonLabel(season: Season, locale: Locales) {
  const l = String(locale);
  const isEs = l.startsWith("es");
  const isPt = l.startsWith("pt");

  const map = {
    allSeasons: isPt ? "Todo o ano" : isEs ? "Todo el año" : "All seasons",
    summer: isPt ? "Verão" : isEs ? "Verano" : "Summer",
    autumn: isPt ? "Outono" : isEs ? "Otoño" : "Autumn",
    winter: isPt ? "Inverno" : isEs ? "Invierno" : "Winter",
    spring: isPt ? "Primavera" : isEs ? "Primavera" : "Spring",
  } as const;

  return map[season] ?? String(season);
}
