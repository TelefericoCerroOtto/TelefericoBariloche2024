import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  GetZoneResponse,
  GetZonesResponse,
  Locales,
  UpdateZoneRequest,
  UpdateZoneResponse,
} from "@/types";
import { stringifyQuery } from "@/utils";

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

  const res = await strapiFetch<GetZoneResponse>({
    endpoint: `${STRAPI_ENDPOINTS.ZONES}/${documentId}`,
    qp: qs,
  });

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

  const res = await strapiFetch<GetZonesResponse>({
    endpoint: STRAPI_ENDPOINTS.ZONES,
    qp: stringifyQuery(query),
  });

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
    { endpoint: `${STRAPI_ENDPOINTS.ZONES}/${documentId}` },
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
