import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { getPricingScheduleZonesQuery } from "@/lib/helpers/pricing-schedules-queries";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  CreateZoneRequest,
  CreateZoneResponse,
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

  const res = await strapiFetch<GetZoneResponse>({
    endpoint: `${STRAPI_ENDPOINTS.ZONES}/${documentId}`,
    qp: stringifyQuery(query),
  });

  return res;
};

export const getZones = async (locale: Locales, init?: RequestInit) => {
  const query = {
    ...getPricingScheduleZonesQuery(locale ?? i18n.defaultLocale),
    sort: ["sortOrder:asc", "id:asc"]
  };

  const res = await strapiFetch<GetZonesResponse>( 
    {
      endpoint: STRAPI_ENDPOINTS.ZONES,
      qp: stringifyQuery(query),
    },
    init,
  );

  return res;
};

export const createZone = async (
  { reqBody }: { reqBody: CreateZoneRequest },
  jwt: string,
) => {
  const res = await strapiFetch<CreateZoneResponse>(
    { endpoint: STRAPI_ENDPOINTS.ZONES },
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify(reqBody),
    },
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
