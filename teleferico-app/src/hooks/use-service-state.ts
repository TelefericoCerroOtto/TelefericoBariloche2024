import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { GetServiceStateResponse } from "@/types";
import { useProxy } from "./use-proxy";

const REFRESH_INTERVAL_MS = 10 * 1000; // 10 seconds

type UseServiceStateOptions = {
  fallbackData?: GetServiceStateResponse;
};

export const useServiceState = (options: UseServiceStateOptions = {}) => {
  const { fallbackData } = options;
  const hasFallbackData = typeof fallbackData !== "undefined";

  const {
    data: serviceState,
    isError,
    isLoading,
  } = useProxy<GetServiceStateResponse>(
    STRAPI_ENDPOINTS.SERVICE_STATE,
    {},
    {
      fallbackData,
      revalidateOnFocus: true,
      refreshInterval: REFRESH_INTERVAL_MS,
      ...(hasFallbackData
        ? {
            revalidateOnMount: false,
            revalidateIfStale: false,
          }
        : {}),
    },
  );

  return {
    serviceState,
    isError,
    isLoading,
  };
};
