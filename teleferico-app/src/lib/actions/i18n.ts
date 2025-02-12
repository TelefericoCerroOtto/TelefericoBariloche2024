"use server";

import { TRANSLATIONS } from "@/dictionaries";
import type {
  Locales,
  Subset,
  TranslationKeys,
  TranslationPaths,
} from "@/types";

export async function getTranslationValue<P extends TranslationPaths>(
  locale: Locales,
  path: P,
) {
  const obj = TRANSLATIONS[locale];

  return (
    path
      .split(".")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .reduce((acc: any, key: any) => acc?.[key], obj) as Subset<
      TranslationKeys,
      P
    >
  );
}
