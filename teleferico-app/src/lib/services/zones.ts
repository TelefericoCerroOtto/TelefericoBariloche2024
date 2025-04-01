import { i18n } from "@/i18n";
import type { GetZonesResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getZones = async (locale: Locales) => {
  const query = {
    populate: {
      zone_descriptions: {
        filters: {
          locale: {
            $eq: locale ?? i18n.defaultLocale,
          },
        },
      },
    },
  };

  const res = await fetchWrapper<GetZonesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ZONES, stringifyQuery(query)),
  );

  return res;
};
