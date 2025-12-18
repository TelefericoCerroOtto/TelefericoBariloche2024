import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { GetServiceStateResponse } from "@/types";
import { useProxy } from "./use-proxy";

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
