"use client";

import { Button, Select, SelectItem, type Selection } from "@heroui/react";
import { STATUS_OPTIONS } from "./Filters";
import type { PostulationStatus } from "@/types";
import { useState } from "react";

interface BulkPostulationActionsProps {
  selectedRows: Selection;
  isApplying?: boolean;
  disabled?: boolean;
  // eslint-disable-next-line no-unused-vars
  onApplyStatus: (status: PostulationStatus) => void;
}

export default function BulkPostulationActions(
  props: BulkPostulationActionsProps,
) {
  const {
    selectedRows,
    isApplying = false,
    disabled = false,
    onApplyStatus,
  } = props;

  // Si no hay nada seleccionado, no renderizamos la barra
  const isAllSelected = selectedRows === "all";
  const count =
    selectedRows === "all" ? null : ((selectedRows as Set<unknown>).size ?? 0);

  const label =
    selectedRows === "all"
      ? "Todas las postulaciones seleccionadas"
      : `${count} postulaci${count === 1 ? "ó" : "o"}n${count === 1 ? "" : "es"} seleccionada${
          count === 1 ? "" : "s"
        }`;

  const [selectedStatus, setSelectedStatus] =
    useState<PostulationStatus | null>(null);

  const handlePress = () => {
    if (!selectedStatus || disabled || isApplying) return;
    onApplyStatus(selectedStatus);
  };

  const isApplyDisabled =
    disabled ||
    isApplying ||
    !selectedStatus ||
    (!isAllSelected && count === 0);

  if (!isAllSelected && count === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-4 border-b border-b-foreground-200 bg-default-50 px-3 py-2">
      {/* Lado izquierdo: info de selección */}
      <div className="flex min-w-[260px] flex-1 items-center gap-3 text-base">
        <span className="rounded-full bg-default-100 px-3 py-1 font-medium text-black">
          {label}
        </span>
        <span className="hidden text-default-500 md:inline">
          Acciones sobre las postulaciones seleccionadas.
        </span>
      </div>

      {/* Lado derecho: futuros controles de acciones masivas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-default-700">
            Cambiar estado de el/los postulante/s
          </span>
          <Select
            size="sm"
            labelPlacement="outside-left"
            className="w-[210px]"
            aria-label="Seleccionar nuevo estado para postulaciones"
            placeholder="Nuevo estado"
            selectedKeys={
              selectedStatus ? new Set([selectedStatus]) : new Set()
            }
            onSelectionChange={(keys) => {
              const [first] = Array.from(keys);
              setSelectedStatus(first as PostulationStatus);
            }}
            isDisabled={disabled || isApplying}
          >
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.key}>{status.label}</SelectItem>
            ))}
          </Select>
        </div>

        <Button
          type="button"
          variant="solid"
          size="sm"
          color="primary"
          isDisabled={isApplyDisabled}
          onPress={handlePress}
          className="min-w-[120px] rounded-full text-lg hover:cursor-pointer"
        >
          {isApplying ? "Aplicando..." : "Aplicar"}
        </Button>
      </div>
    </div>
  );
}
