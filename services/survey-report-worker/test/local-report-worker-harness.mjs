import { createLocalWorkerServers } from "../scripts/local-worker.mjs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

const EMPTY_SECTIONS = [
  "executive_summary",
  "observed_changes",
  "strengths",
  "unfavorable_areas",
  "recurrent_themes",
  "minority_signals",
  "coverage_limitations",
];
const ROOT = resolve(new URL("..", import.meta.url).pathname);
const require = createRequire(import.meta.url);
const workerBundlePath = resolve(ROOT, "dist/server.cjs");

function injectedGenerationProfile() {
  const evidenceKeyId = "local-isolated-test-evidence-v1";
  const sourceRevision = "local-isolated-test-source.v1";
  const modelConfig = {
    version: "survey-model-config.v1",
    evidenceKeyId,
    provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024",
    vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
    model: "gemini-3.8-flash",
    temperature: 0,
    reasoning: "LOW",
    grounding: false,
    promptVersion: "isolated-test-prompt.v1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "isolated-test-redaction.v1",
    validatorVersion: "isolated-test-validator.v1",
    chunkVersion: "isolated-test-chunk.v1",
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision,
  };
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
    pricingSnapshot: {
      version: "isolated-test-pricing.v1",
      currency: "USD",
      units: [{ sku: modelConfig.model, inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
    },
  };
}

export function createInjectedLocalReportWorker(env, rootDirectory) {
  const analysisProvider = async (request, countRequest) => ({
    output: {
      schemaVersion: "survey-analysis.v1",
      route: "direct",
      sections: EMPTY_SECTIONS.map((key, index) => index === 0
        ? {
            key,
            status: "supported",
            claims: [{
              claimId: "local-synthetic-observation",
              textEs: "La experiencia general se describe de manera positiva.",
              evidenceRefs: [request.comments[0].evidenceRef],
              signal: "descriptive",
            }],
          }
        : { key, status: "insufficient_evidence", claims: [] }),
    },
    usage: {
      model: countRequest.modelConfig.model,
      modelRevision: "isolated-test-provider.v1",
      sku: countRequest.modelConfig.model,
      usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 1 },
    },
  });
  const countTokens = async (request) => {
    if (
      request.contractVersion !== "survey-count-request.v1" ||
      request.modelConfig.model !== "gemini-3.8-flash"
    )
      throw Object.assign(new Error("Invalid isolated provider request"), {
        code: "CONFIGURATION",
      });
    return { instructions: 1, schema: 1, metrics: 1, comments: 1 };
  };
  return createLocalWorkerServers(env, {
    rootDirectory,
    generationProfile: injectedGenerationProfile(),
    analysisProvider,
    countTokens,
  });
}

async function listen(server, port) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolveListen();
    });
  });
}

async function run() {
  if (process.argv[2] === "--snapshot") {
    const input = JSON.parse(Buffer.from(process.argv[3] ?? "", "base64url").toString("utf8"));
    const { createSnapshot } = require(workerBundlePath);
    process.stdout.write(`${JSON.stringify(createSnapshot(input))}\n`);
    return;
  }
  if (process.argv[2] === "--evidence-key-fingerprint") {
    const { createDevelopmentReportWorkerDependencies } = require(workerBundlePath);
    const profile = injectedGenerationProfile();
    const config = profile.generation;
    const dependencies = createDevelopmentReportWorkerDependencies(process.env, {
      rootDirectory: process.argv[3],
      generationProfile: profile,
    });
    const key = await dependencies.evidenceKeyProvider(config.evidenceKeyId);
    process.stdout.write(`${createHash("sha256").update(key).digest("hex")}\n`);
    return;
  }
  const rootDirectory = process.argv[2];
  const runtime = createInjectedLocalReportWorker(process.env, rootDirectory);
  try {
    await listen(runtime.worker, runtime.workerPort);
    await listen(runtime.queue, runtime.queuePort);
  } catch {
    runtime.worker.close();
    runtime.queue.close();
    process.stderr.write("Isolated local report worker failed to bind.\n");
    process.exitCode = 1;
    return;
  }
  process.stdout.write("ISOLATED_LOCAL_REPORT_WORKER_READY\n");
  const stop = () => {
    runtime.queue.close();
    runtime.worker.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  await run();
