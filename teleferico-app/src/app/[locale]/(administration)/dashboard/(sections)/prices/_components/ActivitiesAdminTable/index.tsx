"use client";

import { TableActionsButtons, TableContainer } from "@/components";
import { useAppAlert, usePointerReorder, useProxy } from "@/hooks";
import { ADMIN_ROUTES, STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { tableStyles } from "@/lib/constants/styles.const";
import type { Activity, GetActivitiesResponse } from "@/types";
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
import ActiveToggle from "./ActiveToggle";
import AvailableToggle from "./AvailableToggle";
import { reorderActivitiesAction } from "./actions";

type ColumnKeys =
  | "sortOrder"
  | "name"
  | "price"
  | "minAge"
  | "season"
  | "requirements"
  | "available"
  | "isActive"
  | "actions";

const columns: { key: ColumnKeys; label: string }[] = [
  { key: "sortOrder", label: "Orden" },
  { key: "name", label: "Actividad" },
  { key: "price", label: "Precio por persona" },
  { key: "minAge", label: "Edad mínima" },
  { key: "season", label: "Temporada" },
  { key: "requirements", label: "Requisitos" },
  { key: "available", label: "Disponible" },
  { key: "isActive", label: "Publicada/Oculta" },
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const { mutate } = useSWRConfig();
  const { showAlert } = useAppAlert();

  const query = {
    sort: ["sortOrder:asc", "id:asc"],
    populate: {
      activity_translations: {
        filters: {
          locale: { $eq: "es-AR" },
        },
        fields: ["name", "requirements", "locale"],
      },
    },
  };

  const { data, isError, isLoading, key } = useProxy<GetActivitiesResponse>(
    STRAPI_ENDPOINTS.ACTIVITIES,
    query,
    { revalidateOnFocus: false },
  );

  useEffect(() => {
    setActivities(data?.data ?? []);
  }, [data]);

  const syncActivitiesCache = useCallback(
    (nextActivities: Activity[]) => {
      if (!data) return;

      void mutate(
        key,
        {
          ...data,
          data: nextActivities,
        },
        { revalidate: false },
      );
    },
    [data, key, mutate],
  );

  const handleReorder = useCallback(
    async (sourceDocumentId: string, targetDocumentId: string) => {
      if (isPersistingOrder) return;

      const fromIndex = activities.findIndex(
        ({ documentId }) => documentId === sourceDocumentId,
      );
      const toIndex = activities.findIndex(
        ({ documentId }) => documentId === targetDocumentId,
      );

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const previousActivities = activities;
      const reorderedActivities = withSequentialSortOrder(
        reorderList(activities, fromIndex, toIndex),
      );

      setActivities(reorderedActivities);
      syncActivitiesCache(reorderedActivities);
      setIsPersistingOrder(true);

      try {
        const response = await reorderActivitiesAction(
          reorderedActivities.map(({ documentId, sortOrder }) => ({
            documentId,
            sortOrder,
          })),
        );

        if (!response.success) {
          setActivities(previousActivities);
          syncActivitiesCache(previousActivities);
          showAlert({
            title: "Error",
            message: "No se pudo guardar el nuevo orden de las actividades.",
            variant: "danger",
          });
          return;
        }

        addToast({
          title: "Orden de actividades actualizado.",
          color: "success",
          timeout: 4000,
        });
      } catch (error) {
        setActivities(previousActivities);
        syncActivitiesCache(previousActivities);
        showAlert({
          title: "Error",
          message:
            "Ocurrió un error inesperado al guardar el nuevo orden de las actividades.",
          variant: "danger",
        });
        console.log("Unexpected error reordering activities.", error);
      } finally {
        setIsPersistingOrder(false);
      }
    },
    [activities, isPersistingOrder, showAlert, syncActivitiesCache],
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

  const previewActivities = useMemo(() => {
    if (!activeDocumentId || !targetDocumentId || activeDocumentId === targetDocumentId) {
      return activities;
    }

    const fromIndex = activities.findIndex(
      (activity) => activity.documentId === activeDocumentId,
    );
    const toIndex = activities.findIndex(
      (activity) => activity.documentId === targetDocumentId,
    );

    if (fromIndex < 0 || toIndex < 0) return activities;

    return reorderList(activities, fromIndex, toIndex);
  }, [activities, activeDocumentId, targetDocumentId]);

  const getDisplayOrder = useCallback(
    (documentId: string) => {
      const index = previewActivities.findIndex(
        (activity) => activity.documentId === documentId,
      );
      return index >= 0 ? index + 1 : 0;
    },
    [previewActivities],
  );

  const renderCell = useCallback(
    (activity: Activity, columnKey: ColumnKeys) => {
      const name = activity.activity_translations?.[0]?.name ?? "-";

      switch (columnKey) {
        case "sortOrder": {
          const isDraggedItem = activeDocumentId === activity.documentId;
          // const isDropTarget =
          //   targetDocumentId === activity.documentId && !isDraggedItem;

          return (
            <div
              className={cn(
                "flex min-h-12 w-full items-center rounded-xl border border-transparent p-1 transition-colors",
                isDraggedItem && "opacity-60",
              )}
            >
              <button
                type="button"
                {...getHandleProps(activity.documentId)}
                className={cn(
                  "inline-flex touch-none items-center gap-2 rounded-lg border border-default-200 bg-default-50 px-3 py-2 text-sm font-semibold text-foreground/70 transition-colors",
                  !isPersistingOrder &&
                    "cursor-grab hover:border-primary/40 hover:text-primary active:cursor-grabbing",
                  isPersistingOrder && "cursor-not-allowed opacity-60",
                )}
                aria-label={`Reordenar actividad ${name}`}
                aria-disabled={isPersistingOrder}
                title="Mantener presionado y mover para reordenar"
              >
                {isPersistingOrder && isDraggedItem ? (
                  <Spinner size="sm" />
                ) : (
                  <GripVertical className="h-4 w-4" />
                )}
                <span className="tabular-nums">
                  {getDisplayOrder(activity.documentId)}
                </span>
              </button>
            </div>
          );
        }

        case "name":
          return <span>{name}</span>;

        case "price":
          return (
            <span>{activity.price === 0 ? "Sin cargo" : `$${activity.price}`}</span>
          );

        case "minAge":
          return <span>{activity.minAge === 0 ? "Ninguna" : activity.minAge}</span>;

        case "season":
          return <span>{seasonLabels[activity.season] || activity.season}</span>;

        case "requirements": {
          const requirements =
            activity.activity_translations?.[0]?.requirements ?? "-";
          return <span className="line-clamp-2 max-w-xs">{requirements}</span>;
        }

        case "available":
          return <AvailableToggle activity={activity} />;

        case "isActive":
          return <ActiveToggle activity={activity} />;

        case "actions":
          return (
            <TableActionsButtons
              item={activity}
              editPath={ADMIN_ROUTES.EDIT_ACTIVITY_TICKET}
            />
          );
      }
    },
    [
      activeDocumentId,
      getDisplayOrder,
      getHandleProps,
      isPersistingOrder,
    ],
  );

  if (isError)
    console.log(
      "Hubo un error al cargar los datos de la tabla de actividades:",
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
          items={previewActivities}
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
