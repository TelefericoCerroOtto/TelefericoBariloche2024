"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { StrapiTimeToTableRecordTime } from "@/lib/adapters";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { BusTrip, GetBusTripsResponse } from "@/types";
import {
  Table as NextUITable,
  Spinner,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  type SortDescriptor,
} from "@heroui/react";
import { useCallback, useMemo, useState } from "react";
import Toolbar from "../Toolbar";
import VisibleToggle from "./VisibleToggle";

type ColumnKeys =
  | "origin"
  | "destination"
  | "depTime"
  | "arrTime"
  | "isVisible"
  | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "origin", label: "Lugar De Salida" },
  { key: "destination", label: "Lugar De Llegada" },
  { key: "depTime", label: "Horario De Salida" },
  { key: "arrTime", label: "Horario De Llegada" },
  { key: "isVisible", label: "Visible" },
  { key: "actions", label: "Acciones" },
];

// TODO: Implement filters for departure and arrival points

export default function BusesAdminTable() {
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: "origin",
    direction: "ascending",
  });

  const collator = useMemo(
    () => new Intl.Collator("es-AR", { sensitivity: "base" }),
    [],
  );

  const query = {
    populate: {
      origin: {
        populate: {
          station_translations: {
            filters: {
              locale: {
                $eq: "es-AR",
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
                $eq: "es-AR",
              },
            },
          },
        },
      },
    },
  };

  const { data, isError, isLoading, key } = useProxy<GetBusTripsResponse>(
    STRAPI_ENDPOINTS.BUS_TRIPS,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  if (isError)
    console.log(
      "Hubo un error al cargar los datos de la tabla de viajes: ",
      "\n",
      isError,
    );

  const renderCell = useCallback(
    (item: BusTrip, columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "origin":
          return (
            <span>
              {item.origin.station_translations?.[0]?.name ||
                item.origin.key ||
                "-"}
            </span>
          );

        case "destination":
          return (
            <span>
              {item.destination.station_translations?.[0]?.name ||
                item.destination.key ||
                "-"}
            </span>
          );

        case "depTime":
          return <span>{StrapiTimeToTableRecordTime(item.depTime)}</span>;

        case "arrTime":
          return <span>{StrapiTimeToTableRecordTime(item.arrTime)}</span>;

        case "isVisible":
          return <VisibleToggle busTrip={item} />;

        case "actions":
          return (
            <TableActionsButtons
              editPath={ADMIN_ROUTES.EDIT_BUS_TRIP}
              erasePath={STRAPI_ENDPOINTS.BUS_TRIPS}
              item={item}
              eraseModalTitle="Eliminar viaje"
              swrMutateKey={key}
            />
          );

        default:
          return <div>No se encontro la columna</div>;
      }
    },
    [key],
  );

  const sortedItems = useMemo(() => {
    const items = data?.data ? [...data.data] : [];

    const column = sortDescriptor.column as ColumnKeys;
    const direction = sortDescriptor.direction ?? "ascending";
    const multiplier = direction === "descending" ? -1 : 1;

    const getStationLabel = (station: BusTrip["origin"]) =>
      station.station_translations?.[0]?.name || station.key || "";

    items.sort((a, b) => {
      switch (column) {
        case "origin":
          return (
            collator.compare(
              getStationLabel(a.origin),
              getStationLabel(b.origin),
            ) * multiplier
          );

        case "destination":
          return (
            collator.compare(
              getStationLabel(a.destination),
              getStationLabel(b.destination),
            ) * multiplier
          );

        case "depTime":
          return a.depTime.localeCompare(b.depTime) * multiplier;

        case "arrTime":
          return a.arrTime.localeCompare(b.arrTime) * multiplier;

        default:
          return 0;
      }
    });

    return items;
  }, [collator, data?.data, sortDescriptor]);

  return (
    <>
      <Toolbar />
      <TableContainer>
        <NextUITable
          {...tableStyles}
          className="text-base"
          selectionMode="single"
          sortDescriptor={sortDescriptor}
          onSortChange={setSortDescriptor}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.key}
                allowsSorting={column.key !== "actions"}
                className={`${
                  column.key === "actions" ? "text-center" : ""
                } text-lg font-semibold text-black`}
              >
                {column.label}
              </TableColumn>
            )}
          </TableHeader>

          <TableBody
            className="text-base"
            emptyContent={"No hay viajes para mostrar"}
            items={sortedItems}
            isLoading={isLoading}
            loadingContent={<Spinner label="Cargando viajes" />}
          >
            {(entry) => (
              <TableRow key={entry.id}>
                {(columnKey) => (
                  <TableCell className="text-base">
                    {renderCell(entry, columnKey as ColumnKeys)}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </NextUITable>
      </TableContainer>
    </>
  );
}
