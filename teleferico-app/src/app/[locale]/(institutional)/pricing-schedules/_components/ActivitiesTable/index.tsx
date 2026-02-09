"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { Activity, GetActivitiesResponse } from "@/types";
import { type ReactNode, useCallback } from "react";
import { columns, type ColumnKeys } from "./data";
import { renderActivityCell } from "./renderActivityCell";

export default function ActivitiesTable() {
  const { locale } = useLocale();

  const renderCell = useCallback(
    (activity: Activity, columnKey: ColumnKeys) =>
      renderActivityCell({ activity, columnKey, locale }),
    [locale],
  );

  const query = {
    filters: {
      isActive: { $eq: true },
    },
    populate: {
      activity_translations: {
        filters: {
          locale: {
            $eq: locale,
          },
        },
        fields: ["name", "description", "requirements"],
      },
    },
  };

  const {
    data: items,
    isLoading,
    isError,
  } = useProxy<GetActivitiesResponse>(STRAPI_ENDPOINTS.ACTIVITIES, query, {
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
