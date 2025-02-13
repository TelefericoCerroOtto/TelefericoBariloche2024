import { i18n } from "@/i18n";
import type { GetHomePage, Locales } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getHomePageContent = async (locale: Locales) => {
  const query = {
    locale: locale ?? i18n.defaultLocale,
    filters: {
      route: {
        $eq: "/",
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
            populate: "images.image",
          },
        },
      },
    },
  };

  const res = await fetchWrapper<GetHomePage>(
    getStrapiURL(STRAPI_ENDPOINTS.PAGES, stringifyQuery(query)),
  );

  return res;
};
