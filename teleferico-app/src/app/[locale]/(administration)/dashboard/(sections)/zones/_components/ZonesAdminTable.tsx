"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { StrapiTimeToTableRecordTime } from "@/lib/adapters";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import { GetZonesResponse, Zone } from "@/types";
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
import Toolbar from "./Toolbar";
import ZoneOpenToggle from "./ZoneOpenToggle";
import ZoneFeaturedToggle from "./ZoneFeaturedCheckbox";

type ColumnKeys =
  | "name"
  | "openTime"
  | "closeTime"
  | "isOpen"
  | "featured"
  | "actions";
const columns: { key: ColumnKeys; label: string }[] = [
  { key: "name", label: "Zona" },
  { key: "openTime", label: "Horario De Apertura" },
  { key: "closeTime", label: "Horario De Cierre" },
  { key: "isOpen", label: "Zona abierta" },
  { key: "featured", label: "Horario destacado" },
  { key: "actions", label: "Acciones" },
];

export default function ZonesAdminTable() {
  const renderCell = useCallback((zone: Zone, columnKey: ColumnKeys) => {
    switch (columnKey) {
      case "name":
        return (
          <span>{zone.zone_translations?.[0]?.name || zone.label || "-"}</span>
        );

      case "openTime":
        return <span>{StrapiTimeToTableRecordTime(zone[columnKey])}</span>;

      case "closeTime":
        return <span>{StrapiTimeToTableRecordTime(zone[columnKey])}</span>;

      case "isOpen":
        return <ZoneOpenToggle zone={zone} />;

      case "featured":
        return <ZoneFeaturedToggle zone={zone} />;

      case "actions":
        return (
          <TableActionsButtons item={zone} editPath={ADMIN_ROUTES.ZONES} />
        );
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
    <>
      <Toolbar />
      <TableContainer>
        <Table {...tableStyles} className="text-base">
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
            emptyContent={"No hay zonas para mostrar"}
            items={data?.data || []}
            isLoading={isLoading}
            loadingContent={<Spinner label="Cargando zonas" />}
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
        </Table>
      </TableContainer>
    </>
  );
}
