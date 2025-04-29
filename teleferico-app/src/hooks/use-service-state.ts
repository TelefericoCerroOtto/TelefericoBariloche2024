import type { GetServiceStateResponse } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { useProxy } from "./use-proxy";

export function useServiceState() {
  const { data, isError, isLoading } = useProxy<GetServiceStateResponse>(
    STRAPI_ENDPOINTS.SERVICE_STATE,
    {},
  );

  return {
    serviceState: data,
    isLoading,
    isError,
  };
}
