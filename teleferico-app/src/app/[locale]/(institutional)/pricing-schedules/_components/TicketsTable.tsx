"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { formatPrice } from "@/lib/adapters";
import { LIFTING_MEANS_TRANSLATIONS } from "@/lib/constants/enum-fields-i18n.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import type { GetTicketsResponse, Locales, Ticket } from "@/types";
import { useCallback, type ReactNode } from "react";
import { getPricingScheduleTicketsQuery } from "@/lib/helpers/pricing-schedules-queries";
import { TableLeadCell, TablePill, TableValueCard } from "./tableCells";

type ColumnKeys = "name" | "price";
type Columns = {
  key: ColumnKeys;
  label: string;
  zeroLabel?: string;
  align?: "start" | "center" | "end";
}[];

const columns: Record<Locales, Columns> = {
  "es-AR": [
    { key: "name", label: "Tipo de ticket", align: "start" },
    {
      key: "price",
      label: "Precio",
      zeroLabel: "Sin cargo",
      align: "end",
    },
  ],
  en: [
    { key: "name", label: "Ticket", align: "start" },
    { key: "price", label: "Price", zeroLabel: "Free", align: "end" },
  ],
  pt: [
    { key: "name", label: "Tipo de bilhete", align: "start" },
    {
      key: "price",
      label: "Preço",
      zeroLabel: "Grátis",
      align: "end",
    },
  ],
};

const dictionaries = {
  "es-AR": {
    ariaLabel: "Tabla de precios de tickets",
    nameEyebrow: "Ticket",
    priceEyebrow: "Tarifa",
    priceHint: "valor por persona",
    priceIncludedHint: "incluido",
  },
  en: {
    ariaLabel: "Ticket pricing table",
    nameEyebrow: "Ticket",
    priceEyebrow: "Rate",
    priceHint: "price per person",
    priceIncludedHint: "included",
  },
  pt: {
    ariaLabel: "Tabela de preços dos bilhetes",
    nameEyebrow: "Bilhete",
    priceEyebrow: "Tarifa",
    priceHint: "valor por pessoa",
    priceIncludedHint: "incluído",
  },
} as const;

interface Props {
  initialData?: GetTicketsResponse;
}

export default function TicketsTable({ initialData }: Readonly<Props>) {
  const { locale } = useLocale();
  const t = dictionaries[locale];
  const hasInitialData = typeof initialData !== "undefined";

  const renderCell = useCallback(
    (ticket: Ticket, columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "name":
          return (
            <TableLeadCell
              title={ticket[columnKey]}
              allowUnlimitedTitleWrap
            />
          );

        case "price":
          if (ticket[columnKey] === 0)
            return (
              <TableValueCard
                value={
                  columns[locale].find((col) => col.key === "price")?.zeroLabel ??
                  "-"
                }
                supportingText={t.priceIncludedHint}
              />
            );

          return (
            <TableValueCard
              value={formatPrice(ticket[columnKey], locale)}
              supportingText={t.priceHint}
              tone="brand"
            />
          );

        default:
          return <TablePill>{ticket[columnKey] as string}</TablePill>;
      }
    },
    [locale, t],
  );

  const query = getPricingScheduleTicketsQuery(locale);
  const {
    data: items,
    isError,
    isLoading,
  } = useProxy<GetTicketsResponse>(STRAPI_ENDPOINTS.TICKETS, query, {
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
      ariaLabel={t.ariaLabel}
      renderCell={renderCell as () => ReactNode}
      items={items?.data || []}
      columns={columns[locale]}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
