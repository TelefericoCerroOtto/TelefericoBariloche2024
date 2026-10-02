import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  LOCAL_FIXTURE_RUN_ID,
  LOCAL_FIXTURE_TOKEN,
} from "../scripts/dev-fixture-contract.mjs";

const PACKAGE_DIRECTORY = dirname(fileURLToPath(import.meta.url)).replace(
  /\/test$/,
  "",
);
const SERVER_BUNDLE = join(PACKAGE_DIRECTORY, "dist", "server.cjs");
const WORKER_RUNNER = join(PACKAGE_DIRECTORY, "dist", "run-worker.mjs");
const DEV_FIXTURE = join(PACKAGE_DIRECTORY, "scripts", "dev-fixture.mjs");
const REPORT_RUN_ID = "11111111-1111-4111-8111-111111111111";
const PRINCIPAL =
  "task-invoker@teleferico-bariloche-2024.iam.gserviceaccount.com";
const AUDIENCE = "https://worker.example";

function loadBuiltWorker() {
  assert.ok(
    existsSync(SERVER_BUNDLE),
    "Run the offline worker build before running the package smoke tests",
  );
  return createRequire(import.meta.url)(SERVER_BUNDLE);
}

function createFakeRuntimeConfig(counters) {
  const now = 2_000_000_000;
  return {
    oidc: {
      issuerAllowlist: ["https://accounts.google.com"],
      audience: AUDIENCE,
      principal: PRINCIPAL,
      nowSeconds: () => now,
      verifySignedToken: async (token) =>
        token === "synthetic-valid-token"
          ? {
              signatureVerified: true,
              issuer: "https://accounts.google.com",
              audience: AUDIENCE,
              principal: PRINCIPAL,
              issuedAt: now - 10,
              expiresAt: now + 120,
            }
          : null,
    },
    dependencies: {
      cms: {
        async claim(reportRunId) {
          counters.claims += 1;
          return {
            contractVersion: "survey-worker-cms.v1",
            reportRunId,
            stateVersion: 4,
            status: "succeeded",
            disposition: "terminal-replay",
          };
        },
        async snapshot() {
          throw new Error("unexpected synthetic snapshot call");
        },
        async checkpoint() {
          throw new Error("unexpected synthetic checkpoint call");
        },
        async complete() {
          throw new Error("unexpected synthetic completion call");
        },
        async fail() {
          throw new Error("unexpected synthetic fail call");
        },
      },
      artifacts: {
        async stage() {
          throw new Error("unexpected synthetic stage call");
        },
        async readStaged() {
          throw new Error("unexpected synthetic artifact read");
        },
        async discardStaged() {
          throw new Error("unexpected synthetic artifact delete");
        },
      },
      renderer: {
        rendererVersion: "synthetic-test-renderer.v1",
        async render() {
          throw new Error("unexpected synthetic render call");
        },
      },
    },
  };
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve(server.address().port);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("the independent worker package uses the pinned Node runtime and built-in test runner", async () => {
  assert.equal(process.version, "v22.22.0");
  const manifest = JSON.parse(
    await readFile(join(PACKAGE_DIRECTORY, "package.json"), "utf8"),
  );
  assert.equal(manifest.packageManager, "pnpm@10.33.0");
  assert.equal(manifest.engines.node, "22.22.0");
  assert.equal(
    manifest.scripts.test,
    "node --conditions=react-server --test test/*.test.mjs",
  );
  assert.equal("vitest" in manifest.devDependencies, false);
});

test("built HTTP handler rejects invalid OIDC before reading its body", async () => {
  const { createReportWorkerHttpHandler } = loadBuiltWorker();
  const counters = { claims: 0, bodyReads: 0 };
  const handler = createReportWorkerHttpHandler(
    createFakeRuntimeConfig(counters),
  );
  const response = await handler({
    method: "POST",
    url: "/internal/v1/report-runs:execute",
    headers: new Headers({
      authorization: "Bearer invalid-token",
      "content-type": "application/json",
    }),
    async readBody() {
      counters.bodyReads += 1;
      return new TextEncoder().encode("not-json");
    },
  });

  assert.equal(response.status, 401);
  assert.deepEqual(response.body, { error: { code: "INVALID_OIDC" } });
  assert.equal(counters.bodyReads, 0);
  assert.equal(counters.claims, 0);
});

test("built Node HTTP server returns a synthetic terminal replay without external calls", async (context) => {
  const { createReportWorkerNodeServer, REPORT_WORKER_EXECUTE_PATH } =
    loadBuiltWorker();
  const counters = { claims: 0, bodyReads: 0 };
  const server = createReportWorkerNodeServer(
    createFakeRuntimeConfig(counters),
  );
  context.after(() => close(server));
  const port = await listen(server);
  const response = await fetch(
    `http://127.0.0.1:${port}${REPORT_WORKER_EXECUTE_PATH}`,
    {
      method: "POST",
      headers: {
        authorization: "Bearer synthetic-valid-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        commandVersion: "survey-report-command.v1",
        reportRunId: REPORT_RUN_ID,
      }),
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    contractVersion: "survey-worker-execution.v1",
    reportRunId: REPORT_RUN_ID,
    status: "succeeded",
    disposition: "terminal-replay",
  });
  assert.equal(counters.claims, 1);
});

test("built process fails closed on missing configuration before listening", async (context) => {
  assert.ok(existsSync(WORKER_RUNNER), "Run the offline worker build first");
  const occupied = createServer();
  const port = await listen(occupied);
  context.after(() => close(occupied));

  const child = spawn(
    process.execPath,
    ["--conditions=react-server", WORKER_RUNNER],
    {
      cwd: PACKAGE_DIRECTORY,
      env: {
        HOME: process.env.HOME ?? "/tmp/opencode",
        PATH: process.env.PATH ?? "",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const timeout = setTimeout(() => child.kill("SIGKILL"), 5_000);
  context.after(() => {
    clearTimeout(timeout);
    if (child.exitCode === null) child.kill("SIGKILL");
  });
  const [code, signal] = await once(child, "exit");

  assert.equal(signal, null);
  assert.equal(code, 1);
  assert.match(
    stderr,
    /Report worker startup failed: configuration unavailable\./,
  );
});

test("local fake worker executes a synthetic report without external services", async (context) => {
  const child = spawn(
    process.execPath,
    ["--conditions=react-server", DEV_FIXTURE, "--port", "0"],
    {
      cwd: PACKAGE_DIRECTORY,
      env: {
        HOME: process.env.HOME ?? "/tmp/opencode",
        PATH: process.env.PATH ?? "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  context.after(() => {
    if (child.exitCode === null) child.kill("SIGKILL");
  });

  const startupDeadline = Date.now() + 5_000;
  let match;
  while (!match && Date.now() < startupDeadline && child.exitCode === null) {
    match = stdout.match(
      /http:\/\/127\.0\.0\.1:(\d+)\/internal\/v1\/report-runs:execute/,
    );
    if (!match) await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.ok(match, `Local fixture did not listen: ${stderr}`);
  const response = await fetch(
    `http://127.0.0.1:${match[1]}/internal/v1/report-runs:execute`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${LOCAL_FIXTURE_TOKEN}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        commandVersion: "survey-report-command.v1",
        reportRunId: LOCAL_FIXTURE_RUN_ID,
      }),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.status, "succeeded");
  assert.equal(body.reportRunId, LOCAL_FIXTURE_RUN_ID);

  const exit = once(child, "exit");
  child.kill("SIGTERM");
  const [code, signal] = await exit;
  assert.equal(signal, null);
  assert.equal(code, 0, stderr);
  assert.match(
    stdout,
    /responses=3, snapshots=1, CountTokens=1, generation=0, render=1, staged=1, completed=1/,
  );
});
