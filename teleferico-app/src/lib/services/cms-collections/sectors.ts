import { i18n } from "@/i18n";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { GetSectorsResponse, Locales } from "@/types";
import { STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

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

  const res = await strapiFetch<GetSectorsResponse>({
    endpoint: STRAPI_ENDPOINTS.SECTORS,
    qp: stringifyQuery(query),
  });

  return res;
};
