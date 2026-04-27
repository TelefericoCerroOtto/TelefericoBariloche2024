import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { createRegistryFromSeedProfiles } from "@/lib/studio/registry-mappers";
import { saveRegistry } from "@/lib/server/registry-store";
import { createWorkspace, readWorkspaceJobsText } from "@/lib/server/workspace-store";
import { POST } from "./route";

test("jobs route rejects canonical paths outside the active workspace", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  await saveRegistry(registry);

  const workspace = await createWorkspace("Jobs route path guard");
  const slot = registry.profiles[0]!.slots[0]!;

  const response = await POST(
    new Request("http://localhost/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "rehydrate",
        text: `${JSON.stringify(
          {
            jobs: [
              {
                name: "malicious",
                inputDir: "./imports",
                outputDir: "../outside",
                jobSubdir: false,
                preserveFolders: true,
                collisionPolicy: "suffix",
                defaults: {
                  format: "webp",
                  quality: 82,
                  alignTo: 2,
                  capToBase: true,
                },
                images: [
                  {
                    file: "gallery/source.png",
                    outputs: [
                      {
                        name: slot.id,
                        ratio: String(slot.ratio),
                        mp: slot.mp,
                        quality: slot.quality,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          null,
          2,
        )}\n`,
      }),
    }),
    { params: Promise.resolve({ workspaceId: workspace.id }) },
  );

  expect(response.status).toBe(400);
  expect(await readWorkspaceJobsText(workspace.id)).toBe("");
});

test.each(["../../escape", "nested/job"])(
  "jobs route rejects unsafe job names before saving canonical jobs (%s)",
  async (unsafeJobName) => {
    const registry = createRegistryFromSeedProfiles(createSeedProfiles());
    await saveRegistry(registry);

    const workspace = await createWorkspace("Jobs route job name guard");
    const slot = registry.profiles[0]!.slots[0]!;

    const response = await POST(
      new Request("http://localhost/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "rehydrate",
          text: `${JSON.stringify(
            {
              jobs: [
                {
                  name: unsafeJobName,
                  inputDir: "./imports",
                  outputDir: "./processed",
                  jobSubdir: true,
                  preserveFolders: true,
                  collisionPolicy: "suffix",
                  defaults: {
                    format: "webp",
                    quality: 82,
                    alignTo: 2,
                    capToBase: true,
                  },
                  images: [
                    {
                      file: "gallery/source.png",
                      outputs: [
                        {
                          name: slot.id,
                          ratio: String(slot.ratio),
                          mp: slot.mp,
                          quality: slot.quality,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            null,
            2,
          )}\n`,
        }),
      }),
      { params: Promise.resolve({ workspaceId: workspace.id }) },
    );

    expect(response.status).toBe(400);
    expect(await readWorkspaceJobsText(workspace.id)).toBe("");
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/unsafe|workspace processed root/i),
    });
  },
);
