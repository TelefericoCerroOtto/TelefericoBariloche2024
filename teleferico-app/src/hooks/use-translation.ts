"use client";

import { useLocale, useProxy } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { TranslateComponentsResponseTypes } from "@/lib/services";
import type { ComponentTranslationKeys } from "@/types";

export function useTranslation<T extends ComponentTranslationKeys>(key: T) {
  const { locale } = useLocale();

  const query = {
    locale,
    filters: {
      key,
    },
  };

  const { data, isError, isLoading } = useProxy<
    TranslateComponentsResponseTypes[T]
  >(STRAPI_ENDPOINTS.COMPONENT_TRANSLATIONS, query);

  return {
    data,
    loading: isLoading,
    error: isError,
  };
}
