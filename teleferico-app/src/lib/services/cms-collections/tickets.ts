import type {
  ExtendLocalizations,
  GetTicketResponse,
  Locales,
  PostAccessTicketRequest,
  PostAccessTicketResponse,
  UpdateAccessTicketRequest,
  UpdateAccessTicketResponse,
} from "@/types";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import { getStrapiURL, STRAPI_ENDPOINTS, stringifyQuery } from "@/utils";

export const getAccessTicket = async <T extends Locales | "all">({
  documentId,
  locale,
}: {
  documentId: string;
  locale?: T;
}) => {
  const query: Record<string, Locales | "localizations"> = {};

  if (locale === "all") {
    query.populate = "localizations";
  } else if (!!locale) {
    query.locale = locale;
  }

  const qs = stringifyQuery(query);

  const res = await strapiFetch<
    T extends "all" ? ExtendLocalizations<GetTicketResponse> : GetTicketResponse
  >(getStrapiURL(`${STRAPI_ENDPOINTS.TICKETS}/${documentId}`, qs));

  return res;
};

// TODO: replace createAccessTicket with createAccessTicket
export const createAccessTicket = async (
  reqBody: PostAccessTicketRequest,
  jwt: string,
) => {
  const res = await strapiFetch<PostAccessTicketResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.TICKETS),
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

export const updateAccessTicket = async (
  {
    reqBody,
    documentId,
    locale,
  }: {
    reqBody: UpdateAccessTicketRequest;
    documentId: string;
    locale: Locales;
  },
  jwt: string,
) => {
  const query = {
    locale,
  };

  const res = await strapiFetch<UpdateAccessTicketResponse>(
    getStrapiURL(
      `${STRAPI_ENDPOINTS.TICKETS}/${documentId}`,
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
