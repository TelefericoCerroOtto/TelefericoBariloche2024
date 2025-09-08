import { i18n } from "@/i18n";
import type { GetSectorsResponse, Locales } from "@/types";
import {
  fetchWrapper,
  getStrapiURL,
  STRAPI_ENDPOINTS,
  stringifyQuery,
} from "@/utils";

export const getSectors = async (locale: Locales) => {
  const query = {
    populate: {
      sector_names: {
        filters: {
          locale: {
            $eq: locale ?? i18n.defaultLocale,
          },
        },
      },
    },
  };

  const res = await fetchWrapper<GetSectorsResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.SECTORS, stringifyQuery(query)),
  );

  return res;
};
