import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { GetSectorsResponse, Locales } from "@/types";
import { stringifyQuery } from "@/utils";

type GetSectorsOptions = {
  activeOnly?: boolean;
};

export const getSectors = async (
  locale: Locales,
  options: GetSectorsOptions = {},
) => {
  const { activeOnly = true } = options;

  const query = {
    ...(activeOnly
      ? {
          filters: {
            isActive: {
              $eq: true,
            },
          },
        }
      : {}),
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
