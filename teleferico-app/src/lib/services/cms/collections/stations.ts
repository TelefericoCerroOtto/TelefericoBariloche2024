import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { GetStationsResponse, Locales } from "@/types";
import { stringifyQuery } from "@/utils";

export const getStations = async (locale: Locales) => {
  const query = {
    populate: {
      station_translations: {
        filters: {
          locale: {
            $eq: locale ?? i18n.defaultLocale,
          },
        },
      },
    },
  };

  const res = await strapiFetch<GetStationsResponse>({
    endpoint: STRAPI_ENDPOINTS.STATIONS,
    qp: stringifyQuery(query),
  });

  return res;
};
