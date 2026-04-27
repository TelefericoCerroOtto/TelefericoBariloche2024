"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { getPricingScheduleBusTripsQuery } from "@/lib/helpers/pricing-schedules-queries";
import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { BusTrip, GetBusTripsResponse } from "@/types";
import { type ReactNode, useCallback } from "react";
import { type ColumnKeys, columns, dictionaries } from "./data";
import { renderBusCell } from "./renderBusCell";

const BUSES_REVALIDATION_INTERVAL_MS = 30 * 60 * 1000;

interface Props {
  initialData?: GetBusTripsResponse;
}

export default function BusTable({ initialData }: Readonly<Props>) {
  const { locale } = useLocale();
  const hasInitialData = typeof initialData !== "undefined";

  const renderCell = useCallback(
    (bus: BusTrip, columnKey: ColumnKeys) =>
      renderBusCell({ bus, columnKey, locale }),
    [locale],
  );

  const query = getPricingScheduleBusTripsQuery(locale ?? i18n.defaultLocale);

  const {
    data: items,
    isLoading,
    isError,
  } = useProxy<GetBusTripsResponse>(STRAPI_ENDPOINTS.BUS_TRIPS, query, {
    fallbackData: initialData,
    revalidateOnFocus: true,
    focusThrottleInterval: BUSES_REVALIDATION_INTERVAL_MS,
    dedupingInterval: BUSES_REVALIDATION_INTERVAL_MS,
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
