"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { GetTicketsResponse, Ticket } from "@/types";
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

type ColumnKeys = "name" | "lifting_mean" | "price" | "actions";
const columns: { key: ColumnKeys; label: string }[] = [
  { key: "name", label: "Tipo de ticket" },
  { key: "lifting_mean", label: "Medio de elevación" },
  { key: "price", label: "Precio por persona" },
  { key: "actions", label: "Acciones" },
];

export default function TicketsTable() {
  const renderCell = useCallback((ticket: Ticket, columnKey: ColumnKeys) => {
    switch (columnKey) {
      case "name":
        return <span>{ticket[columnKey]}</span>;

      case "lifting_mean":
        return <span>{ticket[columnKey]}</span>;

      case "price":
        return <span>{ticket[columnKey]}</span>;

      case "actions":
        return (
          <TableActionsButtons
            item={ticket}
            eraseModalTitle="Eliminar tarifa de acceso"
            editPath={ADMIN_ROUTES.EDIT_ACCESS_TICKET}
            erasePath={STRAPI_ENDPOINTS.TICKETS}
          />
        );
    }
  }, []);

  const { data, isError, isLoading } = useProxy<GetTicketsResponse>(
    STRAPI_ENDPOINTS.TICKETS,
    undefined,
    {
      revalidateOnFocus: false,
    },
  );

  if (isError)
    console.log(
      "Hubo un error al cargar los datos de la tabla de tickets: ",
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
          emptyContent={"No hay tarifas para mostrar"}
          items={data?.data || []}
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando tarifas" />}
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
