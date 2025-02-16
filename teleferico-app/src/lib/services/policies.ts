import { i18n } from "@/i18n";
import type { GetPoliciesResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getPolicies = async (locale: Locales) => {
  const query = { locale: locale ?? i18n.defaultLocale };

  const res = fetchWrapper<GetPoliciesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.POLICIES, stringifyQuery(query)),
  );

  return res;
};
