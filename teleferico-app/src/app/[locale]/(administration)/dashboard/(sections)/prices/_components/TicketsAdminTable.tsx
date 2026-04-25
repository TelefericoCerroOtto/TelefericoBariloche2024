"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useAppAlert, usePointerReorder, useProxy } from "@/hooks";
import { LIFTING_MEANS_TRANSLATIONS } from "@/lib/constants/enum-fields-i18n.const";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { GetTicketsResponse, Ticket } from "@/types";
import { cn, reorderList, withSequentialSortOrder } from "@/utils";
import { truncateString } from "@/utils/truncate-string";
import {
  addToast,
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
import { GripVertical } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { reorderTicketsAction } from "./tickets-actions";

type ColumnKeys =
  | "sortOrder"
  | "name"
  | "description"
  | "lifting_mean"
  | "price"
  | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "sortOrder", label: "Orden" },
  { key: "name", label: "Tipo de ticket" },
  { key: "description", label: "Descripción (Opcional)" },
  { key: "lifting_mean", label: "Medio de elevación" },
  { key: "price", label: "Precio por persona" },
  { key: "actions", label: "Acciones" },
];

export default function TicketsAdminTable() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  const query = {
    sort: ["sortOrder:asc", "id:asc"],
  };

  const { data, isError, isLoading, key } = useProxy<GetTicketsResponse>(
    STRAPI_ENDPOINTS.TICKETS,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    setTickets(data?.data ?? []);
  }, [data]);

  const syncTicketsCache = useCallback(
    (nextTickets: Ticket[]) => {
      if (!data) return;

      void mutate(
        key,
        {
          ...data,
          data: nextTickets,
        },
        { revalidate: false },
      );
    },
    [data, key, mutate],
  );

  const handleReorder = useCallback(
    async (sourceDocumentId: string, targetDocumentId: string) => {
      if (isPersistingOrder) return;

      const fromIndex = tickets.findIndex(
        ({ documentId }) => documentId === sourceDocumentId,
      );
      const toIndex = tickets.findIndex(
        ({ documentId }) => documentId === targetDocumentId,
      );

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const previousTickets = tickets;
      const reorderedTickets = withSequentialSortOrder(
        reorderList(tickets, fromIndex, toIndex),
      );

      setTickets(reorderedTickets);
      syncTicketsCache(reorderedTickets);
      setIsPersistingOrder(true);

      try {
        const response = await reorderTicketsAction(
          reorderedTickets.map(({ documentId, sortOrder }) => ({
            documentId,
            sortOrder,
          })),
        );

        if (!response.success) {
          setTickets(previousTickets);
          syncTicketsCache(previousTickets);
          showAlert({
            title: "Error",
            message: "No se pudo guardar el nuevo orden de los tickets.",
            variant: "danger",
          });
          return;
        }

        addToast({
          title: "Orden de tickets actualizado.",
          color: "success",
          timeout: 4000,
        });
      } catch (error) {
        setTickets(previousTickets);
        syncTicketsCache(previousTickets);
        showAlert({
          title: "Error",
          message:
            "Ocurrió un error inesperado al guardar el nuevo orden de los tickets.",
          variant: "danger",
        });
        console.log("Unexpected error reordering tickets.", error);
      } finally {
        setIsPersistingOrder(false);
      }
    },
    [isPersistingOrder, showAlert, syncTicketsCache, tickets],
  );

  const {
    activeDocumentId,
    targetDocumentId,
    getHandleProps,
    getTargetProps,
  } = usePointerReorder({
    isDisabled: isPersistingOrder,
    onCommit: (sourceDocumentId, targetDocumentId) => {
      void handleReorder(sourceDocumentId, targetDocumentId);
    },
  });

  const previewTickets = useMemo(() => {
    if (!activeDocumentId || !targetDocumentId || activeDocumentId === targetDocumentId) {
      return tickets;
    }

    const fromIndex = tickets.findIndex(
      (ticket) => ticket.documentId === activeDocumentId,
    );
    const toIndex = tickets.findIndex(
      (ticket) => ticket.documentId === targetDocumentId,
    );

    if (fromIndex < 0 || toIndex < 0) return tickets;

    return reorderList(tickets, fromIndex, toIndex);
  }, [tickets, activeDocumentId, targetDocumentId]);

  const getDisplayOrder = useCallback(
    (documentId: string) => {
      const index = previewTickets.findIndex(
        (ticket) => ticket.documentId === documentId,
      );
      return index >= 0 ? index + 1 : 0;
    },
    [previewTickets],
  );

  const renderCell = useCallback(
    (ticket: Ticket, columnKey: ColumnKeys) => {
      switch (columnKey) {
        case "sortOrder": {
          const isDraggedItem = activeDocumentId === ticket.documentId;
          const isDropTarget =
            targetDocumentId === ticket.documentId && !isDraggedItem;

          return (
            <div
              className={cn(
                "flex min-h-12 w-full items-center rounded-xl border border-transparent p-1 transition-colors",
                isDraggedItem && "opacity-60",
              )}
            >
              <button
                type="button"
                {...getHandleProps(ticket.documentId)}
                className={cn(
                  "inline-flex touch-none items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm font-semibold text-foreground/70 transition-colors",
                  !isPersistingOrder &&
                    "cursor-grab hover:border-primary/40 hover:text-primary active:cursor-grabbing",
                  isPersistingOrder && "cursor-not-allowed opacity-60",
                )}
                aria-label={`Reordenar ticket ${ticket.name}`}
                aria-disabled={isPersistingOrder}
                title="Mantener presionado y mover para reordenar"
              >
                {isPersistingOrder && isDraggedItem ? (
                  <Spinner size="sm" />
                ) : (
                  <GripVertical className="h-4 w-4" />
                )}
                <span className="tabular-nums">{getDisplayOrder(ticket.documentId)}</span>
              </button>
            </div>
          );
        }

        case "name":
          return <span>{ticket.name}</span>;

        case "description": {
          if (!ticket.description) return <span>-</span>;

          const preview = truncateString(ticket.description, 80);

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
              {LIFTING_MEANS_TRANSLATIONS["es-AR"][ticket.lifting_mean] ||
                "Medio de elevación no disponible"}
            </span>
          );

        case "price":
          return <span>{ticket.price}</span>;

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
    },
    [
      activeDocumentId,
      getDisplayOrder,
      getHandleProps,
      getTargetProps,
      isPersistingOrder,
      targetDocumentId,
    ],
  );

  if (isError)
    console.log(
      "Hubo un error al cargar los datos de la tabla de tickets: ",
      "\n",
      isError,
    );

  return (
    <TableContainer>
      <Table
        key={isPersistingOrder ? "persisting-order" : "idle-order"}
        {...tableStyles}
        className="text-base"
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.key}
              className={cn(
                column.key === "actions" && "text-center",
                "text-lg font-semibold text-black",
              )}
            >
              {column.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          className="text-base"
          emptyContent={"No hay tarifas para mostrar"}
          items={previewTickets}
          isLoading={isLoading}
          loadingContent={<Spinner label="Cargando tarifas" />}
        >
          {(entry) => (
            <TableRow
              key={entry.id}
              {...getTargetProps(entry.documentId)}
              className={cn(
                activeDocumentId === entry.documentId && "opacity-60",
                targetDocumentId === entry.documentId &&
                  activeDocumentId !== entry.documentId &&
                  "bg-primary/5",
              )}
            >
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
