import { spawn, spawnSync } from "node:child_process";
import { watch } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(ROOT, "scripts", "build.mjs");
const LOCAL_WORKER = join(ROOT, "scripts", "local-worker.mjs");
let child;
let restarting = false;
let queued = false;

function loadDevelopmentEnvironment() {
  const inheritedNodeOptions = process.env.NODE_OPTIONS;
  try {
    loadEnvFile(join(ROOT, ".env"));
  } catch (error) {
    if (error?.code !== "ENOENT")
      throw new Error("Unable to load worker development environment.");
  }
  if (inheritedNodeOptions === undefined) delete process.env.NODE_OPTIONS;
  else process.env.NODE_OPTIONS = inheritedNodeOptions;
  process.env.NODE_ENV = "development";
}

function build() {
  const result = spawnSync(process.execPath, [BUILD], { cwd: ROOT, stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw result.error ?? new Error("Local worker build failed");
}

function startWorker() {
  child = spawn(process.execPath, ["--conditions=react-server", LOCAL_WORKER], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "inherit",
  });
  child.once("exit", (code, signal) => {
    child = undefined;
    if (!restarting && code !== 0 && signal === null)
      process.exitCode = code ?? 1;
  });
}

function stopWorker() {
  if (!child) return Promise.resolve();
  const running = child;
  return new Promise((resolveStop) => {
    running.once("exit", resolveStop);
    running.kill("SIGTERM");
  });
}

async function restart() {
  if (restarting) {
    queued = true;
    return;
  }
  restarting = true;
  try {
    do {
      queued = false;
      await stopWorker();
      build();
      startWorker();
    } while (queued);
  } catch {
    process.stderr.write("Local worker rebuild failed; the previous process was stopped.\n");
    process.exitCode = 1;
  } finally {
    restarting = false;
  }
}

try {
  loadDevelopmentEnvironment();
} catch {
  process.stderr.write("Unable to load worker development environment.\n");
  process.exit(1);
}

try {
  build();
  startWorker();
} catch {
  process.stderr.write("Local worker initial build failed.\n");
  process.exit(1);
}

const watchers = ["src", "scripts"].map((directory) =>
  watch(join(ROOT, directory), { recursive: true }, (_event, filename) => {
    if (!filename || !/\.(?:ts|tsx|mjs)$/.test(String(filename))) return;
    void restart();
  }),
);

function shutdown() {
  for (const watcher of watchers) watcher.close();
  void stopWorker().finally(() => process.exit());
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
