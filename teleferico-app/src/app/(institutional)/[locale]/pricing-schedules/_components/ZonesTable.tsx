"use client";

import { DataTable } from "@/components";
import { useLocale, useTableItems } from "@/hooks";
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
    title: "Ascenso y Descenso - Teleférico Cerro Otto + Acceso al Complejo",
    description:
      "El ascenso y descenso en el teleférico es solo el comienzo de una experiencia inolvidable. Disfrutá de un recorrido panorámico que te lleva directo al complejo turístico en la cima, donde te esperan actividades para todas las edades.",
    columns: [
      { key: "name", label: "Sector" },
      { key: "openTime", label: "Apertura" },
      { key: "closeTime", label: "Cierre" },
    ],
  },
  en: {
    title: "Ascent and Descent - Cerro Otto Cable Car + Access to the Complex",
    description:
      "The ascent and descent on the cable car are just the beginning of an unforgettable experience. Enjoy a panoramic ride that takes you straight to the tourist complex at the summit, where activities for all ages await you.",
    columns: [
      { key: "name", label: "Sector" },
      { key: "openTime", label: "Opening" },
      { key: "closeTime", label: "Closing" },
    ],
  },
  pt: {
    title: "Subida e Descida - Teleférico Cerro Otto + Acesso ao Complexo",
    description:
      "A subida e descida no teleférico são apenas o começo de uma experiência inesquecível. Desfrute de um passeio panorâmico que o leva diretamente ao complexo turístico no topo, onde atividades para todas as idades o aguardam.",
    columns: [
      { key: "name", label: "Setor" },
      { key: "openTime", label: "Abertura" },
      { key: "closeTime", label: "Fechamento" },
    ],
  },
};

export default function ZonesTable() {
  const { language } = useLocale();

  const renderCell = useCallback(
    (zone: Zone, columnKey: ColumnKeys) => {
      let cellValue: string;
      if (columnKey === "name") cellValue = zone.zone_descriptions[0].name;
      else cellValue = zone[columnKey];

      switch (columnKey) {
        case "name":
          return <span>{cellValue}</span>;
        case "openTime":
          return <span>{formatStrapiTime(cellValue, language)}</span>;
        case "closeTime":
          return <span>{formatStrapiTime(cellValue, language)}</span>;

        default:
          return <span>{cellValue as string}</span>;
      }
    },
    [language],
  );

  const query = {
    populate: {
      zone_descriptions: {
        filters: {
          locale: {
            $eq: language ?? i18n.defaultLocale,
          },
        },
      },
    },
  };

  const { items, isLoading, isError } = useTableItems<GetZonesResponse>(
    STRAPI_ENDPOINTS.ZONES,
    query,
  );

  // TODO: Mejorar respuesta de interfaz en caso de que no carguen los datos
  if (isError) return <div>Hubo un error al cargar los datos de la tabla</div>;

  return (
    <DataTable
      title={dicitionaries[language].title}
      desc={dicitionaries[language].description}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      isLoading={isLoading}
      columns={dicitionaries[language].columns}
    />
  );
}
