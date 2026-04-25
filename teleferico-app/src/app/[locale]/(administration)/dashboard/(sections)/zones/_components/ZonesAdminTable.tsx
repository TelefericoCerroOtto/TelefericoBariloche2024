"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useAppAlert, usePointerReorder, useProxy } from "@/hooks";
import { StrapiTimeToTableRecordTime } from "@/lib/adapters";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { GetZonesResponse, Zone } from "@/types";
import { cn, reorderList, withSequentialSortOrder } from "@/utils";
import {
  addToast,
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
import Toolbar from "./Toolbar";
import ZoneFeaturedToggle from "./ZoneFeaturedCheckbox";
import ZoneOpenToggle from "./ZoneOpenToggle";
import { reorderZonesAction } from "./actions";

type ColumnKeys =
  | "sortOrder"
  | "name"
  | "openTime"
  | "closeTime"
  | "isOpen"
  | "featured"
  | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "sortOrder", label: "Orden" },
  { key: "name", label: "Zona" },
  { key: "openTime", label: "Horario de apertura" },
  { key: "closeTime", label: "Horario de cierre" },
  { key: "isOpen", label: "Zona abierta" },
  { key: "featured", label: "Horario destacado" },
  { key: "actions", label: "Acciones" },
];

export default function ZonesAdminTable() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  const query = {
    sort: ["sortOrder:asc", "id:asc"],
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

  const { data, isError, isLoading, key } = useProxy<GetZonesResponse>(
    STRAPI_ENDPOINTS.ZONES,
    query,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    setZones(data?.data ?? []);
  }, [data]);

  const syncZonesCache = useCallback(
    (nextZones: Zone[]) => {
      if (!data) return;

      void mutate(
        key,
        {
          ...data,
          data: nextZones,
        },
        { revalidate: false },
      );
    },
    [data, key, mutate],
  );

  const handleReorder = useCallback(
    async (sourceDocumentId: string, targetDocumentId: string) => {
      if (isPersistingOrder) return;

      const fromIndex = zones.findIndex(
        ({ documentId }) => documentId === sourceDocumentId,
      );
      const toIndex = zones.findIndex(
        ({ documentId }) => documentId === targetDocumentId,
      );

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const previousZones = zones;
      const reorderedZones = withSequentialSortOrder(
        reorderList(zones, fromIndex, toIndex),
      );

      setZones(reorderedZones);
      syncZonesCache(reorderedZones);
      setIsPersistingOrder(true);

      try {
        const response = await reorderZonesAction(
          reorderedZones.map(({ documentId, sortOrder }) => ({
            documentId,
            sortOrder,
          })),
        );

        if (!response.success) {
          setZones(previousZones);
          syncZonesCache(previousZones);
          showAlert({
            title: "Error",
            message: "No se pudo guardar el nuevo orden de las zonas.",
            variant: "danger",
          });
          return;
        }

        addToast({
          title: "Orden de zonas actualizado.",
          color: "success",
          timeout: 4000,
        });
      } catch (error) {
        setZones(previousZones);
        syncZonesCache(previousZones);
        showAlert({
          title: "Error",
          message:
            "Ocurrió un error inesperado al guardar el nuevo orden de las zonas.",
          variant: "danger",
        });
        console.log("Unexpected error reordering zones.", error);
      } finally {
        setIsPersistingOrder(false);
      }
    },
    [isPersistingOrder, showAlert, syncZonesCache, zones],
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

  const previewZones = useMemo(() => {
    if (!activeDocumentId || !targetDocumentId || activeDocumentId === targetDocumentId) {
      return zones;
    }

    const fromIndex = zones.findIndex(
      (zone) => zone.documentId === activeDocumentId,
    );
    const toIndex = zones.findIndex(
      (zone) => zone.documentId === targetDocumentId,
    );

    if (fromIndex < 0 || toIndex < 0) return zones;

    return reorderList(zones, fromIndex, toIndex);
  }, [zones, activeDocumentId, targetDocumentId]);

  const getDisplayOrder = useCallback(
    (documentId: string) => {
      const index = previewZones.findIndex((zone) => zone.documentId === documentId);
      return index >= 0 ? index + 1 : 0;
    },
    [previewZones],
  );

  const renderCell = useCallback(
    (zone: Zone, columnKey: ColumnKeys) => {
      const zoneName = zone.zone_translations?.[0]?.name || zone.label || "-";

      switch (columnKey) {
        case "sortOrder": {
          const isDraggedItem = activeDocumentId === zone.documentId;
          const isDropTarget =
            targetDocumentId === zone.documentId && !isDraggedItem;

          return (
            <div
              className={cn(
                "flex min-h-12 w-full items-center rounded-xl border border-transparent p-1 transition-colors",
                isDraggedItem && "opacity-60",
              )}
            >
              <button
                type="button"
                {...getHandleProps(zone.documentId)}
                className={cn(
                  "inline-flex touch-none items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm font-semibold text-foreground/70 transition-colors",
                  !isPersistingOrder &&
                    "cursor-grab hover:border-primary/40 hover:text-primary active:cursor-grabbing",
                  isPersistingOrder && "cursor-not-allowed opacity-60",
                )}
                aria-label={`Reordenar zona ${zoneName}`}
                aria-disabled={isPersistingOrder}
                title="Mantener presionado y mover para reordenar"
              >
                {isPersistingOrder && isDraggedItem ? (
                  <Spinner size="sm" />
                ) : (
                  <GripVertical className="h-4 w-4" />
                )}
                <span className="tabular-nums">{getDisplayOrder(zone.documentId)}</span>
              </button>
            </div>
          );
        }

        case "name":
          return <span>{zoneName}</span>;

        case "openTime":
          return <span>{StrapiTimeToTableRecordTime(zone.openTime)}</span>;

        case "closeTime":
          return <span>{StrapiTimeToTableRecordTime(zone.closeTime)}</span>;

        case "isOpen":
          return <ZoneOpenToggle zone={zone} />;

        case "featured":
          return <ZoneFeaturedToggle zone={zone} />;

        case "actions":
          return <TableActionsButtons item={zone} editPath={ADMIN_ROUTES.ZONES} />;
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
      "Hubo un error al cargar los datos de la tabla de zonas: ",
      "\n",
      isError,
    );

  return (
    <>
      <Toolbar />
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
            emptyContent={"No hay zonas para mostrar"}
            items={previewZones}
            isLoading={isLoading}
            loadingContent={<Spinner label="Cargando zonas" />}
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
    </>
  );
}
