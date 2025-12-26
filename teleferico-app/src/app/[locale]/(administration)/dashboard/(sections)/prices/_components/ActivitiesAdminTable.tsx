"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { Activity, GetActivitiesResponse } from "@/types";
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

type ColumnKeys =
  | "name"
  | "price"
  | "minAge"
  | "season"
  | "requirements"
  | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "name", label: "Actividad" },
  { key: "price", label: "Precio por persona" },
  { key: "minAge", label: "Edad mínima" },
  { key: "season", label: "Temporada" },
  { key: "requirements", label: "Requisitos" },
  { key: "actions", label: "Acciones" },
];

const seasonLabels: Record<string, string> = {
  summer: "Verano",
  autumn: "Otoño",
  winter: "Invierno",
  spring: "Primavera",
  allSeasons: "Todo el año",
};

export default function ActivitiesAdminTable() {
  const renderCell = useCallback(
    (activity: Activity, columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "name": {
          const name = activity.activity_translations?.[0]?.name ?? "-";
          return <span>{name}</span>;
        }
        case "price":
          return (
            <span>
              {activity.price === 0 ? "Sin cargo" : `$${activity.price}`}
            </span>
          );
        case "minAge":
          return (
            <span>{activity.minAge === 0 ? "Ninguna" : activity.minAge}</span>
          );
        case "season":
          return (
            <span>{seasonLabels[activity.season] || activity.season}</span>
          );
        case "requirements": {
          const req = activity.activity_translations?.[0]?.requirements ?? "";
          return <span>{req || "-"}</span>;
        }
        case "actions":
          return (
            <TableActionsButtons
              item={activity}
              eraseModalTitle="Eliminar actividad"
              editPath={ADMIN_ROUTES.EDIT_ACTIVITY_TICKET}
              erasePath={STRAPI_ENDPOINTS.ACTIVITIES}
            />
          );
      }
    },
    [],
  );

  const query = {
    populate: {
      activity_translations: {
        filters: {
          locale: { $eq: "es-AR" },
        },
        fields: ["name", "requirements", "locale"],
      },
    },
  };

  const { data, isError, isLoading } = useProxy<GetActivitiesResponse>(
    STRAPI_ENDPOINTS.ACTIVITIES,
    query,
    { revalidateOnFocus: false },
  );

  if (isError)
    console.log(
      "Hubo un error al cargar los datos de la tabla de actividades:",
      "\n",
      isError,
    );

  return (
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
          emptyContent={"No hay tarifas para mostrar"}
          items={data?.data || []}
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando tarifas" />}
        >
          {(entry) => (
            <TableRow key={entry.id}>
              {(columnKey) => (
                <TableCell className="text-base">
                  {renderCell(entry as Activity, columnKey as ColumnKeys)}
                </TableCell>
              )}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
