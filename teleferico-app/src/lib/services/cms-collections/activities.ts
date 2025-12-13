import type {
  GetActivitiesResponse,
  GetActivityResponse,
  Locales,
  PostActivityRequest,
  PostActivityResponse,
  UpdateActivityRequest,
  UpdateActivityResponse,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { getStrapiURL, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const getActivity = async <T extends Locales | "all">({
  documentId,
  locale,
}: {
  documentId: string;
  locale: T;
}) => {
  const query: Record<string, unknown> = {};

  if (locale === "all") {
    query.populate = {
      0: "activity_translations", // => populate[0]=activity_translations
      zone: {
        populate: {
          1: "zone_translations", // => populate[zone][populate][1]=zone_translations
        },
      },
    };
  } else if (locale) {
    query.populate = {
      activity_translations: {
        filters: { locale: { $eq: locale } },
      },
      zone: {
        populate: {
          zone_translations: { filters: { locale: { $eq: locale } } },
        },
      },
    };
  }

  const qs = stringifyQuery(query);

  const res = await strapiFetch<GetActivityResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.ACTIVITIES}/${documentId}`, qs),
  );

  return res;
};

export const getActivities = async <T extends Locales | "all">(locale: T) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (locale === "all") {
    query.populate = [
      "activity_translations",
      { zone: { populate: "zone_translations" } },
    ];
  } else if (locale) {
    query.populate = {
      activity_translations: {
        filters: {
          locale: {
            $eq: locale,
          },
        },
      },
      zone: {
        populate: {
          zone_translations: {
            filters: {
              locale: {
                $eq: locale,
              },
            },
          },
        },
      },
    };
  }

  const res = await strapiFetch<GetActivitiesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ACTIVITIES, stringifyQuery(query)),
  );

  return res;
};

export const createActivity = async (
  reqBody: PostActivityRequest,
  jwt: string,
) => {
  const res = await strapiFetch<PostActivityResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ACTIVITIES),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    },
  );

  return res;
};

export const updateActivity = async (
  {
    reqBody,
    documentId,
  }: { reqBody: UpdateActivityRequest; documentId: string },
  jwt: string,
) => {
  const res = await strapiFetch<UpdateActivityResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.ACTIVITIES}/${documentId}`),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reqBody),
    },
  );

  return res;
};
