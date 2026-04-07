import { findProfileById } from "./registry-mappers";
import type { SlotProfileRegistry, WorkspaceManifest } from "./types";

export type WorkspaceUpdateBody =
  | { type: "bulkAssign"; itemIds: string[]; profileId?: string }
  | { type: "setItemProfile"; itemId: string; profileId?: string }
  | { type: "setFocalPoint"; itemId: string; focalPoint?: { x: number; y: number } }
  | { type: "deleteItems"; itemIds: string[] }
  | { type: "setTitle"; title: string };

export function applyWorkspaceUpdate(params: {
  manifest: WorkspaceManifest;
  registry: SlotProfileRegistry;
  body: WorkspaceUpdateBody;
}): WorkspaceManifest {
  const { manifest, registry, body } = params;

  if (body.type === "setTitle") {
    return { ...manifest, title: body.title };
  }

  if (body.type === "deleteItems") {
    return {
      ...manifest,
      items: manifest.items.filter((item) => !body.itemIds.includes(item.id)),
    };
  }

  if (body.type === "bulkAssign") {
    const profile = findProfileById(registry, body.profileId);
    return {
      ...manifest,
      items: manifest.items.map((item) =>
        body.itemIds.includes(item.id)
          ? {
              ...item,
              profileId: profile?.id,
              slotIds: profile?.slots.map((slot) => slot.id) ?? [],
            }
          : item,
      ),
    };
  }

  if (body.type === "setItemProfile") {
    const profile = findProfileById(registry, body.profileId);
    return {
      ...manifest,
      items: manifest.items.map((item) =>
        item.id === body.itemId
          ? {
              ...item,
              profileId: profile?.id,
              slotIds: profile?.slots.map((slot) => slot.id) ?? [],
            }
          : item,
      ),
    };
  }

  return {
    ...manifest,
    items: manifest.items.map((item) =>
      item.id === body.itemId
        ? {
            ...item,
            focalPoint: body.focalPoint,
          }
        : item,
    ),
  };
}
