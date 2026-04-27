"use client";

import { useState } from "react";

import { fetchJson } from "@/lib/studio/api-client";
import type { SlotProfileRegistry } from "@/lib/studio/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UseRegistryManagerOptions {
  onStatus: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

/**
 * Manages the slot-profile registry state and its persistence.
 */
export function useRegistryManager({ onStatus }: UseRegistryManagerOptions) {
  const [registry, setRegistry] = useState<SlotProfileRegistry | null>(null);
  const [savedRegistry, setSavedRegistry] = useState<SlotProfileRegistry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const data = await fetchJson<{ registry: SlotProfileRegistry }>("/api/registry/profiles");
      setRegistry(data.registry);
      setSavedRegistry(data.registry);
    } finally {
      setIsLoading(false);
    }
  }

  async function save() {
    if (!registry) return;
    setIsSaving(true);
    try {
      const data = await fetchJson<{ registry: SlotProfileRegistry }>("/api/registry/profiles", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registry }),
      });
      setRegistry(data.registry);
      setSavedRegistry(data.registry);
      onStatus("Cambios del registro guardados.");
    } finally {
      setIsSaving(false);
    }
  }

  const busyLabel = isSaving
    ? "Guardando perfiles..."
    : isLoading
      ? "Cargando perfiles..."
      : undefined;

  const isDirty = JSON.stringify(registry) !== JSON.stringify(savedRegistry);

  const dirtyProfileIds = new Set<string>();
  if (registry && savedRegistry) {
    // Check modified or new profiles
    registry.profiles.forEach((profile) => {
      const savedProfile = savedRegistry.profiles.find((p) => p.id === profile.id);
      if (!savedProfile || JSON.stringify(profile) !== JSON.stringify(savedProfile)) {
        dirtyProfileIds.add(profile.id);
      }
    });
  }

  return {
    registry,
    setRegistry,
    load,
    save,
    isLoading,
    isDirty,
    isSaving,
    busyLabel,
    dirtyProfileIds,
  };
}
