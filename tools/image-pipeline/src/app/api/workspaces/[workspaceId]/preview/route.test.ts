import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { createRegistryFromSeedProfiles } from "@/lib/studio/registry-mappers";
import { saveRegistry } from "@/lib/server/registry-store";
import {
  createWorkspace,
  importWorkspaceFiles,
  saveWorkspaceManifest,
} from "@/lib/server/workspace-store";
import { POST } from "./route";

test("preview route returns a controlled 4xx response for corrupt image inputs", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  await saveRegistry(registry);

  const workspace = await createWorkspace("Preview route validation");
  const imported = await importWorkspaceFiles(workspace.id, [
    {
      relativePath: "gallery/broken.png",
      buffer: Buffer.from("not-a-real-image"),
    },
  ]);
  const slot = registry.profiles[0]!.slots[0]!;
  const manifest = await saveWorkspaceManifest({
    ...imported,
    items: imported.items.map((item) => ({
      ...item,
      profileId: registry.profiles[0]!.id,
      slotIds: [slot.id],
    })),
  });

  const response = await POST(
    new Request("http://localhost/api/preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId: manifest.items[0]!.id, slotId: slot.id }),
    }),
    { params: Promise.resolve({ workspaceId: workspace.id }) },
  );

  expect(response.status).toBe(422);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringMatching(/image|preview/i),
  });
});
