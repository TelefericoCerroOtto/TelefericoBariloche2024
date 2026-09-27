// @vitest-environment node

import type { Server } from "node:http";
import { createSnapshot } from "../../../packages/survey-reporting-core/src";
import type {
  CompleteCommand,
  FailCommand,
  WorkerArtifact,
  WorkerArtifactStore,
  WorkerCheckpointSet,
  WorkerCmsClient,
  WorkerRuntimeDependencies,
} from "../../../services/survey-report-worker/src/contracts";
import { WorkerCmsConflictError } from "../../../services/survey-report-worker/src/contracts";
import { createDeterministicTestPdfRenderer } from "../../../services/survey-report-worker/src/pdf";
import { WorkerCmsClientError } from "../../../services/survey-report-worker/src/worker-cms-client";
import {
  createReportWorkerHttpHandler,
  createReportWorkerNodeServer,
  REPORT_WORKER_EXECUTE_PATH,
  type ReportWorkerRuntimeConfig,
  type VerifiedOidcClaims,
} from "../../../services/survey-report-worker/src/worker-http";
import { afterEach, describe, expect, it, vi } from "vitest";

const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000113";
const REPORT_ID = "00000000-0000-4000-8000-000000000114";
const NOW = 1_800_000_000;

function snapshot() {
  return createSnapshot({
    sourceRevision: "synthetic-source-v1",
    createdAt: "2026-09-21T12:00:00.000Z",
    dataCutoffAt: "2026-09-21T11:59:59.000Z",
    range: { from: "2026-09-01", to: "2026-09-01" },
    filters: { pointKey: null, versionKey: null },
    submissions: [],
    definitions: [{ aspectKey: "other", sortOrder: 99 }],
    points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
  });
}

function verifiedClaims(overrides: Partial<VerifiedOidcClaims> = {}): VerifiedOidcClaims {
  return {
    signatureVerified: true,
    issuer: "https://accounts.example.invalid",
    audience: "https://worker.example.invalid",
    principal: "serviceAccount:task-invoker@example.invalid",
    issuedAt: NOW - 10,
    expiresAt: NOW + 120,
    ...overrides,
  };
}

function runtimeHarness() {
  const envelope = snapshot();
  const initialCheckpoints: WorkerCheckpointSet = {
    version: "survey-checkpoints.v1",
    snapshotDigest: envelope.digestHex,
    route: "undecided",
    chunkCount: null,
    entries: [],
  };
  let stateVersion = 1;
  let checkpoints = initialCheckpoints;
  let terminal = false;
  const calls = { claim: 0, snapshot: 0, checkpoint: 0, complete: 0, fail: 0, stage: 0, countTokens: 0 };
  const staged = new Map<string, WorkerArtifact>();

  const cms: WorkerCmsClient = {
    async claim(reportRunId) {
      calls.claim += 1;
      if (terminal)
        return {
          contractVersion: "survey-worker-cms.v1",
          reportRunId,
          stateVersion,
          status: "succeeded",
          disposition: "terminal-replay",
        };
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "running",
        disposition: stateVersion === 1 ? "claimed" : "resumed",
        checkpoints,
        modelConfig: {
            version: "survey-model-config.v1",
            evidenceKeyId: "synthetic-key-id",
            provider: "vertex-ai",
            vertexProjectId: "teleferico-bariloche-2024",
            vertexLocation: "us",
            vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
            model: "gemini-3.8-flash",
            temperature: 0,
            reasoning: "LOW",
            grounding: false,
            promptVersion: "synthetic-prompt-v1",
            mapSchemaVersion: "survey-map.v1",
            analysisSchemaVersion: "survey-analysis.v1",
            redactionVersion: "redaction.v1",
            validatorVersion: "validator.v1",
            chunkVersion: "chunk.v1",
            verifiedInputTokenLimit: 8192,
            map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
            directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
            safetyHeadroomTokens: 2048,
            sourceRevision: "synthetic-source-v1",
        },
        pricingSnapshot: {
            version: "synthetic-pricing.v1",
            currency: "USD",
            units: [{ sku: "synthetic", inputMicrosPerMillion: 1, outputMicrosPerMillion: 1 }],
        },
      };
    },
    async snapshot(reportRunId) {
      calls.snapshot += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        snapshot: envelope,
      };
    },
    async checkpoint(reportRunId, command) {
      calls.checkpoint += 1;
      stateVersion += 1;
      checkpoints = {
        ...checkpoints,
        route: command.checkpoint.route === "common" ? "direct" : "direct",
        entries: [...checkpoints.entries, command.checkpoint],
      };
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        stageKey: command.checkpoint.stageKey,
        status: "valid",
        replayed: false,
      };
    },
    async complete(reportRunId, command: CompleteCommand) {
      calls.complete += 1;
      terminal = true;
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "succeeded",
        reportId: REPORT_ID,
        artifactSha256: command.artifact.sha256,
        artifactSize: command.artifact.size,
        replayed: false,
      };
    },
    async fail(reportRunId, _command: FailCommand) {
      calls.fail += 1;
      stateVersion += 1;
      return {
        contractVersion: "survey-worker-cms.v1",
        reportRunId,
        stateVersion,
        status: "failed",
        failureCode: "INVARIANT",
        replayed: false,
      };
    },
  };
  const artifacts: WorkerArtifactStore = {
    async stage(reportRunId, artifact) {
      calls.stage += 1;
      staged.set(reportRunId, artifact);
    },
    async readStaged(reportRunId, sha256) {
      const artifact = staged.get(reportRunId);
      return artifact?.sha256 === sha256 ? artifact : null;
    },
    async discardStaged(reportRunId, sha256) {
      if (staged.get(reportRunId)?.sha256 === sha256) staged.delete(reportRunId);
    },
  };
  const dependencies: WorkerRuntimeDependencies = {
    cms,
    artifacts,
    renderer: createDeterministicTestPdfRenderer(),
    countTokens: async () => {
      calls.countTokens += 1;
      return { instructions: 100, schema: 100, metrics: 100, comments: 0 };
    },
    now: () => new Date("2026-09-21T12:00:00.000Z"),
  };
  return { dependencies, calls };
}

function runtimeConfig(
  overrides: Partial<ReportWorkerRuntimeConfig["oidc"]> = {},
  dependencies = runtimeHarness().dependencies,
): ReportWorkerRuntimeConfig {
  return {
    oidc: {
      issuerAllowlist: ["https://accounts.example.invalid"],
      audience: "https://worker.example.invalid",
      principal: "serviceAccount:task-invoker@example.invalid",
      verifySignedToken: async () => verifiedClaims(),
      nowSeconds: () => NOW,
      ...overrides,
    },
    dependencies,
  };
}

function request(
  config: ReportWorkerRuntimeConfig,
  overrides: Partial<Parameters<ReturnType<typeof createReportWorkerHttpHandler>>[0]> = {},
) {
  const body = new TextEncoder().encode(JSON.stringify({
    commandVersion: "survey-report-command.v1",
    reportRunId: REPORT_RUN_ID,
  }));
  return createReportWorkerHttpHandler(config)({
    method: "POST",
    url: REPORT_WORKER_EXECUTE_PATH,
    headers: new Headers({
      authorization: "Bearer synthetic-signed-token",
      "content-type": "application/json",
      "content-length": String(body.byteLength),
    }),
    readBody: async () => body,
    ...overrides,
  });
}

describe("private report worker HTTP entrypoint", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) => {
        server!.close((error) => error ? reject(error) : resolve());
      });
    }
    server = undefined;
  });

  it("rejects invalid OIDC before consuming the body or touching CMS and providers", async () => {
    const harness = runtimeHarness();
    const verifySignedToken = vi.fn(async () => null);
    const result = await request(runtimeConfig({ verifySignedToken }, harness.dependencies), {
      readBody: vi.fn(async () => new Uint8Array()),
    });

    expect(result).toMatchObject({ status: 401, body: { error: { code: "INVALID_OIDC" } } });
    expect(verifySignedToken).toHaveBeenCalledOnce();
    expect(harness.calls).toEqual({ claim: 0, snapshot: 0, checkpoint: 0, complete: 0, fail: 0, stage: 0, countTokens: 0 });
  });

  it("requires exact immutable issuer, audience, principal, signature, and live time claims", async () => {
    const invalidClaims = [
      verifiedClaims({ signatureVerified: false as true }),
      verifiedClaims({ issuer: "https://unlisted.example.invalid" }),
      verifiedClaims({ audience: ["https://worker.example.invalid", "https://other.example.invalid"] }),
      verifiedClaims({ issuedAt: NOW + 31 }),
      verifiedClaims({ expiresAt: NOW }),
      verifiedClaims({ notBefore: NOW + 1 }),
    ];
    for (const claims of invalidClaims) {
      const harness = runtimeHarness();
      const result = await request(runtimeConfig({
        verifySignedToken: async () => claims,
      }, harness.dependencies));
      expect(result.status).toBe(401);
      expect(harness.calls.claim).toBe(0);
    }

    const wrongPrincipal = runtimeHarness();
    const forbidden = await request(runtimeConfig({
      verifySignedToken: async () => verifiedClaims({ principal: "serviceAccount:other@example.invalid" }),
    }, wrongPrincipal.dependencies));
    expect(forbidden).toMatchObject({ status: 403, body: { error: { code: "FORBIDDEN_INVOKER" } } });
    expect(wrongPrincipal.calls.claim).toBe(0);
  });

  it("rejects wrong method, route, query, media type, and oversized raw bodies before CMS access", async () => {
    const cases: Array<{
      method?: string;
      url?: string;
      contentType?: string;
      body?: Uint8Array;
      status: number;
      code: string;
    }> = [
      { method: "GET", status: 405, code: "METHOD_NOT_ALLOWED" },
      { url: "/internal/v1/other", status: 404, code: "NOT_FOUND" },
      { url: `${REPORT_WORKER_EXECUTE_PATH}?debug=1`, status: 400, code: "INVALID_COMMAND" },
      { contentType: "text/plain", status: 415, code: "UNSUPPORTED_MEDIA_TYPE" },
      { body: new Uint8Array(4 * 1024 + 1), status: 413, code: "PAYLOAD_TOO_LARGE" },
    ];

    for (const item of cases) {
      const harness = runtimeHarness();
      const defaultBody = new TextEncoder().encode(JSON.stringify({
        commandVersion: "survey-report-command.v1",
        reportRunId: REPORT_RUN_ID,
      }));
      const result = await request(runtimeConfig({}, harness.dependencies), {
        method: item.method ?? "POST",
        url: item.url ?? REPORT_WORKER_EXECUTE_PATH,
        headers: new Headers({
          authorization: "Bearer synthetic-signed-token",
          "content-type": item.contentType ?? "application/json",
          ...(item.body ? {} : { "content-length": String(defaultBody.byteLength) }),
        }),
        readBody: async () => item.body ?? defaultBody,
      });
      expect(result).toMatchObject({ status: item.status, body: { error: { code: item.code } } });
      expect(harness.calls.claim).toBe(0);
      expect(harness.calls.countTokens).toBe(0);
    }
  });

  it("maps CMS not-found, conflicts, transient failures, and configuration errors safely", async () => {
    const cases = [
      { failure: new WorkerCmsClientError("UNKNOWN_VERSION"), status: 404, code: "RUN_NOT_FOUND" },
      { failure: new WorkerCmsConflictError(), status: 409, code: "INVALID_STATE" },
      { failure: new WorkerCmsClientError("CMS_TRANSIENT"), status: 503, code: "RETRYABLE_EXECUTION" },
      { failure: new WorkerCmsClientError("INVALID_CONFIGURATION"), status: 500, code: "INTERNAL_ERROR" },
    ];
    for (const item of cases) {
      const harness = runtimeHarness();
      vi.spyOn(harness.dependencies.cms, "claim").mockRejectedValue(item.failure);
      const result = await request(runtimeConfig({}, harness.dependencies));
      expect(result).toMatchObject({ status: item.status, body: { error: { code: item.code } } });
      expect(JSON.stringify(result)).not.toContain(item.failure.message);
    }
  });

  it("runs the existing executor over a synthetic loopback HTTP server and closes it cleanly", async () => {
    const harness = runtimeHarness();
    const verifySignedToken = vi.fn(async () => verifiedClaims());
    server = createReportWorkerNodeServer(runtimeConfig({ verifySignedToken }, harness.dependencies));
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Loopback server did not bind");

    const body = JSON.stringify({
      commandVersion: "survey-report-command.v1",
      reportRunId: REPORT_RUN_ID,
    });
    const response = await fetch(`http://127.0.0.1:${address.port}${REPORT_WORKER_EXECUTE_PATH}`, {
      method: "POST",
      headers: {
        authorization: "Bearer synthetic-signed-token",
        "content-type": "application/json",
      },
      body,
    });
    const result: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(result).toEqual({
      contractVersion: "survey-worker-execution.v1",
      reportRunId: REPORT_RUN_ID,
      status: "succeeded",
      disposition: "completed",
    });
    expect(verifySignedToken).toHaveBeenCalledOnce();
    expect(harness.calls).toEqual({ claim: 1, snapshot: 1, checkpoint: 6, complete: 1, fail: 0, stage: 1, countTokens: 1 });
  });

  it("fails closed at construction when verifier or worker dependencies are absent", () => {
    const config = runtimeConfig();
    expect(() => createReportWorkerHttpHandler({
      ...config,
      oidc: { ...config.oidc, verifySignedToken: undefined as never },
    })).toThrow("configuration is incomplete");
    expect(() => createReportWorkerHttpHandler({
      ...config,
      dependencies: undefined as never,
    })).toThrow("configuration is incomplete");
  });
});
