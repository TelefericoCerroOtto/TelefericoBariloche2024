import type {
  ComponentTranslationKeys,
  GetFooterResponse,
  GetFormsTranslationResponse,
  GetHoursoverviewResponse,
  GetNavbarItemsResponse,
  GetPoliciesResponse,
  GetSchedulesTranslationResponse,
  GetServiceButtonResponse,
  Locales,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { CACHE_TAGS, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export type TranslateComponentsResponseTypes = {
  policies: GetPoliciesResponse;
  navbar: GetNavbarItemsResponse;
  footer: GetFooterResponse;
  hoursoverview: GetHoursoverviewResponse;
  servicebutton: GetServiceButtonResponse;
  forms: GetFormsTranslationResponse;
  schedules: GetSchedulesTranslationResponse;
};

export const getComponentTranslation = async <
  T extends ComponentTranslationKeys,
>(
  locale: Locales,
  key: T,
) => {
  const translateComponentCacheTags: Record<
    ComponentTranslationKeys,
    Partial<keyof typeof CACHE_TAGS>
  > = {
    policies: "POLICIES_CONTENT",
    navbar: "NAVITEMS",
    footer: "FOOTER",
    hoursoverview: "HOURS_OVERVIEW",
    servicebutton: "SERVICE_BUTTON",
    forms: "FORMS",
    schedules: "SCHEDULES",
  };

  const query = {
    locale,
    filters: {
      key,
    },
  };

  const res = await strapiFetch<TranslateComponentsResponseTypes[T]>(
    {
      endpoint: STRAPI_ENDPOINTS.COMPONENT_TRANSLATIONS,
      qp: stringifyQuery(query),
    },
    {
      cache: "force-cache",
      next: { tags: [CACHE_TAGS[translateComponentCacheTags[key]]] },
    },
  );

  return res;
};
