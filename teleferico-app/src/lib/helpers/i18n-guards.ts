import { i18n } from "@/i18n";
import type { Locales } from "@/types";

export function isLocales(value: string): value is Locales {
  return (i18n.locales as readonly string[]).includes(value);
}
