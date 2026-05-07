"use client";

import { Button, Chip } from "@heroui/react";

import { getNonCanonicalBusyLabel } from "@/components/studio/busy-labels";
import { LoadingIndicator } from "@/components/studio/loading-indicator";
import type { SlotProfileRegistry, WorkspaceItem } from "@/lib/studio/types";

type AssignmentPanelProps = {
  registry: SlotProfileRegistry | null;
  selectedItems: WorkspaceItem[];
  activeItem?: WorkspaceItem;
  isBusy?: boolean;
  busyLabel?: string;
  onBulkAssign: (profileId?: string) => Promise<void>;
  onAssignActive: (profileId?: string) => Promise<void>;
};

export function AssignmentPanel({
  registry,
  selectedItems,
  activeItem,
  isBusy,
  busyLabel,
  onBulkAssign,
  onAssignActive,
}: AssignmentPanelProps) {
  const visibleBusyLabel = getNonCanonicalBusyLabel(busyLabel);
  const profiles = registry?.profiles ?? [];
  const selectedCount = selectedItems.length;

  const isUniformBulkProfile =
    selectedCount > 0 &&
    selectedItems.every((item) => item.profileId === selectedItems[0].profileId)
      ? selectedItems[0].profileId
      : undefined;

  return (
    <section className="flex h-full min-h-[22rem] flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.95)]">
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold text-slate-100">Asignaciones</h2>
        <p className="text-sm text-slate-400">
          Aplica perfiles en bloque o ajusta el recurso activo de forma individual.
        </p>
        {visibleBusyLabel ? <LoadingIndicator className="mt-3" label={visibleBusyLabel} /> : null}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <strong className="text-sm font-semibold text-slate-100">Asignación masiva</strong>
            <Chip size="sm">{selectedCount} seleccionados</Chip>
          </div>
          <div className="flex flex-wrap gap-2">
            {profiles.map((profile, index) => (
              <Button
                key={index}
                size="sm"
                variant={isUniformBulkProfile === profile.id ? "primary" : "secondary"}
                isDisabled={Boolean(isBusy) || selectedCount === 0}
                onPress={() => void onBulkAssign(profile.id)}
              >
                {profile.label}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              isDisabled={Boolean(isBusy) || selectedCount === 0}
              onPress={() => void onBulkAssign()}
            >
              Limpiar
            </Button>
          </div>
          {profiles.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">
              Crea al menos un perfil en el registro para habilitar las asignaciones.
            </p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <strong className="text-sm font-semibold text-slate-100">Ítem activo</strong>
            {activeItem ? (
              <Chip size="sm" className="max-w-[10rem] truncate">{activeItem.displayName}</Chip>
            ) : null}
          </div>
          {activeItem ? (
            <div className="flex flex-wrap gap-2">
              {profiles.map((profile, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={activeItem?.profileId === profile.id ? "primary" : "secondary"}
                  isDisabled={isBusy}
                  onPress={() => void onAssignActive(profile.id)}
                >
                  {profile.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" isDisabled={isBusy} onPress={() => void onAssignActive()}>
                Limpiar
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Selecciona un ítem para modificar su perfil de forma individual.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
