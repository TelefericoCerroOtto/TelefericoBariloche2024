import type {
  Locales,
  PostAccessTicketRequest,
  PostAccessTicketResponse,
  UpdateAccessTicketRequest,
  UpdateAccessTicketResponse,
} from "@/types";
import { fetchWrapper } from "@/utils/fetch";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";

export const newAccessTicket = async (
  reqBody: PostAccessTicketRequest,
  jwt: string,
) => {
  const res = await fetchWrapper<PostAccessTicketResponse>(
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

  const res = await fetchWrapper<UpdateAccessTicketResponse>(
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
