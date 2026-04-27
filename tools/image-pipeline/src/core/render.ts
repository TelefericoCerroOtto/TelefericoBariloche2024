import path from "node:path";
import sharp from "sharp";

import { cropAndFitToMP, type FocalPoint } from "../cropAndFitToMP";
import { ratioToTag } from "../ratioToTag";
import { orientedSize } from "../sharpUtils";
import {
  buildOutPath,
  ensureDir,
  fileExists,
  getEffectiveOutputs,
  loadJobsFromFile,
  mergeDefaults,
  normalizeOutputName,
  resolveCollision,
  resolveJobList,
  resolveOutputBase,
} from "./jobs";
import type {
  ExecuteJobsParams,
  ExecuteJobsResult,
  OutputJob,
  PlannedOutput,
  ResolvedDefaults,
} from "./types";

function createPipeline(plan: PlannedOutput) {
  let pipeline = sharp(plan.inputPath, { failOn: "none" })
    .rotate()
    .extract({
      left: plan.cropFit.crop.x,
      top: plan.cropFit.crop.y,
      width: plan.cropFit.crop.w,
      height: plan.cropFit.crop.h,
    })
    .resize(plan.cropFit.out.w, plan.cropFit.out.h, {
      fit: "fill",
      withoutEnlargement: true,
    });

  pipeline =
    plan.format === "webp"
      ? pipeline.webp({ quality: plan.quality })
      : pipeline.jpeg({ quality: plan.quality, mozjpeg: true });

  return pipeline;
}

export async function planOutputRender(params: {
  inputPath: string;
  relFile: string;
  outJob: OutputJob;
  defaults: ResolvedDefaults;
  focalPoint?: FocalPoint;
  outputBase?: string;
  preserveFolders?: boolean;
  context: string;
  warn?: (line: string) => void;
}): Promise<PlannedOutput> {
  const {
    inputPath,
    relFile,
    outJob,
    defaults,
    focalPoint,
    outputBase,
    preserveFolders = true,
    context,
    warn,
  } = params;

  const meta = await sharp(inputPath, { failOn: "none" }).metadata();
  const base = orientedSize(meta);
  const cropFit = cropAndFitToMP(outJob.ratio, outJob.mp, base, focalPoint, {
    alignTo: defaults.alignTo,
    capToBase: defaults.capToBase,
  });

  if (
    cropFit.crop.w <= 0 ||
    cropFit.crop.h <= 0 ||
    cropFit.out.w <= 0 ||
    cropFit.out.h <= 0
  ) {
    throw new Error(
      `Invalid crop/out for ${relFile} ratio=${String(outJob.ratio)}`,
    );
  }

  const format = outJob.format ?? defaults.format;
  const quality = outJob.quality ?? defaults.quality;
  const ext = format === "jpeg" ? "jpg" : format;
  const ratioTag = ratioToTag(outJob.ratio);
  const outputName = normalizeOutputName(outJob.name, `${context}.name`, warn);

  const destination = outputBase
    ? buildOutPath({
        outputBase,
        relFile,
        ratioTag,
        ext,
        preserveFolders,
        outputName,
      })
    : undefined;

  return {
    context,
    inputPath,
    relativeFile: relFile,
    format,
    ext,
    quality,
    ratioTag,
    outputName,
    focalPoint,
    cropFit,
    outDir: destination?.outDir,
    outPath: destination?.outPath,
    output: outJob,
  };
}

export async function renderPreview(params: {
  inputPath: string;
  relFile: string;
  outJob: OutputJob;
  defaults: ResolvedDefaults;
  focalPoint?: FocalPoint;
  context: string;
}): Promise<{ buffer: Buffer; contentType: string; plan: PlannedOutput }> {
  const plan = await planOutputRender(params);
  const buffer = await createPipeline(plan).toBuffer();

  return {
    buffer,
    contentType: plan.format === "webp" ? "image/webp" : "image/jpeg",
    plan,
  };
}

export async function writePlanToFile(plan: PlannedOutput, outPath?: string) {
  const targetPath = outPath ?? plan.outPath;
  if (!targetPath) {
    throw new Error(`Missing output path for ${plan.context}`);
  }

  await ensureDir(path.dirname(targetPath));
  await createPipeline(plan).toFile(targetPath);
  return targetPath;
}

export async function executeJobs(
  params: ExecuteJobsParams,
): Promise<ExecuteJobsResult> {
  const { jobsPath, dryRun = false, logger = console.log } = params;
  const logs: string[] = [];
  const outputs: string[] = [];
  const skipped: string[] = [];
  const warn = (line: string) => {
    logs.push(line);
    logger(line);
  };

  const { jobsDir, root } = await loadJobsFromFile(jobsPath);
  const jobList = resolveJobList(root);

  for (const job of jobList) {
    const inputDir = path.resolve(jobsDir, job.inputDir);
    const outputBase = resolveOutputBase({ jobsDir, job });
    const preserveFolders = job.preserveFolders ?? true;
    const collisionPolicy = job.collisionPolicy ?? "error";
    const defaults = mergeDefaults(job.defaults);

    await ensureDir(outputBase);
    const reservedOutputs = new Set<string>();

    for (const line of [
      `\n=== Job: ${job.name ?? "(unnamed)"} ===`,
      `inputDir:  ${inputDir}`,
      `outputDir: ${outputBase}`,
      `policy:    ${collisionPolicy}, preserveFolders=${preserveFolders}`,
    ]) {
      logs.push(line);
      logger(line);
    }

    for (const image of job.images) {
      const inputPath = path.join(inputDir, image.file);
      if (!(await fileExists(inputPath))) {
        const line = `⚠️  Missing file: ${inputPath} (skipping)`;
        skipped.push(line);
        logs.push(line);
        logger(line);
        continue;
      }

      const outputsForImage = getEffectiveOutputs(image, defaults);
      for (const [outIndex, outJob] of outputsForImage.entries()) {
        const context = `images[file="${image.file}"].outputs[${outIndex}]`;

        let plan: PlannedOutput;
        try {
          plan = await planOutputRender({
            inputPath,
            relFile: image.file,
            outJob,
            defaults,
            focalPoint: image.focalPoint,
            outputBase,
            preserveFolders,
            context,
            warn,
          });
        } catch (error) {
          const line = `⚠️  ${error instanceof Error ? error.message : String(error)} (skipping)`;
          skipped.push(line);
          logs.push(line);
          logger(line);
          continue;
        }

        const finalOutPath = await resolveCollision({
          outPath: plan.outPath!,
          policy: collisionPolicy,
          reserved: reservedOutputs,
        });

        const logLine = `[${image.file}] ratio=${String(outJob.ratio)} -> out=${plan.cropFit.out.w}x${plan.cropFit.out.h} (${plan.cropFit.mpOut.toFixed(3)}MP) => ${finalOutPath ?? "(skipped)"}`;

        if (!finalOutPath) {
          const line = `↷ SKIP: ${logLine}`;
          skipped.push(line);
          logs.push(line);
          logger(line);
          continue;
        }

        reservedOutputs.add(finalOutPath);

        if (dryRun) {
          const line = `🧪 DRY: ${logLine}`;
          outputs.push(finalOutPath);
          logs.push(line);
          logger(line);
          continue;
        }

        await writePlanToFile(plan, finalOutPath);
        outputs.push(finalOutPath);
        const line = `✅ ${logLine}`;
        logs.push(line);
        logger(line);
      }
    }
  }

  return { logs, outputs, skipped };
}
