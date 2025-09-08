import type {
  Locales,
  PostActivityTranslationRequest,
  PostActivityTranslationResponse,
  UpdateActivityTranslationRequest,
  UpdateActivityTranslationResponse,
} from "@/types";
import {
  fetchWrapper,
  getStrapiURL,
  STRAPI_ENDPOINTS,
  stringifyQuery,
} from "@/utils";

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

  const res = await fetchWrapper<PostActivityTranslationResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.ACTIVITY_TRANSLATIONS, stringifyQuery(query)),
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

  const res = await fetchWrapper<UpdateActivityTranslationResponse>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.ACTIVITY_TRANSLATIONS}/${documentId}`,
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
