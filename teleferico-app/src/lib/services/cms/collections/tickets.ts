import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  ExtendLocalizations,
  GetTicketResponse,
  Locales,
  PostAccessTicketRequest,
  PostAccessTicketResponse,
  UpdateAccessTicketRequest,
  UpdateAccessTicketResponse,
} from "@/types";
import { stringifyQuery } from "@/utils";

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

  const res = await strapiFetch<
    T extends "all" ? ExtendLocalizations<GetTicketResponse> : GetTicketResponse
  >({
    endpoint: `${STRAPI_ENDPOINTS.TICKETS}/${documentId}`,
    qp: stringifyQuery(query),
  });

  return res;
};

// TODO: replace createAccessTicket with createAccessTicket
export const createAccessTicket = async (
  reqBody: PostAccessTicketRequest,
  jwt: string,
) => {
  const res = await strapiFetch<PostAccessTicketResponse>(
    { endpoint: STRAPI_ENDPOINTS.TICKETS },
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
    {
      endpoint: `${STRAPI_ENDPOINTS.TICKETS}/${documentId}`,
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
