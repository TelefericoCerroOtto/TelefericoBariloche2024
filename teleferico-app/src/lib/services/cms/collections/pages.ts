import { i18n } from "@/i18n";
import { PAGE_TAG_PREFIX } from "@/lib/constants/cache-tags.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type { GetPageResponse, Locales } from "@/types";
import { stringifyQuery } from "@/utils";

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
            populate: [
              "firstLink",
              "secondLink",
              "desktopCover.image",
              "mobileCover.image",
              "logo.image",
            ],
          },
          "page-components.hours-overview": "*",
          "page-components.title-desc-block": "*",
          "page-components.image-text-block": {
            populate: {
              link: true,
              oneImageBlock: {
                populate: {
                  desktopImages: {
                    populate: ["image"],
                  },
                  mobileImages: {
                    populate: ["image"],
                  },
                },
              },
              twoImagesBlock: {
                populate: {
                  desktopImages: {
                    populate: ["image"],
                  },
                  mobileImages: {
                    populate: ["image"],
                  },
                },
              },
              threeImagesBlock: {
                populate: {
                  desktopImages: {
                    populate: ["image"],
                  },
                  mobileImages: {
                    populate: ["image"],
                  },
                },
              },
            },
          },
          "page-components.faq-section": "*",
          "page-components.spacer": "*",
          "page-components.schedules": "*",
          "page-components.service-status-button": "*",
          "page-components.carrousel": {
            populate: {
              items: {
                populate: [
                  "desktopCover.image",
                  "mobileCover.image",
                  "link",
                ],
              },
            },
          },
          "page-components.activity-showcase": {
            populate: {
              activity: {
                fields: ["documentId"],
              },
            },
          },
        },
      },
    },
  };

  const res = await strapiFetch<GetPageResponse>(
    { endpoint: STRAPI_ENDPOINTS.PAGES, qp: stringifyQuery(query) },
    {
      // cache: "force-cache",
      next: {
        tags: [`${PAGE_TAG_PREFIX}${route}`],
      },
    },
  );

  return res;
};
