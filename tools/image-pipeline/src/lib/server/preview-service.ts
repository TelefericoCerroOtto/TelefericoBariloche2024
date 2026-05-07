import { findSlotById } from "../studio/registry-mappers";
import type { SlotProfileRegistry, WorkspaceManifest } from "../studio/types";

export function resolvePreviewTarget(params: {
  workspace: WorkspaceManifest;
  registry: SlotProfileRegistry;
  itemId?: string;
  slotId?: string;
}) {
  const { workspace, registry, itemId, slotId } = params;

  if (!itemId || !slotId) {
    throw new Error("Preview requires an active item and slot.");
  }

  const item = workspace.items.find((candidate) => candidate.id === itemId);
  const slot = findSlotById(registry, slotId);

  if (!item || !slot) {
    throw new Error("Preview target was not found.");
  }

  return { item, slot };
}
