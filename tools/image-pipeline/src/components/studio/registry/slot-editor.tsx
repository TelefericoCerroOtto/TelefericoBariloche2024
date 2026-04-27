"use client";

import { Button, Input, Label, ListBox, Select } from "@heroui/react";

import { studioSelectStyles } from "@/components/studio/select-styles";
import type { StudioSlot } from "@/lib/studio/types";

type SlotEditorProps = {
  slot: StudioSlot;
  onChange: (slot: StudioSlot) => void;
  onRemove: () => void;
};

export function SlotEditor({ slot, onChange, onRemove }: SlotEditorProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre visible</Label>
            <div className="group relative flex cursor-help items-center">
              <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                Nombre que verá el editor al revisar las diferentes salidas.
                <div className="absolute -bottom-1 left-1/2 -ml-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <Input
            value={slot.label}
            onChange={(event) => onChange({ ...slot, label: event.target.value })}
            placeholder="Ej: Hero principal"
            aria-label="Nombre de la salida"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">ID interno</Label>
            <div className="group relative flex cursor-help items-center">
              <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                Identificador único para usar en el código y generar el sufijo.
                <div className="absolute -bottom-1 left-1/2 -ml-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <Input
            value={slot.id}
            onChange={(event) => onChange({ ...slot, id: event.target.value })}
            placeholder="ej: hero-principal"
            aria-label="ID de la salida"
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_7rem_auto] items-end">
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aspecto</Label>
            <div className="group relative flex cursor-help items-center">
              <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                Relación de ancho/alto (ej: 16:9, 1:1, 21:9).
                <div className="absolute -bottom-1 left-1/2 -ml-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <Input
            value={String(slot.ratio)}
            onChange={(event) =>
              onChange({ ...slot, ratio: event.target.value.trim() || slot.ratio })
            }
            placeholder="21:9"
            aria-label="Relación de aspecto"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">MP</Label>
            <div className="group relative flex cursor-help items-center">
              <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
              <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                Resolución total objetivo en megapíxeles (ej: 1.5, 2.0).
                <div className="absolute -bottom-1 left-1/2 -ml-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <Input
            type="number"
            step="0.1"
            value={String(slot.mp)}
            onChange={(event) => onChange({ ...slot, mp: Number(event.target.value || slot.mp) })}
            placeholder="MP"
            aria-label="Megapíxeles"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Calidad</Label>
            <div className="group relative flex cursor-help items-center">
              <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
              <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-max max-w-[12rem] rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                Nivel de compresión del 1 al 100 (Recomendado: 80-85).
                <div className="absolute -bottom-1 right-2 -ml-1 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
          </div>
          <Input
            type="number"
            min="1"
            max="100"
            value={String(slot.quality ?? 82)}
            onChange={(event) => onChange({ ...slot, quality: Number(event.target.value || 82) })}
            placeholder="82"
            aria-label="Calidad"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Formato</Label>
          <Select
            value={slot.format ?? "webp"}
            onChange={(key) =>
              key && onChange({ ...slot, format: String(key) as "webp" | "jpeg" })
            }
            aria-label="Formato"
            variant="secondary"
          >
            <Label className="sr-only">Formato</Label>
            <Select.Trigger className={studioSelectStyles.trigger}>
              <Select.Value className={studioSelectStyles.value} />
              <Select.Indicator className={studioSelectStyles.indicator} />
            </Select.Trigger>
            <Select.Popover className={studioSelectStyles.popover}>
              <ListBox className={studioSelectStyles.listBox}>
                <ListBox.Item id="webp" textValue="webp">
                  webp
                  <ListBox.ItemIndicator className={studioSelectStyles.itemIndicator} />
                </ListBox.Item>
                <ListBox.Item id="jpeg" textValue="jpeg">
                  jpeg
                  <ListBox.ItemIndicator className={studioSelectStyles.itemIndicator} />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>
        </label>
        <Button size="sm" variant="danger-soft" className="mb-[2px]" onPress={onRemove}>
          Eliminar
        </Button>
      </div>
    </div>
  );
}
