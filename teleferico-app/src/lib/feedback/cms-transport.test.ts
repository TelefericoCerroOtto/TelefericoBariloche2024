// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createFeedbackCmsTransport } from "./cms-transport";

const surveyResponse = {
  contractVersion: "feedback-cms-public.v1",
  pointDocumentId: "point-document",
  versionDocumentId: "version-document",
  point: { pointKey: "summit", publicCode: "A".repeat(32), displayName: "Summit" },
  survey: {
    versionKey: "visitor-v1",
    versionRevision: 1,
    translations: { es: {}, en: {}, pt: {} },
    aspects: [{ aspectKey: "views", sortOrder: 0, labels: { es: "Vistas", en: "Views", pt: "Vistas" } }],
  },
  activeVersionKey: "visitor-v1",
  versions: [{ versionKey: "visitor-v1", status: "published", lastSupersededAtEpochSeconds: null }],
};

describe("feedback CMS transport", () => {
  it("uses a server-only family token and validates a resolved survey", async () => {
    const fetchImplementation = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer synthetic-cms-token");
      return Response.json(surveyResponse);
    });
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation,
    });

    const result = await transport.resolveSurvey("A".repeat(32));

    expect(result?.survey.aspects).toHaveLength(1);
    expect(fetchImplementation).toHaveBeenCalledExactlyOnceWith(
      `http://127.0.0.1:1337/api/tb113/public/surveys/${"A".repeat(32)}`,
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("maps unavailable responses and rejects malformed or oversized CMS bodies", async () => {
    const unavailable = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => new Response(null, { status: 404 })),
    });
    const malformed = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => Response.json({ secret: "must-not-pass" })),
    });
    const oversized = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => new Response("x".repeat(33 * 1024))),
    });

    await expect(unavailable.resolveSurvey("A".repeat(32))).resolves.toBeNull();
    await expect(malformed.resolveSurvey("A".repeat(32))).rejects.toThrow("Invalid CMS response");
    await expect(oversized.resolveSurvey("A".repeat(32))).rejects.toThrow("CMS response too large");
  });

  it("cancels the CMS response stream as soon as the body exceeds the limit", async () => {
    const cancel = vi.fn(async () => undefined);
    const read = vi.fn()
      .mockResolvedValueOnce({ done: false, value: new Uint8Array(32 * 1024) })
      .mockResolvedValueOnce({ done: false, value: new Uint8Array(1) });
    const response = {
      body: { getReader: () => ({ read, cancel }) },
      headers: new Headers(),
      ok: true,
      status: 200,
      text: async () => "x".repeat(33 * 1024),
    } as unknown as Response;
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => response),
    });

    await expect(transport.resolveSurvey("A".repeat(32))).rejects.toThrow("CMS response too large");
    expect(cancel).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it("surfaces an atomic CMS replay with its authoritative receipt", async () => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337", token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => Response.json({ submissionReceipt: "receipt", acceptedAt: "2026-09-17T12:00:00.000Z" })),
    });
    const store = transport.acceptanceStore({ point: { pointKey: "p", publicCode: "A" }, survey: { versionKey: "v" } } as never);
    await expect(store.withTransaction(async (transaction) => {
      await transaction.insert({} as never);
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_REPLAY", receipt: "receipt" });
  });

  it.each([
    ["extra keys", { submissionReceipt: "receipt", acceptedAt: "2026-09-17T12:00:00.000Z", extra: true }],
    ["missing keys", { submissionReceipt: "receipt" }],
    ["wrong field types", { submissionReceipt: 7, acceptedAt: "2026-09-17T12:00:00.000Z" }],
    ["an unparseable timestamp", { submissionReceipt: "receipt", acceptedAt: "not-a-date" }],
    ["an invalid timestamp", { submissionReceipt: "receipt", acceptedAt: "2026-02-30T12:00:00.000Z" }],
  ])("rejects an atomic CMS replay envelope with %s", async (_case, replay) => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => Response.json(replay)),
    });
    const store = transport.acceptanceStore({
      point: { pointKey: "p", publicCode: "A" },
      survey: { versionKey: "v" },
    } as never);

    await expect(store.withTransaction((transaction) => transaction.insert({} as never)))
      .rejects.toThrow("Invalid CMS response");
  });

  it.each([
    ["aspect", { ...surveyResponse, survey: { ...surveyResponse.survey, aspects: [{ aspectKey: "views" }] } }],
    ["version", { ...surveyResponse, versions: [{ versionKey: "visitor-v1", status: "retired", lastSupersededAtEpochSeconds: null }] }],
  ])("rejects a malformed nested CMS %s", async (_case, value) => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => Response.json(value)),
    });

    await expect(transport.resolveSurvey("A".repeat(32))).rejects.toThrow("Invalid CMS response");
  });

  it("uses one closed versioned submission command endpoint for lookup and acceptance", async () => {
    const requests: { path: string; body: unknown }[] = [];
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async (input, init) => {
        const body = JSON.parse(String(init?.body));
        requests.push({ path: String(input), body });
        return body.operation === "lookup" ? Response.json(null) : new Response(null, { status: 201 });
      }),
    });
    const store = transport.acceptanceStore({
      pointDocumentId: "point-document", versionDocumentId: "version-document",
      point: { pointKey: "summit", publicCode: "A".repeat(32) }, survey: { versionKey: "visitor-v1" },
    } as never);
    await store.withTransaction(async (transaction) => {
      await transaction.lockAndFindByIdempotency("a".repeat(64), "idem-key-0000001");
      await transaction.insert({ receipt: "receipt" } as never);
    });

    expect(requests.map(({ path }) => path)).toEqual([
      "http://127.0.0.1:1337/api/tb113/public/submissions",
      "http://127.0.0.1:1337/api/tb113/public/submissions",
    ]);
    expect(requests.map(({ body }) => body)).toMatchObject([
      { contractVersion: "feedback-cms-submission.v1", operation: "lookup" },
      { contractVersion: "feedback-cms-submission.v1", operation: "accept" },
    ]);
  });

  it("maps a commit-time CMS 410 to the survey unavailable domain code", async () => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi.fn(async () => new Response(null, { status: 410 })),
    });
    const store = transport.acceptanceStore({
      pointDocumentId: "point-document", versionDocumentId: "version-document",
      point: { pointKey: "summit", publicCode: "A".repeat(32) }, survey: { versionKey: "visitor-v1" },
    } as never);

    await expect(store.withTransaction((transaction) => transaction.insert({} as never)))
      .rejects.toMatchObject({ code: "SURVEY_UNAVAILABLE" });
  });
});
