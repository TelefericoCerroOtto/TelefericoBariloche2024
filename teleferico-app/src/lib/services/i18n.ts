import { i18n } from "@/i18n";
import type { GetNavbarItems, Locales } from "@/types";
import { CACHE_TAGS } from "@/utils/cache-tags.const";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getNavbarItems = async (locale: Locales) => {
  const query = {
    locale: locale ?? i18n.defaultLocale,
    populate: {
      components: {
        on: {
          "global-intl-components.navbar": {
            populate: "items",
          },
        },
      },
    },
  };

  const res = await fetchWrapper<GetNavbarItems>(
    getStrapiURL(STRAPI_ENDPOINTS.GLOBAL_INTL, stringifyQuery(query)),
    { cache: "force-cache", next: { tags: [CACHE_TAGS.NAVITEMS] } },
  );

  return res;
};
