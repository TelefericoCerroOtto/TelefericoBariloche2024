"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { PREVIEW_REFRESH_BUSY_LABEL } from "@/components/studio/busy-labels";
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
  const [isLoading, setIsLoading] = useState(false);
  const currentObjectUrlRef = useRef<string | undefined>(undefined);

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
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = undefined;
      }
      setPreviewUrl(undefined);
      setPreviewMeta(undefined);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setIsLoading(true);
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
        const newObjectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          if (currentObjectUrlRef.current) {
            URL.revokeObjectURL(currentObjectUrlRef.current);
          }
          currentObjectUrlRef.current = newObjectUrl;
          setPreviewUrl(newObjectUrl);
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
        } else {
          URL.revokeObjectURL(newObjectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          onStatus(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
    // onStatus is stable (comes from the shell's setState); safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, activeItem, activeSlotId]);

  useEffect(() => {
    return () => {
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = undefined;
      }
    };
  }, []);

  return {
    activeSlotId,
    availableSlots,
    previewUrl,
    previewMeta,
    isLoading,
    busyLabel: isLoading ? PREVIEW_REFRESH_BUSY_LABEL : undefined,
    setActiveSlotId,
  };
}
