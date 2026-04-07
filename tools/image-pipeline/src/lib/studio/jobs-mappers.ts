import path from "node:path";

import {
  parseJobsRoot,
  resolveJobList,
  serializeSlotOutput,
  validateJobsRoot,
} from "../server/pipeline-core";
import { resolveWorkspaceSourcePathFromJob } from "../server/workspace-store";
import { findSlotById, inferProfileIdFromSlotIds } from "./registry-mappers";
import type { JobsRoot } from "../server/pipeline-core";
import type {
  JobsDocument,
  SlotProfileRegistry,
  WorkspaceItem,
  WorkspaceManifest,
} from "./types";

export const STUDIO_JOB_DEFAULTS = {
  format: "webp" as const,
  quality: 82,
  alignTo: 2,
  capToBase: true,
};

export function buildJobsDocument(params: {
  workspace: WorkspaceManifest;
  registry: SlotProfileRegistry;
}): JobsDocument {
  const { workspace, registry } = params;

  const images = workspace.items
    .filter((item) => item.slotIds.length > 0)
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath))
    .map((item) => ({
      file: item.sourcePath,
      focalPoint: item.focalPoint,
      outputs: item.slotIds
        .map((slotId) => findSlotById(registry, slotId))
        .filter((slot): slot is NonNullable<typeof slot> => Boolean(slot))
        .map((slot) => serializeSlotOutput(slot)),
    }));

  const root: JobsRoot = {
    jobs: [
      {
        name: workspace.title || workspace.id,
        inputDir: "./imports",
        outputDir: "./processed",
        jobSubdir: false,
        preserveFolders: true,
        collisionPolicy: "suffix",
        defaults: STUDIO_JOB_DEFAULTS,
        images,
      },
    ],
  };

  validateJobsRoot(root, {
    requireNamedOutputs: true,
    knownOutputNames: new Set(
      registry.profiles.flatMap((profile) => profile.slots.map((slot) => slot.id)),
    ),
  });

  return {
    root,
    text: `${JSON.stringify(root, null, 2)}\n`,
  };
}

function createWorkspaceItem(sourcePath: string): WorkspaceItem {
  return {
    id: sourcePath,
    sourcePath,
    displayName: path.basename(sourcePath),
    groupPath: path.posix.dirname(sourcePath) === "." ? "root" : path.posix.dirname(sourcePath),
    slotIds: [],
  };
}

export function validateJobsDocument(
  text: string,
  registry: SlotProfileRegistry,
): JobsDocument {
  const root = validateJobsRoot(parseJobsRoot(text), {
    requireNamedOutputs: true,
    knownOutputNames: new Set(
      registry.profiles.flatMap((profile) => profile.slots.map((slot) => slot.id)),
    ),
  });

  return {
    root,
    text: `${JSON.stringify(root, null, 2)}\n`,
  };
}

export function rehydrateWorkspaceFromJobs(params: {
  workspaceId: string;
  workspace: WorkspaceManifest;
  registry: SlotProfileRegistry;
  jobsText: string;
}): WorkspaceManifest {
  const { workspaceId, workspace, registry, jobsText } = params;
  const root = parseJobsRoot(jobsText);
  const jobList = resolveJobList(root);
  const bySourcePath = new Map<string, WorkspaceItem>(
    workspace.items.map((item) => [
      item.sourcePath,
      {
        ...item,
        focalPoint: undefined,
        profileId: undefined,
        slotIds: [],
      } satisfies WorkspaceItem,
    ]),
  );

  for (const job of jobList) {
    for (const image of job.images) {
      const sourcePath = resolveWorkspaceSourcePathFromJob(
        workspaceId,
        job.inputDir,
        image.file,
      );
      const slotIds = (image.outputs ?? [])
        .map((output) => output.name?.trim())
        .filter((slotId): slotId is string => Boolean(slotId));

      const item = bySourcePath.get(sourcePath) ?? createWorkspaceItem(sourcePath);
      item.focalPoint = image.focalPoint;
      item.slotIds = slotIds;
      item.profileId = inferProfileIdFromSlotIds(registry, slotIds);
      bySourcePath.set(sourcePath, item);
    }
  }

  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    items: [...bySourcePath.values()].sort((a, b) =>
      a.sourcePath.localeCompare(b.sourcePath),
    ),
  };
}
