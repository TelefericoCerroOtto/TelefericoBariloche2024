// @vitest-environment node

import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";
import { canonicalizeJson, createSnapshot } from "../../../packages/survey-reporting-core/src";
import {
  CHECKPOINT_VERSION,
  WORKER_CMS_CONTRACT_VERSION,
  WORKER_COMMAND_VERSION,
  WorkerCmsConflictError,
  type FailCommand,
  type WorkerClaimResult,
} from "../../../services/survey-report-worker/src/contracts";
import {
  createWorkerCmsClient,
  WorkerCmsClientError,
  type WorkerCmsAction,
} from "../../../services/survey-report-worker/src/worker-cms-client";

const BASE_URL = "https://cms.example.com";
const TOKEN = "synthetic-action-scoped-token";
const RUN_ID = "123e4567-e89b-42d3-a456-426614174000";
const COMMENT = "private synthetic comment";

function tokenProvider(action: WorkerCmsAction) {
  return Promise.resolve({ action, value: `${TOKEN}:${action}` });
}

function snapshotEnvelope() {
  return createSnapshot({
    range: { from: "2026-09-01", to: "2026-09-02" },
    dataCutoffAt: "2026-09-03T00:00:00.000Z",
    sourceRevision: "source-v1",
    createdAt: "2026-09-03T00:00:00.000Z",
    filters: { pointKey: null, versionKey: null },
    submissions: [],
    definitions: [{ aspectKey: "other", sortOrder: 99 }],
    points: [{ pointKey: "point-a", displayName: "Point A", sortOrder: 1 }],
  });
}

function claimResult(status: "running" | "failed" = "running"): WorkerClaimResult {
  if (status === "failed") {
    return {
      contractVersion: WORKER_CMS_CONTRACT_VERSION,
      reportRunId: RUN_ID,
      stateVersion: 3,
      status,
      disposition: "terminal-replay",
    };
  }
  return {
    contractVersion: WORKER_CMS_CONTRACT_VERSION,
    reportRunId: RUN_ID,
    stateVersion: 2,
    status,
    disposition: "claimed",
    checkpoints: {
      version: "survey-checkpoints.v1",
      snapshotDigest: "a".repeat(64),
      route: "direct",
      chunkCount: null,
      entries: [],
    },
    modelConfig: { version: "survey-model-config.v1" },
    pricingSnapshot: { version: "pricing.v1" },
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function client(options: Partial<Parameters<typeof createWorkerCmsClient>[0]> = {}) {
  return createWorkerCmsClient({
    baseUrl: BASE_URL,
    allowedOrigins: [BASE_URL],
    tokenProvider,
    ...options,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("worker CMS HTTP client", () => {
  it("uses fixed scoped claim, snapshot, and fail requests and validates exact results", async () => {
    const snapshot = snapshotEnvelope();
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (url.endsWith("/claim")) return jsonResponse(claimResult());
      if (url.endsWith("/snapshot"))
        return jsonResponse({
          contractVersion: WORKER_CMS_CONTRACT_VERSION,
          reportRunId: RUN_ID,
          stateVersion: 2,
          snapshot,
        });
      return jsonResponse({
        contractVersion: WORKER_CMS_CONTRACT_VERSION,
        reportRunId: RUN_ID,
        stateVersion: 3,
        status: "failed",
        failureCode: "INVALID_OUTPUT",
        replayed: true,
      });
    });
    const tokenProviderMock = vi.fn(tokenProvider);
    const cms = client({ tokenProvider: tokenProviderMock, fetchImplementation });

    const claim = await cms.claim(RUN_ID);
    const snapshotResult = await cms.snapshot(RUN_ID);
    const failCommand: FailCommand = {
      contractVersion: WORKER_CMS_CONTRACT_VERSION,
      expectedStateVersion: 2,
      failureCode: "INVALID_OUTPUT",
      safeFailureMessage: "The report output did not satisfy its contract.",
    };
    const failed = await cms.fail(RUN_ID, failCommand);

    expect(claim.status).toBe("running");
    expect(snapshotResult.snapshot.payload.comments).toEqual([]);
    expect(failed.replayed).toBe(true);
    expect(calls.map(({ url }) => url)).toEqual([
      `${BASE_URL}/api/tb113/worker/generations/${RUN_ID}/claim`,
      `${BASE_URL}/api/tb113/worker/generations/${RUN_ID}/snapshot`,
      `${BASE_URL}/api/tb113/worker/generations/${RUN_ID}/fail`,
    ]);
    expect(tokenProviderMock.mock.calls.map(([action]) => action)).toEqual([
      "api::survey-report-generation.survey-report-generation.workerClaim",
      "api::survey-report-generation.survey-report-generation.workerSnapshot",
      "api::survey-report-generation.survey-report-generation.workerFail",
    ]);
    expect(calls.map(({ init }) => init?.method)).toEqual(["POST", "GET", "POST"]);
    expect(calls.map(({ init }) => new Headers(init?.headers).get("authorization"))).toEqual([
      `Bearer ${TOKEN}:api::survey-report-generation.survey-report-generation.workerClaim`,
      `Bearer ${TOKEN}:api::survey-report-generation.survey-report-generation.workerSnapshot`,
      `Bearer ${TOKEN}:api::survey-report-generation.survey-report-generation.workerFail`,
    ]);
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      commandVersion: WORKER_COMMAND_VERSION,
    });
    expect(JSON.parse(String(calls[2]?.init?.body))).toEqual(failCommand);
    for (const { init } of calls) {
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("error");
    }
  });

  it("allows terminal claim replay and returns private snapshot comments only in the result", async () => {
    const snapshot = snapshotEnvelope();
    const privateSnapshot = {
      ...snapshot,
      payload: {
        ...snapshot.payload,
        comments: [
          {
            recordId: "record-1",
            receipt: "receipt-1",
            period: "current",
            acceptedAt: "2026-09-02T12:00:00.000Z",
            locale: "es",
            versionKey: "v1",
            pointKey: "point-a",
            overallRating: 5,
            aspectRatings: [],
            text: COMMENT,
          },
        ],
      },
    };
    const digestHex = createHash("sha256")
      .update(canonicalizeJson(privateSnapshot.payload))
      .digest("hex");
    const envelope = { ...privateSnapshot, digestHex };
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL) =>
      String(input).endsWith("/claim")
        ? jsonResponse(claimResult("failed"))
        : jsonResponse({
            contractVersion: WORKER_CMS_CONTRACT_VERSION,
            reportRunId: RUN_ID,
            stateVersion: 4,
            snapshot: envelope,
          }),
    );
    const cms = client({ fetchImplementation });

    await expect(cms.claim(RUN_ID)).resolves.toMatchObject({
      status: "failed",
      disposition: "terminal-replay",
    });
    const result = await cms.snapshot(RUN_ID);
    expect(result.snapshot.payload.comments[0]?.text).toBe(COMMENT);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["unauthorized", 401, "UNAUTHORIZED"],
    ["forbidden", 403, "FORBIDDEN"],
    ["conflict", 409, "STATE_VERSION_CONFLICT"],
    ["payload too large", 413, "PAYLOAD_TOO_LARGE"],
    ["server error", 500, "CMS_TRANSIENT"],
  ] as const)("maps %s to a bounded non-disclosing error", async (_label, status, code) => {
    const privateText = `${TOKEN} ${COMMENT}`;
    const consoleMethods = ["debug", "info", "log", "warn", "error"] as const;
    const consoleSpies = consoleMethods.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const cms = client({
      fetchImplementation: async () => jsonResponse({ error: privateText }, status),
    });
    try {
      const failure = await cms.claim(RUN_ID).catch((error: unknown) => error);

      if (status === 409) expect(failure).toBeInstanceOf(WorkerCmsConflictError);
      else expect(failure).toBeInstanceOf(WorkerCmsClientError);
      expect(failure).toMatchObject({ code });
      const details = failure as Error & { code: string };
      expect(`${details.name} ${details.message}`).not.toContain(TOKEN);
      expect(`${details.name} ${details.message}`).not.toContain(COMMENT);
      for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
    } finally {
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
  });

  it("rejects wrong-scope tokens and missing or invalid token providers without leaking values", async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse(claimResult()));
    const wrongScope = client({
      tokenProvider: async (action) => ({
        action:
          action === "api::survey-report-generation.survey-report-generation.workerClaim"
            ? "api::survey-report-generation.survey-report-generation.workerFail"
            : action,
        value: `${TOKEN}:${action}`,
      }),
      fetchImplementation,
    });
    await expect(wrongScope.claim(RUN_ID)).rejects.toMatchObject({
      code: "INVALID_CONFIGURATION",
    });
    expect(fetchImplementation).not.toHaveBeenCalled();

    expect(() =>
      createWorkerCmsClient({
        baseUrl: BASE_URL,
        allowedOrigins: [BASE_URL],
        tokenProvider: null as never,
        fetchImplementation,
      }),
    ).toThrow();
    const invalidToken = client({
      tokenProvider: async (action) => ({
        action,
        value: "bad token",
      }),
    });
    await expect(invalidToken.claim(RUN_ID)).rejects.toMatchObject({
      code: "INVALID_CONFIGURATION",
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("validates canonical allowed origin before requesting an action token", async () => {
    const provider = vi.fn(tokenProvider);
    const fetchImplementation = vi.fn(async () => jsonResponse(claimResult()));
    for (const [baseUrl, allowedOrigins] of [
      [BASE_URL, []],
      [BASE_URL, ["https://other.example.com"]],
      ["https://169.254.169.254", ["https://169.254.169.254"]],
      ["https://cms.example.com/path", ["https://cms.example.com/path"]],
      ["https://cms.example.com@attacker.example", ["https://cms.example.com@attacker.example"]],
    ] as const) {
      expect(() =>
        createWorkerCmsClient({
          baseUrl,
          allowedOrigins,
          tokenProvider: provider,
          fetchImplementation,
        }),
      ).toThrow();
    }
    expect(provider).not.toHaveBeenCalled();
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("rejects malformed, extra-field, oversized, redirected, and cross-origin responses", async () => {
    const valid = claimResult();
    const responses = [
      new Response("not json", { status: 200, headers: { "content-type": "application/json" } }),
      jsonResponse({ ...valid, privateComment: COMMENT }),
      new Response(`{"padding":"${"x".repeat(1_048_577)}"}`, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "content-length": String(1_048_577),
        },
      }),
      (() => {
        const response = jsonResponse(valid);
        Object.defineProperties(response, {
          redirected: { value: true },
          url: { value: "https://attacker.example/claim" },
        });
        return response;
      })(),
    ];
    for (const response of responses) {
      const cms = client({ fetchImplementation: async () => response });
      await expect(cms.claim(RUN_ID)).rejects.toBeInstanceOf(WorkerCmsClientError);
    }
  });

  it("rejects snapshot digest changes and malformed response envelopes", async () => {
    const snapshot = snapshotEnvelope();
    const badSnapshot = {
      ...snapshot,
      payload: { ...snapshot.payload, sourceRevision: "tampered" },
    };
    const cases = [
      {
        contractVersion: WORKER_CMS_CONTRACT_VERSION,
        reportRunId: RUN_ID,
        stateVersion: 2,
        snapshot: badSnapshot,
      },
      {
        contractVersion: WORKER_CMS_CONTRACT_VERSION,
        reportRunId: RUN_ID,
        stateVersion: 2,
        snapshot,
        extra: true,
      },
    ];
    for (const body of cases) {
      const cms = client({ fetchImplementation: async () => jsonResponse(body) });
      await expect(cms.snapshot(RUN_ID)).rejects.toMatchObject({
        code: "INVALID_RESPONSE",
      });
    }
  });

  it("fails checkpoint and completion closed without requesting a token or making a request", async () => {
    const provider = vi.fn(tokenProvider);
    const fetchImplementation = vi.fn(async () => jsonResponse(claimResult()));
    const cms = client({ tokenProvider: provider, fetchImplementation });

    await expect(
      cms.checkpoint(RUN_ID, {
        contractVersion: WORKER_CMS_CONTRACT_VERSION,
        expectedStateVersion: 2,
        checkpoint: {
          checkpointVersion: CHECKPOINT_VERSION,
          stageKey: "render",
          stageIndex: 4,
          route: "direct",
          stageType: "render",
          status: "valid",
          inputDigest: "a".repeat(64),
          outputDigest: "b".repeat(64),
          attempts: 1,
          completedAt: "2026-09-03T00:00:00.000Z",
          payload: { kind: "render", rendererVersion: "v1", pdfSha256: "c".repeat(64), size: 1 },
        },
      }),
    ).rejects.toMatchObject({ code: "UNKNOWN_VERSION" });
    await expect(
      cms.complete(RUN_ID, {
        contractVersion: WORKER_CMS_CONTRACT_VERSION,
        expectedStateVersion: 2,
        validatedAnalysis: { schemaVersion: "survey-published-analysis.v1", sections: [] } as never,
        analysisDigest: "a".repeat(64),
        rendererVersion: "v1",
        artifact: { objectKey: "private/report.pdf", sha256: "b".repeat(64), size: 1, mimeType: "application/pdf" },
      }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_OPERATION" });
    expect(provider).not.toHaveBeenCalled();
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("rejects invalid run IDs and oversized requests before token lookup", async () => {
    const provider = vi.fn(tokenProvider);
    const fetchImplementation = vi.fn(async () => jsonResponse(claimResult()));
    const cms = client({ tokenProvider: provider, fetchImplementation });
    await expect(Promise.resolve().then(() => cms.claim("../report-source"))).rejects.toMatchObject({
      code: "INVALID_CONFIGURATION",
    });
    expect(provider).not.toHaveBeenCalled();
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("bounds token acquisition with a request deadline", async () => {
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    const cms = client({
      tokenProvider: () => new Promise(() => {}),
      fetchImplementation: async () => jsonResponse(claimResult()),
    });

    try {
      const pending = cms.claim(RUN_ID);
      controller.abort();
      await expect(pending).rejects.toMatchObject({ code: "TIMEOUT" });
    } finally {
      timeout.mockRestore();
    }
  });
});
