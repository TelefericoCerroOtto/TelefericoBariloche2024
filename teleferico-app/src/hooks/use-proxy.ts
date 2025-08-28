import { fetcher } from "@/utils/fetcher";
import { stringifyQuery } from "@/utils/query";
import { ROUTE_HANDLERS } from "@/utils/routes.const";
import useSWR, { type BareFetcher, type SWRConfiguration } from "swr";

export function useProxy<T>(
  endpoint: string,
  queryObject?: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  swrconfig?: SWRConfiguration<T, any, BareFetcher<T>>,
) {
  const queryParams = queryObject ? stringifyQuery(queryObject) : "";
  const key = `${ROUTE_HANDLERS.PROXY}${endpoint}${queryParams ? `?${queryParams}` : queryParams}`;

  const { data, error, isLoading } = useSWR<T>(key, fetcher, {
    ...swrconfig,
    errorRetryCount: 2,
    errorRetryInterval: 5000,
  });

  return {
    data,
    isLoading,
    isError: error,
  };
}
