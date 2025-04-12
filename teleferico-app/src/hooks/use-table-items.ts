import { fetcher } from "@/utils/fetcher";
import { getStrapiURL } from "@/utils/get-strapi-url";
import { stringifyQuery } from "@/utils/query";
import useSWR from "swr";

export function useTableItems<T>(endpoint: string, qs: object) {
  const { data, error, isLoading } = useSWR<T>(
    getStrapiURL(endpoint, stringifyQuery(qs)),
    fetcher,
    { errorRetryCount: 2, errorRetryInterval: 5000 },
  );

  return {
    items: data,
    isLoading,
    isError: error,
  };
}
