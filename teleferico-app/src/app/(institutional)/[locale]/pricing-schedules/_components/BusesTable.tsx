"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { i18n } from "@/i18n";
import type { BusTrip, GetBusTripsResponse, Locales, Station } from "@/types";
import { formatStrapiTime } from "@/utils/format-strapi-time";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { type ReactNode, useCallback } from "react";

type ColumnKeys = "depTime" | "arrTime" | "origin" | "destination";

const dictionaries: Record<
  Locales,
  {
    title: string;
    description: string;
    stations: Record<string, string>;
    columns: { key: ColumnKeys; label: string; zeroLabel?: string }[];
  }
> = {
  "es-AR": {
    columns: [
      { key: "depTime", label: "Horario de salida" },
      { key: "arrTime", label: "Horario de llegada" },
      { key: "origin", label: "Origen" },
      { key: "destination", label: "Destino" },
    ],
    title: "Buses (Traslado gratuito)",
    description:
      "Nuestros buses están disponibles durante todo el año para llevarte a tu destino de manera cómoda y segura. Consultá los horarios y planificá tu viaje con nosotros, sea cual sea la temporada.",
    stations: {
      base: "Base",
      center: "Centro",
    },
  },
  en: {
    columns: [
      { key: "depTime", label: "Departure time" },
      { key: "arrTime", label: "Arrival time" },
      { key: "origin", label: "Origin" },
      { key: "destination", label: "Destination" },
    ],
    title: "Buses (Free transfer)",
    description:
      "Our buses are available year-round to take you to your destination comfortably and safely. Check the schedules and plan your trip with us, no matter the season.",
    stations: {
      base: "Base",
      center: "Center",
    },
  },
  pt: {
    columns: [
      { key: "depTime", label: "Horário de partida" },
      { key: "arrTime", label: "Horário de chegada" },
      { key: "origin", label: "Origem" },
      { key: "destination", label: "Destino" },
    ],
    title: "Ônibus (Transporte gratuito)",
    description:
      "Nossos ônibus estão disponíveis o ano todo para levá-lo ao seu destino com conforto e segurança. Consulte os horários e planeje sua viagem conosco, independentemente da estação.",
    stations: {
      base: "Base",
      center: "Centro",
    },
  },
};

export default function BusTable() {
  const { language } = useLocale();
  const renderCell = useCallback(
    (bus: BusTrip, columnKey: ColumnKeys) => {
      const cellValue = bus[columnKey];

      switch (columnKey) {
        case "origin":
          return (
            <span>{(cellValue as Station).zone.zone_descriptions[0].name}</span>
          );
        case "destination":
          return (
            <span>{(cellValue as Station).zone.zone_descriptions[0].name}</span>
          );
        case "depTime":
          return <span>{formatStrapiTime(cellValue as string, language)}</span>;
        case "arrTime":
          return <span>{formatStrapiTime(cellValue as string, language)}</span>;

        default:
          return <span>{cellValue as string}</span>;
      }
    },
    [language],
  );

  const query = {
    populate: {
      origin: {
        populate: {
          zone: {
            populate: {
              zone_descriptions: {
                filters: {
                  locale: {
                    $eq: language ?? i18n.defaultLocale,
                  },
                },
              },
            },
          },
        },
      },
      destination: {
        populate: {
          zone: {
            populate: {
              zone_descriptions: {
                filters: {
                  locale: {
                    $eq: language ?? i18n.defaultLocale,
                  },
                },
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
  } = useProxy<GetBusTripsResponse>(STRAPI_ENDPOINTS.BUSTRIPS, query);

  // TODO: Mejorar respuesta de interfaz en caso de que no carguen los datos
  if (isError) return <div>Hubo un error al cargar los datos de la tabla</div>;

  return (
    <DataTable
      title={dictionaries[language].title}
      desc={dictionaries[language].description}
      renderCell={renderCell as () => ReactNode}
      items={items?.data ?? []}
      columns={dictionaries[language].columns}
      isLoading={isLoading}
    />
  );
}
