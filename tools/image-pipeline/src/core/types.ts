import type { CropFitResult, FocalPoint } from "../cropAndFitToMP";

export type { FocalPoint } from "../cropAndFitToMP";

export type OutputFormat = "webp" | "jpeg";

export type OutputJob = {
  name?: string;
  ratio: string | number;
  mp: number;
  format?: OutputFormat;
  quality?: number;
};

export type OutputJobWithId = OutputJob & {
  id: string;
  label: string;
};

export type ImageJob = {
  file: string;
  focalPoint?: FocalPoint;
  outputs?: OutputJob[];
};

export type Defaults = {
  format?: OutputFormat;
  quality?: number;
  alignTo?: number;
  capToBase?: boolean;
  outputs?: OutputJob[];
};

export type CollisionPolicy = "error" | "skip" | "suffix" | "replace";

export type JobConfig = {
  name?: string;
  inputDir: string;
  outputDir?: string;
  jobSubdir?: boolean;
  preserveFolders?: boolean;
  collisionPolicy?: CollisionPolicy;
  defaults?: Defaults;
  images: ImageJob[];
};

export type JobsRoot = JobConfig | { jobs: JobConfig[] };

export type ResolvedDefaults = {
  format: OutputFormat;
  quality: number;
  alignTo: number;
  capToBase: boolean;
  outputs?: OutputJob[];
};

export type PlannedOutput = {
  context: string;
  inputPath: string;
  relativeFile: string;
  format: OutputFormat;
  ext: string;
  quality: number;
  ratioTag: string;
  outputName: string | null;
  focalPoint?: FocalPoint;
  cropFit: CropFitResult;
  outDir?: string;
  outPath?: string;
  output: OutputJob;
};

export type ExecuteJobsParams = {
  jobsPath: string;
  dryRun?: boolean;
  logger?: (line: string) => void;
};

export type ExecuteJobsResult = {
  logs: string[];
  outputs: string[];
  skipped: string[];
};
