import fs from "node:fs/promises";
import path from "node:path";

import type {
  Defaults,
  ImageJob,
  JobConfig,
  JobsRoot,
  OutputJob,
  OutputJobWithId,
  ResolvedDefaults,
} from "./types";

type ValidateJobsOptions = {
  requireNamedOutputs?: boolean;
  knownOutputNames?: Set<string>;
};

const KNOWN_NAME_EXTS = new Set([
  ".webp",
  ".jpg",
  ".jpeg",
  ".png",
  ".tif",
  ".tiff",
  ".avif",
]);
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const PATH_SEPARATOR_PATTERN = /[\\/]/;

export function parseJobsRoot(raw: string): JobsRoot {
  return JSON.parse(raw) as JobsRoot;
}

function isWithinRoot(rootDir: string, candidatePath: string) {
  const relativePath = path.relative(rootDir, candidatePath);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function requireSafePathAtom(value: string, context: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`Invalid jobs.json: ${context} must be a non-empty string`);
  }

  if (PATH_SEPARATOR_PATTERN.test(trimmed)) {
    throw new Error(`Invalid jobs.json: ${context} contains unsafe path separators`);
  }

  if (trimmed === "." || trimmed === "..") {
    throw new Error(`Invalid jobs.json: ${context} contains an unsafe traversal segment`);
  }

  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    throw new Error(`Invalid jobs.json: ${context} contains unsafe control characters`);
  }

  return trimmed;
}

function resolvePathWithinRoot(params: {
  baseDir: string;
  rawPath: string;
  rootDir: string;
  context: string;
}) {
  const candidatePath = path.resolve(params.baseDir, params.rawPath);

  if (!isWithinRoot(params.rootDir, candidatePath)) {
    throw new Error(
      `Invalid jobs.json: ${params.context} must stay within the configured output root`,
    );
  }

  return candidatePath;
}

function assertNonEmptyString(value: unknown, context: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid jobs.json: ${context} must be a non-empty string`);
  }
}

function assertOptionalBoolean(value: unknown, context: string) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new Error(`Invalid jobs.json: ${context} must be boolean`);
  }
}

function assertOptionalFormat(value: unknown, context: string) {
  if (value !== undefined && value !== "webp" && value !== "jpeg") {
    throw new Error(`Invalid jobs.json: ${context} must be "webp"|"jpeg"`);
  }
}

function assertOptionalQuality(value: unknown, context: string) {
  if (value === undefined) {
    return;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 1 ||
    value > 100
  ) {
    throw new Error(`Invalid jobs.json: ${context} must be number in [1..100]`);
  }
}

function assertOptionalAlignTo(value: unknown, context: string) {
  if (value === undefined) {
    return;
  }

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 1 ||
    !Number.isInteger(value)
  ) {
    throw new Error(`Invalid jobs.json: ${context} must be an integer >= 1`);
  }
}

function assertValidFocalPoint(value: unknown, context: string) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "object" || value === null) {
    throw new Error(`Invalid jobs.json: ${context} must be an object`);
  }

  const focalPoint = value as { x?: unknown; y?: unknown };
  for (const axis of ["x", "y"] as const) {
    const coordinate = focalPoint[axis];
    if (
      typeof coordinate !== "number" ||
      !Number.isFinite(coordinate) ||
      coordinate < 0 ||
      coordinate > 1
    ) {
      throw new Error(
        `Invalid jobs.json: ${context}.${axis} must be number in [0..1]`,
      );
    }
  }
}

function assertOptionalCollisionPolicy(value: unknown, context: string) {
  if (
    value !== undefined &&
    value !== "error" &&
    value !== "skip" &&
    value !== "suffix" &&
    value !== "replace"
  ) {
    throw new Error(
      `Invalid jobs.json: ${context} must be "error"|"skip"|"suffix"|"replace"`,
    );
  }
}

function assertValidDefaults(value: unknown, context: string) {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "object" || value === null) {
    throw new Error(`Invalid jobs.json: ${context} must be an object`);
  }

  const defaults = value as Defaults;
  assertOptionalFormat(defaults.format, `${context}.format`);
  assertOptionalQuality(defaults.quality, `${context}.quality`);
  assertOptionalAlignTo(defaults.alignTo, `${context}.alignTo`);
  assertOptionalBoolean(defaults.capToBase, `${context}.capToBase`);

  if (defaults.outputs !== undefined) {
    assertValidOutputs(defaults.outputs, context);
  }
}

function assertCanonicalOutputNames(
  outputs: OutputJob[],
  context: string,
  options: ValidateJobsOptions,
) {
  if (!options.requireNamedOutputs) {
    return;
  }

  for (const [index, output] of outputs.entries()) {
    const nameContext = `${context}.outputs[${index}].name`;
    assertNonEmptyString(output.name, nameContext);

    const outputName = output.name!.trim();
    if (options.knownOutputNames && !options.knownOutputNames.has(outputName)) {
      throw new Error(
        `Invalid jobs.json: ${nameContext} must reference a known Studio slot id`,
      );
    }
  }
}

function assertValidImageJob(
  image: ImageJob,
  context: string,
  defaults: ResolvedDefaults,
  options: ValidateJobsOptions,
) {
  assertNonEmptyString(image.file, `${context}.file`);
  assertValidFocalPoint(image.focalPoint, `${context}.focalPoint`);
  const outputs = getEffectiveOutputs(image, defaults);
  assertCanonicalOutputNames(outputs, context, options);
}

function assertValidJobConfig(
  job: JobConfig,
  context: string,
  options: ValidateJobsOptions,
) {
  if (job.name !== undefined && (typeof job.name !== "string" || !job.name.trim())) {
    throw new Error(`Invalid jobs.json: ${context}.name must be a non-empty string`);
  }

  assertNonEmptyString(job.inputDir, `${context}.inputDir`);

  if (job.outputDir !== undefined) {
    assertNonEmptyString(job.outputDir, `${context}.outputDir`);
  }

  assertOptionalBoolean(job.jobSubdir, `${context}.jobSubdir`);
  assertOptionalBoolean(job.preserveFolders, `${context}.preserveFolders`);
  assertOptionalCollisionPolicy(job.collisionPolicy, `${context}.collisionPolicy`);
  assertValidDefaults(job.defaults, `${context}.defaults`);

  if (!Array.isArray(job.images)) {
    throw new Error(`Invalid jobs.json: ${context}.images must be an array`);
  }

  const defaults = mergeDefaults(job.defaults);
  job.images.forEach((image, index) => {
    assertValidImageJob(image, `${context}.images[${index}]`, defaults, options);
  });
}

export function validateJobsRoot(
  root: JobsRoot,
  options: ValidateJobsOptions = {},
): JobsRoot {
  if (typeof root !== "object" || root === null) {
    throw new Error("Invalid jobs.json: root must be an object");
  }

  if ("jobs" in root) {
    if (!Array.isArray(root.jobs)) {
      throw new Error('Invalid jobs.json: "jobs" must be an array');
    }

    root.jobs.forEach((job, index) => {
      assertValidJobConfig(job, `jobs[${index}]`, options);
    });

    return root;
  }

  assertValidJobConfig(root, "root", options);
  return root;
}

export async function loadJobsFromFile(jobsPath: string) {
  const absJobsPath = path.resolve(jobsPath);
  const raw = await fs.readFile(absJobsPath, "utf8");
  const root = validateJobsRoot(parseJobsRoot(raw));

  return {
    absJobsPath,
    jobsDir: path.dirname(absJobsPath),
    raw,
    root,
  };
}

export function resolveJobList(root: JobsRoot): JobConfig[] {
  return "jobs" in root ? root.jobs : [root];
}

export function mergeDefaults(job?: Defaults): ResolvedDefaults {
  return {
    format: job?.format ?? "webp",
    quality: job?.quality ?? 82,
    alignTo: job?.alignTo ?? 2,
    capToBase: job?.capToBase ?? true,
    outputs: job?.outputs,
  };
}

export function assertValidOutputs(
  outputs: OutputJob[] | undefined,
  context: string,
): asserts outputs is OutputJob[] {
  if (!Array.isArray(outputs) || outputs.length === 0) {
    throw new Error(
      `Invalid jobs.json: ${context} has no outputs. Provide "defaults.outputs" or "${context}.outputs"`,
    );
  }

  for (const [index, output] of outputs.entries()) {
    if (output.name !== undefined && typeof output.name !== "string") {
      throw new Error(
        `Invalid jobs.json: ${context}.outputs[${index}].name must be string`,
      );
    }

    normalizeOutputName(output.name, `${context}.outputs[${index}].name`, () => {});

    const ratioOk =
      typeof output.ratio === "string" || typeof output.ratio === "number";
    if (!ratioOk) {
      throw new Error(
        `Invalid jobs.json: ${context}.outputs[${index}].ratio must be string|number`,
      );
    }

    if (
      typeof output.mp !== "number" ||
      !Number.isFinite(output.mp) ||
      output.mp <= 0
    ) {
      throw new Error(
        `Invalid jobs.json: ${context}.outputs[${index}].mp must be a number > 0`,
      );
    }

    if (
      output.format !== undefined &&
      output.format !== "webp" &&
      output.format !== "jpeg"
    ) {
      throw new Error(
        `Invalid jobs.json: ${context}.outputs[${index}].format must be "webp"|"jpeg"`,
      );
    }

    if (output.quality !== undefined) {
      const quality = output.quality;
      if (
        typeof quality !== "number" ||
        !Number.isFinite(quality) ||
        quality < 1 ||
        quality > 100
      ) {
        throw new Error(
          `Invalid jobs.json: ${context}.outputs[${index}].quality must be number in [1..100]`,
        );
      }
    }
  }
}

export function getEffectiveOutputs(
  image: ImageJob,
  defaults: ResolvedDefaults,
): OutputJob[] {
  const outputs = image.outputs ?? defaults.outputs;
  assertValidOutputs(outputs, `images[file="${image.file}"]`);
  return outputs;
}

export async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function resolveOutputBase(params: {
  jobsDir: string;
  job: JobConfig;
}): string {
  const { jobsDir, job } = params;
  const base = path.resolve(jobsDir, job.outputDir ?? "./processed");
  const jobSubdir = job.jobSubdir ?? true;

  if (!jobSubdir) {
    return base;
  }

  const name = job.name?.trim() ? requireSafePathAtom(job.name, "job.name") : "job";
  return resolvePathWithinRoot({
    baseDir: base,
    rawPath: name,
    rootDir: base,
    context: "job.name",
  });
}

export function normalizeOutputName(
  rawName: string | undefined,
  context: string,
  warn: (line: string) => void = console.warn,
): string | null {
  if (typeof rawName !== "string") {
    return null;
  }

  const trimmed = rawName.trim();
  if (!trimmed) {
    return null;
  }

  const ext = path.extname(trimmed);
  if (!ext) {
    return requireSafePathAtom(trimmed, context);
  }

  const extLower = ext.toLowerCase();
  if (!KNOWN_NAME_EXTS.has(extLower)) {
    return requireSafePathAtom(trimmed, context);
  }

  const base = trimmed.slice(0, -ext.length).trim();
  if (!base) {
    warn(
      `⚠️  Output name includes extension at ${context} and no base name remains. Falling back to default naming.`,
    );
    return null;
  }

  warn(
    `⚠️  Output name includes extension at ${context}: "${trimmed}". Using "${base}" instead.`,
  );
  return requireSafePathAtom(base, context);
}

export function buildOutPath(params: {
  outputBase: string;
  relFile: string;
  ratioTag: string;
  ext: string;
  preserveFolders: boolean;
  outputName?: string | null;
}) {
  const { outputBase, relFile, ratioTag, ext, preserveFolders, outputName } =
    params;
  const parsed = path.parse(relFile);

  const outDir = preserveFolders
    ? path.join(outputBase, parsed.dir)
    : outputBase;

  const baseName = outputName ? `${parsed.name}-${outputName}` : `${parsed.name}-${ratioTag}`;
  const fileName = `${baseName}.${ext}`;
  const outPath = path.join(outDir, fileName);

  return { outDir, outPath };
}

export async function resolveCollision(params: {
  outPath: string;
  policy: JobConfig["collisionPolicy"] extends infer Policy
    ? Exclude<Policy, undefined>
    : never;
  reserved?: Set<string>;
}) {
  const { outPath, policy, reserved } = params;

  const isTaken = async (candidate: string) => {
    if (reserved?.has(candidate)) {
      return true;
    }

    return await fileExists(candidate);
  };

  if (!(await isTaken(outPath))) {
    return outPath;
  }

  if (policy === "replace") {
    return outPath;
  }

  if (policy === "skip") {
    return null;
  }

  if (policy === "error") {
    throw new Error(`Output collision: file already exists: ${outPath}`);
  }

  const dir = path.dirname(outPath);
  const ext = path.extname(outPath);
  const base = path.basename(outPath, ext);

  for (let index = 2; index < 10_000; index++) {
    const candidate = path.join(dir, `${base}-${index}${ext}`);
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }

  throw new Error(`Could not resolve collision for: ${outPath}`);
}

export function serializeSlotOutput(slot: OutputJobWithId): OutputJob {
  return {
    name: slot.id,
    ratio: slot.ratio,
    mp: slot.mp,
    format: slot.format,
    quality: slot.quality,
  };
}
