import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { resolveJobList } from "../server/pipeline-core";
import { buildJobsDocument } from "./jobs-mappers";
import { createRegistryFromSeedProfiles } from "./registry-mappers";
import { applyWorkspaceUpdate } from "./workspace-updates";
import type { WorkspaceManifest } from "./types";

function createManifest(): WorkspaceManifest {
  const now = new Date().toISOString();

  return {
    id: "workspace",
    title: "Workspace",
    createdAt: now,
    updatedAt: now,
    importsDir: "imports",
    jobsFile: "jobs.json",
    processedDir: "processed",
    items: [
      {
        id: "item-a",
        sourcePath: "folder/item-a.jpg",
        displayName: "item-a.jpg",
        groupPath: "folder",
        slotIds: [],
      },
      {
        id: "item-b",
        sourcePath: "folder/item-b.jpg",
        displayName: "item-b.jpg",
        groupPath: "folder",
        slotIds: [],
      },
    ],
  };
}

test("bulk assignment supports per-item override without mutating peers", () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  const [hero, carrousel] = registry.profiles;
  const bulkAssigned = applyWorkspaceUpdate({
    manifest: createManifest(),
    registry,
    body: {
      type: "bulkAssign",
      itemIds: ["item-a", "item-b"],
      profileId: hero!.id,
    },
  });

  const overridden = applyWorkspaceUpdate({
    manifest: bulkAssigned,
    registry,
    body: {
      type: "setItemProfile",
      itemId: "item-b",
      profileId: carrousel!.id,
    },
  });

  expect(overridden.items[0]?.profileId).toBe(hero!.id);
  expect(overridden.items[1]?.profileId).toBe(carrousel!.id);
  expect(overridden.items[0]?.slotIds).toEqual(
    hero!.slots.map((slot) => slot.id),
  );
  expect(overridden.items[1]?.slotIds).toEqual(
    carrousel!.slots.map((slot) => slot.id),
  );
});

test("focal point updates persist into generated canonical jobs", () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  const profile = registry.profiles[0]!;
  const assigned = applyWorkspaceUpdate({
    manifest: createManifest(),
    registry,
    body: {
      type: "setItemProfile",
      itemId: "item-a",
      profileId: profile.id,
    },
  });

  const updated = applyWorkspaceUpdate({
    manifest: assigned,
    registry,
    body: {
      type: "setFocalPoint",
      itemId: "item-a",
      focalPoint: { x: 0.2, y: 0.7 },
    },
  });

  const document = buildJobsDocument({ workspace: updated, registry });
  const image = (resolveJobList(document.root)[0]?.images ?? [])[0];

  expect(image?.focalPoint).toEqual({ x: 0.2, y: 0.7 });
});
