import { i18n } from "@/i18n";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  GetBusTripResponse,
  GetBusTripsResponse,
  Locales,
  PostBusTripRequest,
  PostBusTripResponse,
  UpdateBusTripRequest,
} from "@/types";
import { getStrapiURL, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const getBusTrip = async (documentId: string, locale: Locales) => {
  const query = {
    populate: {
      origin: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: locale ?? i18n.defaultLocale,
              },
            },
          },
        },
      },
      destination: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: locale ?? i18n.defaultLocale,
              },
            },
          },
        },
      },
    },
  };

  const res = await strapiFetch<GetBusTripResponse>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.BUS_TRIPS}/${documentId}`,
      stringifyQuery(query),
    ),
  );

  return res;
};

export const getBusTrips = async (locale: Locales) => {
  const query = {
    populate: {
      origin: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: locale ?? i18n.defaultLocale,
              },
            },
          },
        },
      },
      destination: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: locale ?? i18n.defaultLocale,
              },
            },
          },
        },
      },
    },
  };

  const res = await strapiFetch<GetBusTripsResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.BUS_TRIPS, stringifyQuery(query)),
  );

  return res;
};

export const createBusTrip = async (
  reqBody: PostBusTripRequest,
  jwt: string,
) => {
  const res = await strapiFetch<PostBusTripResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.BUS_TRIPS),
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

export const updateBusTrip = async (
  {
    reqBody: PostBusTripRequest,
    documentId,
  }: { reqBody: UpdateBusTripRequest; documentId: string },
  jwt: string,
) => {
  const res = await strapiFetch<PostBusTripResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.BUS_TRIPS}/${documentId}`),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(PostBusTripRequest),
    },
  );

  return res;
};
