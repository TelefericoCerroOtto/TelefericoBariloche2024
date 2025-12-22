"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { StrapiTimeToTableRecordTime } from "@/lib/adapters";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import { BusTrip, GetBusTripsResponse } from "@/types";
import {
  Table as NextUITable,
  Spinner,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useCallback } from "react";
import Toolbar from "./Toolbar";

type ColumnKeys = "origin" | "destination" | "depTime" | "arrTime" | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "origin", label: "Lugar De Salida" },
  { key: "destination", label: "Lugar De Llegada" },
  { key: "depTime", label: "Horario De Salida" },
  { key: "arrTime", label: "Horario De Llegada" },
  { key: "actions", label: "Acciones" },
];

// TODO: Implement filters for departure and arrival points

export default function BusesAdminTable() {
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
      "Hubo un error al cargar los datos de la tabla de zonas: ",
      "\n",
      isError,
    );

  const renderCell = useCallback(
    (item: BusTrip, columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "origin":
          return (
            <span>
              {item[columnKey].station_translations?.[0]?.name ||
                item[columnKey].key ||
                "-"}
            </span>
          );

        case "destination":
          return (
            <span>
              {item[columnKey].station_translations?.[0]?.name ||
                item[columnKey].key ||
                "-"}
            </span>
          );

        case "depTime":
          return <span>{StrapiTimeToTableRecordTime(item[columnKey])}</span>;

        case "arrTime":
          return <span>{StrapiTimeToTableRecordTime(item[columnKey])}</span>;

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

  // const [departureFilter, setDepartureFilter] = useState<Selection>("all");
  // const [arrivalFilter, setArrivalFilter] = useState<Selection>("all");

  // const filteredItems = useMemo(() => {
  //   let filteredEntries = [...(data?.data || [])];

  //   if (
  //     departureFilter !== "all" &&
  //     Array.from(departureFilter).length !== options.length
  //   ) {
  //     filteredEntries = filteredEntries.filter((entry) =>
  //       Array.from(departureFilter).includes(entry.depUid),
  //     );
  //   }

  //   if (
  //     arrivalFilter !== "all" &&
  //     Array.from(arrivalFilter).length !== options.length
  //   ) {
  //     filteredEntries = filteredEntries.filter((entry) =>
  //       Array.from(arrivalFilter).includes(entry.arrUid),
  //     );
  //   }

  //   return filteredEntries;
  // }, [departureFilter, arrivalFilter]);

  return (
    <>
      <Toolbar
      // options={options}
      // departureFilter={departureFilter}
      // setDepartureFilter={setDepartureFilter}
      // arrivalFilter={arrivalFilter}
      // setArrivalFilter={setArrivalFilter}
      />
      <TableContainer>
        <NextUITable {...tableStyles} className="text-base">
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.key}
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
            items={data?.data || []}
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
