"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy, useServiceState } from "@/hooks";
import { getPricingScheduleZonesQuery } from "@/lib/helpers/pricing-schedules-queries";
import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { GetServiceStateResponse, GetZonesResponse, Zone } from "@/types";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { ColumnKeys, columns, dictionaries } from "./data";
import { renderZoneCell } from "./renderZoneCell";

interface Props {
  initialData?: GetZonesResponse;
  initialServiceState?: GetServiceStateResponse;
}

export default function ZonesTable({
  initialData,
  initialServiceState,
}: Readonly<Props>) {
  const { locale } = useLocale();
  const hasInitialData = typeof initialData !== "undefined";

  const {
    serviceState,
    isError: isErrorServiceState,
    isLoading: isLoadingServiceState,
  } = useServiceState({ fallbackData: initialServiceState });

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // MUY importante: memoizar query para que el tick de now NO te cambie la key y refetchee
  const query = useMemo(
    () => getPricingScheduleZonesQuery(locale ?? i18n.defaultLocale),
    [locale],
  );

  const {
    data: items,
    isLoading,
    isError,
  } = useProxy<GetZonesResponse>(STRAPI_ENDPOINTS.ZONES, query, {
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

  const state = serviceState?.data.state; // puede ser undefined al principio

  const renderCell = useCallback(
    (zone: Zone, columnKey: ColumnKeys) =>
      renderZoneCell({ zone, columnKey, locale, now, serviceState: state }),
    [locale, now, state],
  );

  return (
    <DataTable
      ariaLabel={dictionaries[locale ?? i18n.defaultLocale].table.ariaLabel}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      isLoading={isLoading || isLoadingServiceState}
      isError={isError || isErrorServiceState}
      columns={columns[locale ?? i18n.defaultLocale]}
    />
  );
}
