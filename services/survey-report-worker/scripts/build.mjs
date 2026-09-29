import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";
import { chromium } from "@playwright/test";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = join(ROOT, "dist");
const CHROMIUM_SHA256 =
  "2d18db9d8608b052b6a552ee00ec1e830f93692e928b65ecc67d693bd33fe801";
const HEADLESS_SHELL_SHA256 =
  "670ba079b75107746ba41abad131180a31a7c7219aa1bd4061fb471f4535d541";
const FONT_SHA256 =
  "ae7b7855e115a5966d8b1b3f80f254ccc117ec86f9965e202ee2940453837280";
const FONT_SOURCE = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const EXTERNAL_RUNTIME_PACKAGES = [
  "@google-cloud/storage",
  "@playwright/test",
  "echarts",
  "google-auth-library",
  "server-only",
];

if (process.platform !== "linux" || process.arch !== "x64")
  throw new Error("The pinned report worker artifact requires Linux x64");

const browserCache = join(homedir(), ".cache", "ms-playwright");
process.env.PLAYWRIGHT_BROWSERS_PATH = browserCache;
const browserExecutable = chromium.executablePath();
const chromiumDirectory = dirname(dirname(browserExecutable));
const revision = chromiumDirectory.match(/chromium-(\d+)$/)?.[1];
if (!revision) throw new Error("Pinned Chromium revision is unavailable");

const headlessDirectory = join(
  browserCache,
  `chromium_headless_shell-${revision}`,
);
const headlessExecutable = join(
  headlessDirectory,
  "chrome-headless-shell-linux64",
  "chrome-headless-shell",
);

async function sha256File(filePath) {
  const bytes = await readFile(filePath);
  return createHash("sha256").update(bytes).digest("hex");
}

async function requireDigest(filePath, expected) {
  const actual = await sha256File(filePath);
  if (actual !== expected)
    throw new Error(`Pinned renderer asset digest mismatch: ${filePath}`);
}

await requireDigest(browserExecutable, CHROMIUM_SHA256);
await requireDigest(headlessExecutable, HEADLESS_SHELL_SHA256);
await requireDigest(FONT_SOURCE, FONT_SHA256);

await rm(OUTPUT, { recursive: true, force: true });
await mkdir(join(OUTPUT, "assets", "fonts"), { recursive: true });
await mkdir(join(OUTPUT, "browsers"), { recursive: true });
await cp(chromiumDirectory, join(OUTPUT, "browsers", `chromium-${revision}`), {
  recursive: true,
  dereference: true,
});
await cp(
  headlessDirectory,
  join(OUTPUT, "browsers", `chromium_headless_shell-${revision}`),
  {
    recursive: true,
    dereference: true,
  },
);
await cp(FONT_SOURCE, join(OUTPUT, "assets", "fonts", "DejaVuSans.ttf"));

await build({
  entryPoints: {
    server: join(ROOT, "src", "index.ts"),
  },
  outdir: OUTPUT,
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: EXTERNAL_RUNTIME_PACKAGES,
  packages: "bundle",
  sourcemap: false,
  minify: false,
  logLevel: "warning",
});

await cp(join(ROOT, "src", "run-worker.mjs"), join(OUTPUT, "run-worker.mjs"));

const entries = await readdir(OUTPUT, { withFileTypes: true });
async function directorySize(directory) {
  const children = await readdir(directory, { withFileTypes: true });
  const sizes = await Promise.all(
    children.map(async (entry) => {
      const child = join(directory, entry.name);
      return entry.isDirectory()
        ? directorySize(child)
        : (await stat(child)).size;
    }),
  );
  return sizes.reduce((total, size) => total + size, 0);
}

const bytes = await directorySize(OUTPUT);
const copiedFont = join(OUTPUT, "assets", "fonts", "DejaVuSans.ttf");
await requireDigest(copiedFont, FONT_SHA256);
if (!entries.some((entry) => entry.name === "server.cjs"))
  throw new Error("Worker bundle output was not created");

process.stdout.write(
  `Built ${OUTPUT} (${bytes} bytes); pinned Chromium ${revision}, headless shell, and font verified.\n`,
);
