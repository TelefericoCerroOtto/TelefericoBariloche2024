"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import type { GetTicketsResponse, LiftingMean, Locales, Ticket } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { useCallback, type ReactNode } from "react";

type ColumnKeys = "name" | "lifting_mean" | "price";

const dictionaries: Record<
  Locales,
  {
    title: string;
    description: string;
    columns: { key: ColumnKeys; label: string; zeroLabel?: string }[];
  }
> = {
  "es-AR": {
    columns: [
      { key: "name", label: "Tipo de ticket" },
      { key: "lifting_mean", label: "Medio" },
      { key: "price", label: "Precio por persona", zeroLabel: "Sin cargo" },
    ],
    title: "Ascenso y Descenso - Teleférico Cerro Otto + Acceso al Complejo",
    description:
      "El ascenso y descenso en el teleférico es solo el comienzo de una experiencia inolvidable. Disfrutá de un recorrido panorámico que te lleva directo al complejo turístico en la cima, donde te esperan actividades para todas las edades.",
  },
  en: {
    columns: [
      { key: "name", label: "Ticket" },
      { key: "lifting_mean", label: "Lifting mean" },
      { key: "price", label: "Price", zeroLabel: "Free" },
    ],
    title: "Ascent and Descent - Cerro Otto Cable Car + Complex Access",
    description:
      "The ascent and descent on the cable car are just the beginning of an unforgettable experience. Enjoy a panoramic ride that takes you straight to the tourist complex at the summit, where activities for all ages await you.",
  },
  pt: {
    columns: [
      { key: "name", label: "Tipo de bilhete" },
      { key: "lifting_mean", label: "Meio" },
      { key: "price", label: "Preço por pessoa", zeroLabel: "Grátis" },
    ],
    title: "Subida e Descida - Teleférico Cerro Otto + Acesso ao Complexo",
    description:
      "A subida e descida no teleférico são apenas o começo de uma experiência inesquecível. Desfrute de um passeio panorâmico que o leva diretamente ao complexo turístico no topo, onde atividades para todas as idades o aguardam.",
  },
};

export default function PricingTable() {
  const { locale } = useLocale();
  const renderCell = useCallback(
    (price: Ticket, columnKey: ColumnKeys) => {
      const cellValue = price[columnKey as keyof Ticket];

      switch (columnKey) {
        case "name":
          return <span>{cellValue as string}</span>;
        case "lifting_mean":
          if (!cellValue) return <span></span>;
          return <span>{(cellValue as LiftingMean).name}</span>;
        case "price":
          if (cellValue === 0)
            return (
              <span>
                {
                  dictionaries[locale].columns.find(
                    (column) => column.key === "price",
                  )?.zeroLabel
                }
              </span>
            );
          return <span>${cellValue as string}</span>;

        default:
          return <span>{cellValue as string}</span>;
      }
    },
    [locale],
  );

  const query = { locale: locale, populate: "lifting_mean" };
  const {
    data: items,
    isError,
    isLoading,
  } = useProxy<GetTicketsResponse>(STRAPI_ENDPOINTS.TICKETS, query);

  // TODO: Mejorar respuesta de interfaz en caso de que no carguen los datos
  if (isError) return <div>Hubo un error al cargar los datos de la tabla</div>;

  return (
    <DataTable
      title={dictionaries[locale].title}
      desc={dictionaries[locale].description}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      columns={dictionaries[locale].columns}
      isLoading={isLoading}
    />
  );
}
