import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { createRegistryFromSeedProfiles } from "@/lib/studio/registry-mappers";
import {
  STUDIO_JOB_DEFAULTS,
  buildJobsDocument,
  rehydrateWorkspaceFromJobs,
} from "@/lib/studio/jobs-mappers";
import { resolvePreviewTarget } from "@/lib/server/preview-service";
import {
  createWorkspace,
  getWorkspacePaths,
  importWorkspaceFiles,
  readWorkspaceManifest,
  resolveWorkspaceItemInputPath,
  saveWorkspaceManifest,
  writeWorkspaceJobsText,
} from "@/lib/server/workspace-store";
import { executeJobs, renderPreview } from "./render";
import { mergeDefaults } from "./jobs";

test("workspace jobs roundtrip keeps assignments and preview/process parity", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "studio-fixture-"));
  const sourcePath = path.join(tempDir, "source.png");
  await sharp({
    create: {
      width: 1800,
      height: 1200,
      channels: 3,
      background: "#8844aa",
    },
  })
    .png()
    .toFile(sourcePath);

  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  const profile = registry.profiles[0]!;
  const slot = profile.slots[0]!;
  const workspace = await createWorkspace("Integration workspace");

  const imported = await importWorkspaceFiles(workspace.id, [
    {
      relativePath: "gallery/source.png",
      buffer: await readFile(sourcePath),
    },
  ]);

  const manifest = await saveWorkspaceManifest({
    ...imported,
    items: imported.items.map((item) => ({
      ...item,
      profileId: profile.id,
      slotIds: profile.slots.map((candidate) => candidate.id),
      focalPoint: { x: 0.3, y: 0.4 },
    })),
  });

  const jobsDocument = buildJobsDocument({ workspace: manifest, registry });
  await writeWorkspaceJobsText(workspace.id, jobsDocument.text);

  const roundTripped = rehydrateWorkspaceFromJobs({
    workspaceId: workspace.id,
    workspace: manifest,
    registry,
    jobsText: jobsDocument.text,
  });
  expect(roundTripped.items[0]?.slotIds).toEqual(
    profile.slots.map((candidate) => candidate.id),
  );
  expect(roundTripped.items[0]?.profileId).toBe(profile.id);

  const inputPath = await resolveWorkspaceItemInputPath(
    workspace.id,
    roundTripped.items[0]!.sourcePath,
  );
  const previewTarget = resolvePreviewTarget({
    workspace: roundTripped,
    registry,
    itemId: roundTripped.items[0]!.id,
    slotId: slot.id,
  });
  const preview = await renderPreview({
    inputPath,
    relFile: previewTarget.item.sourcePath,
    outJob: {
      name: previewTarget.slot.id,
      ratio: previewTarget.slot.ratio,
      mp: previewTarget.slot.mp,
      format: previewTarget.slot.format,
      quality: previewTarget.slot.quality,
    },
    defaults: mergeDefaults(STUDIO_JOB_DEFAULTS),
    focalPoint: previewTarget.item.focalPoint,
    context: "integration-preview",
  });

  const result = await executeJobs({
    jobsPath: getWorkspacePaths(workspace.id).jobsPath,
  });
  expect(result.outputs.length).toBe(profile.slots.length);

  const processedMeta = await sharp(await readFile(result.outputs[0]!)).metadata();
  expect(preview.plan.cropFit.out.w).toBe(processedMeta.width);
  expect(preview.plan.cropFit.out.h).toBe(processedMeta.height);

  const persistedManifest = await readWorkspaceManifest(workspace.id);
  expect(persistedManifest.items[0]?.focalPoint?.x).toBe(0.3);
});

test("preview service rejects invalid interactions without active selection", () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());

  expect(() =>
    resolvePreviewTarget({
      workspace: {
        id: "workspace",
        title: "Workspace",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        importsDir: "imports",
        jobsFile: "jobs.json",
        processedDir: "processed",
        items: [],
      },
      registry,
    }),
  ).toThrow(/Preview requires an active item and slot/);
});
