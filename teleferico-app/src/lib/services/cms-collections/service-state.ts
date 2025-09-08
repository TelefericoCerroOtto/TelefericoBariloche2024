import type {
  GetServiceStateResponse,
  ServiceStateValues,
  UpdateServiceStateResponse,
} from "@/types";
import {
  CACHE_TAGS,
  STRAPI_ENDPOINTS,
  fetchWrapper,
  getStrapiURL,
} from "@/utils";

export const getServiceState = async () => {
  const res = await fetchWrapper<GetServiceStateResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.SERVICE_STATE),
    {
      method: "GET",
      next: {
        tags: [CACHE_TAGS.SERVICE_STATE],
      },
    },
  );

  return res;
};

export const updateServiceState = async (
  state: ServiceStateValues,
  jwt: string,
) => {
  const res = await fetchWrapper<UpdateServiceStateResponse>(
    getStrapiURL(STRAPI_ENDPOINTS.SERVICE_STATE),
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: { state } }),
      cache: "no-cache",
    },
  );

  return res;
};
