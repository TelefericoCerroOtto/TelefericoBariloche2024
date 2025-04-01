"use client";

import { useLocale } from "@/hooks";
import { TranslateComponentsResponseTypes } from "@/lib/services";
import type { TranslateComponentKeys } from "@/types";
import { fetcher } from "@/utils/fetcher";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import useSWR from "swr";

export function useTranslation<T extends TranslateComponentKeys>(key: T) {
  const { language } = useLocale();

  const query = {
    locale: language,
    filters: {
      key,
    },
  };

  const { data, error, isLoading } = useSWR<
    TranslateComponentsResponseTypes[T]
  >(
    getStrapiURL(
      STRAPI_ENDPOINTS.COMPONENT_TRANSLATIONS,
      stringifyQuery(query),
    ),
    fetcher,
    { errorRetryCount: 2, errorRetryInterval: 5000 },
  );

  return {
    data,
    loading: isLoading,
    error,
  };
}
