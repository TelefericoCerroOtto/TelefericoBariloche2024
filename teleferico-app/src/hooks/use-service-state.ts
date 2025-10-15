import { STRAPI_ENDPOINTS } from "@/utils";
import { useProxy } from "./use-proxy";
import type { GetServiceStateResponse } from "@/types";

export const useServiceState = () => {
  const {
    data: serviceState,
    isError,
    isLoading,
  } = useProxy<GetServiceStateResponse>(
    STRAPI_ENDPOINTS.SERVICE_STATE,
    {},
    { revalidateOnFocus: true, refreshInterval: 10 * 1000 },
  );

  return {
    serviceState,
    isError,
    isLoading,
  };
};
