import type {
  GetFooterResponse,
  GetHoursoverviewResponse,
  GetNavbarItemsResponse,
  GetPoliciesResponse,
  Locales,
} from "@/types";
import { CACHE_TAGS } from "@/utils/cache-tags.const";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

type Keys = "policies" | "navbar" | "footer" | "hoursoverview";

type translateComponentsResponseTypes = {
  policies: GetPoliciesResponse;
  navbar: GetNavbarItemsResponse;
  footer: GetFooterResponse;
  hoursoverview: GetHoursoverviewResponse;
};

export const getComponentTranslation = async <T extends Keys>(
  locale: Locales,
  key: T,
) => {
  const translateComponentCacheTags: Record<
    Keys,
    Partial<keyof typeof CACHE_TAGS>
  > = {
    policies: "POLICIES_CONTENT",
    navbar: "NAVITEMS",
    footer: "FOOTER",
    hoursoverview: "HOURS_OVERVIEW",
  };

  const query = {
    locale,
    filters: {
      key,
    },
  };

  const res = await fetchWrapper<translateComponentsResponseTypes[T]>(
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
