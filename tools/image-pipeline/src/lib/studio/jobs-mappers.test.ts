import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { resolveJobList } from "../server/pipeline-core";
import { createRegistryFromSeedProfiles } from "./registry-mappers";
import {
  buildJobsDocument,
  rehydrateWorkspaceFromJobs,
  validateJobsDocument,
} from "./jobs-mappers";
import type { SlotProfileRegistry, WorkspaceManifest } from "./types";

function createRegistry(): SlotProfileRegistry {
  return createRegistryFromSeedProfiles(createSeedProfiles());
}

function createWorkspace(registry: SlotProfileRegistry): WorkspaceManifest {
  const now = new Date().toISOString();
  const profile = registry.profiles[0]!;

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
        id: "item-1",
        sourcePath: "gallery/image-1.jpg",
        displayName: "image-1.jpg",
        groupPath: "gallery",
        profileId: profile.id,
        slotIds: profile.slots.map((slot) => slot.id),
        focalPoint: { x: 0.3, y: 0.4 },
      },
    ],
  };
}

test("jobs validation rejects semantically invalid canonical payloads", () => {
  const registry = createRegistry();

  expect(() => validateJobsDocument('{"jobs":[{"name":"broken"}]}', registry)).toThrow(
    /inputDir must be a non-empty string/,
  );

  expect(() =>
      validateJobsDocument(
        JSON.stringify({
          jobs: [
            {
              name: "broken",
              inputDir: "./imports",
              outputDir: "./processed",
              images: [
                {
                  file: "gallery/source.png",
                  outputs: [{ ratio: "1:1", mp: 1 }],
                },
              ],
            },
          ],
        }),
        registry,
      ),
  ).toThrow(/must be a non-empty string/);

  expect(() =>
      validateJobsDocument(
        JSON.stringify({
          jobs: [
            {
              name: "broken",
              inputDir: "./imports",
              outputDir: "./processed",
              images: [
                {
                  file: "gallery/source.png",
                  outputs: [{ name: "unknown-slot", ratio: "1:1", mp: 1 }],
                },
              ],
            },
          ],
        }),
        registry,
      ),
  ).toThrow(/known Studio slot id/);
});

test("duplicate technical settings still preserve distinct slot identifiers", () => {
  const registry: SlotProfileRegistry = {
    version: 1,
    updatedAt: new Date().toISOString(),
    profiles: [
      {
        id: "custom-profile",
        label: "Custom profile",
        slots: [
          {
            id: "slot-alpha",
            label: "Alpha",
            ratio: "4:5",
            mp: 1.5,
            quality: 82,
            format: "webp",
          },
          {
            id: "slot-beta",
            label: "Beta",
            ratio: "4:5",
            mp: 1.5,
            quality: 82,
            format: "webp",
          },
        ],
      },
    ],
  };

  const workspace: WorkspaceManifest = {
    id: "workspace",
    title: "Workspace",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    importsDir: "imports",
    jobsFile: "jobs.json",
    processedDir: "processed",
    items: [
      {
        id: "item-1",
        sourcePath: "gallery/image.jpg",
        displayName: "image.jpg",
        groupPath: "gallery",
        profileId: "custom-profile",
        slotIds: ["slot-alpha", "slot-beta"],
      },
    ],
  };

  const document = buildJobsDocument({ workspace, registry });
  const outputNames = resolveJobList(document.root)[0]?.images[0]?.outputs?.map(
    (output) => output.name,
  );

  expect(outputNames).toEqual(["slot-alpha", "slot-beta"]);
});

test("rehydrating edited jobs reflects slots, presets, and focal points", () => {
  const registry = createRegistry();
  const workspace = createWorkspace(registry);
  const currentProfile = registry.profiles[0]!;
  const nextProfile = registry.profiles[1]!;
  const document = buildJobsDocument({ workspace, registry });
  const edited = JSON.parse(document.text) as {
    jobs: Array<{
      images: Array<{
        outputs: Array<{ name: string; ratio: string; mp: number; quality?: number }>;
        focalPoint?: { x: number; y: number };
      }>;
    }>;
  };

  edited.jobs[0]!.images[0]!.outputs = nextProfile.slots.map((slot) => ({
    name: slot.id,
    ratio: String(slot.ratio),
    mp: slot.mp,
    quality: slot.quality,
  }));
  edited.jobs[0]!.images[0]!.focalPoint = { x: 0.8, y: 0.1 };

  const rehydrated = rehydrateWorkspaceFromJobs({
    workspaceId: workspace.id,
    workspace,
    registry,
    jobsText: validateJobsDocument(`${JSON.stringify(edited, null, 2)}\n`, registry).text,
  });

  expect(rehydrated.items[0]?.slotIds).toEqual(
    nextProfile.slots.map((slot) => slot.id),
  );
  expect(rehydrated.items[0]?.profileId).toBe(nextProfile.id);
  expect(rehydrated.items[0]?.focalPoint).toEqual({ x: 0.8, y: 0.1 });
  expect(rehydrated.items[0]?.profileId).not.toBe(currentProfile.id);
});

test("rehydrating edited jobs clears assignment state omitted from canonical jobs", () => {
  const registry = createRegistry();
  const profile = registry.profiles[0]!;
  const workspace = createWorkspace(registry);
  const document = buildJobsDocument({
    workspace: {
      ...workspace,
      items: [
        ...workspace.items,
        {
          id: "item-2",
          sourcePath: "gallery/image-2.jpg",
          displayName: "image-2.jpg",
          groupPath: "gallery",
          profileId: profile.id,
          slotIds: profile.slots.map((slot) => slot.id),
          focalPoint: { x: 0.2, y: 0.7 },
        },
      ],
    },
    registry,
  });
  const edited = JSON.parse(document.text) as {
    jobs: Array<{
      images: Array<{
        file: string;
        outputs: Array<{ name: string; ratio: string; mp: number; quality?: number }>;
        focalPoint?: { x: number; y: number };
      }>;
    }>;
  };

  edited.jobs[0]!.images = edited.jobs[0]!.images.filter(
    (image) => image.file !== "gallery/image-2.jpg",
  );

  const rehydrated = rehydrateWorkspaceFromJobs({
    workspaceId: workspace.id,
    workspace: {
      ...workspace,
      items: [
        ...workspace.items,
        {
          id: "item-2",
          sourcePath: "gallery/image-2.jpg",
          displayName: "image-2.jpg",
          groupPath: "gallery",
          profileId: profile.id,
          slotIds: profile.slots.map((slot) => slot.id),
          focalPoint: { x: 0.2, y: 0.7 },
        },
      ],
    },
    registry,
    jobsText: validateJobsDocument(`${JSON.stringify(edited, null, 2)}\n`, registry).text,
  });

  expect(rehydrated.items).toHaveLength(2);
  expect(rehydrated.items[1]).toMatchObject({
    id: "item-2",
    sourcePath: "gallery/image-2.jpg",
    slotIds: [],
    profileId: undefined,
    focalPoint: undefined,
  });
});
