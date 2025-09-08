import type {
  GetFooterResponse,
  GetFormsTranslationResponse,
  GetHoursoverviewResponse,
  GetNavbarItemsResponse,
  GetPoliciesResponse,
  GetServiceButtonResponse,
  Locales,
  TranslateComponentKeys,
} from "@/types";
import {
  CACHE_TAGS,
  fetchWrapper,
  getStrapiURL,
  STRAPI_ENDPOINTS,
  stringifyQuery,
} from "@/utils";

export type TranslateComponentsResponseTypes = {
  policies: GetPoliciesResponse;
  navbar: GetNavbarItemsResponse;
  footer: GetFooterResponse;
  hoursoverview: GetHoursoverviewResponse;
  servicebutton: GetServiceButtonResponse;
  forms: GetFormsTranslationResponse;
};

export const getComponentTranslation = async <T extends TranslateComponentKeys>(
  locale: Locales,
  key: T,
) => {
  const translateComponentCacheTags: Record<
    TranslateComponentKeys,
    Partial<keyof typeof CACHE_TAGS>
  > = {
    policies: "POLICIES_CONTENT",
    navbar: "NAVITEMS",
    footer: "FOOTER",
    hoursoverview: "HOURS_OVERVIEW",
    servicebutton: "SERVICE_BUTTON",
    forms: "FORMS",
  };

  const query = {
    locale,
    filters: {
      key,
    },
  };

  const res = await fetchWrapper<TranslateComponentsResponseTypes[T]>(
    getStrapiURL(
      STRAPI_ENDPOINTS.COMPONENT_TRANSLATIONS,
      stringifyQuery(query),
    ),
    {
      cache: "force-cache",
      next: { tags: [CACHE_TAGS[translateComponentCacheTags[key]]] },
    },
  );

  return res;
};
