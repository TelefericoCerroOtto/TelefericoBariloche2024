import { i18n } from "@/i18n";
import type { GetPageResponse, Locales } from "@/types";
import {
  fetchWrapper,
  getStrapiURL,
  STRAPI_ENDPOINTS,
  stringifyQuery,
} from "@/utils";

export const getPageContent = async (locale: Locales, route: string) => {
  const query = {
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
            populate: ["firstLink", "secondLink", "cover.image", "logo.image"],
          },
          "page-components.hours-overview": "*",
          "page-components.title-desc-block": "*",
          "page-components.image-text-block": {
            populate: ["images.image", "link"],
          },
          "page-components.faq-section": "*",
          "page-components.spacer": "*",
        },
      },
    },
  };

  const res = await fetchWrapper<GetPageResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.PAGES, stringifyQuery(query)),
    {
      cache: "force-cache",
      next: {
        tags: [`content${route}`],
      },
    },
  );

  return res;
};
