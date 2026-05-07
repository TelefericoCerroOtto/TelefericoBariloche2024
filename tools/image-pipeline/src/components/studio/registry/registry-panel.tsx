"use client";

import { useState } from "react";

import { Button, Chip, Input, Label } from "@heroui/react";

import { SlotEditor } from "@/components/studio/registry/slot-editor";
import type { SlotProfileRegistry, StudioProfile, StudioSlot } from "@/lib/studio/types";

type RegistryPanelProps = {
  registry: SlotProfileRegistry | null;
  isDirty?: boolean;
  isSaving?: boolean;
  dirtyProfileIds?: Set<string>;
  onChange: (registry: SlotProfileRegistry) => void;
  onSave: () => Promise<void>;
  onClose?: () => void;
};

function createSlot(): StudioSlot {
  return {
    id: `slot-${Math.random().toString(36).slice(2, 8)}`,
    label: "Nueva salida",
    ratio: "1:1",
    mp: 1,
    quality: 82,
    format: "webp",
  };
}

function createProfile(): StudioProfile {
  return {
    id: `profile-${Math.random().toString(36).slice(2, 8)}`,
    label: "Nuevo perfil",
    slots: [createSlot()],
  };
}

export function RegistryPanel({ registry, isDirty, isSaving, dirtyProfileIds, onChange, onSave, onClose }: RegistryPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }
    const newProfiles = [...registry!.profiles];
    const item = newProfiles.splice(draggedIndex, 1)[0];
    if (item) {
      newProfiles.splice(dropIndex, 0, item);
      onChange({ ...registry!, profiles: newProfiles });
    }
    setDraggedIndex(null);
  }

  function toggleProfile(profileId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }

  if (!registry) {
    return (
      <section className="flex h-full flex-col p-5">
        <h2 className="text-base font-semibold text-slate-100">Perfiles y salidas</h2>
        <p className="text-sm text-slate-400">Cargando el registro...</p>
      </section>
    );
  }

  return (
    <section className="flex h-full flex-col p-5">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-100">Perfiles y salidas</h2>
              <Chip size="sm">{registry.profiles.length} perfiles</Chip>
            </div>
            <p className="text-sm text-slate-400">
              Los identificadores de cada salida son únicos aunque compartan la misma configuración.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 min-w-0 flex-none items-center justify-center rounded-lg border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              aria-label="Cerrar panel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              onChange({
                ...registry,
                profiles: [...registry.profiles, createProfile()],
              })
            }
          >
            Agregar perfil
          </Button>
          <Button
            size="sm"
            variant={isDirty ? "primary" : "ghost"}
            isDisabled={!isDirty || isSaving}
            onPress={() => void onSave()}
          >
            {isSaving ? "Guardando..." : isDirty ? "Guardar cambios" : "Guardado"}
          </Button>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          {registry.profiles.map((profile, index) => {
            const isExpanded = expandedIds.has(profile.id);
            const isDragged = draggedIndex === index;
            const isProfileDirty = dirtyProfileIds?.has(profile.id);

            return (
              <div 
                className={`overflow-hidden rounded-2xl border bg-slate-900/60 transition-all focus-within:border-slate-700 ${
                  isDragged ? "opacity-40 border-sky-500 scale-[0.98]" : isProfileDirty ? "border-amber-500/50" : "border-slate-800"
                }`} 
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => setDraggedIndex(null)}
              >
                <div className="group relative flex items-center justify-between gap-2 p-4 transition-colors hover:bg-slate-800/50">
                  <button
                    className="absolute inset-0 z-0 cursor-pointer outline-none focus-visible:bg-slate-800/50"
                    type="button"
                    onClick={() => toggleProfile(profile.id)}
                    aria-label={isExpanded ? `Contraer ${profile.label}` : `Expandir ${profile.label}`}
                  />
                  <div className="pointer-events-none z-10 flex flex-1 items-center gap-2 text-left text-sm font-semibold text-slate-100">
                    <div className="pointer-events-auto mr-1 flex cursor-grab items-center text-slate-600 hover:text-slate-300 active:cursor-grabbing" aria-hidden="true" title="Arrastrar para ordenar">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                    </div>
                    <span className="text-xs text-slate-500 transition-colors group-hover:text-slate-400 w-3 text-center">{isExpanded ? "▾" : "▸"}</span>
                    {profile.label}
                    {isProfileDirty && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Perfil modificado" />}
                    <span className="text-xs font-normal text-slate-400">
                      &nbsp;({profile.slots.length} salidas)
                    </span>
                  </div>
                  <div className="z-10">
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() =>
                        onChange({
                          ...registry,
                          profiles: registry.profiles.filter(
                            (_, candidateIndex) => candidateIndex !== index,
                          ),
                        })
                      }
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-0 flex flex-col gap-4 border-t border-slate-800/60 p-4 pt-4">
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Nombre visible</Label>
                          <div className="group relative flex cursor-help items-center">
                            <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
                            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                              Nombre del grupo o perfil (ej: &quot;Hero&quot;, &quot;Galería&quot;).
                              <div className="absolute -bottom-1 left-1/2 -ml-1 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        </div>
                        <Input
                          value={profile.label}
                          onChange={(event) =>
                            onChange({
                              ...registry,
                              profiles: registry.profiles.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, label: event.target.value }
                                  : candidate,
                              ),
                            })
                          }
                          placeholder="Nombre del perfil"
                          aria-label="Nombre del perfil"
                        />
                      </label>
                      <label className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">ID interno</Label>
                          <div className="group relative flex cursor-help items-center">
                            <span className="flex items-center justify-center rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400 font-bold">?</span>
                            <div className="pointer-events-none absolute bottom-full -left-1/2 mb-2 hidden w-max max-w-xs -translate-x-1/4 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-xl group-hover:block z-50">
                              Identificador clave del grupo (usado en código).
                              <div className="absolute -bottom-1 left-1/4 ml-2 border-4 border-transparent border-t-slate-800"></div>
                            </div>
                          </div>
                        </div>
                        <Input
                          value={profile.id}
                          onChange={(event) => {
                            const newId = event.target.value;
                            if (expandedIds.has(profile.id)) {
                              setExpandedIds((prev) => {
                                const next = new Set(prev);
                                next.delete(profile.id);
                                next.add(newId);
                                return next;
                              });
                            }
                            onChange({
                              ...registry,
                              profiles: registry.profiles.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? { ...candidate, id: newId }
                                  : candidate,
                              ),
                            });
                          }}
                          placeholder="id-perfil"
                          aria-label="ID del perfil"
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-3">
                      {profile.slots.map((slot, slotIndex) => (
                        <SlotEditor
                          key={slotIndex}
                          slot={slot}
                          onChange={(nextSlot) =>
                            onChange({
                              ...registry,
                              profiles: registry.profiles.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? {
                                      ...candidate,
                                      slots: candidate.slots.map((candidateSlot, candidateSlotIndex) =>
                                        candidateSlotIndex === slotIndex ? nextSlot : candidateSlot,
                                      ),
                                    }
                                  : candidate,
                              ),
                            })
                          }
                          onRemove={() =>
                            onChange({
                              ...registry,
                              profiles: registry.profiles.map((candidate, candidateIndex) =>
                                candidateIndex === index
                                  ? {
                                      ...candidate,
                                      slots: candidate.slots.filter(
                                        (_, candidateSlotIndex) => candidateSlotIndex !== slotIndex,
                                      ),
                                    }
                                  : candidate,
                              ),
                            })
                          }
                        />
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        onChange({
                          ...registry,
                          profiles: registry.profiles.map((candidate, candidateIndex) =>
                            candidateIndex === index
                              ? { ...candidate, slots: [...candidate.slots, createSlot()] }
                              : candidate,
                          ),
                        })
                      }
                    >
                      Agregar salida
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
          {registry.profiles.length === 0 ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
              Aún no hay perfiles. Crea el primero para definir las salidas disponibles.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
