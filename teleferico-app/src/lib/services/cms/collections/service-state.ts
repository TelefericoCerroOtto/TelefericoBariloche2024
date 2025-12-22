import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { strapiFetch } from "@/lib/http/clients/strapi-fetch";
import type {
  GetServiceStateResponse,
  ServiceStateValues,
  UpdateServiceStateResponse,
} from "@/types";

export const getServiceState = async () => {
  const res = await strapiFetch<GetServiceStateResponse>(
    { endpoint: STRAPI_ENDPOINTS.SERVICE_STATE },
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
  const res = await strapiFetch<UpdateServiceStateResponse>(
    { endpoint: STRAPI_ENDPOINTS.SERVICE_STATE },
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
