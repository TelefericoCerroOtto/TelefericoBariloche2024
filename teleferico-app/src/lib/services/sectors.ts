import { i18n } from "@/i18n";
import { GetSectorsResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";


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