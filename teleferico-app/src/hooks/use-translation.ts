"use client";

import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { TranslateComponentsResponseTypes } from "@/lib/services/cms/collections/component-translations";
import type { ComponentTranslationKeys } from "@/types";
import { useLocale } from "./use-locale";
import { useProxy } from "./use-proxy";

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
