import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { once } from "node:events";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
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
const EVIDENCE_KEY_ID = "tb113-evidence-v1";
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

function injectedGenerationProfile(generation) {
  const { sourceRevision, evidenceKeyId, modelConfig, pricingSnapshot } = generation;
  const {
    evidenceKeyId: _evidenceKeyId,
    sourceRevision: _sourceRevision,
    safetyHeadroomTokens: _safetyHeadroomTokens,
    ...profileModelConfig
  } = modelConfig;
  return {
    profileVersion: "feedback-report-generation-profile.v1",
    sourceRevision,
    evidenceKeyId,
    modelConfig: profileModelConfig,
    pricingSnapshot,
  };
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

function listen(server, port = 0) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
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

test("development worker CMS client uses only the exact loopback allowlist and scoped token", async () => {
  const { createDevelopmentWorkerCmsClient } = loadBuiltWorker();
  const origin = "http://127.0.0.1:1337";
  const calls = [];
  const cms = createDevelopmentWorkerCmsClient({
    NODE_ENV: "development",
    BUILD_STRAPI_BASE_URL: origin,
    FEEDBACK_CMS_ALLOWED_ORIGIN: origin,
    FEEDBACK_WORKER_CMS_TOKEN: "synthetic-worker-custom-token",
  }, {
    fetchImplementation: async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 });
    },
  });

  await assert.rejects(cms.claim(REPORT_RUN_ID), { code: "FORBIDDEN" });
  assert.equal(calls[0].url, `${origin}/api/tb113/worker/generations/${REPORT_RUN_ID}/claim`);
  assert.equal(new Headers(calls[0].init.headers).get("authorization"), "Bearer synthetic-worker-custom-token");
  assert.throws(() => createDevelopmentWorkerCmsClient({
    NODE_ENV: "production",
    BUILD_STRAPI_BASE_URL: origin,
    FEEDBACK_CMS_ALLOWED_ORIGIN: origin,
    FEEDBACK_WORKER_CMS_TOKEN: "synthetic-worker-custom-token",
  }, { fetchImplementation: async () => Response.json({}) }));
  assert.doesNotThrow(() => createDevelopmentWorkerCmsClient({
    NODE_ENV: "development",
    BUILD_STRAPI_BASE_URL: "http://localhost:1337",
    FEEDBACK_CMS_ALLOWED_ORIGIN: "http://localhost:1337",
    FEEDBACK_WORKER_CMS_TOKEN: "synthetic-worker-custom-token",
  }, { fetchImplementation: async () => Response.json({}) }));
});

test("configured development composition binds real worker providers without credential or network discovery", async () => {
  const { createDevelopmentReportWorkerDependencies } = loadBuiltWorker();
  const { deriveLocalEvidenceKey } = createRequire(import.meta.url)(
    "../../../packages/tb113-runtime-contracts/src/local-evidence-key.cjs",
  );
  const modelConfig = {
    version: "survey-model-config.v1",
    evidenceKeyId: "tb113-evidence-v1",
    provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024",
    vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
    model: "gemini-3.8-flash",
    temperature: 0,
    reasoning: "LOW",
    grounding: false,
    promptVersion: "prompt.v1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redaction.v1",
    validatorVersion: "validator.v1",
    chunkVersion: "chunk.v1",
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: "feedback-admin.v1",
  };
  const pricingSnapshot = {
    version: "pricing.v1",
    currency: "USD",
    units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
  };
  const env = {
    NODE_ENV: "development",
    FEEDBACK_WORKER_URL: "http://127.0.0.1:18080/internal/v1/report-runs:execute",
    FEEDBACK_TASK_QUEUE_PATH: "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports",
    BUILD_STRAPI_BASE_URL: "http://127.0.0.1:1337",
    FEEDBACK_CMS_ALLOWED_ORIGIN: "http://127.0.0.1:1337",
    FEEDBACK_WORKER_CMS_TOKEN: "synthetic-worker-custom-token",
    FEEDBACK_APPROVED_GENERATION_CONFIG_JSON: JSON.stringify({
      model: "legacy-environment-must-not-replace-the-profile",
    }),
    FEEDBACK_WORKER_EVIDENCE_KEY: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
    FEEDBACK_VERTEX_PROJECT_ID: "teleferico-bariloche-2024",
  };
  const providerUrls = [];
  const dependencies = createDevelopmentReportWorkerDependencies(env, {
    rootDirectory: join(tmpdir(), "tb113-uncreated-report-root"),
    generationProfile: injectedGenerationProfile({
      contractVersion: "survey-approved-generation-config.v1",
      sourceRevision: "feedback-admin.v1",
      evidenceKeyId: "tb113-evidence-v1",
      modelConfig,
      pricingSnapshot,
    }),
    accessTokenProvider: async () => "synthetic-test-access-token",
    fetchImplementation: async (url) => {
      providerUrls.push(String(url));
      return Response.json({
        name: env.FEEDBACK_WORKER_EVIDENCE_KEY,
        payload: { data: Buffer.from("unused remote test key material").toString("base64") },
      });
    },
  });

  assert.equal(typeof dependencies.cms.claim, "function");
  assert.equal(typeof dependencies.cms.snapshot, "function");
  assert.equal(typeof dependencies.countTokens, "function");
  assert.equal(typeof dependencies.analysisProvider, "function");
  assert.equal(typeof dependencies.evidenceKeyProvider, "function");
  assert.equal(dependencies.renderer.rendererVersion, "playwright-chromium-echarts-6.1-pdf.v2");
  assert.deepEqual(dependencies.approvedModelConfig, modelConfig);
  const bundledProfileDependencies = createDevelopmentReportWorkerDependencies(env, {
    rootDirectory: join(tmpdir(), "tb113-uncreated-default-profile-root"),
    accessTokenProvider: async () => "synthetic-test-access-token",
    fetchImplementation: async () => {
      throw new Error("default profile composition must not call external providers");
    },
  });
  assert.equal(bundledProfileDependencies.approvedModelConfig.verifiedInputTokenLimit, 1_048_576);
  assert.equal(bundledProfileDependencies.approvedModelConfig.safetyHeadroomTokens, 104_858);
  assert.deepEqual(bundledProfileDependencies.approvedPricingSnapshot.units, [{
    sku: "gemini-3.8-flash",
    inputMicrosPerMillion: 1_650_000,
    outputMicrosPerMillion: 8_250_000,
  }]);
  assert.throws(() => createDevelopmentReportWorkerDependencies(env, {
    generationProfile: injectedGenerationProfile({
      contractVersion: "survey-approved-generation-config.v1",
      sourceRevision: "feedback-admin.v1",
      evidenceKeyId: "tb113-evidence-v1",
      modelConfig: { ...modelConfig, verifiedInputTokenLimit: null },
      pricingSnapshot: {
        ...pricingSnapshot,
        units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: null, outputMicrosPerMillion: null }],
      },
    }),
  }), {
    message: "TB-113 report profile is not configured",
  });
  const localKey = Buffer.from(await dependencies.evidenceKeyProvider(EVIDENCE_KEY_ID));
  const expectedLocalKey = deriveLocalEvidenceKey({
    evidenceKeyId: EVIDENCE_KEY_ID,
    sourceRevision: modelConfig.sourceRevision,
    secretVersion: env.FEEDBACK_WORKER_EVIDENCE_KEY,
  });
  assert.deepEqual(localKey, expectedLocalKey);
  assert.deepEqual(providerUrls, [], "local evidence-key derivation must not call Secret Manager");
  assert.throws(() => createDevelopmentReportWorkerDependencies({
    ...env,
    K_SERVICE: "must-not-spoof-cloud-run",
  }));
  assert.throws(() => createDevelopmentReportWorkerDependencies({
    ...env,
    GOOGLE_APPLICATION_CREDENTIALS: "must-not-be-set",
  }));
});

test("local worker refuses startup when an explicitly injected report profile has unset values", async () => {
  const runtime = await import("../scripts/local-worker.mjs");
  assert.equal(typeof runtime.createLocalWorkerServers, "function");
  assert.throws(() => runtime.createLocalWorkerServers({
    NODE_ENV: "development",
    FEEDBACK_WORKER_URL: "http://127.0.0.1:18080/internal/v1/report-runs:execute",
    FEEDBACK_TASK_QUEUE_PATH: "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports",
  }, {
    generationProfile: injectedGenerationProfile({
      contractVersion: "survey-approved-generation-config.v1",
      sourceRevision: "feedback-admin.v1",
      evidenceKeyId: "tb113-evidence-v1",
      modelConfig: {
        version: "survey-model-config.v1",
        evidenceKeyId: "tb113-evidence-v1",
        provider: "vertex-ai",
        vertexProjectId: "teleferico-bariloche-2024",
        vertexLocation: "us",
        vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
        model: "gemini-3.8-flash",
        temperature: 0,
        reasoning: "LOW",
        grounding: false,
        promptVersion: "prompt.v1",
        mapSchemaVersion: "survey-map.v1",
        analysisSchemaVersion: "survey-analysis.v1",
        redactionVersion: "redaction.v1",
        validatorVersion: "validator.v1",
        chunkVersion: "chunk.v1",
        verifiedInputTokenLimit: null,
        map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
        directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
      },
      pricingSnapshot: {
        version: "pricing.v1",
        currency: "USD",
        units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: null, outputMicrosPerMillion: null }],
      },
    }),
  }), { message: "TB-113 report profile is not configured" });
  assert.throws(() => runtime.createLocalWorkerServers({
    NODE_ENV: "development",
    K_SERVICE: "must-not-spoof-cloud-run",
    FEEDBACK_WORKER_URL: "http://127.0.0.1:18080/internal/v1/report-runs:execute",
    FEEDBACK_TASK_QUEUE_PATH: "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports",
  }));
});

test("local task queue delivers a named task over HTTP to the authenticated worker server", async (context) => {
  const { createLocalTaskQueueServer } = await import("../scripts/local-task-queue.mjs");
  const { createLocalDevelopmentOidc } = await import("../scripts/local-dev-oidc.mjs");
  const { createReportWorkerNodeServer, REPORT_WORKER_EXECUTE_PATH } = loadBuiltWorker();
  const counters = { claims: 0, bodyReads: 0 };
  const portReservation = createServer();
  const workerPort = await listen(portReservation);
  await close(portReservation);
  const workerUrl = `http://127.0.0.1:${workerPort}${REPORT_WORKER_EXECUTE_PATH}`;
  const localOidc = createLocalDevelopmentOidc({ audience: `http://127.0.0.1:${workerPort}` });
  const runtime = createFakeRuntimeConfig(counters);
  runtime.oidc = localOidc;
  const worker = createReportWorkerNodeServer(runtime);
  context.after(() => close(worker));
  await listen(worker, workerPort);
  let deliveryStatus;
  let deliveryError;
  const queuePath = "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports";
  const queue = createLocalTaskQueueServer({
    queuePath,
    workerUrl,
    audience: localOidc.audience,
    principal: localOidc.principal,
    createOidcToken: async () => localOidc.createToken(),
    fetchImplementation: async (...args) => {
      try {
        const response = await fetch(...args);
        deliveryStatus = response.status;
        return response;
      } catch (error) {
        deliveryError = error.message;
        throw error;
      }
    },
  });
  context.after(() => close(queue));
  const queuePort = await listen(queue);
  const taskName = `tb113-report-${REPORT_RUN_ID.replaceAll("-", "")}`;
  const fullName = `${queuePath}/tasks/${taskName}`;
  const command = { commandVersion: "survey-report-command.v1", reportRunId: REPORT_RUN_ID };
  const requestBody = JSON.stringify({ task: {
    name: fullName,
    httpRequest: {
      httpMethod: "POST",
      url: workerUrl,
      headers: { "Content-Type": "application/json" },
      body: Buffer.from(JSON.stringify(command)).toString("base64"),
      oidcToken: { serviceAccountEmail: localOidc.principal, audience: localOidc.audience },
    },
  } });
  const created = await fetch(`http://127.0.0.1:${queuePort}/_local-tasks/v2/${queuePath}/tasks`, {
    method: "POST",
    headers: { authorization: "Bearer tb113-local-task-api-v1", "content-type": "application/json" },
    body: requestBody,
  });
  assert.equal(created.status, 200);
  assert.deepEqual(await created.json(), { name: fullName });
  const deliveryDeadline = Date.now() + 2_000;
  while (deliveryStatus === undefined && Date.now() < deliveryDeadline)
    await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(deliveryStatus, 200, deliveryError);
  assert.equal(counters.claims, 1);

  const duplicate = await fetch(`http://127.0.0.1:${queuePort}/_local-tasks/v2/${fullName}?responseView=FULL`, {
    headers: { authorization: "Bearer tb113-local-task-api-v1" },
  });
  assert.equal(duplicate.status, 200);
  const stored = await duplicate.json();
  assert.equal(stored.name, fullName);
  assert.equal(stored.httpRequest.url, workerUrl);
  assert.equal(stored.httpRequest.body, Buffer.from(JSON.stringify(command)).toString("base64"));

  const sameDuplicate = await fetch(`http://127.0.0.1:${queuePort}/_local-tasks/v2/${queuePath}/tasks`, {
    method: "POST",
    headers: { authorization: "Bearer tb113-local-task-api-v1", "content-type": "application/json" },
    body: requestBody,
  });
  assert.equal(sameDuplicate.status, 409);

  const conflictingInput = JSON.parse(requestBody);
  conflictingInput.task.httpRequest.body = Buffer.from(JSON.stringify({
    commandVersion: "survey-report-command.v1",
    reportRunId: "22222222-2222-4222-8222-222222222222",
  })).toString("base64");
  const conflictingDuplicate = await fetch(`http://127.0.0.1:${queuePort}/_local-tasks/v2/${queuePath}/tasks`, {
    method: "POST",
    headers: { authorization: "Bearer tb113-local-task-api-v1", "content-type": "application/json" },
    body: JSON.stringify(conflictingInput),
  });
  assert.equal(conflictingDuplicate.status, 409);

  const denied = await fetch(`http://127.0.0.1:${queuePort}/_local-tasks/v2/${queuePath}/tasks`, {
    method: "POST", headers: { authorization: "Bearer wrong", "content-type": "application/json" }, body: requestBody,
  });
  assert.equal(denied.status, 401);

  const malformed = await fetch(`http://127.0.0.1:${queuePort}/_local-tasks/v2/${queuePath}/tasks`, {
    method: "POST",
    headers: { authorization: "Bearer tb113-local-task-api-v1", "content-type": "application/json" },
    body: "not-json",
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: { code: "INVALID_ARGUMENT" } });
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
