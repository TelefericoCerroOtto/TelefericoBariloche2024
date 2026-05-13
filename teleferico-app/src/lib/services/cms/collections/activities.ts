import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { getPricingScheduleActivitiesQuery } from "@/lib/helpers/pricing-schedules-queries";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  GetActivitiesResponse,
  GetActivityResponse,
  Locales,
  PostActivityRequest,
  PostActivityResponse,
  UpdateActivityRequest,
  UpdateActivityResponse,
} from "@/types";
import { stringifyQuery } from "@/utils";

type SitemapActivityItem = {
  label: string;
  isActive: boolean;
  updatedAt: string;
};

type GetActivitiesForSitemapResponse = {
  data: SitemapActivityItem[];
  meta: GetActivitiesResponse["meta"];
};

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
      activity_translations: true,
    };
  } else if (locale) {
    query.populate = {
      activity_translations: {
        filters: { locale: { $eq: locale } },
      },
    };
  }

  const res = await strapiFetch<GetActivityResponse>({
    endpoint: `${STRAPI_ENDPOINTS.ACTIVITIES}/${documentId}`,
    qp: stringifyQuery(query),
  });

  return res;
};

export const getActivities = async <T extends Locales | "all">(locale: T) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    sort: ["sortOrder:asc", "id:asc"]
  };

  if (locale === "all") {
    query.populate = ["activity_translations"];
  } else if (locale) {
    query.populate = {
      activity_translations: {
        filters: {
          locale: {
            $eq: locale,
          },
        },
      },
    };
  }

  const res = await strapiFetch<GetActivitiesResponse>( 
    {
      endpoint: STRAPI_ENDPOINTS.ACTIVITIES,
      qp: stringifyQuery(query),
    },
    {
      cache: "force-cache",
      next: {
        tags: [CACHE_TAGS.ACTIVITIES],
      },
    },
  );

  return res;
};

export const getActivitiesForSitemap = async () => {
  const query = {
    filters: {
      isActive: {
        $eq: true,
      },
    },
    fields: ["label", "isActive", "updatedAt"],
    sort: ["sortOrder:asc", "id:asc"],
  };

  const res = await strapiFetch<GetActivitiesForSitemapResponse>(
    {
      endpoint: STRAPI_ENDPOINTS.ACTIVITIES,
      qp: stringifyQuery(query),
    },
    { cache: "no-store" },
    { errorMsg: "get activities for sitemap fetch error" },
  );

  return res;
};

export const getPricingScheduleActivities = async (
  locale: Locales,
  init?: RequestInit,
) => {
  const query = getPricingScheduleActivitiesQuery(locale);

  const res = await strapiFetch<GetActivitiesResponse>(
    {
      endpoint: STRAPI_ENDPOINTS.ACTIVITIES,
      qp: stringifyQuery(query),
    },
    init,
  );

  return res;
};

export const createActivity = async (
  reqBody: PostActivityRequest,
  jwt: string,
) => {
  const res = await strapiFetch<PostActivityResponse>(
    { endpoint: STRAPI_ENDPOINTS.ACTIVITIES },
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
    { endpoint: `${STRAPI_ENDPOINTS.ACTIVITIES}/${documentId}` },
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
