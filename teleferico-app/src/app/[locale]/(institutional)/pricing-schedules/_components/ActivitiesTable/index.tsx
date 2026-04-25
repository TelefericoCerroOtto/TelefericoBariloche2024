"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { getPricingScheduleActivitiesQuery } from "@/lib/helpers/pricing-schedules-queries";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { Activity, GetActivitiesResponse } from "@/types";
import { type ReactNode, useCallback } from "react";
import { columns, dictionaries, type ColumnKeys } from "./data";
import { renderActivityCell } from "./renderActivityCell";

interface Props {
  initialData?: GetActivitiesResponse;
}

export default function ActivitiesTable({ initialData }: Readonly<Props>) {
  const { locale } = useLocale();
  const hasInitialData = typeof initialData !== "undefined";

  const renderCell = useCallback(
    (activity: Activity, columnKey: ColumnKeys) =>
      renderActivityCell({ activity, columnKey, locale }),
    [locale],
  );

  const query = getPricingScheduleActivitiesQuery(locale);

  const {
    data: items,
    isLoading,
    isError,
  } = useProxy<GetActivitiesResponse>(STRAPI_ENDPOINTS.ACTIVITIES, query, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    ...(hasInitialData
      ? {
          revalidateOnMount: false,
          revalidateIfStale: false,
        }
      : {}),
  });

  return (
    <DataTable
      ariaLabel={dictionaries[locale].table.ariaLabel}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      columns={columns[locale]}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
