import en from "@/dictionaries/en.json";
import es from "@/dictionaries/es-AR.json";
import pt from "@/dictionaries/pt.json";
import type { Locales, TranslationKeys } from "@/types";

// TODO: Deprecar traducciones puestas en archivos locales json.
// Pasar todo a la coleccion de Strapi GlobalInstitutionalTranslation

export const TRANSLATIONS: Record<Locales, TranslationKeys> = {
  "es-AR": es,
  en,
  pt,
};
