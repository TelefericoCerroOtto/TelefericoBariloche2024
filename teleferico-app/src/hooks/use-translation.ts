"use client";

import { TRANSLATIONS } from "@/dictionaries";
import { useLocale } from "@/hooks";
import type { Locales, Subset, TranslationPaths } from "@/types";
import { useMemo } from "react";

export function useTranslation() {
  const { language } = useLocale();

  const t = useMemo(
    () =>
      function <P extends TranslationPaths>(
        path: P,
      ): Subset<(typeof TRANSLATIONS)[Locales], P> {
        return path.split(".").reduce(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (acc: any, key: any) => acc?.[key],
          TRANSLATIONS[language],
        ) as Subset<(typeof TRANSLATIONS)[Locales], P>;
      },
    [language],
  );

  return { t, locale: language };
}
