import { i18n } from "@/i18n";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  GetZoneResponse,
  GetZonesResponse,
  Locales,
  UpdateZoneRequest,
  UpdateZoneResponse,
} from "@/types";
import { getStrapiURL, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const getZone = async <T extends Locales | "all">({
  documentId,
  locale,
}: {
  documentId: string;
  locale?: T;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (locale === "all") {
    query.populate = "zone_translations";
  } else if (locale) {
    query.populate = {
      zone_translations: {
        filters: {
          locale: {
            $eq: locale,
          },
        },
      },
    };
  }

  const qs = stringifyQuery(query);

  const res = await strapiFetch<GetZoneResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.ZONES}/${documentId}`, qs),
  );

  return res;
};

export const getZones = async (locale: Locales) => {
  const query = {
    populate: {
      zone_translations: {
        filters: {
          locale: {
            $eq: locale ?? i18n.defaultLocale,
          },
        },
      },
    },
  };

  const res = await strapiFetch<GetZonesResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ZONES, stringifyQuery(query)),
  );

  return res;
};

export const updateZone = async (
  {
    reqBody,
    documentId,
  }: {
    reqBody: UpdateZoneRequest;
    documentId: string;
  },
  jwt: string,
) => {
  const res = await strapiFetch<UpdateZoneResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.ZONES}/${documentId}`),
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
