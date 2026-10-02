import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_FIXTURE_PORT,
  LOCAL_FIXTURE_RUN_ID,
  LOCAL_FIXTURE_TOKEN,
} from "./dev-fixture-contract.mjs";

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const {
  createPrivateReportObjectStorage,
  createReportWorkerNodeServer,
  createSnapshot,
  deterministicReportId,
} = require(join(packageDirectory, "dist", "server.cjs"));

const SOURCE_REVISION = "tb113-local-worker-fixture.v1";
const EVIDENCE_KEY_ID = "local-fixture-key";
const MODEL_CONFIG = {
  version: "survey-model-config.v1",
  evidenceKeyId: EVIDENCE_KEY_ID,
  provider: "vertex-ai",
  vertexProjectId: "teleferico-bariloche-2024",
  vertexLocation: "us",
  vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
  model: "gemini-3.8-flash",
  temperature: 0,
  reasoning: "LOW",
  grounding: false,
  promptVersion: "local-fixture.v1",
  mapSchemaVersion: "survey-map.v1",
  analysisSchemaVersion: "survey-analysis.v1",
  redactionVersion: "local-fixture.v1",
  validatorVersion: "local-fixture.v1",
  chunkVersion: "local-fixture.v1",
  verifiedInputTokenLimit: 30_000,
  map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
  directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
  safetyHeadroomTokens: 3000,
  sourceRevision: SOURCE_REVISION,
};
const PRICING_SNAPSHOT = {
  version: "local-fixture-pricing.v1",
  currency: "USD",
  units: [
    {
      sku: MODEL_CONFIG.model,
      inputMicrosPerMillion: 0,
      outputMicrosPerMillion: 0,
    },
  ],
};
const syntheticSubmission = ({
  recordId,
  acceptedAt,
  receipt,
  pointKey,
  overallRating,
  sentiment,
  digestCharacter,
}) => ({
  recordId,
  receipt,
  acceptedAt,
  source: "valid_qr",
  locale: "es",
  versionKey: "local-preview-v1",
  pointKey,
  overallRating,
  commentText: null,
  aspects: [
    {
      aspectKey: "atencion",
      label: "Atención",
      sortOrder: 0,
      sentiment,
    },
    {
      aspectKey: "acceso",
      label: "Acceso",
      sortOrder: 1,
      sentiment: "neutral",
    },
  ],
  payloadDigest: digestCharacter.repeat(64),
});

const SNAPSHOT_INPUT = {
  sourceRevision: SOURCE_REVISION,
  createdAt: "2026-09-28T12:00:00.000Z",
  dataCutoffAt: "2026-09-28T12:30:00.000Z",
  range: { from: "2026-09-28", to: "2026-09-28" },
  filters: { pointKey: null, versionKey: null },
  submissions: [
    syntheticSubmission({
      recordId: "local-preview-submission-1",
      acceptedAt: "2026-09-28T12:05:00.000Z",
      receipt: "local-preview-receipt-1",
      pointKey: "cumbre",
      overallRating: 5,
      sentiment: "positive",
      digestCharacter: "1",
    }),
    syntheticSubmission({
      recordId: "local-preview-submission-2",
      acceptedAt: "2026-09-28T12:10:00.000Z",
      receipt: "local-preview-receipt-2",
      pointKey: "cumbre",
      overallRating: 4,
      sentiment: "positive",
      digestCharacter: "2",
    }),
    syntheticSubmission({
      recordId: "local-preview-submission-3",
      acceptedAt: "2026-09-28T12:15:00.000Z",
      receipt: "local-preview-receipt-3",
      pointKey: "base",
      overallRating: 2,
      sentiment: "negative",
      digestCharacter: "3",
    }),
  ],
  definitions: [
    { aspectKey: "atencion", sortOrder: 0 },
    { aspectKey: "acceso", sortOrder: 1 },
  ],
  points: [
    { pointKey: "cumbre", displayName: "Cumbre", sortOrder: 0 },
    { pointKey: "base", displayName: "Base", sortOrder: 1 },
  ],
};
const SNAPSHOT = createSnapshot(SNAPSHOT_INPUT);

function createMemoryPrivateBucket(counters) {
  const objects = new Map();

  return Object.freeze({
    async isPrivate() {
      return true;
    },
    async createIfAbsent(input) {
      if (!input.objectKey.startsWith("private/feedback-reports/"))
        throw new Error("Local private fixture rejected an object prefix");
      if (objects.has(input.objectKey)) return "exists";
      const bytes = new Uint8Array(input.bytes);
      objects.set(input.objectKey, {
        bytes,
        metadata: {
          size: bytes.byteLength,
          contentType: input.contentType,
          cacheControl: input.cacheControl,
          visibility: "private",
          customMetadata: { ...input.customMetadata },
        },
      });
      counters.stagedObjects += 1;
      return "created";
    },
    async getMetadata(objectKey) {
      return objects.get(objectKey)?.metadata ?? null;
    },
    async readBounded(objectKey, maxBytes) {
      const object = objects.get(objectKey);
      if (!object || object.bytes.byteLength > maxBytes)
        throw new Error("Local private fixture object is unavailable");
      return new Uint8Array(object.bytes);
    },
    async deleteIfMetadataMatches(objectKey, expected) {
      const object = objects.get(objectKey);
      if (!object) return false;
      if (
        Object.entries(expected).some(
          ([key, value]) => object.metadata.customMetadata[key] !== value,
        )
      )
        return false;
      objects.delete(objectKey);
      return true;
    },
  });
}

function createFixtureRuntime(port) {
  const counters = {
    claims: 0,
    snapshots: 0,
    syntheticResponses: SNAPSHOT.payload.population.currentSubmissionCount,
    countTokens: 0,
    generation: 0,
    renders: 0,
    stagedObjects: 0,
    completions: 0,
  };
  const runs = new Map();
  const { artifacts } = createPrivateReportObjectStorage({
    bucket: createMemoryPrivateBucket(counters),
  });
  const nowSeconds = () => Math.floor(Date.now() / 1000);
  const audience = `http://127.0.0.1:${port}`;

  const cms = {
    async claim(reportRunId) {
      counters.claims += 1;
      let run = runs.get(reportRunId);
      if (!run) {
        run = {
          stateVersion: 1,
          status: "running",
          claims: 0,
          checkpoints: {
            version: "survey-checkpoints.v1",
            snapshotDigest: SNAPSHOT.digestHex,
            route: "undecided",
            chunkCount: null,
            entries: [],
          },
        };
        runs.set(reportRunId, run);
      }
      if (run.status === "succeeded")
        return {
          contractVersion: "survey-worker-cms.v1",
          reportRunId,
          stateVersion: run.stateVersion,
          status: "succeeded",
          disposition: "terminal-replay",
        };
      const disposition = run.claims > 0 ? "resumed" : "claimed";
      run.claims += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion: run.stateVersion,
        status: "running",
        disposition,
        checkpoints: run.checkpoints,
        modelConfig: MODEL_CONFIG,
        pricingSnapshot: PRICING_SNAPSHOT,
      };
    },
    async snapshot(reportRunId) {
      counters.snapshots += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion: runs.get(reportRunId).stateVersion,
        snapshot: SNAPSHOT,
      };
    },
    async checkpoint(reportRunId, command) {
      const run = runs.get(reportRunId);
      if (command.expectedStateVersion !== run.stateVersion)
        throw Object.assign(new Error("Synthetic state conflict"), {
          code: "STATE_VERSION_CONFLICT",
        });
      run.stateVersion += 1;
      run.checkpoints = {
        ...run.checkpoints,
        entries: [...run.checkpoints.entries, command.checkpoint],
      };
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion: run.stateVersion,
        stageKey: command.checkpoint.stageKey,
        status: "valid",
        replayed: false,
        crossedCostThreshold: false,
      };
    },
    async complete(reportRunId, command) {
      const run = runs.get(reportRunId);
      if (command.expectedStateVersion !== run.stateVersion)
        throw Object.assign(new Error("Synthetic state conflict"), {
          code: "STATE_VERSION_CONFLICT",
        });
      run.stateVersion += 1;
      run.status = "succeeded";
      counters.completions += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion: run.stateVersion,
        status: "succeeded",
        reportId: deterministicReportId(
          reportRunId,
          command.artifact.sha256,
        ),
        artifactSha256: command.artifact.sha256,
        artifactSize: command.artifact.size,
        replayed: false,
      };
    },
    async fail(reportRunId, command) {
      const run = runs.get(reportRunId);
      run.stateVersion += 1;
      run.status = "failed";
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion: run.stateVersion,
        status: "failed",
        failureCode: command.failureCode,
        replayed: false,
        alertRequired: false,
      };
    },
    async acknowledgeAlert() {
      throw new Error("Alerts are not enabled in the local worker fixture");
    },
  };

  const runtime = {
    oidc: {
      issuerAllowlist: ["https://accounts.google.com"],
      audience,
      principal: "local-fixture-invoker@invalid.test",
      nowSeconds,
      async verifySignedToken(token) {
        if (token !== LOCAL_FIXTURE_TOKEN) return null;
        const now = nowSeconds();
        return {
          signatureVerified: true,
          issuer: "https://accounts.google.com",
          audience,
          principal: "local-fixture-invoker@invalid.test",
          issuedAt: now - 1,
          expiresAt: now + 300,
        };
      },
    },
    dependencies: {
      cms,
      artifacts,
      renderer: {
        rendererVersion: "tb113-local-fake-renderer.v1",
        async render() {
          counters.renders += 1;
          return Buffer.from(
            "%PDF-1.4\n% Synthetic local-only report\n%%EOF\n",
          );
        },
      },
      countTokens: async () => {
        counters.countTokens += 1;
        return { instructions: 8, schema: 8, metrics: 8, comments: 1 };
      },
      analysisProvider: async () => {
        counters.generation += 1;
        throw new Error("Text generation is not simulated in the local fixture");
      },
      mapProvider: async () => {
        counters.generation += 1;
        throw new Error("Map generation is not simulated in the local fixture");
      },
      reduceProvider: async () => {
        counters.generation += 1;
        throw new Error("Reduce generation is not simulated in the local fixture");
      },
      evidenceKeyProvider: async () => Buffer.from("local-only synthetic evidence key"),
      approvedModelConfig: MODEL_CONFIG,
      approvedPricingSnapshot: PRICING_SNAPSHOT,
      now: () => new Date("2026-09-28T12:00:00.000Z"),
    },
  };

  return { runtime, counters };
}

function parsePort(argv) {
  if (argv.length === 0) return DEFAULT_FIXTURE_PORT;
  if (argv.length !== 2 || argv[0] !== "--port")
    throw new TypeError("Usage: pnpm run dev:fixture [--port <0-65535>]");
  const port = Number(argv[1]);
  if (!Number.isInteger(port) || port < 0 || port > 65_535)
    throw new TypeError("Local fixture port is invalid");
  return port;
}

if (process.version !== "v22.22.0") {
  process.stderr.write("Local worker fixture requires Node v22.22.0.\n");
  process.exitCode = 1;
} else {
  try {
    const port = parsePort(process.argv.slice(2));
    const { runtime, counters } = createFixtureRuntime(port);
    const server = createReportWorkerNodeServer(runtime);
    server.on("error", (error) => {
      process.stderr.write(
        error?.code === "EADDRINUSE"
          ? "Local worker fixture port is already in use.\n"
          : "Local worker fixture failed to listen.\n",
      );
      process.exitCode = 1;
    });
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address ? address.port : port;
      process.stdout.write(
        `TB-113 local fake worker listening at http://127.0.0.1:${actualPort}/internal/v1/report-runs:execute\n`,
      );
    });
    const shutdown = () => {
      server.close(() => {
        process.stdout.write(
          `Local fixture counters: responses=${counters.syntheticResponses}, snapshots=${counters.snapshots}, CountTokens=${counters.countTokens}, generation=${counters.generation}, render=${counters.renders}, staged=${counters.stagedObjects}, completed=${counters.completions}.\n`,
        );
        process.exit(0);
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch {
    process.stderr.write("Local worker fixture configuration failed.\n");
    process.exitCode = 1;
  }
}
