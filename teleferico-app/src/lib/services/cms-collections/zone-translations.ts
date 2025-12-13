import type {
  Locales,
  UpdateZoneTranslationRequest,
  UpdateZoneTranslationResponse,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { getStrapiURL, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const updateZoneTranslation = async (
  {
    reqBody,
    documentId,
    locale,
  }: {
    reqBody: UpdateZoneTranslationRequest;
    documentId: string;
    locale?: Locales;
  },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<UpdateZoneTranslationResponse>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.ZONE_TRANSLATIONS}/${documentId}`,
      stringifyQuery(query),
    ),
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
