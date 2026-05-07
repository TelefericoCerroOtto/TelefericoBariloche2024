import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { requireSafePathAtom } from "./path-safety";
import { resolveJobList } from "./pipeline-core";
import type {
  WorkspaceManifest,
  WorkspacePayload,
  WorkspaceSummary,
} from "../studio/types";
import type { JobsRoot } from "./pipeline-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOL_ROOT = path.resolve(__dirname, "../../..");
const STUDIO_ROOT = process.env.IMAGE_PIPELINE_STUDIO_ROOT
  ? path.resolve(process.env.IMAGE_PIPELINE_STUDIO_ROOT)
  : path.join(TOOL_ROOT, ".studio");
const WORKSPACES_ROOT = path.join(STUDIO_ROOT, "workspaces");

function normalizeRelativePath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function isWithinRoot(rootDir: string, candidatePath: string) {
  const relativePath = path.relative(rootDir, candidatePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function resolveWorkspaceScopedPath(params: {
  baseDir: string;
  rawPath: string;
  rootDir: string;
  context: string;
}) {
  const normalizedPath = params.rawPath.replace(/\\/g, "/").trim();
  if (!normalizedPath) {
    throw new Error(`${params.context} must be a non-empty path`);
  }

  const candidatePath = path.resolve(params.baseDir, normalizedPath);
  if (!isWithinRoot(params.rootDir, candidatePath)) {
    throw new Error(
      `${params.context} must stay within the workspace ${path.basename(params.rootDir)} root`,
    );
  }

  return candidatePath;
}

function resolveWorkspaceJobOutputBase(params: {
  outputDir: string;
  processedDir: string;
  jobName: string | undefined;
  jobSubdir: boolean | undefined;
  context: string;
}) {
  if (!(params.jobSubdir ?? true)) {
    return params.outputDir;
  }

  const normalizedJobName = params.jobName?.trim()
    ? requireSafePathAtom(params.jobName, `${params.context}.name`)
    : "job";

  return resolveWorkspaceScopedPath({
    baseDir: params.outputDir,
    rawPath: normalizedJobName,
    rootDir: params.processedDir,
    context: `${params.context}.name`,
  });
}

function toPosixRelative(rootDir: string, targetPath: string) {
  return path.relative(rootDir, targetPath).replace(/\\/g, "/");
}

function createItemId(sourcePath: string) {
  return createHash("sha1").update(sourcePath).digest("hex").slice(0, 12);
}

function isMissingFileError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

export function getWorkspacePaths(workspaceId: string) {
  const workspaceDir = path.join(WORKSPACES_ROOT, workspaceId);

  return {
    workspaceDir,
    manifestPath: path.join(workspaceDir, "workspace.json"),
    importsDir: path.join(workspaceDir, "imports"),
    jobsPath: path.join(workspaceDir, "jobs.json"),
    processedDir: path.join(workspaceDir, "processed"),
  };
}

async function ensureWorkspaceDirs(workspaceId: string) {
  const paths = getWorkspacePaths(workspaceId);
  await Promise.all([
    mkdir(WORKSPACES_ROOT, { recursive: true }),
    mkdir(paths.workspaceDir, { recursive: true }),
    mkdir(paths.importsDir, { recursive: true }),
    mkdir(paths.processedDir, { recursive: true }),
  ]);

  return paths;
}

function createManifest(workspaceId: string, title?: string): WorkspaceManifest {
  const now = new Date().toISOString();
  return {
    id: workspaceId,
    title: title ?? `Workspace ${workspaceId.slice(0, 8)}`,
    createdAt: now,
    updatedAt: now,
    importsDir: "imports",
    jobsFile: "jobs.json",
    processedDir: "processed",
    items: [],
  };
}

export async function saveWorkspaceManifest(manifest: WorkspaceManifest) {
  const paths = await ensureWorkspaceDirs(manifest.id);
  const nextManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(
    paths.manifestPath,
    `${JSON.stringify(nextManifest, null, 2)}\n`,
    "utf8",
  );

  return nextManifest;
}

export async function createWorkspace(title?: string) {
  const workspaceId = randomUUID();
  const manifest = createManifest(workspaceId, title);
  await saveWorkspaceManifest(manifest);

  return manifest;
}

export async function readWorkspaceManifest(workspaceId: string) {
  const paths = getWorkspacePaths(workspaceId);
  const raw = await readFile(paths.manifestPath, "utf8");
  return JSON.parse(raw) as WorkspaceManifest;
}

async function readWorkspaceManifestIfExists(workspaceId: string) {
  try {
    return await readWorkspaceManifest(workspaceId);
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  await mkdir(WORKSPACES_ROOT, { recursive: true });
  const entries = await readdir(WORKSPACES_ROOT, { withFileTypes: true });
  const summaries = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const manifest = await readWorkspaceManifestIfExists(entry.name);
        if (!manifest) {
          return null;
        }

        return {
          id: manifest.id,
          title: manifest.title,
          updatedAt: manifest.updatedAt,
          itemCount: manifest.items.length,
        } satisfies WorkspaceSummary;
      }),
  );

  return summaries
    .filter((summary): summary is WorkspaceSummary => summary !== null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function updateWorkspace(
  workspaceId: string,
  updater: (manifest: WorkspaceManifest) => WorkspaceManifest,
) {
  const manifest = await readWorkspaceManifest(workspaceId);
  return await saveWorkspaceManifest(updater(manifest));
}

export async function readWorkspaceJobsText(workspaceId: string) {
  const paths = getWorkspacePaths(workspaceId);
  try {
    return await readFile(paths.jobsPath, "utf8");
  } catch {
    return "";
  }
}

export async function writeWorkspaceJobsText(workspaceId: string, jobsText: string) {
  const paths = await ensureWorkspaceDirs(workspaceId);
  await writeFile(paths.jobsPath, jobsText, "utf8");
}

export function assertWorkspaceJobsPathConfinement(
  workspaceId: string,
  root: JobsRoot,
) {
  const { workspaceDir, importsDir, processedDir } = getWorkspacePaths(workspaceId);

  for (const [jobIndex, job] of resolveJobList(root).entries()) {
    const jobContext = `Invalid jobs.json: jobs[${jobIndex}]`;
    const inputDir = resolveWorkspaceScopedPath({
      baseDir: workspaceDir,
      rawPath: job.inputDir,
      rootDir: importsDir,
      context: `${jobContext}.inputDir`,
    });

    const outputDir = resolveWorkspaceScopedPath({
      baseDir: workspaceDir,
      rawPath: job.outputDir ?? "./processed",
      rootDir: processedDir,
      context: `${jobContext}.outputDir`,
    });

    resolveWorkspaceJobOutputBase({
      outputDir,
      processedDir,
      jobName: job.name,
      jobSubdir: job.jobSubdir,
      context: jobContext,
    });

    for (const [imageIndex, image] of job.images.entries()) {
      resolveWorkspaceScopedPath({
        baseDir: inputDir,
        rawPath: image.file,
        rootDir: importsDir,
        context: `${jobContext}.images[${imageIndex}].file`,
      });
    }
  }

  return root;
}

export function resolveWorkspaceSourcePathFromJob(
  workspaceId: string,
  inputDir: string,
  imageFile: string,
) {
  const { workspaceDir, importsDir } = getWorkspacePaths(workspaceId);
  const absoluteInputDir = resolveWorkspaceScopedPath({
    baseDir: workspaceDir,
    rawPath: inputDir,
    rootDir: importsDir,
    context: "Invalid jobs.json: job.inputDir",
  });
  const absoluteFilePath = resolveWorkspaceScopedPath({
    baseDir: absoluteInputDir,
    rawPath: imageFile,
    rootDir: importsDir,
    context: "Invalid jobs.json: image.file",
  });

  return toPosixRelative(importsDir, absoluteFilePath);
}

export async function getWorkspacePayload(
  workspaceId: string,
): Promise<WorkspacePayload> {
  const [workspace, jobsText] = await Promise.all([
    readWorkspaceManifest(workspaceId),
    readWorkspaceJobsText(workspaceId),
  ]);

  return {
    workspace,
    jobsText,
  };
}

export async function importWorkspaceFiles(
  workspaceId: string,
  files: Array<{ relativePath: string; buffer: Buffer }>,
) {
  const paths = await ensureWorkspaceDirs(workspaceId);
  const manifest = await readWorkspaceManifest(workspaceId);
  const bySourcePath = new Map(
    manifest.items.map((item) => [item.sourcePath, { ...item }]),
  );

  for (const file of files) {
    const relativePath = normalizeRelativePath(file.relativePath);
    if (!relativePath) {
      continue;
    }

    const targetPath = path.join(paths.importsDir, relativePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, file.buffer);

    const existing = bySourcePath.get(relativePath);
    bySourcePath.set(relativePath, {
      id: existing?.id ?? createItemId(relativePath),
      sourcePath: relativePath,
      displayName: path.basename(relativePath),
      groupPath:
        path.posix.dirname(relativePath) === "."
          ? "root"
          : path.posix.dirname(relativePath),
      focalPoint: existing?.focalPoint,
      profileId: existing?.profileId,
      slotIds: existing?.slotIds ?? [],
    });
  }

  return await saveWorkspaceManifest({
    ...manifest,
    items: [...bySourcePath.values()].sort((a, b) =>
      a.sourcePath.localeCompare(b.sourcePath),
    ),
  });
}

export async function resolveWorkspaceItemInputPath(
  workspaceId: string,
  sourcePath: string,
) {
  const { importsDir } = getWorkspacePaths(workspaceId);
  return resolveWorkspaceScopedPath({
    baseDir: importsDir,
    rawPath: normalizeRelativePath(sourcePath),
    rootDir: importsDir,
    context: "Invalid workspace item sourcePath",
  });
}

export async function workspaceExists(workspaceId: string) {
  try {
    await stat(getWorkspacePaths(workspaceId).manifestPath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteWorkspace(workspaceId: string) {
  const { workspaceDir } = getWorkspacePaths(workspaceId);
  await rm(workspaceDir, { recursive: true, force: true });
}
