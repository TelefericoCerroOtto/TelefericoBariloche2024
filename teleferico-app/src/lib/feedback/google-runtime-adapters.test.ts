import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createGoogleFeedbackTaskClient } from "./google-cloud-tasks";
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

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const TASK_NAME = createFeedbackTaskName(RUN_ID)!;
const INVOKER = "tasks@teleferico-bariloche-2024.iam.gserviceaccount.com";
const AUDIENCE = "https://worker-abc-uc.a.run.app";
const ENDPOINT = "https://aiplatform.us.rep.googleapis.com/v1/projects/teleferico-bariloche-2024/locations/us/publishers/google/models/gemini-3.8-flash:countTokens";

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
          const { Readable } = require("node:stream") as typeof import("node:stream");
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
    await expect(providers.analysisProvider(request, countRequest)).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
    responseText = "{}";
    promptTokenCount = 32_001;
    await expect(providers.analysisProvider(request, countRequest)).rejects.toMatchObject({ code: "INVALID_OUTPUT" });
  });

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
});
