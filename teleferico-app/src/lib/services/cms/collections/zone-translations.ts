import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  Locales,
  UpdateZoneTranslationRequest,
  UpdateZoneTranslationResponse,
} from "@/types";
import { stringifyQuery } from "@/utils";

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
    {
      endpoint: `${STRAPI_ENDPOINTS.ZONE_TRANSLATIONS}/${documentId}`,
      qp: stringifyQuery(query),
    },
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
