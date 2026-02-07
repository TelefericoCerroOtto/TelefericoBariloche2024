"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { i18n } from "@/i18n";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { BusTrip, GetBusTripsResponse } from "@/types";
import { type ReactNode, useCallback } from "react";
import { type ColumnKeys, columns } from "./data";
import { renderBusCell } from "./renderBusCell";

export default function BusTable() {
  const { locale } = useLocale();

  const renderCell = useCallback(
    (bus: BusTrip, columnKey: ColumnKeys) =>
      renderBusCell({ bus, columnKey, locale }),
    [locale],
  );

  const query = {
    filters: {
      isVisible: {
        $eq: true,
      },
    },
    populate: {
      origin: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: locale ?? i18n.defaultLocale,
              },
            },
          },
        },
      },
      destination: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: locale ?? i18n.defaultLocale,
              },
            },
          },
        },
      },
    },
  };

  const {
    data: items,
    isLoading,
    isError,
  } = useProxy<GetBusTripsResponse>(STRAPI_ENDPOINTS.BUS_TRIPS, query, {
    revalidateOnFocus: false,
  });

  return (
    <DataTable
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      columns={columns[locale]}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
