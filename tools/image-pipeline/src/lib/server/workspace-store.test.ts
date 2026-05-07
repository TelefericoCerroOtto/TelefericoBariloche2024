import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, expect, test, vi } from "vitest";

import type { WorkspaceManifest } from "../studio/types";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

test("listWorkspaces skips workspace directories without manifests", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "image-pipeline-studio-root-"));

  const studioRoot = path.join(tempDir, ".studio");
  const workspacesRoot = path.join(studioRoot, "workspaces");
  await mkdir(workspacesRoot, { recursive: true });

  await mkdir(path.join(workspacesRoot, "orphan-workspace"), { recursive: true });

  const validWorkspaceId = "valid-workspace";
  const validWorkspaceDir = path.join(workspacesRoot, validWorkspaceId);
  await mkdir(validWorkspaceDir, { recursive: true });

  const manifest: WorkspaceManifest = {
    id: validWorkspaceId,
    title: "Valid workspace",
    createdAt: "2026-05-06T00:00:00.000Z",
    updatedAt: "2026-05-06T00:00:00.000Z",
    importsDir: "imports",
    jobsFile: "jobs.json",
    processedDir: "processed",
    items: [],
  };
  await writeFile(
    path.join(validWorkspaceDir, "workspace.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  vi.stubEnv("IMAGE_PIPELINE_STUDIO_ROOT", studioRoot);
  const { listWorkspaces } = await import("./workspace-store");

  await expect(listWorkspaces()).resolves.toEqual([
    {
      id: validWorkspaceId,
      title: "Valid workspace",
      updatedAt: "2026-05-06T00:00:00.000Z",
      itemCount: 0,
    },
  ]);
});
