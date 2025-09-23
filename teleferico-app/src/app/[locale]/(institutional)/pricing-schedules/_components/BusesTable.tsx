"use client";

import { DataTable } from "@/components";
import { useLocale, useProxy } from "@/hooks";
import { i18n } from "@/i18n";
import type { BusTrip, GetBusTripsResponse, Locales, Station } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { formatStrapiTime } from "@/utils/format-strapi-time";
import { type ReactNode, useCallback } from "react";

type ColumnKeys = "depTime" | "arrTime" | "origin" | "destination";
type StationWithZone = Station & {
  zone?: {
    zone_translations?: { name?: string }[];
  };
};

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
      { key: "depTime", label: "Horario de salida" },
      { key: "arrTime", label: "Horario de llegada" },
      { key: "origin", label: "Origen" },
      { key: "destination", label: "Destino" },
    ],
    title: "Buses (Traslado gratuito)",
    description:
      "Nuestros buses están disponibles durante todo el año para llevarte a tu destino de manera cómoda y segura. Consultá los horarios y planificá tu viaje con nosotros, sea cual sea la temporada.",
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
  },
};

export default function BusTable() {
  const { locale } = useLocale();
  const renderCell = useCallback(
    (bus: BusTrip, columnKey: ColumnKeys) => {
      const cellValue = bus[columnKey];

      switch (columnKey) {
        case "origin":
        case "destination": {
          const station = cellValue as StationWithZone;
          const zoneName =
            station.zone?.zone_translations?.[0]?.name ?? "-";
          return <span>{zoneName}</span>;
        }
        case "depTime":
          return <span>{formatStrapiTime(cellValue as string, locale)}</span>;
        case "arrTime":
          return <span>{formatStrapiTime(cellValue as string, locale)}</span>;

        default:
          return <span>{cellValue as string}</span>;
      }
    },
    [locale],
  );

  const query = {
    populate: {
      origin: {
        populate: {
          zone: {
            populate: {
              zone_translations: {
                filters: {
                  locale: {
                    $eq: locale ?? i18n.defaultLocale,
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
              zone_translations: {
                filters: {
                  locale: {
                    $eq: locale ?? i18n.defaultLocale,
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
  } = useProxy<GetBusTripsResponse>(STRAPI_ENDPOINTS.BUS_TRIPS, query, {
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
    />
  );
}
