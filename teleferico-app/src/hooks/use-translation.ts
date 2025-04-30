"use client";

import { useLocale, useProxy } from "@/hooks";
import { TranslateComponentsResponseTypes } from "@/lib/services";
import type { TranslateComponentKeys } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export function useTranslation<T extends TranslateComponentKeys>(key: T) {
  const { language } = useLocale();

  const query = {
    locale: language,
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
