import type { GetServiceStateResponse } from "@/types";
import { fetcher } from "@/utils/fetcher";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import useSWR from "swr";

export function useServiceState() {
  const { data, error, isLoading } = useSWR<GetServiceStateResponse>(
    getStrapiURL(`${STRAPI_ENDPOINTS.SERVICE_STATE}`),
    fetcher,
    { errorRetryCount: 2, errorRetryInterval: 5000 },
  );

  return {
    serviceState: data,
    isLoading,
    isError: error,
  };
}
