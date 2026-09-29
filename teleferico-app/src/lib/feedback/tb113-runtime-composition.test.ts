// @vitest-environment node

import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { Storage } from "@google-cloud/storage";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({
  jwt: "synthetic-session-jwt",
  capabilities: ["feedback.read", "feedback.comments.read", "feedback.reports.read", "feedback.reports.generate"],
}));

const storageState = vi.hoisted(() => ({
  objects: new Map<string, { bytes: Uint8Array; metadata: Record<string, unknown>; generation: string }>(),
}));

const fetchState = vi.hoisted(() => ({
  handler: undefined as unknown as (url: string, init: RequestInit) => Promise<Response>,
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: vi.fn(() => ({ ok: true })),
  requireCsrfSession: vi.fn(async () => ({
    ok: true,
    session: { jwt: authState.jwt, user: { capabilities: authState.capabilities } },
  })),
}));
vi.mock("google-auth-library", () => ({
  GoogleAuth: class {
    async getClient() {
      return { getAccessToken: async () => ({ token: "synthetic-adc-token" }) };
    }
  },
  OAuth2Client: class {},
}));
vi.mock("@google-cloud/storage", () => ({
  Storage: class {
    bucket() {
      return {
        async getMetadata() {
          return [{ iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: "enforced" } }];
        },
        iam: { getPolicy: async () => [{ bindings: [] }] },
        file(objectKey: string, options?: { generation?: string }) {
          return {
            async save(bytes: Uint8Array, settings: Record<string, unknown>) {
              const precondition = settings.preconditionOpts as { ifGenerationMatch?: number };
              if (precondition.ifGenerationMatch !== 0 || storageState.objects.has(objectKey))
                throw Object.assign(new Error("Precondition failed"), { code: 412 });
              const metadata = settings.metadata as { contentType: string; cacheControl: string; metadata: Record<string, string> };
              const generation = "101";
              storageState.objects.set(objectKey, {
                bytes: new Uint8Array(bytes),
                generation,
                metadata: { size: bytes.byteLength, generation, contentType: metadata.contentType, cacheControl: metadata.cacheControl, metadata: metadata.metadata },
              });
            },
            async getMetadata() {
              const object = storageState.objects.get(objectKey);
              if (!object || (options?.generation && options.generation !== object.generation))
                throw Object.assign(new Error("Object not found"), { code: 404 });
              return [object.metadata];
            },
            createReadStream() {
              const object = storageState.objects.get(objectKey);
              if (!object || (options?.generation && options.generation !== object.generation))
                throw new Error("Object generation is unavailable");
              return Readable.from([Buffer.from(object.bytes)]);
            },
            async delete(settings: Record<string, unknown>) {
              const object = storageState.objects.get(objectKey);
              if (!object || String(settings.ifGenerationMatch) !== object.generation)
                throw Object.assign(new Error("Precondition failed"), { code: 412 });
              storageState.objects.delete(objectKey);
            },
          };
        },
      };
    }
  },
}));

import { GET as getGenerationHistory, POST as postGeneration } from "@/app/api/admin/feedback/generations/route";
import { GET as getReportDownload } from "@/app/api/admin/feedback/reports/[reportId]/download/route";
import { createConfiguredReportWorkerHttpHandler } from "../../../../services/survey-report-worker/src/report-worker-composition";
import { createSnapshot } from "@teleferico/survey-reporting-core";
import { deterministicReportId } from "@teleferico/tb113-private-report-storage";

const CMS_ORIGIN = "https://cms.teleferico.com.ar";
const APP_ORIGIN = "https://app.teleferico.com.ar";
const WORKER_ORIGIN = "https://worker-abc-uc.a.run.app";
const TASK_INVOKER = "tb113-invoker@teleferico-bariloche-2024.iam.gserviceaccount.com";
const REPORT_ID = "22222222-2222-4222-8222-222222222222";
const RUN_ID = "11111111-1111-4111-8111-111111111111";
const APP_TOKENS = {
  feedbackAdminRead: "synthetic-feedback-admin-read-token",
  workerSourceRead: "synthetic-worker-source-read-token",
  workerReportDownloadMetadata: "synthetic-report-download-metadata-token",
};
const WORKER_TOKENS = {
  workerClaim: "synthetic-worker-claim-token",
  workerSnapshot: "synthetic-worker-snapshot-token",
  workerCheckpoint: "synthetic-worker-checkpoint-token",
  workerComplete: "synthetic-worker-complete-token",
  workerFail: "synthetic-worker-fail-token",
};

function modelConfig() {
  return {
    version: "survey-model-config.v1",
    evidenceKeyId: "evidence-key-v1",
    provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024",
    vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
    model: "gemini-3.8-flash",
    temperature: 0,
    reasoning: "LOW",
    grounding: false,
    promptVersion: "prompt-v1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redaction-v1",
    validatorVersion: "validator-v1",
    chunkVersion: "chunk-v1",
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: "approved-source-v1",
  };
}

function pricingSnapshot() {
  return {
    version: "approved-pricing-v1",
    currency: "USD",
    units: [{ sku: "gemini-3.8-flash", inputMicrosPerMillion: 100, outputMicrosPerMillion: 200 }],
  };
}

function generationConfiguration() {
  return {
    contractVersion: "survey-approved-generation-config.v1",
    sourceRevision: "approved-source-v1",
    evidenceKeyId: "evidence-key-v1",
    modelConfig: modelConfig(),
    pricingSnapshot: pricingSnapshot(),
  };
}

function installEnvironment(): void {
  vi.stubEnv("K_SERVICE", "synthetic-teleferico-app");
  vi.stubEnv("K_REVISION", "synthetic-teleferico-app-00001-test");
  vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "");
  vi.stubEnv("BUILD_STRAPI_BASE_URL", CMS_ORIGIN);
  vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");
  vi.stubEnv("TB113_CMS_ALLOWED_ORIGIN", CMS_ORIGIN);
  vi.stubEnv("TB113_APP_CMS_TOKENS_JSON", JSON.stringify(APP_TOKENS));
  vi.stubEnv("TB113_WORKER_CMS_TOKENS_JSON", JSON.stringify(WORKER_TOKENS));
  vi.stubEnv("TB113_APPROVED_GENERATION_CONFIG_JSON", JSON.stringify(generationConfiguration()));
  vi.stubEnv("TB113_WORKER_EVIDENCE_KEY", "projects/teleferico-bariloche-2024/secrets/tb113-evidence/versions/1");
  vi.stubEnv("TB113_TASK_QUEUE_PATH", "projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports");
  vi.stubEnv("TB113_WORKER_URL", `${WORKER_ORIGIN}/internal/v1/report-runs:execute`);
  vi.stubEnv("TB113_TASK_INVOKER_EMAIL", TASK_INVOKER);
  vi.stubEnv("TB113_WORKER_OIDC_AUDIENCE", WORKER_ORIGIN);
  vi.stubEnv("TB113_WORKER_OIDC_PRINCIPAL", TASK_INVOKER);
  vi.stubEnv("TB113_VERTEX_PROJECT_ID", "teleferico-bariloche-2024");
  vi.stubEnv("TB113_PRIVATE_BUCKET", "teleferico-feedback-private");
}

function installFetch(handler: (url: URL, init: RequestInit) => Promise<Response>): void {
  fetchState.handler = (url, init) => handler(new URL(url), init);
  vi.stubGlobal("fetch", vi.fn((url: string | URL, init: RequestInit = {}) => fetchState.handler(String(url), init)));
}

function emptySnapshot() {
  return createSnapshot({
    sourceRevision: "approved-source-v1",
    createdAt: "2026-09-21T12:00:00.000Z",
    dataCutoffAt: "2026-09-21T12:00:00.000Z",
    range: { from: "2026-09-01", to: "2026-09-01" },
    filters: { pointKey: null, versionKey: null },
    submissions: [],
    definitions: [{ aspectKey: "other", sortOrder: 99 }],
    points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
  });
}

function sourcePage(resource: string): Record<string, unknown> {
  const items = resource === "versions"
    ? [{ id: "version-row", versionKey: "v1", aspects: [{ id: "aspect-other", aspectKey: "other", sortOrder: 99 }] }]
    : resource === "points"
      ? [{ id: "point-row", pointKey: "point-a", displayName: "Point A", sortOrder: 1 }]
      : [];
  return { contractVersion: "survey-generation-source.v1", resource, cursor: null, nextCursor: null, total: items.length, items };
}

describe("TB-113 default runtime composition", () => {
  beforeEach(() => {
    installEnvironment();
    authState.capabilities = ["feedback.read", "feedback.comments.read", "feedback.reports.read", "feedback.reports.generate"];
    storageState.objects.clear();
    storageState.objects.clear();
    fetchState.handler = async () => { throw new Error("Unexpected external fetch"); };
    vi.stubGlobal("fetch", vi.fn((url: string | URL, init: RequestInit = {}) => fetchState.handler(String(url), init)));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("serves generation history through the authenticated default App Route Handler using only the admin-read token", async () => {
    const observedTokens: string[] = [];
    installFetch(async (url, init) => {
      expect(url.origin).toBe(CMS_ORIGIN);
      expect(url.pathname).toBe("/api/tb113/admin/feedback/read");
      observedTokens.push(new Headers(init.headers).get("authorization") ?? "");
      expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${APP_TOKENS.feedbackAdminRead}`);
      const query = JSON.parse(String(init.body)) as { resource: string };
      return Response.json({
        contractVersion: "feedback-admin-source.v1",
        resource: query.resource,
        cursor: null,
        nextCursor: null,
        total: 0,
        items: [],
      });
    });
    const request = new NextRequest(`${APP_ORIGIN}/api/admin/feedback/generations?from=2026-09-01&to=2026-09-01`);
    const response = await getGenerationHistory(request);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({ items: [], total: 0, page: 1, pageSize: 25 });
    expect(observedTokens).toEqual([`Bearer ${APP_TOKENS.feedbackAdminRead}`]);
  });

  it("fails closed before any native create or Cloud Tasks request when command configuration is incomplete", async () => {
    vi.stubEnv("TB113_APP_CMS_TOKENS_JSON", JSON.stringify({ feedbackAdminRead: APP_TOKENS.feedbackAdminRead }));
    const calls: string[] = [];
    installFetch(async (url) => { calls.push(url.href); return Response.json({ data: [] }); });
    const request = new NextRequest(`${APP_ORIGIN}/api/admin/feedback/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractVersion: "feedback-admin.v1",
        period: { from: "2026-09-01", to: "2026-09-01" },
        override: { accepted: false, overlapDigest: null },
      }),
    });
    const response = await postGeneration(request);
    expect(response.status).toBe(503);
    expect(calls).toEqual([]);
  });

  it("refuses ADC-backed command composition outside the Cloud Run identity environment", async () => {
    vi.stubEnv("K_SERVICE", "");
    const calls: string[] = [];
    installFetch(async (url) => { calls.push(url.href); return Response.json({ data: [] }); });
    const request = new NextRequest(`${APP_ORIGIN}/api/admin/feedback/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractVersion: "feedback-admin.v1",
        period: { from: "2026-09-01", to: "2026-09-01" },
        override: { accepted: false, overlapDigest: null },
      }),
    });
    expect((await postGeneration(request)).status).toBe(503);
    expect(calls).toEqual([]);
  });

  it("runs default generation source, native command, reservation, task create, and outcome through action-separated fake adapters", async () => {
    const events: string[] = [];
    installFetch(async (url, init) => {
      const authorization = new Headers(init.headers).get("authorization");
      if (url.hostname === "cloudtasks.googleapis.com") {
        events.push("task-create");
        expect(authorization).toBe("Bearer synthetic-adc-token");
        const body = JSON.parse(String(init.body)) as { task: { name: string } };
        return Response.json({ name: body.task.name });
      }
      expect(url.origin).toBe(CMS_ORIGIN);
      if (url.pathname === "/api/tb113/worker/report-source") {
        events.push("private-source");
        expect(authorization).toBe(`Bearer ${APP_TOKENS.workerSourceRead}`);
        const query = JSON.parse(String(init.body)) as { resource: string };
        return Response.json(sourcePage(query.resource));
      }
      if (url.pathname === "/api/survey-report-generations" && (init.method ?? "GET") === "GET") {
        events.push("generation-list");
        expect(authorization).toBe(`Bearer ${authState.jwt}`);
        return Response.json({ data: [] });
      }
      if (url.pathname === "/api/survey-report-generations" && init.method === "POST") {
        events.push("generation-create");
        expect(authorization).toBe(`Bearer ${authState.jwt}`);
        return Response.json({ data: {
          documentId: "generation-document",
          attributes: {
            reportRunId: RUN_ID,
            periodStart: "2026-09-01T00:00:00.000Z",
            periodEnd: "2026-09-01T23:59:59.999Z",
            status: "queued",
            stateVersion: 1,
          },
        } });
      }
      if (url.pathname === `/api/tb113/admin/generations/${RUN_ID}/dispatch-state`) {
        expect(authorization).toBe(`Bearer ${authState.jwt}`);
        const command = JSON.parse(String(init.body)) as { action: string; outcome?: string; expectedStateVersion: number; taskName: string; dispatchAttemptCount?: number };
        if (command.action === "reserve") {
          events.push("dispatch-reserve");
          return Response.json({ contractVersion: "survey-dispatch-state.v1", reportRunId: RUN_ID, taskName: command.taskName, stateVersion: command.expectedStateVersion + 1, status: "queued", dispatchState: "reserved", dispatchAttemptCount: 0, failureCode: null, replayed: false });
        }
        events.push("dispatch-record");
        return Response.json({ contractVersion: "survey-dispatch-state.v1", reportRunId: RUN_ID, taskName: command.taskName, stateVersion: command.expectedStateVersion + 1, status: "queued", dispatchState: command.outcome, dispatchAttemptCount: command.dispatchAttemptCount, failureCode: null, replayed: false });
      }
      throw new Error(`Unexpected route: ${url.pathname}`);
    });
    const request = new NextRequest(`${APP_ORIGIN}/api/admin/feedback/generations`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contractVersion: "feedback-admin.v1",
        period: { from: "2026-09-01", to: "2026-09-01" },
        override: { accepted: false, overlapDigest: null },
      }),
    });
    const response = await postGeneration(request);
    const body = await response.json();
    expect(response.status, JSON.stringify(body)).toBe(202);
    expect(body.status).toBe("queued");
    expect(body.dispatch.status, JSON.stringify(body.dispatch)).toBe("dispatched");
    const resultText = JSON.stringify(body);
    for (const token of [...Object.values(APP_TOKENS), ...Object.values(WORKER_TOKENS), "synthetic-session-jwt", "synthetic-adc-token"])
      expect(resultText).not.toContain(token);
    expect(events).toEqual([
      "generation-list",
      "private-source",
      "private-source",
      "private-source",
      "generation-create",
      "dispatch-reserve",
      "task-create",
      "dispatch-record",
    ]);
  });

  it("returns authenticated private report bytes through the default download route", async () => {
    const reportRunId = "11111111-1111-4111-8111-111111111111";
    const bytes = Buffer.from("%PDF-1.4\nsynthetic-private-report\n%%EOF\n");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const reportId = deterministicReportId(reportRunId, sha256);
    const objectKey = `private/feedback-reports/${reportId}/report.pdf`;
    storageState.objects.set(objectKey, {
      bytes,
      generation: "101",
      metadata: {
        size: bytes.byteLength,
        generation: "101",
        contentType: "application/pdf",
        cacheControl: "private, no-store",
        metadata: {
          contractVersion: "survey-private-report-object.v1",
          reportId,
          reportRunId,
          sha256,
          mimeType: "application/pdf",
        },
      },
    });
    installFetch(async (url, init) => {
      expect(url.origin).toBe(CMS_ORIGIN);
      expect(url.pathname).toBe(`/api/tb113/worker/reports/${reportId}/download-metadata`);
      expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${APP_TOKENS.workerReportDownloadMetadata}`);
      return Response.json({ contractVersion: "survey-report-download-metadata.v1", reportId, reportRunId, generationStatus: "succeeded", objectKey, sha256, size: bytes.byteLength, mimeType: "application/pdf" });
    });
    const request = new NextRequest(`${APP_ORIGIN}/api/admin/feedback/reports/${reportId}/download`);
    const response = await getReportDownload(request, { params: Promise.resolve({ reportId }) });
    expect(response.status, await response.clone().text()).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("builds the default private worker handler and authenticates before CMS access", async () => {
    const snapshot = emptySnapshot();
    let cmsStateVersion = 1;
    let cmsRequests = 0;
    const workerFetch = async (urlString: string, init: RequestInit): Promise<Response> => {
      const url = new URL(urlString);
      if (url.hostname === "aiplatform.us.rep.googleapis.com") return Response.json({ totalTokens: 1 });
      expect(url.origin).toBe(CMS_ORIGIN);
      cmsRequests += 1;
      const action = url.pathname.endsWith("/claim") ? "workerClaim"
        : url.pathname.endsWith("/snapshot") ? "workerSnapshot"
          : url.pathname.includes("/checkpoints/") ? "workerCheckpoint"
            : url.pathname.endsWith("/complete") ? "workerComplete" : "unknown";
      if (action === "unknown") throw new Error(`Unexpected worker CMS path: ${url.pathname}`);
      expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${WORKER_TOKENS[action as keyof typeof WORKER_TOKENS]}`);
      if (action === "workerClaim") return Response.json({
        contractVersion: "survey-worker-cms.v1",
        reportRunId: RUN_ID,
        stateVersion: cmsStateVersion,
        status: "running",
        disposition: "claimed",
        checkpoints: { version: "survey-checkpoints.v1", snapshotDigest: snapshot.digestHex, route: "undecided", chunkCount: null, entries: [] },
        modelConfig: modelConfig(),
        pricingSnapshot: pricingSnapshot(),
      });
      if (action === "workerSnapshot") return Response.json({ contractVersion: "survey-worker-cms.v1", reportRunId: RUN_ID, stateVersion: cmsStateVersion, snapshot });
      if (action === "workerCheckpoint") {
        const command = JSON.parse(String(init.body)) as { checkpoint: { stageKey: string } };
        cmsStateVersion += 1;
        return Response.json({ contractVersion: "survey-worker-cms.v1", reportRunId: RUN_ID, stateVersion: cmsStateVersion, stageKey: command.checkpoint.stageKey, status: "valid", replayed: false, crossedCostThreshold: false });
      }
      const command = JSON.parse(String(init.body)) as { expectedStateVersion: number; artifact: { sha256: string; size: number } };
      return Response.json({ contractVersion: "survey-worker-cms.v1", reportRunId: RUN_ID, stateVersion: command.expectedStateVersion + 1, status: "succeeded", reportId: REPORT_ID, artifactSha256: command.artifact.sha256, artifactSize: command.artifact.size, replayed: false });
    };
    const handler = createConfiguredReportWorkerHttpHandler(process.env, {
      fetchImplementation: (url, init) => workerFetch(String(url), init ?? {}),
      accessTokenProvider: async () => "synthetic-adc-token",
      storage: new Storage() as never,
      idTokenVerifier: { verifyIdToken: async ({ idToken, audience }) => {
        if (idToken !== "synthetic-signed-task-token") throw new Error("Invalid signature");
        return { getPayload: () => ({ iss: "https://accounts.google.com", aud: audience, email: TASK_INVOKER, email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 }) };
      } },
      evidenceKeyProvider: async () => "synthetic-evidence-key-with-at-least-32-bytes",
      renderer: { rendererVersion: "synthetic-pdf.v1", render: async () => new TextEncoder().encode("%PDF-1.4\nsynthetic\n%%EOF\n") },
    });
    const readBody = vi.fn(async () => new TextEncoder().encode(JSON.stringify({ commandVersion: "survey-report-command.v1", reportRunId: RUN_ID })));
    const rejected = await handler({ method: "POST", url: "/internal/v1/report-runs:execute", headers: new Headers({ authorization: "Bearer invalid" }), readBody });
    expect(rejected.status).toBe(401);
    expect(readBody).not.toHaveBeenCalled();
    expect(cmsRequests).toBe(0);
    const success = await handler({ method: "POST", url: "/internal/v1/report-runs:execute", headers: new Headers({ authorization: "Bearer synthetic-signed-task-token", "content-type": "application/json" }), readBody });
    expect(success.status).toBe(200);
    expect(success.body.status, JSON.stringify(success.body)).toBe("succeeded");
    const resultText = JSON.stringify(success.body);
    for (const token of Object.values(WORKER_TOKENS)) expect(resultText).not.toContain(token);
  });

  it("rejects incomplete worker configuration before constructing request-capable adapters", () => {
    const incomplete = { ...process.env };
    delete incomplete.TB113_WORKER_CMS_TOKENS_JSON;
    expect(() => createConfiguredReportWorkerHttpHandler(incomplete)).toThrow(/configuration/i);
  });
});
