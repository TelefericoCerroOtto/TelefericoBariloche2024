import { describe, expect, it, vi } from "vitest";
import {
  buildAuthoritativeGenerationInputsV1,
  type GenerationSourcePageQueryV1,
} from "../../../services/survey-report-worker/src/authoritative-generation-source";
import {
  createPrivateReportSourceTransport,
  PrivateReportSourceTransportError,
  type PrivateReportSourcePageResponseV1,
} from "../../../services/survey-report-worker/src/private-report-source-transport";

const BASE_URL = "https://cms.example.com";
const TOKEN = "synthetic-custom-content-api-token";
const PRIVATE_COMMENT = "synthetic private visitor comment";
const CUTOFF = "2026-09-02T12:00:00.000Z";
const RANGE = { from: "2026-09-01", to: "2026-09-10" };

type SourceResource = GenerationSourcePageQueryV1["resource"];

function page(
  resource: SourceResource,
  cursor: string | null,
  items: readonly unknown[],
  total: number,
  nextCursor: string | null,
): PrivateReportSourcePageResponseV1 {
  return {
    contractVersion: "survey-generation-source.v1",
    resource,
    cursor,
    nextCursor,
    total,
    items,
  };
}

function sourceRows(): Record<SourceResource, readonly unknown[]> {
  return {
    submissions: [
      {
        id: "submission-1",
        receipt: "receipt-1",
        acceptedAt: "2026-08-31T15:00:00.000Z",
        source: "valid_qr",
        locale: "es",
        overallRating: 5,
        comment: PRIVATE_COMMENT,
        payloadDigest: "a".repeat(64),
        qrPoint: { id: "point-1", pointKey: "summit" },
        surveyVersion: { id: "version-1", versionKey: "v1" },
        ratings: [
          {
            aspectKey: "views",
            label: "Views",
            sortOrder: 0,
            rating: "positive",
          },
        ],
      },
      {
        id: "submission-2",
        receipt: "receipt-2",
        acceptedAt: "2026-09-02T10:00:00.000Z",
        source: "valid_qr",
        locale: "en",
        overallRating: 4,
        comment: null,
        payloadDigest: "b".repeat(64),
        qrPoint: { id: "point-1", pointKey: "summit" },
        surveyVersion: { id: "version-1", versionKey: "v1" },
        ratings: [
          {
            aspectKey: "views",
            label: "Views",
            sortOrder: 0,
            rating: "neutral",
          },
        ],
      },
    ],
    versions: [
      {
        id: "version-1",
        versionKey: "v1",
        aspects: [{ aspectKey: "views", sortOrder: 0 }],
      },
    ],
    points: [
      {
        id: "point-1",
        pointKey: "summit",
        displayName: "Summit",
        sortOrder: 0,
      },
    ],
  };
}

function response(body: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("content-type"))
    responseHeaders.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function isTransportError(
  error: unknown,
): error is PrivateReportSourceTransportError {
  return error instanceof PrivateReportSourceTransportError;
}

describe("private report source transport", () => {
  it("reads complete versioned pages for every source type with bounded cursor requests", async () => {
    const rows = sourceRows();
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ url: String(input), init: init ?? {} });
      const body = JSON.parse(String(init?.body)) as {
        resource: SourceResource;
        cursor: string | null;
        pageSize: number;
      };
      const allRows = rows[body.resource];
      const offset = body.cursor === null ? 0 : Number(body.cursor);
      const nextOffset = Math.min(offset + 1, allRows.length);
      return response(
        page(
          body.resource,
          body.cursor,
          allRows.slice(offset, nextOffset),
          allRows.length,
          nextOffset < allRows.length ? String(nextOffset) : null,
        ),
      );
    });
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => TOKEN,
      fetchImplementation,
    });

    const result = await buildAuthoritativeGenerationInputsV1({
      range: RANGE,
      dataCutoffAt: CUTOFF,
      sourceRevision: "source-revision-17",
      modelConfig: modelConfig(),
      pricingSnapshot: {
        version: "pricing.v1",
        currency: "USD",
        units: [{ sku: "synthetic-model", inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
      },
      evidenceKeyId: "synthetic-key-id",
      readPage: transport.readPage,
    });

    expect(result.snapshotJson.comments.map(({ text }) => text)).toEqual([
      PRIVATE_COMMENT,
    ]);
    expect(requests.map(({ url }) => url)).toEqual(
      requests.map(() => `${BASE_URL}/api/tb113/worker/report-source`),
    );
    expect(requests).toHaveLength(4);
    for (const { init } of requests) {
      const requestBody = JSON.parse(String(init.body));
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("authorization")).toBe(`Bearer ${TOKEN}`);
      expect(new Headers(init.headers).get("content-type")).toBe("application/json");
      expect(init.redirect).toBe("error");
      expect(requestBody).toMatchObject({
        contractVersion: "survey-generation-source.v1",
        acceptedAtGte: expect.any(String),
        acceptedAtLte: expect.any(String),
        dataCutoffAt: CUTOFF,
        pageSize: 25,
      });
    }
    expect(requests.map(({ init }) => JSON.parse(String(init.body)).resource).sort()).toEqual([
      "points",
      "submissions",
      "submissions",
      "versions",
    ]);
  });

  it("requires an exact nonempty origin allowlist before token lookup", async () => {
    const tokenProvider = vi.fn(async () => TOKEN);
    const fetchImplementation = async () => response(page("submissions", null, [], 0, null));
    const missingAllowlist = { baseUrl: BASE_URL, tokenProvider, fetchImplementation };
    expect(() =>
      createPrivateReportSourceTransport(missingAllowlist as never),
    ).toThrow(/Private report source is unavailable/);
    expect(() =>
      createPrivateReportSourceTransport({ ...missingAllowlist, allowedOrigins: [] }),
    ).toThrow(/Private report source is unavailable/);
    expect(() =>
      createPrivateReportSourceTransport({
        ...missingAllowlist,
        allowedOrigins: ["https://other.example.com"],
      }),
    ).toThrow(/Private report source is unavailable/);
    expect(() =>
      createPrivateReportSourceTransport({
        ...missingAllowlist,
        baseUrl: "https://cms.example.com/",
        allowedOrigins: ["https://cms.example.com"],
      }),
    ).toThrow(/Private report source is unavailable/);
    const transport = createPrivateReportSourceTransport({
      ...missingAllowlist,
      allowedOrigins: [BASE_URL],
    });
    await expect(
      transport.readPage({ ...query(), cursor: "a".repeat(1025) }),
    ).rejects.toMatchObject({ code: "INVALID_CONFIGURATION" });
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it.each([
    "https://127.0.0.1",
    "https://[::1]",
    "https://[fe80::1]",
    "https://[fc00::1]",
    "https://10.0.0.8",
    "https://192.168.1.2",
    "https://169.254.169.254",
    "https://2130706433",
    "https://0x7f000001",
    "https://localhost.127.0.0.1.nip.io",
    "https://cms.example",
    "https://metadata",
    "https://metadata.google",
    "https://metadata.google.internal",
    "https://metadata.google.internal.attacker.com",
    "https://instance-data.ec2.internal",
    "https://localhost",
    "https://localhost.attacker.com",
    "https://cms.example.com.attacker.invalid",
    "https://cms.example.com@attacker.com",
    "https://cms.example.com/path",
    "https://cms.example.com/?query=1",
    "https://cms.example.com/#fragment",
    "https://CMS.example.com",
    "https://cms.example.com.",
    "https://cms.example.com:443",
    "https://xn--cm-something.example.com",
  ])("rejects unsafe or noncanonical origin %s even when allowlisted", (origin) => {
    const tokenProvider = vi.fn(async () => TOKEN);
    expect(() =>
      createPrivateReportSourceTransport({
        baseUrl: origin,
        allowedOrigins: [origin],
        tokenProvider,
        fetchImplementation: async () => response(page("submissions", null, [], 0, null)),
      }),
    ).toThrow(/Private report source is unavailable/);
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it("does not follow HTTPS redirects", async () => {
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(null, {
        status: 302,
        headers: { location: "https://attacker.example.com/collect" },
      }),
    );
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => TOKEN,
      fetchImplementation,
    });

    await expect(transport.readPage(query())).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
    expect(fetchImplementation.mock.calls[0]?.[1]?.redirect).toBe("error");
  });

  it("rejects a fetch implementation that returns a redirected response", async () => {
    const redirectedResponse = response(page("submissions", null, [], 0, null));
    Object.defineProperties(redirectedResponse, {
      redirected: { value: true },
      url: { value: "https://attacker.example.com/collect" },
    });
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => TOKEN,
      fetchImplementation: async () => redirectedResponse,
    });

    await expect(transport.readPage(query())).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
  });

  it.each([
    ["unauthorized", 401, "UNAUTHORIZED"],
    ["forbidden", 403, "FORBIDDEN"],
    ["server error", 500, "UPSTREAM_UNAVAILABLE"],
  ] as const)("maps CMS %s to a bounded non-leaking error", async (_label, status, code) => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => TOKEN,
      fetchImplementation: async () =>
        response({ error: `${TOKEN} ${PRIVATE_COMMENT}` }, status),
    });

    try {
      await expect(transport.readPage(query())).rejects.toSatisfy((error: unknown) => {
        if (!isTransportError(error)) return false;
        expect(error.code).toBe(code);
        expect(`${error.name} ${error.message}`).not.toContain(TOKEN);
        expect(`${error.name} ${error.message}`).not.toContain(PRIVATE_COMMENT);
        return true;
      });
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it.each([
    ["missing version", (value: Record<string, unknown>) => delete value.contractVersion],
    ["wrong version", (value: Record<string, unknown>) => (value.contractVersion = "unknown.v9")],
    ["wrong resource", (value: Record<string, unknown>) => (value.resource = "versions")],
    ["wrong cursor", (value: Record<string, unknown>) => (value.cursor = "another-cursor")],
    ["malformed next cursor", (value: Record<string, unknown>) => (value.nextCursor = "bad cursor")],
    ["invalid total", (value: Record<string, unknown>) => (value.total = -1)],
    ["missing rows", (value: Record<string, unknown>) => delete value.items],
    ["partial terminal page", (value: Record<string, unknown>) => (value.total = 2)],
    ["unknown response field", (value: Record<string, unknown>) => (value.comment = PRIVATE_COMMENT)],
  ])("rejects %s before returning a source page", async (_label, mutate) => {
    const body = page("submissions", null, [], 0, null) as unknown as Record<string, unknown>;
    mutate(body);
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => TOKEN,
      fetchImplementation: async () => response(body),
    });

    await expect(transport.readPage(query())).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("rejects oversized response bodies without parsing or exposing their private contents", async () => {
    const oversized = new Response(`{"comment":"${PRIVATE_COMMENT}","padding":"${"x".repeat(1_048_576)}"}`, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => TOKEN,
      fetchImplementation: async () => oversized,
    });

    await expect(transport.readPage(query())).rejects.toSatisfy((error: unknown) => {
      if (!isTransportError(error)) return false;
      expect(error.code).toBe("PAYLOAD_TOO_LARGE");
      expect(error.message).not.toContain(PRIVATE_COMMENT);
      return true;
    });
  });

  it("bounds token acquisition and fetch work with the request abort signal", async () => {
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: (signal) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        }),
      fetchImplementation: async () => response(page("submissions", null, [], 0, null)),
    });

    try {
      const pending = transport.readPage(query());
      controller.abort();
      await expect(pending).rejects.toMatchObject({ code: "TIMEOUT" });
    } finally {
      timeout.mockRestore();
    }
  });

  it.each(["provider", "fetch", "json"] as const)(
    "maps %s failures without logging secret or private text",
    async (failure) => {
    const consoleMethods = ["debug", "info", "log", "warn", "error"] as const;
    const spies = consoleMethods.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    const transport = createPrivateReportSourceTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => {
        if (failure === "provider") throw new Error(`${TOKEN} ${PRIVATE_COMMENT}`);
        return TOKEN;
      },
      fetchImplementation: async () => {
        if (failure === "fetch") throw new Error(`${TOKEN} ${PRIVATE_COMMENT}`);
        return new Response(`${TOKEN} ${PRIVATE_COMMENT}`, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    try {
      await expect(transport.readPage(query())).rejects.toSatisfy((error: unknown) => {
        if (!isTransportError(error)) return false;
        expect(error.code).toBe(
          failure === "json" ? "INVALID_RESPONSE" : "UPSTREAM_UNAVAILABLE",
        );
        expect(`${error.name} ${error.message}`).not.toContain(TOKEN);
        expect(`${error.name} ${error.message}`).not.toContain(PRIVATE_COMMENT);
        return true;
      });
      for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
    },
  );
});

function query(): GenerationSourcePageQueryV1 {
  return {
    resource: "submissions",
    cursor: null,
    acceptedAtGte: "2026-08-22T04:00:00.000Z",
    acceptedAtLte: "2026-09-11T03:59:59.999Z",
    dataCutoffAt: CUTOFF,
  };
}

function modelConfig() {
  return {
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
    promptVersion: "prompt.v1",
    mapSchemaVersion: "survey-map.v1",
    analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redaction.v1",
    validatorVersion: "validator.v1",
    chunkVersion: "chunk.v1",
    verifiedInputTokenLimit: 10000,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: "source-revision-17",
  } as const;
}
