import type {
  Locales,
  UpdateZoneTranslationRequest,
  UpdateZoneTranslationResponse,
} from "@/types";
import {
  fetchWrapper,
  getStrapiURL,
  STRAPI_ENDPOINTS,
  stringifyQuery,
} from "@/utils";

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

  const res = await fetchWrapper<UpdateZoneTranslationResponse>(
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
