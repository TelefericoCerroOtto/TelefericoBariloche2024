import { fetcher } from "@/utils/fetcher";
import { stringifyQuery } from "@/utils/query";
import { ROUTE_HANDLERS } from "@/utils/routes.const";
import useSWR from "swr";

export function useProxy<T>(endpoint: string, qs: object) {
  const queryParams = stringifyQuery(qs);
  const key = `${ROUTE_HANDLERS.PROXY}${endpoint}?${queryParams}`;

  const { data, error, isLoading } = useSWR<T>(key, fetcher, {
    errorRetryCount: 2,
    errorRetryInterval: 5000,
  });

  return {
    data,
    isLoading,
    isError: error,
  };
}
