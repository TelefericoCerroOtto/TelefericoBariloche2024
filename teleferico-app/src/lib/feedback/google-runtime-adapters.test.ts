import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGoogleFeedbackTaskClient } from "./google-cloud-tasks";
import { readTb113LocalCloudTasksConfiguration } from "./tb113-runtime-config";
import { readTb113WorkerIdentityConfiguration } from "@teleferico/tb113-runtime-contracts";
import { createFeedbackTaskName, createCoordinatedFeedbackDispatcher } from "./dispatch";
import { createGoogleTaskOidcPolicy } from "../../../../services/survey-report-worker/src/google-task-oidc";
import { createGooglePrivateReportBucket } from "@teleferico/tb113-private-report-storage";
import { createGoogleVertexCountTokensProvider, createGoogleVertexModelProviders } from "../../../../services/survey-report-worker/src/google-vertex-count-tokens";
import { createGoogleEvidenceKeyProvider } from "../../../../services/survey-report-worker/src/google-evidence-key-provider";
import { DIRECT_INSTRUCTIONS, DIRECT_SCHEMA } from "../../../../services/survey-report-worker/src/direct-execution-plan";
import { MAP_INSTRUCTIONS, MAP_SCHEMA, REDUCE_INSTRUCTIONS, REDUCE_SCHEMA } from "../../../../services/survey-report-worker/src/map-reduce-execution-plan";
import { canonicalizeJson } from "@teleferico/survey-reporting-core";
import { createReportWorkerHttpHandler } from "../../../../services/survey-report-worker/src/worker-http";
import type { WorkerRuntimeDependencies } from "../../../../services/survey-report-worker/src/contracts";
import { Readable } from "node:stream";

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const TASK_NAME = createFeedbackTaskName(RUN_ID)!;
const INVOKER = "tasks@teleferico-bariloche-2024.iam.gserviceaccount.com";
const AUDIENCE = "https://worker-abc-uc.a.run.app";
const DOCUMENTED_PROJECT_NUMBER = "384535443802";
const DETERMINISTIC_WORKER_ORIGIN =
  `https://feedback-worker-staging-${DOCUMENTED_PROJECT_NUMBER}.southamerica-east1.run.app`;
const DETERMINISTIC_PRODUCTION_WORKER_ORIGIN =
  `https://feedback-worker-production-${DOCUMENTED_PROJECT_NUMBER}.southamerica-east1.run.app`;
const WORKER_EXECUTE_PATH = "/internal/v1/report-runs:execute";
const ENDPOINT = "https://aiplatform.us.rep.googleapis.com/v1/projects/teleferico-bariloche-2024/locations/us/publishers/google/models/gemini-3.8-flash:countTokens";

function workerIdentityEnvironment(
  workerUrl: string,
  audience: string,
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    K_SERVICE: "feedback-worker-staging",
    K_REVISION: "feedback-worker-staging-00001-test",
    FEEDBACK_WORKER_URL: workerUrl,
    FEEDBACK_WORKER_OIDC_AUDIENCE: audience,
    FEEDBACK_TASK_INVOKER_EMAIL: INVOKER,
    FEEDBACK_WORKER_OIDC_PRINCIPAL: INVOKER,
    FEEDBACK_VERTEX_PROJECT_ID: "teleferico-bariloche-2024",
  };
}

function createTaskClientForWorker(workerUrl: string, audience: string) {
  return createGoogleFeedbackTaskClient({
    projectId: "teleferico-bariloche-2024",
    location: "southamerica-east1",
    queue: "feedback-reports",
    workerUrl,
    audience,
    invokerServiceAccount: INVOKER,
    accessTokenProvider: async () => "synthetic-access-token",
    fetchImplementation: vi.fn<typeof fetch>(),
  });
}

function oidcPayload(overrides: Record<string, unknown> = {}) {
  return {
    iss: "https://accounts.google.com",
    aud: AUDIENCE,
    email: INVOKER,
    email_verified: true,
    iat: 1_000,
    exp: 1_100,
    ...overrides,
  };
}

function modelConfig(overrides: Record<string, unknown> = {}) {
  return {
    version: "survey-model-config.v1",
    evidenceKeyId: "key-1",
    provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024",
    vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
    model: "gemini-3.8-flash",
    temperature: 0,
    reasoning: "LOW",
    grounding: false,
    promptVersion: "prompt-1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redact-1",
    validatorVersion: "validate-1",
    chunkVersion: "chunk-1",
    verifiedInputTokenLimit: 32_000,
    map: { targetMin: 600, targetMax: 1_200, hardMax: 4_000 },
    directReduce: { targetMin: 1_800, targetMax: 3_000, hardMax: 8_000 },
    safetyHeadroomTokens: 3_200,
    sourceRevision: "revision-1",
    ...overrides,
  } as never;
}

function fakeBucket() {
  const objects = new Map<string, { bytes: Buffer; metadata: Record<string, unknown>; generation: string }>();
  const deleted: Array<{ key: string; generation: unknown }> = [];
  const readGenerations: Array<{ key: string; generation: string | undefined }> = [];
  const bucket = {
    getMetadata: vi.fn(async () => [{ iamConfiguration: {
      uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: "enforced",
    } }]),
    iam: { getPolicy: vi.fn(async () => [{ bindings: [{ members: ["serviceAccount:worker@example.iam.gserviceaccount.com"] }] }]) },
    file(key: string, options?: { generation?: string }) {
      readGenerations.push({ key, generation: options?.generation });
      return {
        async save(bytes: Buffer, options: Record<string, unknown>) {
          const preconditions = options.preconditionOpts as { ifGenerationMatch?: number };
          if (preconditions.ifGenerationMatch !== 0 || objects.has(key)) throw Object.assign(new Error("precondition"), { code: 412 });
          const metadata = options.metadata as { contentType: string; cacheControl: string; metadata: Record<string, string> };
          objects.set(key, { bytes, generation: "11", metadata: { size: bytes.byteLength, generation: "11", contentType: metadata.contentType, cacheControl: metadata.cacheControl, metadata: metadata.metadata } });
        },
        async getMetadata() {
          const object = objects.get(key);
          if (!object || (options?.generation && options.generation !== object.generation)) throw Object.assign(new Error("missing"), { code: 404 });
          return [object.metadata];
        },
        createReadStream() {
          const object = objects.get(key);
          if (!object || (options?.generation && options.generation !== object.generation)) throw new Error("missing");
          return Readable.from([object.bytes]);
        },
        async delete(options: Record<string, unknown>) {
          deleted.push({ key, generation: options.ifGenerationMatch });
          const object = objects.get(key);
          if (!object || String(options.ifGenerationMatch) !== object.generation)
            throw Object.assign(new Error("precondition"), { code: 412 });
          objects.delete(key);
        },
      };
    },
  };
  return { bucket, objects, deleted, readGenerations };
}

describe("Google TB-113 runtime adapters", () => {
  it("rejects a token whose signature cannot be verified before reading the worker body", async () => {
    const policy = createGoogleTaskOidcPolicy({
      audience: AUDIENCE,
      principal: INVOKER,
      issuerAllowlist: ["https://accounts.google.com"],
      nowSeconds: () => 1_050,
      verifier: { verifyIdToken: vi.fn(async () => { throw new Error("signature verification rejected"); }) },
    });
    const dependencies = {
      cms: { claim: vi.fn(), snapshot: vi.fn(), checkpoint: vi.fn(), complete: vi.fn(), fail: vi.fn() },
      artifacts: { stage: vi.fn(), readStaged: vi.fn(), discardStaged: vi.fn() },
      renderer: { rendererVersion: "test", render: vi.fn() },
    } as unknown as WorkerRuntimeDependencies;
    const handler = createReportWorkerHttpHandler({ oidc: policy, dependencies });
    const readBody = vi.fn(async () => new TextEncoder().encode("{}"));
    const result = await handler({ method: "POST", url: "/internal/v1/report-runs:execute", headers: new Headers({ authorization: "Bearer signed.jwt.token" }), readBody });
    expect(result.status).toBe(401);
    expect(readBody).not.toHaveBeenCalled();
  });

  it("verifies a signed different principal and lets the worker policy deny it before body access", async () => {
    const policy = createGoogleTaskOidcPolicy({
      audience: AUDIENCE,
      principal: INVOKER,
      issuerAllowlist: ["https://accounts.google.com"],
      nowSeconds: () => 1_050,
      verifier: { verifyIdToken: vi.fn(async () => ({ getPayload: () => oidcPayload({ email: "other@teleferico-bariloche-2024.iam.gserviceaccount.com" }) })) },
    });
    expect(await policy.verifySignedToken("synthetic-signed-token")).toMatchObject({
      signatureVerified: true,
      principal: "other@teleferico-bariloche-2024.iam.gserviceaccount.com",
    });
    const dependencies = {
      cms: { claim: vi.fn(), snapshot: vi.fn(), checkpoint: vi.fn(), complete: vi.fn(), fail: vi.fn() },
      artifacts: { stage: vi.fn(), readStaged: vi.fn(), discardStaged: vi.fn() },
      renderer: { rendererVersion: "test", render: vi.fn() },
    } as unknown as WorkerRuntimeDependencies;
    const handler = createReportWorkerHttpHandler({ oidc: policy, dependencies });
    const readBody = vi.fn(async () => new TextEncoder().encode("{}"));
    const result = await handler({ method: "POST", url: "/internal/v1/report-runs:execute", headers: new Headers({ authorization: "Bearer signed.jwt.token" }), readBody });
    expect(result.status).toBe(403);
    expect(readBody).not.toHaveBeenCalled();
  });

  it.each([
    { aud: "https://different-worker.example" },
    { exp: 1_049 },
    { iat: 1_081 },
    { nbf: 1_051 },
    { email_verified: false },
    { iss: "https://untrusted.example" },
  ])("rejects untrusted OIDC claims %#", async (claims) => {
    const policy = createGoogleTaskOidcPolicy({
      audience: AUDIENCE,
      principal: INVOKER,
      issuerAllowlist: ["https://accounts.google.com"],
      nowSeconds: () => 1_050,
      verifier: { verifyIdToken: vi.fn(async () => ({ getPayload: () => oidcPayload(claims) })) },
    });
    await expect(policy.verifySignedToken("synthetic-signed-token")).resolves.toBeNull();
  });

  it("sends no second task after an ambiguous response and a replayed reservation", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockRejectedValue(new Error("socket closed"));
    const taskClient = createGoogleFeedbackTaskClient({
      projectId: "teleferico-bariloche-2024", location: "southamerica-east1", queue: "feedback-reports",
      workerUrl: `${AUDIENCE}/internal/v1/report-runs:execute`, audience: AUDIENCE,
      invokerServiceAccount: INVOKER, accessTokenProvider: async () => "synthetic-token", fetchImplementation,
    });
    let reservationCount = 0;
    let outcome: "created" | "unknown" | null = null;
    const dispatchState = {
      trust: "verified" as const,
      reserve: vi.fn(async ({ reportRunId, taskName, expectedStateVersion }: { reportRunId: string; taskName: string; expectedStateVersion: number }) => {
        reservationCount += 1;
        return { reportRunId, taskName, stateVersion: expectedStateVersion + 1, dispatchState: "reserved" as const, dispatchAttemptCount: reservationCount > 1 ? 1 : 0, replayed: reservationCount > 1 };
      }),
      record: vi.fn(async ({ reportRunId, taskName, expectedStateVersion, outcome: value, dispatchAttemptCount }: { reportRunId: string; taskName: string; expectedStateVersion: number; outcome: "created" | "unknown"; dispatchAttemptCount: 1 | 2 | 3 }) => {
        outcome = value;
        return { reportRunId, taskName, stateVersion: expectedStateVersion + 1, dispatchState: value, dispatchAttemptCount, replayed: false };
      }),
    };
    const request = { reportRunId: RUN_ID, taskName: TASK_NAME, expectedStateVersion: 4 };
    const result = await createCoordinatedFeedbackDispatcher({ taskClient, dispatchState }).dispatch(request);
    expect(result.status).toBe("queued");
    expect(outcome).toBe("unknown");
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    const replay = await createCoordinatedFeedbackDispatcher({ taskClient, dispatchState }).dispatch(request);
    expect(replay.status).toBe("queued");
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("verifies an existing Cloud Task only when the stored content type and OIDC identity match", async () => {
    const fullName = `projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports/tasks/${TASK_NAME}`;
    const taskBody = Buffer.from(JSON.stringify({ commandVersion: "survey-report-command.v1", reportRunId: RUN_ID })).toString("base64");
    const createFetch = (contentType: string) => vi.fn<typeof fetch>(async (_url, init) => {
      if (init?.method === "POST") return Response.json({ error: { status: "ALREADY_EXISTS" } }, { status: 409 });
      return Response.json({ name: fullName, httpRequest: {
        httpMethod: "POST",
        url: `${AUDIENCE}/internal/v1/report-runs:execute`,
        headers: { "Content-Type": contentType },
        body: taskBody,
        oidcToken: { serviceAccountEmail: INVOKER, audience: AUDIENCE },
      } });
    });
    const input = {
      projectId: "teleferico-bariloche-2024", location: "southamerica-east1", queue: "feedback-reports",
      workerUrl: `${AUDIENCE}/internal/v1/report-runs:execute`, audience: AUDIENCE,
      invokerServiceAccount: INVOKER, accessTokenProvider: async () => "synthetic-token",
    };
    const matching = createGoogleFeedbackTaskClient({ ...input, fetchImplementation: createFetch("application/json") });
    await expect(matching.createTask({ taskName: TASK_NAME, reportRunId: RUN_ID, commandVersion: "survey-report-command.v1" })).rejects.toMatchObject({ kind: "already-exists" });
    await expect(matching.verifyExistingTask({ taskName: TASK_NAME, reportRunId: RUN_ID })).resolves.toMatchObject({ status: "verified", reportRunId: RUN_ID });

    const mismatched = createGoogleFeedbackTaskClient({ ...input, fetchImplementation: createFetch("text/plain") });
    await expect(mismatched.verifyExistingTask({ taskName: TASK_NAME, reportRunId: RUN_ID })).resolves.toBeNull();
  });

  it("uses the authenticated loopback task API only in development and verifies duplicate identity", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const workerUrl = "http://127.0.0.1:18231/internal/v1/report-runs:execute";
    const queuePath = "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports";
    const fullName = `${queuePath}/tasks/${TASK_NAME}`;
    const existingTasks: Record<string, unknown>[] = [];
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImplementation = vi.fn<typeof fetch>(async (url, init) => {
      requests.push({ url: String(url), init });
      if (init?.method === "POST") {
        const input = JSON.parse(String(init.body)) as { task: Record<string, unknown> };
        if (existingTasks.length) return Response.json({ error: { status: "ALREADY_EXISTS" } }, { status: 409 });
        existingTasks.push(input.task);
        return Response.json({ name: fullName });
      }
      return existingTasks.length
        ? Response.json(existingTasks[0])
        : Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
    });
    const input = {
      projectId: "teleferico-bariloche-2024", location: "southamerica-east1", queue: "feedback-reports",
      workerUrl, audience: "http://127.0.0.1:18231", invokerServiceAccount: "tb113-local-task-invoker",
      fetchImplementation,
    };
    try {
      const client = createGoogleFeedbackTaskClient(input);
      await expect(client.createTask({ taskName: TASK_NAME, reportRunId: RUN_ID, commandVersion: "survey-report-command.v1" }))
        .resolves.toEqual({ taskName: TASK_NAME, reportRunId: RUN_ID });
      await expect(client.createTask({ taskName: TASK_NAME, reportRunId: RUN_ID, commandVersion: "survey-report-command.v1" }))
        .rejects.toMatchObject({ kind: "already-exists" });
      await expect(client.verifyExistingTask({ taskName: TASK_NAME, reportRunId: RUN_ID }))
        .resolves.toMatchObject({ status: "verified", reportRunId: RUN_ID });
      expect(requests[0]?.url).toBe(`http://127.0.0.1:18232/_local-tasks/v2/${queuePath}/tasks`);
      expect(new Headers(requests[0]?.init?.headers).get("authorization")).toBe("Bearer tb113-local-task-api-v1");

      const existing = existingTasks[0]!;
      existingTasks[0] = { ...existing, httpRequest: {
        ...(existing.httpRequest as Record<string, unknown>),
        body: Buffer.from(JSON.stringify({ commandVersion: "survey-report-command.v1", reportRunId: "22222222-2222-4222-8222-222222222222" })).toString("base64"),
      } };
      await expect(client.verifyExistingTask({ taskName: TASK_NAME, reportRunId: RUN_ID })).resolves.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not accept a loopback worker URL outside development", () => {
    expect(() => createGoogleFeedbackTaskClient({
      projectId: "teleferico-bariloche-2024", location: "southamerica-east1", queue: "feedback-reports",
      workerUrl: "http://127.0.0.1:18231/internal/v1/report-runs:execute", audience: "http://127.0.0.1:18231",
      invokerServiceAccount: "tb113-local-task-invoker", accessTokenProvider: async () => "unused",
      fetchImplementation: vi.fn<typeof fetch>(),
    })).toThrow();
  });

  it.each([
    ["staging", DETERMINISTIC_WORKER_ORIGIN],
    ["production", DETERMINISTIC_PRODUCTION_WORKER_ORIGIN],
  ])("accepts the exact deterministic %s URL in worker runtime configuration", (_environment, origin) => {
    const workerUrl = `${origin}${WORKER_EXECUTE_PATH}`;
    expect(readTb113WorkerIdentityConfiguration(workerIdentityEnvironment(workerUrl, origin)).workerUrl)
      .toBe(workerUrl);
  });

  it.each([
    ["staging", DETERMINISTIC_WORKER_ORIGIN],
    ["production", DETERMINISTIC_PRODUCTION_WORKER_ORIGIN],
  ])("accepts the exact deterministic %s URL in app task configuration", (_environment, origin) => {
    expect(() => createTaskClientForWorker(`${origin}${WORKER_EXECUTE_PATH}`, origin)).not.toThrow();
  });

  it.each([
    [
      "malformed project number",
      "https://feedback-worker-staging-0.southamerica-east1.run.app",
      "https://feedback-worker-staging-0.southamerica-east1.run.app",
    ],
    [
      "overlong project number",
      "https://feedback-worker-staging-123456789012345678901.southamerica-east1.run.app",
      "https://feedback-worker-staging-123456789012345678901.southamerica-east1.run.app",
    ],
    [
      "different valid project number",
      "https://feedback-worker-staging-123456789012.southamerica-east1.run.app",
      "https://feedback-worker-staging-123456789012.southamerica-east1.run.app",
    ],
    [
      "wrong region",
      "https://feedback-worker-staging-123456789012.us-central1.run.app",
      "https://feedback-worker-staging-123456789012.us-central1.run.app",
    ],
    [
      "wrong service name",
      "https://feedback-worker-other-123456789012.southamerica-east1.run.app",
      "https://feedback-worker-other-123456789012.southamerica-east1.run.app",
    ],
    [
      "extra path segment",
      `${DETERMINISTIC_WORKER_ORIGIN}${WORKER_EXECUTE_PATH}/extra`,
      DETERMINISTIC_WORKER_ORIGIN,
    ],
    [
      "wrong OIDC audience",
      `${DETERMINISTIC_WORKER_ORIGIN}${WORKER_EXECUTE_PATH}`,
      "https://different.example",
    ],
    [
      "unrecognized run.app host",
      `https://other-service-123456789012.southamerica-east1.run.app${WORKER_EXECUTE_PATH}`,
      "https://other-service-123456789012.southamerica-east1.run.app",
    ],
    [
      "non-default port",
      `https://feedback-worker-staging-123456789012.southamerica-east1.run.app:8443${WORKER_EXECUTE_PATH}`,
      "https://feedback-worker-staging-123456789012.southamerica-east1.run.app:8443",
    ],
    [
      "noncanonical default port",
      `https://feedback-worker-staging-123456789012.southamerica-east1.run.app:443${WORKER_EXECUTE_PATH}`,
      DETERMINISTIC_WORKER_ORIGIN,
    ],
  ])("rejects deterministic worker URL with %s", (_reason, workerUrl, audience) => {
    expect(() =>
      readTb113WorkerIdentityConfiguration(
        workerIdentityEnvironment(workerUrl, audience),
      ),
    ).toThrow();
    expect(() => createTaskClientForWorker(workerUrl, audience)).toThrow();
  });

  it("continues to accept the existing hash-based Cloud Run worker URL", () => {
    const workerUrl = `${AUDIENCE}${WORKER_EXECUTE_PATH}`;
    expect(() =>
      readTb113WorkerIdentityConfiguration(workerIdentityEnvironment(workerUrl, AUDIENCE)),
    ).not.toThrow();
    expect(() => createTaskClientForWorker(workerUrl, AUDIENCE)).not.toThrow();
  });

  it("derives local task identity only from exact loopback settings in development", () => {
    const env = {
      NODE_ENV: "development",
      FEEDBACK_WORKER_URL: "http://127.0.0.1:18231/internal/v1/report-runs:execute",
      FEEDBACK_TASK_QUEUE_PATH: "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports",
    } as NodeJS.ProcessEnv;
    expect(readTb113LocalCloudTasksConfiguration(env)).toMatchObject({
      workerUrl: env.FEEDBACK_WORKER_URL,
      audience: "http://127.0.0.1:18231",
      taskInvokerEmail: "tb113-local-task-invoker",
      queue: "feedback-reports",
    });
    expect(() => readTb113LocalCloudTasksConfiguration({
      ...env,
      FEEDBACK_WORKER_URL: "http://localhost:18231/internal/v1/report-runs:execute",
    })).toThrow();
    expect(() => readTb113LocalCloudTasksConfiguration({ ...env, NODE_ENV: "production" }))
      .toThrow();
  });

  it("creates private GCS objects conditionally, reads within bounds, and deletes only the observed generation", async () => {
    const fake = fakeBucket();
    const bucket = createGooglePrivateReportBucket({
      bucketName: "approved-private-bucket",
      objectPrefix: "private/feedback-reports",
      storage: { bucket: () => fake.bucket } as never,
    });
    expect(await bucket.isPrivate()).toBe(true);
    const bytes = Buffer.from("%PDF-synthetic");
    const expected = {
      contractVersion: "survey-private-report-object.v1" as const,
      reportId: "22222222-2222-4222-8222-222222222222",
      reportRunId: RUN_ID,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      mimeType: "application/pdf" as const,
    };
    const key = `private/feedback-reports/${expected.reportId}/report.pdf`;
    expect(await bucket.createIfAbsent({ objectKey: key, bytes, contentType: "application/pdf", cacheControl: "private, no-store", customMetadata: expected })).toBe("created");
    expect(await bucket.createIfAbsent({ objectKey: key, bytes, contentType: "application/pdf", cacheControl: "private, no-store", customMetadata: expected })).toBe("exists");
    expect(await bucket.readBounded(key, 1024)).toEqual(bytes);
    expect(fake.readGenerations).toContainEqual({ key, generation: "11" });
    expect(await bucket.deleteIfMetadataMatches(key, expected)).toBe(true);
    expect(fake.deleted).toEqual([{ key, generation: "11" }]);
  });

  it("pins Vertex CountTokens to the approved host/model and returns bounded segment evidence", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async (url, init) => {
      expect(String(url)).toBe(ENDPOINT);
      expect(init?.redirect).toBe("error");
      return Response.json({ totalTokens: 7 });
    });
    const provider = createGoogleVertexCountTokensProvider({ fetchImplementation, accessTokenProvider: async () => "synthetic-token" });
    const counts = await provider({
      contractVersion: "survey-count-request.v1",
      modelConfig: modelConfig(),
      segments: { instructions: "instructions", schema: "schema", metrics: "metrics", comments: "comments" },
    });
    expect(counts).toEqual({ instructions: 7, schema: 7, metrics: 7, comments: 7 });
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
    await expect(provider({
      contractVersion: "survey-count-request.v1",
      modelConfig: modelConfig({ vertexApiEndpoint: "us-aiplatform.googleapis.com" }),
      segments: { instructions: "i", schema: "s", metrics: "m", comments: "c" },
    })).rejects.toMatchObject({ code: "CONFIGURATION" });
    expect(fetchImplementation).toHaveBeenCalledTimes(4);
  });

  it("generates direct, map, and reduce outputs from their exact counted segments", async () => {
    const metrics = {} as never;
    const directRequest = { contractVersion: "survey-model-input.v1", metrics, comments: [{ period: "current", text: "Synthetic comment", evidenceRef: "e_aaaaaaaaaaaaaaaaaaaa" }] } as const;
    const mapRequest = { contractVersion: "survey-map-input.v1", chunkId: "map.1-of-1", chunkIndex: 1, chunkCount: 1, metrics, comments: directRequest.comments } as const;
    const reduceRequest = { contractVersion: "survey-reduce-input.v1", metrics, maps: [{ chunkId: "map.1-of-1", outputDigest: "a".repeat(64), validatedOutput: { schemaVersion: "survey-map.v1", chunkId: "map.1-of-1", coveredRefs: [], themes: [], limitations: [] } }] } as const;
    const countedRequest = (stage: "direct" | "map" | "reduce", request: typeof directRequest | typeof mapRequest | typeof reduceRequest) => {
      const prompt = stage === "direct"
        ? { instructions: DIRECT_INSTRUCTIONS, schema: DIRECT_SCHEMA }
        : stage === "map" ? { instructions: MAP_INSTRUCTIONS, schema: MAP_SCHEMA }
          : { instructions: REDUCE_INSTRUCTIONS, schema: REDUCE_SCHEMA };
      const comments = stage === "direct"
        ? canonicalizeJson({ contractVersion: directRequest.contractVersion, comments: directRequest.comments })
        : canonicalizeJson(request);
      return {
        contractVersion: "survey-count-request.v1" as const,
        modelConfig: modelConfig(),
        segments: { ...prompt, metrics: canonicalizeJson(request.metrics), comments },
      };
    };
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchImplementation = vi.fn<typeof fetch>(async (url, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.push({ url: String(url), body });
      return Response.json({
        modelVersion: "gemini-3.8-flash-001",
        candidates: [{ finishReason: "STOP", content: { role: "model", parts: [{ text: JSON.stringify({ schemaVersion: "synthetic.v1" }) }] } }],
        usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2 },
      });
    });
    const providers = createGoogleVertexModelProviders({ fetchImplementation, accessTokenProvider: async () => "synthetic-token" });

    const directCount = countedRequest("direct", directRequest);
    const mapCount = countedRequest("map", mapRequest);
    const reduceCount = countedRequest("reduce", reduceRequest);
    const directResult = await providers.analysisProvider(directRequest, directCount);
    const mapResult = await providers.mapProvider(mapRequest, mapCount);
    const reduceResult = await providers.reduceProvider(reduceRequest, reduceCount);

    expect([directResult.output, mapResult.output, reduceResult.output]).toEqual([
      { schemaVersion: "synthetic.v1" }, { schemaVersion: "synthetic.v1" }, { schemaVersion: "synthetic.v1" },
    ]);
    expect(directResult.usage).toMatchObject({ model: "gemini-3.8-flash", modelRevision: "gemini-3.8-flash-001", sku: "gemini-3.8-flash", usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2 } });
    expect(calls).toHaveLength(3);
    for (const [index, countRequest] of [directCount, mapCount, reduceCount].entries()) {
      expect(calls[index]?.url).toBe(ENDPOINT.replace(":countTokens", ":generateContent"));
      const body = calls[index]?.body;
      const content = (body?.contents as Array<{ parts: Array<{ text: string }> }>)[0]!;
      expect(content.parts.map(({ text }) => text)).toEqual([
        countRequest.segments.instructions,
        countRequest.segments.schema,
        countRequest.segments.metrics,
        countRequest.segments.comments,
      ]);
      expect(body?.generationConfig).toMatchObject({ temperature: 0, responseMimeType: "application/json" });
      expect(body?.generationConfig).toMatchObject({ maxOutputTokens: index === 1 ? 4_000 : 8_000 });
    }
    await expect(providers.mapProvider(mapRequest, { ...mapCount, segments: { ...mapCount.segments, comments: "{}" } })).rejects.toMatchObject({ code: "CONFIGURATION" });
    expect(calls).toHaveLength(3);
  });

  it("rejects malformed generation JSON and provider-reported prompt usage above the model limit", async () => {
    const request = { contractVersion: "survey-model-input.v1", metrics: {} as never, comments: [{ period: "current", text: "safe", evidenceRef: "e_aaaaaaaaaaaaaaaaaaaa" }] } as const;
    const countRequest = {
      contractVersion: "survey-count-request.v1" as const,
      modelConfig: modelConfig(),
      segments: {
        instructions: DIRECT_INSTRUCTIONS,
        schema: DIRECT_SCHEMA,
        metrics: canonicalizeJson(request.metrics),
        comments: canonicalizeJson({ contractVersion: request.contractVersion, comments: request.comments }),
      },
    };
    let responseText = "not-json";
    let promptTokenCount = 1;
    const providers = createGoogleVertexModelProviders({
      accessTokenProvider: async () => "synthetic-token",
      fetchImplementation: async () => Response.json({
        modelVersion: "gemini-3.8-flash-001",
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: responseText }] } }],
        usageMetadata: { promptTokenCount, candidatesTokenCount: 1 },
      }),
    });
    await expect(providers.analysisProvider(request, countRequest)).rejects.toMatchObject({
      code: "INVALID_OUTPUT",
      outputRejection: { stage: "direct", reasonCategory: "provider_json" },
    });
    responseText = "{}";
    promptTokenCount = 32_001;
    await expect(providers.analysisProvider(request, countRequest)).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
  });

  it.each(["direct", "map", "reduce"] as const)(
    "binds provider rejection metadata to the closed %s stage",
    async (stage) => {
      const metrics = {} as never;
      const directRequest = {
        contractVersion: "survey-model-input.v1",
        metrics,
        comments: [],
      } as const;
      const request =
        stage === "direct"
          ? directRequest
          : stage === "map"
            ? {
                contractVersion: "survey-map-input.v1",
                chunkId: "map.1-of-1",
                chunkIndex: 1,
                chunkCount: 1,
                metrics,
                comments: [],
              }
            : { contractVersion: "survey-reduce-input.v1", metrics, maps: [] };
      const prompt =
        stage === "direct"
          ? { instructions: DIRECT_INSTRUCTIONS, schema: DIRECT_SCHEMA }
          : stage === "map"
            ? { instructions: MAP_INSTRUCTIONS, schema: MAP_SCHEMA }
            : { instructions: REDUCE_INSTRUCTIONS, schema: REDUCE_SCHEMA };
      const countRequest = {
        contractVersion: "survey-count-request.v1" as const,
        modelConfig: modelConfig(),
        segments: {
          ...prompt,
          metrics: canonicalizeJson(metrics),
          comments: stage === "direct" ? "[]" : canonicalizeJson(request),
        },
      };
      const providers = createGoogleVertexModelProviders({
        accessTokenProvider: async () => "synthetic-token",
        fetchImplementation: async () =>
          Response.json({
            modelVersion: "synthetic-revision",
            candidates: [
              {
                finishReason: "MAX_TOKENS",
                content: { parts: [{ text: "SYNTHETIC_OUTPUT_MARKER" }] },
              },
            ],
            usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
          }),
      });
      const call =
        stage === "direct"
          ? providers.analysisProvider(request as typeof directRequest, countRequest)
          : stage === "map"
            ? providers.mapProvider(request as never, countRequest)
            : providers.reduceProvider(request as never, countRequest);

      await expect(call).rejects.toMatchObject({
        code: "INVALID_OUTPUT",
        outputRejection: { stage, reasonCategory: "provider_candidate" },
      });
    },
  );

  it("reads only the pinned Secret Manager version for the approved evidence-key ID", async () => {
    const keyBytes = Buffer.alloc(40, 23);
    const accessUrl = "https://secretmanager.googleapis.com/v1/projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7:access";
    const fetchImplementation = vi.fn<typeof fetch>(async (url, init) => {
      expect(String(url)).toBe(accessUrl);
      expect(init?.method).toBe("GET");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer synthetic-adc-token");
      expect(init?.redirect).toBe("error");
      return Response.json({ name: accessUrl.slice("https://secretmanager.googleapis.com/v1/".length, -7), payload: { data: keyBytes.toString("base64") } });
    });
    const provider = createGoogleEvidenceKeyProvider({
      secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
      evidenceKeyId: "key-1",
      fetchImplementation,
      accessTokenProvider: async () => "synthetic-adc-token",
    });
    await expect(provider("key-1")).resolves.toEqual(new Uint8Array(keyBytes));
    await expect(provider("other-key")).rejects.toMatchObject({ code: "CONFIGURATION" });
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(() => createGoogleEvidenceKeyProvider({ secretVersion: "projects/other/secrets/key/versions/latest", evidenceKeyId: "key-1" })).toThrow();
  });

  it("accepts only the exact verified project-number alias in the access response", async () => {
    const secretVersion = "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7";
    const responseName = "projects/384535443802/secrets/tb113-evidence/versions/7";
    const keyBytes = Buffer.alloc(40, 23);
    const fetchImplementation = vi.fn<typeof fetch>(async (url) => {
      expect(String(url)).toBe(`https://secretmanager.googleapis.com/v1/${secretVersion}:access`);
      return Response.json({ name: responseName, payload: { data: keyBytes.toString("base64") } });
    });
    const provider = createGoogleEvidenceKeyProvider({
      secretVersion,
      evidenceKeyId: "key-1",
      fetchImplementation,
      accessTokenProvider: async () => "synthetic-adc-token",
    });

    await expect(provider("key-1")).resolves.toEqual(new Uint8Array(keyBytes));
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it.each([
    "projects/384535443803/secrets/tb113-evidence/versions/7",
    "projects/other-project/secrets/tb113-evidence/versions/7",
    "projects/384535443802/secrets/other/versions/7",
    "projects/384535443802/secrets/tb113-evidence/versions/8",
    "projects/384535443802/secrets/tb113-evidence/versions/latest",
    "projects/384535443802/secrets/tb113-evidence/versions/7/extra",
  ])("rejects unapproved Secret Manager response name %s", async (responseName) => {
    const keyBytes = Buffer.alloc(40, 23);
    const provider = createGoogleEvidenceKeyProvider({
      secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
      evidenceKeyId: "key-1",
      fetchImplementation: async () => Response.json({ name: responseName, payload: { data: keyBytes.toString("base64") } }),
      accessTokenProvider: async () => "synthetic-adc-token",
    });

    await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
  });

  it.each([
    null,
    { name: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7" },
    { name: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7", payload: { data: 32 } },
    { name: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7", payload: { data: "not-base64!" } },
  ])("rejects malformed Secret Manager access response %#", async (response) => {
    const provider = createGoogleEvidenceKeyProvider({
      secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
      evidenceKeyId: "key-1",
      fetchImplementation: async () => Response.json(response),
      accessTokenProvider: async () => "synthetic-adc-token",
    });

    await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
  });

  it.each([
    "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
    "projects/384535443802/secrets/tb113-evidence/versions/7",
  ])("rejects a short synthetic key for approved response name %s", async (responseName) => {
    const shortKeyBytes = Buffer.alloc(31, 23);
    const provider = createGoogleEvidenceKeyProvider({
      secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
      evidenceKeyId: "key-1",
      fetchImplementation: async () => Response.json({
        name: responseName,
        payload: { data: shortKeyBytes.toString("base64") },
      }),
      accessTokenProvider: async () => "synthetic-adc-token",
    });

    await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
  });

  describe("worker evidence-key access logs", () => {
    it.each([
      ["configured project ID", "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7", "configured_id"],
      ["approved project number", "projects/384535443802/secrets/tb113-evidence/versions/7", "approved_number"],
    ])("emits one fixed event for %s success", async (_description, responseName, identityClass) => {
      const keyBytes = Buffer.alloc(40, 23);
      const logLines: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => Response.json({ name: responseName, payload: { data: keyBytes.toString("base64") } }),
        accessTokenProvider: async () => "synthetic-access-token",
      });

      try {
        await expect(provider("key-1")).resolves.toEqual(new Uint8Array(keyBytes));
        await expect(provider("unapproved-key-id")).rejects.toMatchObject({ code: "CONFIGURATION" });
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logLines.map((line) => JSON.parse(line))).toEqual([{
          event: "tb113_evidence_key_access",
          outcome: "accepted",
          identityClass,
          failureClass: "none",
          httpStatus: 200,
        }]);
      } finally {
        logSpy.mockRestore();
      }
    });

    it("logs a rejected response name without exposing response, key, or token strings", async () => {
      const secretMarker = "SYNTHETIC_SECRET_NAME_SENTINEL";
      const tokenMarker = "SYNTHETIC_ACCESS_TOKEN_SENTINEL";
      const keyBytes = Buffer.alloc(40, 0x53);
      const logLines: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => Response.json({
          name: `projects/unapproved/secrets/${secretMarker}/versions/1`,
          payload: { data: keyBytes.toString("base64") },
        }),
        accessTokenProvider: async () => tokenMarker,
      });

      try {
        await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logLines.map((line) => JSON.parse(line))).toEqual([{
          event: "tb113_evidence_key_access",
          outcome: "rejected",
          identityClass: "mismatch_or_missing",
          failureClass: "name_mismatch_or_missing",
          httpStatus: 200,
        }]);
        expect(logLines.join("\n")).not.toContain(secretMarker);
        expect(logLines.join("\n")).not.toContain(tokenMarker);
        expect(logLines.join("\n")).not.toContain(keyBytes.toString("base64"));
      } finally {
        logSpy.mockRestore();
      }
    });

    it("logs a bounded HTTP failure without exposing its response body", async () => {
      const responseMarker = "SYNTHETIC_HTTP_BODY_SENTINEL";
      const logLines: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => Response.json({ detail: responseMarker }, { status: 503 }),
        accessTokenProvider: async () => "synthetic-access-token",
      });

      try {
        await expect(provider("key-1")).rejects.toMatchObject({ code: "PROVIDER_TRANSIENT" });
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logLines.map((line) => JSON.parse(line))).toEqual([{
          event: "tb113_evidence_key_access",
          outcome: "rejected",
          identityClass: "mismatch_or_missing",
          failureClass: "http_error",
          httpStatus: 503,
        }]);
        expect(logLines.join("\n")).not.toContain(responseMarker);
      } finally {
        logSpy.mockRestore();
      }
    });

    it("logs a fetch failure without exposing the dependency error", async () => {
      const errorMarker = "SYNTHETIC_FETCH_ERROR_SENTINEL";
      const logLines: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => {
          throw new Error(errorMarker);
        },
        accessTokenProvider: async () => "synthetic-access-token",
      });

      try {
        await expect(provider("key-1")).rejects.toMatchObject({ code: "PROVIDER_TRANSIENT" });
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logLines.map((line) => JSON.parse(line))).toEqual([{
          event: "tb113_evidence_key_access",
          outcome: "unavailable",
          identityClass: "mismatch_or_missing",
          failureClass: "request_error",
          httpStatus: null,
        }]);
        expect(logLines.join("\n")).not.toContain(errorMarker);
      } finally {
        logSpy.mockRestore();
      }
    });

    it("classifies invalid JSON without logging its raw body", async () => {
      const responseMarker = "SYNTHETIC_INVALID_JSON_SENTINEL";
      const logLines: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => new Response(`{"value":"${responseMarker}"`, {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
        accessTokenProvider: async () => "synthetic-access-token",
      });

      try {
        await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(logLines.map((line) => JSON.parse(line))).toEqual([{
          event: "tb113_evidence_key_access",
          outcome: "rejected",
          identityClass: "mismatch_or_missing",
          failureClass: "json_invalid",
          httpStatus: 200,
        }]);
        expect(logLines.join("\n")).not.toContain(responseMarker);
      } finally {
        logSpy.mockRestore();
      }
    });

    it("classifies malformed payloads and short keys without logging payload data", async () => {
      const responseMarker = "SYNTHETIC_PAYLOAD_SENTINEL";
      const keyBytes = Buffer.alloc(31, 0x4b);
      const scenarios = [
        { failureClass: "payload_invalid", data: responseMarker },
        { failureClass: "short_key", data: keyBytes.toString("base64") },
      ] as const;
      let responseIndex = 0;
      const logLines: string[] = [];
      const logSpy = vi.spyOn(console, "log").mockImplementation((line?: unknown) => {
        logLines.push(String(line));
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => {
          const scenario = scenarios[responseIndex++];
          if (!scenario) throw new Error("no-synthetic-response-remaining");
          return Response.json({
            name: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
            payload: { data: scenario.data },
          });
        },
        accessTokenProvider: async () => "synthetic-access-token",
      });

      try {
        await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
        await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });

        expect(logSpy).toHaveBeenCalledTimes(2);
        expect(logLines.map((line) => JSON.parse(line))).toEqual(scenarios.map(({ failureClass }) => ({
            event: "tb113_evidence_key_access",
            outcome: "rejected",
            identityClass: "configured_id",
            failureClass,
            httpStatus: 200,
          })));
        expect(logLines.join("\n")).not.toContain(responseMarker);
        expect(logLines.join("\n")).not.toContain(keyBytes.toString("base64"));
      } finally {
        logSpy.mockRestore();
      }
    });

    it("preserves provider success and failure if structured logging throws", async () => {
      const keyBytes = Buffer.alloc(40, 23);
      const responses = [
        Response.json({
          name: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
          payload: { data: keyBytes.toString("base64") },
        }),
        Response.json({ name: "unapproved-response-name", payload: { data: keyBytes.toString("base64") } }),
      ];
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {
        throw new Error("SYNTHETIC_LOGGER_FAILURE_SENTINEL");
      });
      const provider = createGoogleEvidenceKeyProvider({
        secretVersion: "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/7",
        evidenceKeyId: "key-1",
        fetchImplementation: async () => {
          const response = responses.shift();
          if (!response) throw new Error("no-synthetic-response-remaining");
          return response;
        },
        accessTokenProvider: async () => "synthetic-access-token",
      });

      try {
        await expect(provider("key-1")).resolves.toEqual(new Uint8Array(keyBytes));
        await expect(provider("key-1")).rejects.toMatchObject({ code: "CONFIGURATION" });
        expect(logSpy).toHaveBeenCalledTimes(2);
      } finally {
        logSpy.mockRestore();
      }
    });
  });
});
