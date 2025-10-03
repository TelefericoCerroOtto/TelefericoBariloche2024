import { i18n } from "@/i18n";
import type {
  FetchResponse,
  GetNewsResponse,
  Locales,
  NewsCreateDto,
  NewsEntity,
  NewsUpdateDto,
} from "@/types";
import {
  cleanObject,
  fetchWrapper,
  getSession,
  getStrapiURL,
  STRAPI_ENDPOINTS,
  stringifyQuery,
} from "@/utils";

type ListNewsParams = {
  locale?: Locales | "all";
  pagination?: { page: number; pageSize: number };
  filters?: Record<string, unknown>;
  sort?: string[];
  fields?: string[];
  populate?: Record<string, unknown> | string[] | string;
};

type GetNewsParams = {
  locale?: Locales | "all";
  populate?: Record<string, unknown> | string[] | string;
  fields?: string[];
};

type MutationParams = {
  locale?: Locales;
};

export async function listNews(
  params?: ListNewsParams,
): Promise<FetchResponse<GetNewsResponse>> {
  const {
    locale = i18n.defaultLocale,
    pagination,
    filters,
    sort = ["date:desc"],
    populate = { cover: { populate: "image" } },
    fields = ["title", "highlighted", "date", "updatedAt", "documentId"],
  } = params ?? {};

  const query = cleanObject({
    locale,
    pagination,
    filters,
    sort,
    populate,
    fields,
  });

  return fetchWrapper<GetNewsResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.NEWS, stringifyQuery(query)),
  );
}

export async function getNews(
  id: number | string,
  params?: GetNewsParams,
): Promise<FetchResponse<{ data: NewsEntity }>> {
  const {
    locale = i18n.defaultLocale,
    populate = {
      cover: { populate: "image" },
      localizations: { populate: "cover.image" },
    },
    fields,
  } = params ?? {};

  const query = cleanObject({
    locale,
    populate,
    fields,
  });

  return fetchWrapper<{ data: NewsEntity }>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.NEWS}/${id}`,
      stringifyQuery(query),
    ),
  );
}

export async function createNews(
  payload: NewsCreateDto,
): Promise<FetchResponse<{ data: NewsEntity }>> {
  const session = await getSession();

  return fetchWrapper<{ data: NewsEntity }>(getStrapiURL(STRAPI_ENDPOINTS.NEWS), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateNews(
  id: number | string,
  payload: NewsUpdateDto,
  params?: MutationParams,
): Promise<FetchResponse<{ data: NewsEntity }>> {
  const session = await getSession();
  const query = params?.locale ? stringifyQuery({ locale: params.locale }) : "";

  return fetchWrapper<{ data: NewsEntity }>(
    getStrapiURL(`${STRAPI_ENDPOINTS.NEWS}/${id}`, query),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteNews(
  id: number | string,
): Promise<FetchResponse<{ data: NewsEntity }>> {
  const session = await getSession();

  return fetchWrapper<{ data: NewsEntity }>(
    getStrapiURL(`${STRAPI_ENDPOINTS.NEWS}/${id}`),
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    },
  );
}
