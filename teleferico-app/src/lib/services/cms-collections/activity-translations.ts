import type {
  Locales,
  PostActivityTranslationRequest,
  PostActivityTranslationResponse,
  UpdateActivityTranslationRequest,
  UpdateActivityTranslationResponse,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const createActivityTranslation = async (
  {
    reqBody,
    locale,
  }: {
    reqBody: PostActivityTranslationRequest;
    locale: Locales;
  },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<PostActivityTranslationResponse>(
    {
      endpoint: STRAPI_ENDPOINTS.ACTIVITY_TRANSLATIONS,
      qp: stringifyQuery(query),
    },
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

export const updateActivityTranslation = async (
  {
    reqBody,
    documentId,
    locale,
  }: {
    reqBody: UpdateActivityTranslationRequest;
    documentId: string;
    locale: Locales;
  },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<UpdateActivityTranslationResponse>(
    {
      endpoint: `${STRAPI_ENDPOINTS.ACTIVITY_TRANSLATIONS}/${documentId}`,
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
