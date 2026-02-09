"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useProxy } from "@/hooks";
import { LIFTING_MEANS_TRANSLATIONS } from "@/lib/constants/enum-fields-i18n.const";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { GetTicketsResponse, Ticket } from "@/types";
import { truncateString } from "@/utils/truncate-string";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useCallback } from "react";

type ColumnKeys = "name" | "description" | "lifting_mean" | "price" | "actions";
const columns: { key: ColumnKeys; label: string }[] = [
  { key: "name", label: "Tipo de ticket" },
  { key: "description", label: "Descripción (Opcional)" },
  { key: "lifting_mean", label: "Medio de elevación" },
  { key: "price", label: "Precio por persona" },
  { key: "actions", label: "Acciones" },
];

export default function TicketsAdminTable() {
  const renderCell = useCallback((ticket: Ticket, columnKey: ColumnKeys) => {
    switch (columnKey) {
      case "name":
        return <span>{ticket[columnKey]}</span>;

      case "description": {
        if (!ticket.description) return <span>-</span>;

        const MAX_CHARS = 80;
        const preview = truncateString(ticket.description, MAX_CHARS);

        return (
          <Popover placement="top-start" showArrow>
            <PopoverTrigger>
              <button
                type="button"
                className="max-w-[260px] truncate text-left text-base text-default-700 hover:underline"
                aria-label="Ver nota completa"
                title="Ver nota completa"
              >
                {preview}
              </button>
            </PopoverTrigger>
            <PopoverContent className="max-w-md whitespace-pre-wrap text-base">
              {ticket.description}
            </PopoverContent>
          </Popover>
        );
      }

      case "lifting_mean":
        return (
          <span>
            {LIFTING_MEANS_TRANSLATIONS["es-AR"][ticket[columnKey]] ||
              "Medio de elevación no disponible"}
          </span>
        );

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
