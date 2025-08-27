"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { i18n } from "@/i18n";
import type { GetZonesResponse, Locales, Zone } from "@/types";
import { formatStrapiTime } from "@/utils/format-strapi-time";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { ReactNode, useCallback } from "react";

type ColumnKeys = "name" | "openTime" | "closeTime";

const dicitionaries: Record<
  Locales,
  {
    title: string;
    description: string;
    columns: {
      key: ColumnKeys;
      label: string;
      zeroLabel?: string;
    }[];
  }
> = {
  "es-AR": {
    title: "Sectores del complejo",
    description:
      "En cualquier época del año, nuestros sectores están abiertos para ofrecerte la mejor atención e información. Consultá los horarios específicos y descubrí todo lo que tenemos preparado para vos en cada estación.",
    columns: [
      { key: "name", label: "Sector" },
      { key: "openTime", label: "Apertura" },
      { key: "closeTime", label: "Cierre" },
    ],
  },
  en: {
    title: "Complex Sectors",
    description:
      "At any time of the year, our sectors are open to offer you the best service and information. Check the specific opening hours and discover everything we have prepared for you in every season.",
    columns: [
      { key: "name", label: "Sector" },
      { key: "openTime", label: "Opening" },
      { key: "closeTime", label: "Closing" },
    ],
  },
  pt: {
    title: "Setores do Complexo",
    description:
      "Em qualquer época do ano, nossos setores estão abertos para oferecer a você o melhor atendimento e informações. Consulte os horários específicos e descubra tudo o que preparamos para você em cada estação.",
    columns: [
      { key: "name", label: "Setor" },
      { key: "openTime", label: "Abertura" },
      { key: "closeTime", label: "Fechamento" },
    ],
  },
};

export default function ZonesTable() {
  const { locale } = useLocale();

  const renderCell = useCallback(
    (zone: Zone, columnKey: ColumnKeys) => {
      let cellValue: string;
      if (columnKey === "name") cellValue = zone.zone_translations[0].name;
      else cellValue = zone[columnKey];

      switch (columnKey) {
        case "name":
          return <span>{cellValue}</span>;
        case "openTime":
          return <span>{formatStrapiTime(cellValue, locale)}</span>;
        case "closeTime":
          return <span>{formatStrapiTime(cellValue, locale)}</span>;

        default:
          return <span>{cellValue as string}</span>;
      }
    },
    [locale],
  );

  const query = {
    populate: {
      zone_translations: {
        filters: {
          locale: {
            $eq: locale ?? i18n.defaultLocale,
          },
        },
      },
    },
  };

  const {
    data: items,
    isLoading,
    isError,
  } = useProxy<GetZonesResponse>(STRAPI_ENDPOINTS.ZONES, query, {
    revalidateOnFocus: false,
  });

  return (
    <DataTable
      title={dicitionaries[locale].title}
      desc={dicitionaries[locale].description}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      isLoading={isLoading}
      isError={isError}
      columns={dicitionaries[locale].columns}
    />
  );
}
