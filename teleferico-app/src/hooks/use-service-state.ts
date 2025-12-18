import { STRAPI_ENDPOINTS } from "@/utils";
import { useProxy } from "./use-proxy";
import type { GetServiceStateResponse } from "@/types";

const REFRESH_INTERVAL_MS = 10 * 1000; // 10 seconds

export const useServiceState = () => {
  const {
    data: serviceState,
    isError,
    isLoading,
  } = useProxy<GetServiceStateResponse>(
    STRAPI_ENDPOINTS.SERVICE_STATE,
    {},
    { revalidateOnFocus: true, refreshInterval: REFRESH_INTERVAL_MS },
  );

  return {
    serviceState,
    isError,
    isLoading,
  };
};
