"use client";

import { Chip, Label, ListBox, Select, Input } from "@heroui/react";

import { FocalPointCanvas } from "@/components/studio/preview/focal-point-canvas";
import { studioSelectStyles } from "@/components/studio/select-styles";
import type { StudioSlot, WorkspaceItem } from "@/lib/studio/types";

type PreviewMeta = {
  baseW?: number;
  baseH?: number;
  cropX?: number;
  cropY?: number;
  cropW?: number;
  cropH?: number;
  outW?: number;
  outH?: number;
};

type PreviewPanelProps = {
  activeItem?: WorkspaceItem;
  activeSlotId?: string;
  availableSlots: StudioSlot[];
  previewUrl?: string;
  previewMeta?: PreviewMeta;
  onSelectSlot: (slotId: string) => void;
  onFocalPointChange: (point: { x: number; y: number }) => Promise<void>;
};

export function PreviewPanel({
  activeItem,
  activeSlotId,
  availableSlots,
  previewUrl,
  previewMeta,
  onSelectSlot,
  onFocalPointChange,
}: PreviewPanelProps) {
  return (
    <section className="flex h-full min-h-[32rem] flex-col rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.95)]">
      <div className="space-y-1 border-b border-slate-800 pb-4">
        <h2 className="text-base font-semibold text-slate-100">Vista previa</h2>
        <p className="text-sm text-slate-400">
          Haz clic en la imagen para fijar el punto focal.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-300">Salida asignada</span>
          <Select
            className="min-w-[13rem] flex-1 self-start"
            isDisabled={!activeItem || availableSlots.length === 0}
            value={activeSlotId ?? null}
            onChange={(key) => key && onSelectSlot(String(key))}
            placeholder={availableSlots.length > 0 ? "Seleccionar salida" : "Sin salidas asignadas"}
            aria-label="Salida"
            variant="secondary"
          >
            <Label className="sr-only">Salida</Label>
            <Select.Trigger className={studioSelectStyles.trigger}>
              <Select.Value className={studioSelectStyles.value} />
              <Select.Indicator className={studioSelectStyles.indicator} />
            </Select.Trigger>
            <Select.Popover className={studioSelectStyles.popover}>
              <ListBox className={studioSelectStyles.listBox}>
                {availableSlots.map((slot) => (
                  <ListBox.Item key={slot.id} id={slot.id} textValue={slot.label}>
                    {slot.label}
                    <ListBox.ItemIndicator className={studioSelectStyles.itemIndicator} />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          {previewMeta?.outW ? (
            <Chip size="sm">
              Salida final: {previewMeta.outW} × {previewMeta.outH} px
            </Chip>
          ) : previewMeta?.baseW ? (
            <Chip size="sm" variant="secondary">
              Original: {previewMeta.baseW} × {previewMeta.baseH} px
            </Chip>
          ) : null}
        </div>
        
        {previewMeta?.baseW && previewMeta?.baseH && activeItem ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800/60 pt-4">
            <span className="text-sm font-medium text-slate-300">Punto focal (px)</span>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">X</span>
                <Input
                  type="number"
                  aria-label="Posición X"
                  min={0}
                  max={previewMeta.baseW}
                  className="w-24 bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded"
                  value={activeItem.focalPoint ? String(Math.round(activeItem.focalPoint.x * previewMeta.baseW)) : ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) return;
                    const newX = Math.max(0, Math.min(1, val / previewMeta.baseW!));
                    onFocalPointChange({ x: newX, y: activeItem.focalPoint?.y ?? 0.5 });
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Y</span>
                <Input
                  type="number"
                  aria-label="Posición Y"
                  min={0}
                  max={previewMeta.baseH}
                  className="w-24 bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded"
                  value={activeItem.focalPoint ? String(Math.round(activeItem.focalPoint.y * previewMeta.baseH)) : ""}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val)) return;
                    const newY = Math.max(0, Math.min(1, val / previewMeta.baseH!));
                    onFocalPointChange({ x: activeItem.focalPoint?.x ?? 0.5, y: newY });
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex-1 overflow-hidden flex flex-col justify-center">
        <FocalPointCanvas
          imageSrc={previewUrl}
          focalPoint={activeItem?.focalPoint}
          previewMeta={previewMeta}
          disabled={!activeItem}
          onChange={onFocalPointChange}
        />
      </div>

      {!activeItem ? (
        <p className="mt-3 text-sm text-slate-400 text-center">
          Selecciona un ítem para habilitar la vista previa.
        </p>
      ) : null}
    </section>
  );
}
