import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEV_SCRIPT = join(PACKAGE_ROOT, "scripts", "dev.mjs");
const FAKE_TOKEN = "synthetic-test-token-never-print";

async function createHarness(context, { packageEnv, cwdEnv = "" } = {}) {
  const root = await mkdtemp(join(tmpdir(), "tb113-dev-env-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const packageRoot = join(root, "worker");
  const scripts = join(packageRoot, "scripts");
  const unrelatedCwd = join(root, "unrelated");
  await mkdir(scripts, { recursive: true });
  await mkdir(unrelatedCwd, { recursive: true });
  await writeFile(join(scripts, "dev.mjs"), await readFile(DEV_SCRIPT));
  await writeFile(join(scripts, "build.mjs"), "process.exit(0);\n");
  const marker = join(root, "worker-start.json");
  await writeFile(
    join(scripts, "local-worker.mjs"),
    `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(marker)}, JSON.stringify({
  token: process.env.FEEDBACK_WORKER_CMS_TOKEN,
  setting: process.env.SYNTHETIC_SETTING,
  nodeEnv: process.env.NODE_ENV,
  nodeOptions: process.env.NODE_OPTIONS,
  cwdFile: process.env.UNRELATED_CWD_SETTING,
}));
process.once("SIGTERM", () => process.exit(0));
setInterval(() => {}, 1000);
`,
  );
  if (packageEnv !== undefined) await writeFile(join(packageRoot, ".env"), packageEnv);
  if (cwdEnv) await writeFile(join(unrelatedCwd, ".env"), cwdEnv);
  return { root, packageRoot, unrelatedCwd, marker };
}

async function startHarness({ packageRoot, unrelatedCwd, marker, env = {} }) {
  const child = spawn(process.execPath, [join(packageRoot, "scripts", "dev.mjs")], {
    cwd: unrelatedCwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  try {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        return { child, state: JSON.parse(await readFile(marker, "utf8")), stderr };
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        if (child.exitCode !== null) break;
        await delay(20);
      }
    }
    return { child, state: null, stderr };
  } finally {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        delay(2000).then(() => {
          if (child.exitCode === null) child.kill("SIGKILL");
        }),
      ]);
    }
  }
}

test("dev loads only its package .env, preserves inherited values, and forces development", async (context) => {
  const harness = await createHarness(context, {
    packageEnv: `FEEDBACK_WORKER_CMS_TOKEN=${FAKE_TOKEN}\nSYNTHETIC_SETTING=from-file\nNODE_ENV=production\nNODE_OPTIONS=--import=synthetic-test-module\n`,
    cwdEnv: "UNRELATED_CWD_SETTING=from-unrelated-cwd\n",
  });
  const result = await startHarness({
    ...harness,
    env: {
      SYNTHETIC_SETTING: "from-parent",
      NODE_ENV: "production",
      NODE_OPTIONS: "--no-warnings",
    },
  });

  assert.equal(result.state?.token === FAKE_TOKEN, true);
  assert.equal(result.state?.setting, "from-parent");
  assert.equal(result.state?.nodeEnv, "development");
  assert.equal(result.state?.nodeOptions, "--no-warnings");
  assert.equal(result.state?.cwdFile, undefined);
  assert.equal(result.stderr.includes(FAKE_TOKEN), false);
});

test("dev starts with inherited settings when its package .env is missing", async (context) => {
  const harness = await createHarness(context);
  const result = await startHarness({
    ...harness,
    env: { FEEDBACK_WORKER_CMS_TOKEN: FAKE_TOKEN, SYNTHETIC_SETTING: "from-parent" },
  });

  assert.equal(result.state?.token === FAKE_TOKEN, true);
  assert.equal(result.state?.setting, "from-parent");
  assert.equal(result.state?.nodeEnv, "development");
});

test("dev reports an unreadable package .env without exposing its values", async (context) => {
  const harness = await createHarness(context);
  await mkdir(join(harness.packageRoot, ".env"));
  const result = await startHarness({
    ...harness,
    env: { FEEDBACK_WORKER_CMS_TOKEN: FAKE_TOKEN },
  });

  assert.equal(result.child.exitCode, 1);
  assert.equal(result.state, null);
  assert.equal(result.stderr, "Unable to load worker development environment.\n");
  assert.equal(result.stderr.includes(FAKE_TOKEN), false);
});
