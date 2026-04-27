"use client";

import { useMemo, useState } from "react";

import type { WorkspaceItem } from "@/lib/studio/types";

/**
 * Manages the active and multi-select state for workspace items.
 *
 * Selection state is stored as raw IDs, but the returned values are
 * always pruned against the current item set — stale IDs are dropped
 * automatically without effects or cascading renders.
 */
export function useItemSelection(items: WorkspaceItem[]) {
  const [rawSelectedIds, setRawSelectedIds] = useState<string[]>([]);
  const [rawActiveId, setRawActiveId] = useState<string>();

  /* Derive effective values from raw state + current items --------- */
  const activeItemId = useMemo(() => {
    if (rawActiveId && items.some((item) => item.id === rawActiveId)) {
      return rawActiveId;
    }
    return items[0]?.id;
  }, [items, rawActiveId]);

  const selectedItemIds = useMemo(
    () => rawSelectedIds.filter((id) => items.some((item) => item.id === id)),
    [items, rawSelectedIds],
  );

  const activeItem = useMemo(
    () => items.find((item) => item.id === activeItemId),
    [items, activeItemId],
  );

  /* Actions -------------------------------------------------------- */

  function toggleSelected(itemId: string) {
    setRawSelectedIds((current) =>
      current.includes(itemId)
        ? current.filter((candidate) => candidate !== itemId)
        : [...current, itemId],
    );
  }

  function setActiveItemId(id: string | undefined) {
    setRawActiveId(id);
  }

  function setSelectedItemIds(ids: string[]) {
    setRawSelectedIds(ids);
  }

  return {
    selectedItemIds,
    activeItemId,
    activeItem,
    toggleSelected,
    setActiveItemId,
    setSelectedItemIds,
  };
}
