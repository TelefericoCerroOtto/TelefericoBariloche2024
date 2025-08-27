"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import type { Activity, GetActivitiesResponse, Locales } from "@/types";
import { ROUTES, STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { type ReactNode, useCallback } from "react";

type ColumnKeys =
  | "name"
  | "zone"
  | "price"
  | "minAge"
  | "season"
  | "requirements";

const dictionaries: Record<
  Locales,
  {
    title: string;
    description: string;
    linkLabel: string;
    columns: {
      key: ColumnKeys;
      label: string;
      zeroLabel?: string;
      unit?: string;
    }[];
    seasons: Record<string, string>;
  }
> = {
  "es-AR": {
    title: "Actividades de Invierno, Verano y Todo El Año",
    description:
      "No importa si venís en pleno invierno con la nieve haciendo magia en el paisaje o en verano con días soleados y vistas increíbles, siempre hay algo para disfrutar.",
    linkLabel: "Ver las actividades",
    columns: [
      { key: "name", label: "Actividad" },
      { key: "zone", label: "Zona" },
      { key: "price", label: "Precio por persona", zeroLabel: "Sin cargo" },
      {
        key: "minAge",
        label: "Edad mínima",
        unit: "años",
        zeroLabel: "Ninguna",
      },
      { key: "season", label: "Temporada" },
      { key: "requirements", label: "Requisitos", zeroLabel: "No hay" },
    ],
    seasons: {
      summer: "Verano",
      autumn: "Otoño",
      winter: "Invierno",
      spring: "Primavera",
      all: "Todo el año",
    },
  },
  en: {
    title: "Winter, Summer, and Year-Round Activities",
    description:
      "It doesn't matter if you come in the middle of winter, with the snow creating magic in the landscape, or in summer, with sunny days and incredible views—there's always something to enjoy.",
    linkLabel: "View activities",
    columns: [
      { key: "name", label: "Actividad" },
      { key: "zone", label: "Zone" },
      { key: "price", label: "Price per person", zeroLabel: "Free" },
      { key: "minAge", label: "Minimum age", unit: "years", zeroLabel: "None" },
      { key: "season", label: "Season" },
      { key: "requirements", label: "Requirements", zeroLabel: "None" },
    ],
    seasons: {
      summer: "Summer",
      autumn: "Autumn",
      winter: "Winter",
      spring: "Spring",
      all: "All year",
    },
  },
  pt: {
    title: "Atividades de Inverno, Verão e o Ano Todo",
    description:
      "Não importa se você vem no auge do inverno, com a neve fazendo magia na paisagem, ou no verão, com dias ensolarados e vistas incríveis—sempre há algo para aproveitar.",
    linkLabel: "Ver atividades",
    columns: [
      { key: "name", label: "Atividade" },
      { key: "zone", label: "Zona" },
      { key: "price", label: "Preço por pessoa", zeroLabel: "Grátis" },
      {
        key: "minAge",
        label: "Idade mínima",
        unit: "anos",
        zeroLabel: "Nenhuma",
      },
      { key: "season", label: "Temporada" },
      { key: "requirements", label: "Requisitos", zeroLabel: "Nenhuma" },
    ],
    seasons: {
      summer: "Verão",
      autumn: "Outono",
      winter: "Inverno",
      spring: "Primavera",
      all: "O ano todo",
    },
  },
};

export default function ActivitiesTable() {
  const { locale } = useLocale();

  const renderCell = useCallback(
    (activity: Activity, columnKey: ColumnKeys) => {
      let cellValue: number | string | null;
      let zeroLabel: string = "-";

      switch (columnKey) {
        case "name":
          cellValue = activity.activity_descriptions?.[0].name ?? "";
          return <span>{cellValue || zeroLabel}</span>;

        case "zone":
          cellValue = activity.activity_descriptions?.[0].name ?? ""; // TODO: Change to zone name
          return <span>{cellValue || zeroLabel}</span>;

        case "price":
          cellValue = activity[columnKey];
          zeroLabel =
            dictionaries[locale].columns.find(
              (column) => column.key === "price",
            )?.zeroLabel || zeroLabel;

          if (cellValue === 0) return <span>{zeroLabel}</span>;
          return <span>${cellValue}</span>;

        case "minAge":
          cellValue = activity[columnKey];
          zeroLabel =
            dictionaries[locale].columns.find(
              (column) => column.key === "minAge",
            )?.zeroLabel || "";

          if (cellValue === 0) return <span>{zeroLabel}</span>;
          return (
            <span>
              {cellValue}{" "}
              {
                dictionaries[locale].columns.find(
                  (column) => column.key === "minAge",
                )?.unit
              }
            </span>
          );

        case "season":
          cellValue = activity[columnKey];
          return <span>{dictionaries[locale].seasons[cellValue]}</span>;

        case "requirements":
          cellValue = activity.activity_descriptions?.[0].requirements ?? "";
          zeroLabel =
            dictionaries[locale].columns.find(
              (column) => column.key === "requirements",
            )?.zeroLabel || zeroLabel;

          if (!cellValue) return <span>{zeroLabel}</span>;
          return <span>{cellValue as string}</span>;

        default:
          cellValue = activity[columnKey];
          return <span>{cellValue}</span>;
      }
    },
    [locale],
  );

  const query = {
    fields: ["price", "minAge", "season", "label"],
    populate: {
      activity_descriptions: {
        filters: {
          locale: {
            $eq: locale,
          },
        },
        fields: ["name", "description", "requirements", "locale"],
      },
      zone: {
        populate: {
          zone_translations: {
            filters: {
              locale: {
                $eq: locale,
              },
            },
            fields: ["name", "description", "locale"],
          },
        },
        fields: ["openTime", "closeTime", "label", "locale"],
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
      title={dictionaries[locale].title}
      desc={dictionaries[locale].description}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      columns={dictionaries[locale].columns}
      isLoading={isLoading}
      isError={isError}
      link={{
        href: ROUTES.ACTIVITIES,
        label: dictionaries[locale].linkLabel,
      }}
    />
  );
}
