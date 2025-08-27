import { i18n } from "@/i18n";
import type { GetBusTripsResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getBusTrips = async (locale: Locales) => {
  const query = {
    populate: {
      origin: {
        populate: {
          zone: {
            populate: {
              zone_translations: {
                filters: {
                  locale: {
                    $eq: locale ?? i18n.defaultLocale,
                  },
                },
              },
            },
          },
        },
      },
      destination: {
        populate: {
          zone: {
            populate: {
              zone_translations: {
                filters: {
                  locale: {
                    $eq: locale ?? i18n.defaultLocale,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  const res = await fetchWrapper<GetBusTripsResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.BUSTRIPS, stringifyQuery(query)),
  );

  return res;
};
