"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { LIFTING_MEANS_TRANSLATIONS } from "@/lib/constants/enum-fields-i18n.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { GetTicketsResponse, Locales, Ticket } from "@/types";
import { useCallback, type ReactNode } from "react";

type ColumnKeys = "name" | "lifting_mean" | "price";
type Columns = { key: ColumnKeys; label: string; zeroLabel?: string }[];

const columns: Record<Locales, Columns> = {
  "es-AR": [
    { key: "name", label: "Tipo de ticket" },
    { key: "lifting_mean", label: "Medio" },
    { key: "price", label: "Precio por persona", zeroLabel: "Sin cargo" },
  ],
  en: [
    { key: "name", label: "Ticket" },
    { key: "lifting_mean", label: "Lifting mean" },
    { key: "price", label: "Price", zeroLabel: "Free" },
  ],
  pt: [
    { key: "name", label: "Tipo de bilhete" },
    { key: "lifting_mean", label: "Meio" },
    { key: "price", label: "Preço por pessoa", zeroLabel: "Grátis" },
  ],
};

export default function TicketsTable() {
  const { locale } = useLocale();
  const renderCell = useCallback(
    (ticket: Ticket, columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "name":
          return <span>{ticket[columnKey]}</span>;

        case "lifting_mean":
          return (
            <span>{LIFTING_MEANS_TRANSLATIONS[locale][ticket[columnKey]]}</span>
          );

        case "price":
          if (ticket[columnKey] === 0)
            return (
              <span>
                {columns[locale].find((col) => col.key === "price")?.zeroLabel}
              </span>
            );
          return <span>$ {ticket[columnKey]}</span>;

        default:
          return <span>{ticket[columnKey] as string}</span>;
      }
    },
    [locale],
  );

  const query = { locale };
  const {
    data: items,
    isError,
    isLoading,
  } = useProxy<GetTicketsResponse>(STRAPI_ENDPOINTS.TICKETS, query, {
    revalidateOnFocus: false,
  });

  return (
    <DataTable
      renderCell={renderCell as () => ReactNode}
      items={items?.data || []}
      columns={columns[locale]}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
