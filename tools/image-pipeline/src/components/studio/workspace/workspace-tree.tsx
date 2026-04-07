"use client";

import { Button, Checkbox, Chip } from "@heroui/react";

import type { WorkspaceItem } from "@/lib/studio/types";

type WorkspaceTreeProps = {
  items: WorkspaceItem[];
  selectedItemIds: string[];
  activeItemId?: string;
  onToggleSelected: (itemId: string) => void;
  onSetActive: (itemId: string) => void;
  onSetSelected: (itemIds: string[]) => void;
  onDeleteSelected?: (itemIds: string[]) => void;
};

export function WorkspaceTree({
  items,
  selectedItemIds,
  activeItemId,
  onToggleSelected,
  onSetActive,
  onSetSelected,
  onDeleteSelected,
}: WorkspaceTreeProps) {
  const groups = items.reduce<Record<string, WorkspaceItem[]>>((acc, item) => {
    const key = item.groupPath || "raíz";
    acc[key] ??= [];
    acc[key]!.push(item);
    return acc;
  }, {});

  const isAllSelected = items.length > 0 && selectedItemIds.length === items.length;

  return (
    <section className="flex flex-col h-full max-h-[42rem] min-h-[22rem] rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.95)]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-slate-100">Archivos del espacio</h2>
          <p className="text-sm text-slate-400">
            Selecciona recursos para asignar perfiles y revisar su configuración.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {onDeleteSelected ? (
            <Button
              size="sm"
              variant="danger-soft"
              isDisabled={selectedItemIds.length === 0}
              onPress={() => onDeleteSelected(selectedItemIds)}
            >
              Eliminar
            </Button>
          ) : null}
          {items.length > 0 ? (
            <label className="flex items-center gap-2 text-sm text-slate-300 font-medium cursor-pointer">
              <Checkbox
                isSelected={isAllSelected}
                onChange={() => onSetSelected(isAllSelected ? [] : items.map((i) => i.id))}
                aria-label="Seleccionar todos los ítems"
              />
              Todos
            </label>
          ) : null}
          <Chip size="sm">{items.length} ítems</Chip>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            Importa archivos o carpetas para comenzar a poblar este espacio de trabajo.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(groups).map(([group, groupItems]) => (
              <div className="flex flex-col gap-2" key={group}>
                <strong className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {group}
                </strong>
                {groupItems.map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  const isActive = activeItemId === item.id;

                  return (
                    <div
                      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                        isActive
                          ? "border-sky-400 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.2)]"
                          : "border-slate-800 bg-slate-900/70"
                      }`}
                      key={item.id}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          isSelected={isSelected}
                          onChange={() => onToggleSelected(item.id)}
                          aria-label={`Seleccionar ${item.displayName}`}
                          className="mt-1"
                        >
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox>

                        <button
                          aria-pressed={isActive}
                          className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3 rounded-xl border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
                          type="button"
                          onClick={() => onSetActive(item.id)}
                        >
                          <div className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-slate-100">
                              {item.displayName}
                            </span>
                            <div className="mt-2 flex flex-col gap-1">
                              <span className="truncate text-xs text-slate-500">{item.sourcePath}</span>
                              <span className="text-xs text-slate-400">
                                Perfil: {item.profileId ?? "sin perfil"}
                              </span>
                            </div>
                          </div>

                          <Chip size="sm">{item.slotIds.length} salidas</Chip>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
