import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  CreateNewRequest,
  CreateNewResponse,
  ExtendLocalizations,
  GetNewResponse,
  GetNewsResponse,
  Locales,
  StrapiLocales,
  UpdateNewRequest,
  UpdateNewResponse,
} from "@/types";
import { stringifyQuery } from "@/utils";

// TODO: Add pagination
export const getNews = async ({
  locale,
  highlighted = false,
}: {
  locale: Locales;
  highlighted?: boolean;
}) => {
  const query = {
    locale: locale ?? i18n.defaultLocale,
    populate: "cover",
    sort: "date:desc",
    fields: ["title", "highlighted", "brief", "date"],
    ...(highlighted && {
      filters: {
        highlighted: {
          $eq: true,
        },
      },
    }),
  };

  const res = await strapiFetch<GetNewsResponse>(
    { endpoint: STRAPI_ENDPOINTS.NEWS, qp: stringifyQuery(query) },
    { cache: "no-store" },
  );

  return res;
};

export const getNew = async <T extends Locales | "all">({
  locale,
  documentId,
}: {
  locale: T;
  documentId: string;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {
    populate: ["cover"],
  };

  if (locale === "all") {
    query.populate.push("localizations");
  } else if (!!locale) {
    query.locale = locale;
  }

  const res = await strapiFetch<
    T extends "all" ? ExtendLocalizations<GetNewResponse> : GetNewResponse
  >(
    {
      endpoint: `${STRAPI_ENDPOINTS.NEWS}/${documentId}`,
      qp: stringifyQuery(query),
    },
    {},
    { errorMsg: "get new fetch error" },
  );

  return res;
};

export const updateNew = async (
  {
    reqBody,
    documentId,
    locale,
  }: {
    reqBody: UpdateNewRequest;
    documentId: string;
    locale: StrapiLocales;
  },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<UpdateNewResponse>(
    {
      endpoint: `${STRAPI_ENDPOINTS.NEWS}/${documentId}`,
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

export const deleteNew = async (documentId: string, jwt: string) => {
  const res = await strapiFetch<object>(
    { endpoint: `${STRAPI_ENDPOINTS.NEWS}/${documentId}` },
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  );

  return res;
};

export const createNew = async (
  {
    reqBody,
    locale,
  }: {
    reqBody: CreateNewRequest;
    locale: Locales;
  },
  jwt: string,
) => {
  const query = { locale };

  const res = await strapiFetch<CreateNewResponse>(
    { endpoint: STRAPI_ENDPOINTS.NEWS, qp: stringifyQuery(query) },
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
