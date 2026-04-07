import { readdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { ratioToTag } from "../ratioToTag";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Raíz de tools/image-pipeline desde src/scripts
const toolRoot = path.resolve(__dirname, "../..");

const ALLOWED_EXTS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "tif",
  "tiff",
  "avif",
]);

type OutputTemplate = {
  ratio: string;
  mp: number;
  quality: number;
};

export type SeedSlot = OutputTemplate & {
  id: string;
  label: string;
};

export type SeedProfile = {
  id: string;
  label: string;
  slots: SeedSlot[];
};

type ImageConfig = {
  file: string;
  outputs: OutputTemplate[];
};

type JobDefaults = {
  format: "webp" | "jpeg";
  alignTo: number;
  capToBase: boolean;
};

type JobConfig = {
  name: string;
  inputDir: string;
  outputDir: string;
  jobSubdir: boolean;
  preserveFolders: boolean;
  collisionPolicy: "suffix";
  defaults: JobDefaults;
  images: ImageConfig[];
};

type JobsFile = {
  jobs: JobConfig[];
};

export const COMPONENT_OUTPUTS = {
  hero: [
    { ratio: "21:9", mp: 2.8, quality: 86 },
    { ratio: "3:4", mp: 1.6, quality: 84 },
  ],
  carrousel: [
    { ratio: "21:9", mp: 2.8, quality: 84 },
    { ratio: "4:5", mp: 1.5, quality: 82 },
  ],
  card: [
    { ratio: "24:7", mp: 1.9, quality: 84 },
    { ratio: "4:3", mp: 1.1, quality: 82 },
  ],
  poster: [
    { ratio: "21:9", mp: 2.8, quality: 82 },
    { ratio: "9:16", mp: 2.1, quality: 80 },
  ],
  panoramic: [
    { ratio: "21:9", mp: 2.8, quality: 80 },
    { ratio: "2:3", mp: 1.8, quality: 78 },
  ],
  single: [
    { ratio: "1:1", mp: 2.0, quality: 84 },
    { ratio: "2:3", mp: 2.2, quality: 82 },
  ],
  spotlight: [
    { ratio: "4:3", mp: 1.5, quality: 84 },
    { ratio: "2:1", mp: 1.0, quality: 82 },
  ],
  horizontal: [
    { ratio: "1:1", mp: 2.0, quality: 82 },
    { ratio: "4:5", mp: 1.2, quality: 80 },
  ],
  ladder: [
    { ratio: "9:16", mp: 2.1, quality: 82 },
    { ratio: "3:4", mp: 1.2, quality: 80 },
  ],
  masonrys0: [{ ratio: "9:16", mp: 2.1, quality: 82 }],
  masonrys1: [{ ratio: "1:1", mp: 1.4, quality: 78 }],
  miniaturess0: [{ ratio: "1:1", mp: 2.0, quality: 82 }],
  miniaturess1: [{ ratio: "4:3", mp: 0.7, quality: 78 }],
  cascades0: [{ ratio: "4:5", mp: 1.8, quality: 82 }],
  cascades1: [{ ratio: "16:11", mp: 1.4, quality: 78 }],
  double: [{ ratio: "1:1", mp: 2.0, quality: 82 }],
} as const satisfies Record<string, readonly OutputTemplate[]>;

type ComponentKey = keyof typeof COMPONENT_OUTPUTS;

function isComponentKey(value: string): value is ComponentKey {
  return Object.prototype.hasOwnProperty.call(COMPONENT_OUTPUTS, value);
}

function toLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (part) => part.toUpperCase());
}

export function createSeedProfiles(): SeedProfile[] {
  return Object.entries(COMPONENT_OUTPUTS).map(([profileId, outputs]) => ({
    id: profileId,
    label: toLabel(profileId),
    slots: outputs.map((output, index) => ({
      id: `${profileId}-${ratioToTag(output.ratio)}-${index + 1}`,
      label: `${toLabel(profileId)} ${output.ratio}`,
      ratio: output.ratio,
      mp: output.mp,
      quality: output.quality,
    })),
  }));
}

function parseBaseDirArg(argv: string[]): string | undefined {
  const flagIndex = argv.findIndex((arg) => arg === "--baseDir");
  if (flagIndex !== -1) {
    return argv[flagIndex + 1];
  }
  const inline = argv.find((arg) => arg.startsWith("--baseDir="));
  if (inline) {
    return inline.slice("--baseDir=".length);
  }
  return undefined;
}

function normalizeBaseDir(baseDir: string): string {
  const normalized = baseDir.replace(/\\/g, "/");
  const withoutLeading = normalized.replace(/^\.\/+/, "");
  return withoutLeading.replace(/\/+$/, "");
}

function toJsonInputDir(baseDir: string, subdir: string): string {
  const normalized = normalizeBaseDir(baseDir);
  const parts = normalized ? [normalized, subdir] : [subdir];
  return `./${parts.join("/")}`;
}

function warnInvalid(filename: string, reason: string): void {
  console.warn(`[build-jobs] ${filename}: ${reason}`);
}

function parseComponent(filename: string): ComponentKey | null {
  const ext = path.extname(filename);
  if (!ext) return null;

  const extClean = ext.slice(1).toLowerCase();
  if (!ALLOWED_EXTS.has(extClean)) return null;

  const stem = path.basename(filename, ext);
  const parts = stem.split("-").filter((part) => part.length > 0);
  if (parts.length < 2) {
    warnInvalid(filename, "invalid name (expected <name>-<component>.<ext>)");
    return null;
  }

  const last = parts[parts.length - 1]!.toLowerCase();
  if (isComponentKey(last)) return last;

  warnInvalid(filename, `invalid component "${last}"`);
  return null;
}

export async function buildJobs(): Promise<void> {
  const baseDirArg = parseBaseDirArg(process.argv.slice(2)) ?? "inbox";

  if (path.isAbsolute(baseDirArg)) {
    console.error("[build-jobs] --baseDir must be relative to tool root.");
    process.exit(1);
  }

  const baseDirPath = path.resolve(toolRoot, baseDirArg);
  if (
    !baseDirPath.startsWith(`${toolRoot}${path.sep}`) &&
    baseDirPath !== toolRoot
  ) {
    console.error("[build-jobs] --baseDir must stay within the tool root.");
    process.exit(1);
  }

  let dirents: import("node:fs").Dirent[];
  try {
    dirents = await readdir(baseDirPath, { withFileTypes: true });
  } catch (error) {
    console.error(`[build-jobs] Unable to read baseDir: ${baseDirArg}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const jobNames = dirents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort((a, b) => a.localeCompare(b));

  const jobs: JobConfig[] = [];

  for (const name of jobNames) {
    const jobDirPath = path.join(baseDirPath, name);

    let entries: import("node:fs").Dirent[] = [];
    try {
      entries = await readdir(jobDirPath, { withFileTypes: true });
    } catch {
      console.warn(
        `[build-jobs] Skipping "${name}" (unable to read directory).`,
      );
      continue;
    }

    const images: ImageConfig[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;

      const filename = entry.name;
      const component = parseComponent(filename);
      if (!component) continue;

      const outputs: OutputTemplate[] = COMPONENT_OUTPUTS[component].map(
        (output) => ({
          ratio: output.ratio,
          mp: output.mp,
          quality: output.quality,
        }),
      );

      images.push({ file: filename, outputs });
    }

    images.sort((a, b) => a.file.localeCompare(b.file));

    jobs.push({
      name,
      inputDir: toJsonInputDir(baseDirArg, name),
      outputDir: "./processed",
      jobSubdir: true,
      preserveFolders: true,
      collisionPolicy: "suffix",
      defaults: {
        format: "webp",
        alignTo: 2,
        capToBase: true,
      },
      images,
    });
  }

  const payload: JobsFile = { jobs };
  const outputPath = path.join(toolRoot, "jobs.json");
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

const maybeEntry = process.argv[1]
  ? path.resolve(process.argv[1])
  : undefined;

if (maybeEntry === __filename) {
  buildJobs().catch((error: unknown) => {
    console.error("[build-jobs] Unhandled error.");
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
