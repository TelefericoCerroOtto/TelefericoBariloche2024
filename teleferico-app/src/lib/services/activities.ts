import { GetActivitiesResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getActivities = async (locale: Locales) => {
  const query = {
    // fields: ["price", "minAge", "season", "label"],
    populate: {
      activity_descriptions: {
        filters: {
          locale: {
            $eq: locale,
          },
        },
        // fields: ["name", "description", "requirements", "locale"],
      },
      zone: {
        populate: {
          zone_descriptions: {
            filters: {
              locale: {
                $eq: locale,
              },
            },
            // fields: ["name", "description", "locale"],
          },
        },
        // fields: ["openTime", "closeTime", "label", "locale"],
      },
    },
  };

  const res = await fetchWrapper<GetActivitiesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ACTIVITIES, stringifyQuery(query)),
  );

  return res;
};
