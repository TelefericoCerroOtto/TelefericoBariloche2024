import type {
  CreateFaqRequest,
  CreateFaqResponse,
  ExtendLocalizations,
  GetFaqResponse,
  Locales,
  StrapiLocales,
  UpdateFaqRequest,
  UpdateFaqResponse,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { getStrapiURL, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const getFaq = async <T extends Locales | "all">({
  locale,
  documentId,
}: {
  locale: T;
  documentId: string;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (locale === "all") {
    query.populate = "localizations";
  } else if (!!locale) {
    query.locale = locale;
  }

  const res = await strapiFetch<
    T extends "all" ? ExtendLocalizations<GetFaqResponse> : GetFaqResponse
  >(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.FAQS}/${documentId}`,
      stringifyQuery(query),
    ),
    {
      method: "GET",
    },
  );

  return res;
};

export const createFaq = async (
  { reqBody, locale }: { reqBody: CreateFaqRequest; locale: StrapiLocales },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<CreateFaqResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.FAQS, stringifyQuery(query)),
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

export const updateFaq = async (
  {
    reqBody,
    documentId,
    locale,
  }: { reqBody: UpdateFaqRequest; documentId: string; locale: StrapiLocales },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<UpdateFaqResponse>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.FAQS}/${documentId}`,
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
