import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { POST } from "../../app/api/workspaces/[workspaceId]/process/route";
import { createRegistryFromSeedProfiles } from "../studio/registry-mappers";
import { buildJobsDocument } from "../studio/jobs-mappers";
import { saveRegistry } from "./registry-store";
import {
  createWorkspace,
  getWorkspacePaths,
  importWorkspaceFiles,
  saveWorkspaceManifest,
  writeWorkspaceJobsText,
} from "./workspace-store";

test("process route executes saved jobs through the shared pipeline", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  await saveRegistry(registry);

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "studio-process-route-"));
  const sourcePath = path.join(tempDir, "source.png");
  await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: "#1155aa",
    },
  })
    .png()
    .toFile(sourcePath);

  const workspace = await createWorkspace("Process route workspace");
  const imported = await importWorkspaceFiles(workspace.id, [
    {
      relativePath: "gallery/source.png",
      buffer: await readFile(sourcePath),
    },
  ]);

  const profile = registry.profiles[0]!;
  const manifest = await saveWorkspaceManifest({
    ...imported,
    items: imported.items.map((item) => ({
      ...item,
      profileId: profile.id,
      slotIds: profile.slots.map((slot) => slot.id),
    })),
  });

  const document = buildJobsDocument({ workspace: manifest, registry });
  await writeWorkspaceJobsText(workspace.id, document.text);

  const response = await POST(
    new Request("http://localhost/api/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    }),
    { params: Promise.resolve({ workspaceId: workspace.id }) },
  );

  expect(response.status).toBe(200);

  const payload = (await response.json()) as { outputs: string[]; logs: string[] };
  expect(payload.outputs).toHaveLength(profile.slots.length);
  expect(payload.logs.join("\n")).toMatch(/DRY/);
  expect(payload.outputs[0] ?? "").toMatch(
    new RegExp(getWorkspacePaths(workspace.id).processedDir),
  );
});

test("process route rejects jobs that escape the workspace roots", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  await saveRegistry(registry);

  const workspace = await createWorkspace("Process route path guard");
  const slot = registry.profiles[0]!.slots[0]!;
  await writeWorkspaceJobsText(
    workspace.id,
    `${JSON.stringify(
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
  );

  const response = await POST(
    new Request("http://localhost/api/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    }),
    { params: Promise.resolve({ workspaceId: workspace.id }) },
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringMatching(/workspace processed root/i),
  });
});

test.each(["../../escape", "nested/job"])(
  "process route rejects unsafe job names in canonical jobs (%s)",
  async (unsafeJobName) => {
    const registry = createRegistryFromSeedProfiles(createSeedProfiles());
    await saveRegistry(registry);

    const workspace = await createWorkspace("Process route job name guard");
    const slot = registry.profiles[0]!.slots[0]!;
    await writeWorkspaceJobsText(
      workspace.id,
      `${JSON.stringify(
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
    );

    const response = await POST(
      new Request("http://localhost/api/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      }),
      { params: Promise.resolve({ workspaceId: workspace.id }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/unsafe|workspace processed root/i),
    });
  },
);

test("process route rejects edited canonical jobs with unknown Studio output names", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  await saveRegistry(registry);

  const workspace = await createWorkspace("Process route output-name guard");
  await writeWorkspaceJobsText(
    workspace.id,
    `${JSON.stringify(
      {
        jobs: [
          {
            name: "safe-job",
            inputDir: "./imports",
            outputDir: "./processed",
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
                outputs: [{ name: "edited-slot-id", ratio: "1:1", mp: 1 }],
              },
            ],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  const response = await POST(
    new Request("http://localhost/api/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ dryRun: true }),
    }),
    { params: Promise.resolve({ workspaceId: workspace.id }) },
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringMatching(/known Studio slot id/i),
  });
});
