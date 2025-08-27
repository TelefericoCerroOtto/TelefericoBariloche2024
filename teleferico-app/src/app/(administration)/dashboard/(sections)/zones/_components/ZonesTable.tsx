"use client";

import { TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { GetZonesResponse, Zone } from "@/types";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { tableStyles } from "@/utils/styles";
import {
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useCallback } from "react";
import ActionsButtons from "./ActionsButtons";
import { StrapiTimeToTableRecordTime } from "@/lib/adapters/formats";

type ColumnKeys = "name" | "openTime" | "closeTime" | "actions";
const columns: { key: ColumnKeys; label: string }[] = [
  { key: "name", label: "Zona" },
  { key: "openTime", label: "Horario De Apertura" },
  { key: "closeTime", label: "Horario De Cierre" },
  { key: "actions", label: "Acciones" },
];

export default function ZonesTable() {
  const renderCell = useCallback((zone: Zone, columnKey: ColumnKeys) => {
    switch (columnKey) {
      case "name":
        return <span>{zone.zone_translations[0].name}</span>;

      case "openTime":
        return <span>{StrapiTimeToTableRecordTime(zone[columnKey])}</span>;

      case "closeTime":
        return <span>{StrapiTimeToTableRecordTime(zone[columnKey])}</span>;

      case "actions":
        return <ActionsButtons zone={zone} />;
    }
  }, []);

  const query = {
    populate: {
      zone_translations: {
        filters: {
          locale: {
            $eq: "es-AR",
          },
        },
      },
    },
  };

  const { data, isError, isLoading } = useProxy<GetZonesResponse>(
    STRAPI_ENDPOINTS.ZONES,
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

  return (
    <TableContainer>
      <Table {...tableStyles}>
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              className={`${column.key === "actions" ? "text-center" : ""} text-black`}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          emptyContent={"No hay zonas para mostrar"}
          items={data?.data || []}
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando zonas" />}
        >
          {(entry) => (
            <TableRow key={entry.id}>
              {(columnKey) => (
                <TableCell>
                  {renderCell(entry, columnKey as ColumnKeys)}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
