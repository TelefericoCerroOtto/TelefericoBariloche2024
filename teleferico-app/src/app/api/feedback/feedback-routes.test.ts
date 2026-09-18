// @vitest-environment node

import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import type { AcceptanceStore, StoredSubmission } from "@/lib/feedback/submission-acceptance";
import {
  createSubmissionHandler,
  createSurveyHandler,
  type FeedbackSurveyContext,
} from "@/lib/feedback/public-http";

const NOW = new Date("2026-09-17T12:00:00.000Z");
const PUBLIC_CODE = "A".repeat(32);
const SIGNING_KEY = "synthetic-signing-key-with-at-least-32-characters";

const surveyContext: FeedbackSurveyContext = {
  pointDocumentId: "point-document",
  versionDocumentId: "version-document",
  point: { pointKey: "summit", publicCode: PUBLIC_CODE, displayName: "Summit" },
  survey: {
    versionKey: "visitor-v1",
    versionRevision: 7,
    translations: {
      es: { headerTitle: "Encuesta" },
      en: { headerTitle: "Survey" },
      pt: { headerTitle: "Pesquisa" },
    },
    aspects: [
      {
        aspectKey: "views",
        sortOrder: 1,
        labels: { es: "Vistas", en: "Views", pt: "Vistas" },
      },
    ],
  },
  activeVersionKey: "visitor-v1",
  versions: [
    {
      versionKey: "visitor-v1",
      status: "published",
      lastSupersededAtEpochSeconds: null,
    },
  ],
};

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(url, init);
}

function cookiesFrom(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .join("; ");
}

function cookieJar(...responses: Response[]): string {
  const cookies = new Map<string, string>();
  for (const response of responses) {
    for (const value of response.headers.getSetCookie()) {
      const cookie = value.split(";", 1)[0];
      cookies.set(cookie.slice(0, cookie.indexOf("=")), cookie);
    }
  }
  return [...cookies.values()].join("; ");
}

function submissionBody(sessionToken: string) {
  return {
    contractVersion: "feedback-public.v1",
    sessionToken,
    idempotencyKey: "idem-key-0000001",
    locale: "en",
    overallRating: 5,
    aspects: [{ aspectKey: "views", rating: "positive" }],
    formLoadedAt: NOW.getTime() - 10_000,
    website: "",
    captchaToken: "captcha-token",
  };
}

function createStore(): AcceptanceStore {
  let stored: StoredSubmission | null = null;

  return {
    async withTransaction(operation) {
      return operation({
        async lockAndFindByIdempotency() {
          return stored;
        },
        async insert(submission) {
          stored = submission;
        },
      });
    },
  };
}

describe("public feedback Route Handler composition", () => {
  it("mediates a valid QR survey without exposing server configuration", async () => {
    const resolveSurvey = vi.fn(async () => surveyContext);
    const handler = createSurveyHandler({
      resolveSurvey,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });

    const response = await handler(request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`), {
      params: Promise.resolve({ publicCode: PUBLIC_CODE }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      contractVersion: "feedback-public.v1",
      point: { pointKey: "summit", displayName: "Summit" },
      survey: { versionKey: "visitor-v1" },
    });
    expect(body.sessionToken).toMatch(/^[^.]+\.[^.]+\.[^.]+$/);
    expect(JSON.stringify(body)).not.toContain(SIGNING_KEY);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.getSetCookie()).toHaveLength(2);
  });

  it("preserves an existing browser identity while rotating only QR context", async () => {
    const handler = createSurveyHandler({
      resolveSurvey: async () => surveyContext,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });
    const first = await handler(request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`), {
      params: Promise.resolve({ publicCode: PUBLIC_CODE }),
    });
    const second = await handler(request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`, {
      headers: { cookie: cookiesFrom(first) },
    }), { params: Promise.resolve({ publicCode: PUBLIC_CODE }) });

    expect(second.headers.getSetCookie()).toHaveLength(1);
    expect(second.headers.getSetCookie()[0]).toMatch(/^tb113_feedback_context=/);
    expect(cookieJar(first, second)).toContain("tb113_feedback_browser=");
  });

  it("keeps durable replay ahead of one browser guard across QR points", async () => {
    const secondCode = "B".repeat(32);
    const secondContext = {
      ...surveyContext,
      pointDocumentId: "second-point-document",
      point: { ...surveyContext.point, pointKey: "base", publicCode: secondCode, displayName: "Base" },
    };
    const resolveSurvey = async (code: string) => code === secondCode ? secondContext : surveyContext;
    const getHandler = createSurveyHandler({
      resolveSurvey,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });
    const submissions = new Map<string, StoredSubmission>();
    const store: AcceptanceStore = {
      async withTransaction(operation) {
        let pair = "";
        return operation({
          async lockAndFindByIdempotency(nonce, idempotencyKey) {
            pair = `${nonce}:${idempotencyKey}`;
            return submissions.get(pair) ?? null;
          },
          async insert(submission) { submissions.set(pair, submission); },
        });
      },
    };
    const active = new Set<string>();
    const postHandler = createSubmissionHandler({
      resolveSurvey,
      signingKey: SIGNING_KEY,
      verifyCaptcha: vi.fn(async () => ({ success: true })),
      store,
      browserGuard: {
        isActive: vi.fn(async (token) => active.has(token)),
        persist: vi.fn(async (token) => { active.add(token); }),
      },
      now: () => NOW,
      extraAllowedOrigins: new Set(["https://example.test"]),
      createReceipt: () => "00000000-0000-4000-8000-000000000001",
    });
    const firstGet = await getHandler(request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`), {
      params: Promise.resolve({ publicCode: PUBLIC_CODE }),
    });
    const firstSurvey = await firstGet.clone().json();
    const secondGet = await getHandler(request(`https://example.test/api/feedback/surveys/${secondCode}`, {
      headers: { cookie: cookiesFrom(firstGet) },
    }), { params: Promise.resolve({ publicCode: secondCode }) });
    const secondSurvey = await secondGet.clone().json();
    const submit = (body: object, cookie: string) => {
      const serialized = JSON.stringify(body);
      return postHandler(request("https://example.test/api/feedback/submissions", {
        method: "POST",
        headers: {
          "content-type": "application/json", "content-length": String(Buffer.byteLength(serialized)),
          origin: "https://example.test", "sec-fetch-site": "same-origin", cookie,
        },
        body: serialized,
      }));
    };
    const firstBody = submissionBody(firstSurvey.sessionToken);

    const accepted = await submit(firstBody, cookiesFrom(firstGet));
    const guarded = await submit({ ...submissionBody(secondSurvey.sessionToken), idempotencyKey: "idem-key-0000002" }, cookieJar(firstGet, secondGet));
    const replay = await submit(firstBody, cookiesFrom(firstGet));

    expect([accepted.status, guarded.status, replay.status]).toEqual([201, 409, 200]);
    await expect(guarded.json()).resolves.toEqual({ error: { code: "GUARD_ACTIVE" } });
  });

  it.each([
    ["malformed path", "short", "", 400, "VALIDATION_FAILED"],
    ["query", PUBLIC_CODE, "?preview=true", 400, "VALIDATION_FAILED"],
  ])("rejects %s before CMS resolution", async (_case, publicCode, query, status, code) => {
    const resolveSurvey = vi.fn(async () => surveyContext);
    const handler = createSurveyHandler({
      resolveSurvey,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });

    const response = await handler(
      request(`https://example.test/api/feedback/surveys/${publicCode}${query}`),
      { params: Promise.resolve({ publicCode }) },
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
    expect(resolveSurvey).not.toHaveBeenCalled();
  });

  it("maps unavailable surveys and CMS failure to bounded public errors", async () => {
    const unavailable = createSurveyHandler({
      resolveSurvey: async () => null,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });
    const failed = createSurveyHandler({
      resolveSurvey: async () => {
        throw new Error("secret upstream detail");
      },
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });

    const unavailableResponse = await unavailable(
      request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`),
      { params: Promise.resolve({ publicCode: PUBLIC_CODE }) },
    );
    const failedResponse = await failed(
      request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`),
      { params: Promise.resolve({ publicCode: PUBLIC_CODE }) },
    );

    expect(unavailableResponse.status).toBe(410);
    expect(failedResponse.status).toBe(503);
    expect(JSON.stringify(await failedResponse.json())).not.toContain("secret upstream detail");
  });

  it("submits through preflight, durable acceptance, and the browser guard", async () => {
    const getHandler = createSurveyHandler({
      resolveSurvey: async () => surveyContext,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });
    const getResponse = await getHandler(
      request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`),
      { params: Promise.resolve({ publicCode: PUBLIC_CODE }) },
    );
    const publicSurvey = await getResponse.json();
    const browserGuard = {
      isActive: vi.fn(async () => false),
      persist: vi.fn(async () => undefined),
    };
    const postHandler = createSubmissionHandler({
      resolveSurvey: async () => surveyContext,
      signingKey: SIGNING_KEY,
      verifyCaptcha: vi.fn(async () => ({ success: true })),
      store: createStore(),
      browserGuard,
      now: () => NOW,
      extraAllowedOrigins: new Set(["https://example.test"]),
      createReceipt: () => "00000000-0000-4000-8000-000000000001",
    });
    const body = JSON.stringify(submissionBody(publicSurvey.sessionToken));

    const response = await postHandler(
      request("https://example.test/api/feedback/submissions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(body)),
          origin: "https://example.test",
          "sec-fetch-site": "same-origin",
          cookie: cookiesFrom(getResponse),
        },
        body,
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      submissionReceipt: "00000000-0000-4000-8000-000000000001",
      acceptedAt: NOW.toISOString(),
      guardUntil: "2026-09-18T12:00:00.000Z",
    });
    expect(browserGuard.persist).toHaveBeenCalledOnce();
  });

  it.each([
    ["unsupported media", { "content-type": "text/plain" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    ["cross-site request", { "sec-fetch-site": "cross-site" }, 403, "UNTRUSTED_REQUEST"],
  ])("rejects %s before CAPTCHA or persistence", async (_case, changedHeaders, status, code) => {
    const verifyCaptcha = vi.fn(async () => ({ success: true }));
    const store = createStore();
    const handler = createSubmissionHandler({
      resolveSurvey: async () => surveyContext,
      signingKey: SIGNING_KEY,
      verifyCaptcha,
      store,
      browserGuard: { isActive: vi.fn(async () => false), persist: vi.fn() },
      now: () => NOW,
      createReceipt: () => crypto.randomUUID(),
    });
    const body = JSON.stringify(submissionBody("invalid-token"));
    const response = await handler(
      request("https://example.test/api/feedback/submissions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://example.test",
          "sec-fetch-site": "same-origin",
          cookie: "tb113_feedback_browser=v1.synthetic; tb113_feedback_context=synthetic",
          ...changedHeaders,
        },
        body,
      }),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ error: { code } });
    expect(verifyCaptcha).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "{", true, 400],
    ["closed schema", JSON.stringify({ ...submissionBody("token"), unexpected: true }), true, 400],
    ["invalid answers", JSON.stringify({ ...submissionBody("token"), aspects: [] }), true, 400],
    ["honeypot", JSON.stringify({ ...submissionBody("token"), website: "bot" }), true, 400],
    ["failed CAPTCHA", JSON.stringify(submissionBody("token")), false, 403],
    ["invalid QR session", JSON.stringify(submissionBody("invalid-token")), true, 401],
  ])("rejects %s before CMS resolution", async (_case, body, captchaSuccess, status) => {
    const resolveSurvey = vi.fn(async () => surveyContext);
    const getHandler = createSurveyHandler({
      resolveSurvey,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });
    const getResponse = await getHandler(
      request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`),
      { params: Promise.resolve({ publicCode: PUBLIC_CODE }) },
    );
    resolveSurvey.mockClear();
    const handler = createSubmissionHandler({
      resolveSurvey,
      signingKey: SIGNING_KEY,
      verifyCaptcha: vi.fn(async () => ({ success: captchaSuccess })),
      store: createStore(),
      browserGuard: { isActive: vi.fn(async () => false), persist: vi.fn() },
      now: () => NOW,
      extraAllowedOrigins: new Set(["https://example.test"]),
      createReceipt: () => crypto.randomUUID(),
    });
    const response = await handler(request("https://example.test/api/feedback/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(body)),
        origin: "https://example.test",
        "sec-fetch-site": "same-origin",
        cookie: cookiesFrom(getResponse),
      },
      body,
    }));

    expect(response.status).toBe(status);
    expect(resolveSurvey).not.toHaveBeenCalled();
  });

  it("stops reading an oversized streamed body at the public cap", async () => {
    const requestWithBody = request("https://example.test/api/feedback/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://example.test",
        "sec-fetch-site": "same-origin",
      },
      body: "x".repeat(32 * 1024 + 1),
    });
    vi.spyOn(requestWithBody, "arrayBuffer").mockRejectedValue(new Error("unbounded read"));
    const handler = createSubmissionHandler({
      resolveSurvey: vi.fn(async () => surveyContext),
      signingKey: SIGNING_KEY,
      verifyCaptcha: vi.fn(),
      store: createStore(),
      browserGuard: { isActive: vi.fn(async () => false), persist: vi.fn() },
      now: () => NOW,
      extraAllowedOrigins: new Set(["https://example.test"]),
      createReceipt: () => crypto.randomUUID(),
    });

    const response = await handler(requestWithBody);

    expect(response.status).toBe(413);
  });

  it.each([
    ["method", "PUT", "application/json", 405],
    ["media type", "POST", "text/plain", 415],
  ])("rejects invalid %s before applying the body-size cap", async (_case, method, contentType, status) => {
    const oversized = request("https://example.test/api/feedback/submissions", {
      method,
      headers: { "content-type": contentType, "content-length": String(32 * 1024 + 1) },
      body: "x".repeat(32 * 1024 + 1),
    });
    const handler = createSubmissionHandler({
      resolveSurvey: vi.fn(async () => surveyContext), signingKey: SIGNING_KEY,
      verifyCaptcha: vi.fn(), store: createStore(),
      browserGuard: { isActive: vi.fn(async () => false), persist: vi.fn() },
      now: () => NOW, createReceipt: () => crypto.randomUUID(),
    });

    const response = await handler(oversized);

    expect(response.status).toBe(status);
  });

  it("maps a commit-time unavailable survey to the public 410 contract", async () => {
    const getHandler = createSurveyHandler({
      resolveSurvey: async () => surveyContext,
      signingKey: SIGNING_KEY,
      now: () => NOW,
      randomBytes: () => Buffer.alloc(32, 7),
    });
    const getResponse = await getHandler(
      request(`https://example.test/api/feedback/surveys/${PUBLIC_CODE}`),
      { params: Promise.resolve({ publicCode: PUBLIC_CODE }) },
    );
    const publicSurvey = await getResponse.json();
    const handler = createSubmissionHandler({
      resolveSurvey: async () => surveyContext,
      signingKey: SIGNING_KEY,
      verifyCaptcha: vi.fn(async () => ({ success: true })),
      store: { async withTransaction() { throw Object.assign(new Error("gone"), { code: "SURVEY_UNAVAILABLE" }); } },
      browserGuard: { isActive: vi.fn(async () => false), persist: vi.fn() },
      now: () => NOW,
      extraAllowedOrigins: new Set(["https://example.test"]),
      createReceipt: () => crypto.randomUUID(),
    });
    const body = JSON.stringify(submissionBody(publicSurvey.sessionToken));
    const response = await handler(request("https://example.test/api/feedback/submissions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(Buffer.byteLength(body)),
        origin: "https://example.test",
        "sec-fetch-site": "same-origin",
        cookie: cookiesFrom(getResponse),
      },
      body,
    }));

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({ error: { code: "SURVEY_UNAVAILABLE" } });
  });
});
