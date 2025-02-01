import { GetHomePage } from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const getHomePageContent = async () => {
  const query = {
    filters: {
      route: {
        $eq: "/",
      },
    },
    populate: {
      blocks: {
        on: {
          "page-components.service-state-modal": {
            populate: {
              stateList: {
                populate: "state",
              },
            },
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
