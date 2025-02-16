import { i18n } from "@/i18n";
import type { GetPoliciesResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getPolicies = async (locale: Locales) => {
  const query = {
    locale: locale ?? i18n.defaultLocale,
    populate: {
      components: { on: { "global-intl-components.policies": "*" } },
    },
  };

  const res = fetchWrapper<GetPoliciesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.TRANSLATIONS, stringifyQuery(query)),
  );

  return res;
};
