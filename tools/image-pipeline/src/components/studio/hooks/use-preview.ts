"use client";

import { useEffect, useMemo, useState } from "react";

import { findSlotById } from "@/lib/studio/registry-mappers";
import type {
  SlotProfileRegistry,
  StudioSlot,
  WorkspaceItem,
} from "@/lib/studio/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface UsePreviewOptions {
  workspaceId: string | undefined;
  activeItem: WorkspaceItem | undefined;
  registry: SlotProfileRegistry | null;
  onStatus: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Manages preview image loading for the active workspace item + slot.
 *
 * Computes available slots from the registry, fetches the preview blob,
 * creates an object URL and cleans it up on change/unmount.
 */
export function usePreview({
  workspaceId,
  activeItem,
  registry,
  onStatus,
}: UsePreviewOptions) {
  const [activeSlotId, setActiveSlotId] = useState<string>();
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [previewMeta, setPreviewMeta] = useState<PreviewMeta>();

  /* Derive available slots from registry + active item ------------- */
  const availableSlots = useMemo<StudioSlot[]>(() => {
    if (!registry || !activeItem) return [];
    return activeItem.slotIds
      .map((slotId) => findSlotById(registry, slotId))
      .filter((slot): slot is StudioSlot => Boolean(slot));
  }, [activeItem, registry]);

  /* Auto-select first slot when available slots change ------------- */
  useEffect(() => {
    if (!availableSlots.some((slot) => slot.id === activeSlotId)) {
      setActiveSlotId(availableSlots[0]?.id);
    }
  }, [availableSlots, activeSlotId]);

  /* Load preview blob when item/slot change ------------------------ */
  useEffect(() => {
    if (!workspaceId || !activeItem) {
      setPreviewUrl(undefined);
      setPreviewMeta(undefined);
      return;
    }

    let cancelled = false;
    let objectUrl: string | undefined;

    const loadPreview = async () => {
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/preview`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ itemId: activeItem.id, slotId: activeSlotId }),
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? "No se pudo cargar la vista previa.");
        }
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPreviewUrl(objectUrl);
          setPreviewMeta({
            baseW: Number(response.headers.get("x-base-width") ?? 0) || undefined,
            baseH: Number(response.headers.get("x-base-height") ?? 0) || undefined,
            cropX: Number(response.headers.get("x-crop-left")), // Can be 0
            cropY: Number(response.headers.get("x-crop-top")),
            cropW: Number(response.headers.get("x-crop-width") ?? 0) || undefined,
            cropH: Number(response.headers.get("x-crop-height") ?? 0) || undefined,
            outW: Number(response.headers.get("x-out-width") ?? 0) || undefined,
            outH: Number(response.headers.get("x-out-height") ?? 0) || undefined,
          });
        }
      } catch (error) {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // onStatus is stable (comes from the shell's setState); safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, activeItem, activeSlotId]);

  return {
    activeSlotId,
    availableSlots,
    previewUrl,
    previewMeta,
    setActiveSlotId,
  };
}
