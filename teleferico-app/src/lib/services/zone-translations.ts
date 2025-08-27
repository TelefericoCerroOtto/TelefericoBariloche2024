import type {
  Locales,
  UpdateZoneTranslationRequest,
  UpdateZoneTranslationResponse,
} from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

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
