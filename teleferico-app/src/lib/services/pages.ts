import { i18n } from "@/i18n";
import type { GetHomePage, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { ROUTES, STRAPI_ENDPOINTS } from "@/utils/routes.const";

const getQuery = (locale: Locales, route: string) => ({
  locale: locale ?? i18n.defaultLocale,
  filters: {
    route: {
      $eq: route,
    },
  },
  populate: {
    blocks: {
      on: {
        "page-components.hero": {
          populate: ["firstLink", "secondLink", "cover.image"],
        },
        "page-components.hours-overview": "*",
        "page-components.title-desc-block": "*",
        "page-components.image-text-block": {
          populate: ["images.image", "link"],
        },
      },
    },
  },
});

export const getHomePageContent = async (locale: Locales) => {
  const query = getQuery(locale, ROUTES.HOME);
  const res = await fetchWrapper<GetHomePage>(
    getStrapiURL(STRAPI_ENDPOINTS.PAGES, stringifyQuery(query)),
  );

  return res;
};

export const getActivitiesPageContent = async (locale: Locales) => {
  const query = getQuery(locale, ROUTES.ACTIVITIES);

  const res = await fetchWrapper<GetHomePage>(
    getStrapiURL(STRAPI_ENDPOINTS.PAGES, stringifyQuery(query)),
  );

  return res;
};
