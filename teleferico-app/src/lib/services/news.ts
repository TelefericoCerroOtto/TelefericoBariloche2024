import { i18n } from "@/i18n";
import { GetNewResponse, GetNewsResponse, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

// TODO: Add pagination
export const getNews = async ({
  locale,
  highlighted = false,
}: {
  locale: Locales;
  highlighted?: boolean;
}) => {
  const query = {
    locale: locale ?? i18n.defaultLocale,
    populate: "cover.image",
    sort: "date:desc",
    fields: ["title", "highlighted", "brief", "date"],
    ...(highlighted && {
      filters: {
        highlighted: {
          $eq: true,
        },
      },
    }),
  };

  const res = await fetchWrapper<GetNewsResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.NEWS, stringifyQuery(query)),
  );

  return res;
};

export const getNew = async ({
  locale,
  documentId,
}: {
  locale: string;
  documentId: string;
}) => {
  const query = {
    locale: locale ?? i18n.defaultLocale,
    populate: "cover.image",
  };

  const res = await fetchWrapper<GetNewResponse>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.NEWS}/${documentId}`,
      stringifyQuery(query),
    ),
    {},
    "get new fetch error",
  );

  return res;
};
