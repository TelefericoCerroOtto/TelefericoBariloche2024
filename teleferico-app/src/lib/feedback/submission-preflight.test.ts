import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { issueQrSessionToken } from "./qr-session";
import { runSubmissionPreflight } from "./submission-preflight";

const SITE_URL = "https://telefericobariloche.com.ar";
const NOW = 1_800_000_000;
const SIGNING_KEY = "test-only-signing-key-with-enough-entropy";
const SESSION_CONTEXT = {
  pointKey: "lower-station",
  publicCode: "Abcdefghijklmnopqrstuvwxyz_12345",
  versionKey: "visitor-2026-09",
  versionRevision: 7,
} as const;
const DEFINITIONS = [
  {
    aspectKey: "views",
    sortOrder: 1,
    labels: { es: "Paisajes", en: "Views", pt: "Paisagens" },
  },
] as const;

function sessionToken() {
  return issueQrSessionToken(SESSION_CONTEXT, {
    signingKey: SIGNING_KEY,
    now: NOW,
    nonce: "0123456789abcdef0123456789abcdef",
  });
}

function validBody() {
  return {
    contractVersion: "feedback-public.v1",
    sessionToken: sessionToken(),
    idempotencyKey: "request-key-12345",
    locale: "en",
    overallRating: 5,
    aspects: [{ aspectKey: "views", rating: "positive" }],
    formLoadedAt: NOW * 1000 - 3_000,
    website: "",
    captchaToken: "captcha-token",
  };
}

function encode(body: unknown) {
  return new TextEncoder().encode(JSON.stringify(body));
}

function request(
  body: Uint8Array,
  headers: Record<string, string> = {
    origin: SITE_URL,
    "sec-fetch-site": "same-origin",
  },
  method = "POST",
) {
  return new NextRequest(`${SITE_URL}/api/feedback/submissions`, {
    method,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-length": String(body.byteLength),
      ...headers,
    },
  });
}

function execute(
  body: Uint8Array,
  verifyCaptcha: (_token: string) => Promise<unknown> = vi.fn(async () => ({
    success: true,
  })),
  options: {
    headers?: Record<string, string>;
    method?: string;
    activeVersionKey?: string;
    versions?: unknown;
  } = {},
) {
  return {
    verifyCaptcha,
    result: runSubmissionPreflight({
      request: request(body, options.headers, options.method),
      body,
      definitions: DEFINITIONS,
      nowEpochSeconds: NOW,
      signingKey: SIGNING_KEY,
      expectedSession: SESSION_CONTEXT,
      activeVersionKey: options.activeVersionKey ?? SESSION_CONTEXT.versionKey,
      extraAllowedOrigins: new Set([SITE_URL]),
      versions: options.versions ?? [
        {
          versionKey: SESSION_CONTEXT.versionKey,
          status: "published",
          lastSupersededAtEpochSeconds: null,
        },
      ],
      verifyCaptcha,
    }),
  };
}

describe("feedback submission preflight", () => {
  it("returns validated pre-persistence context without invoking any downstream boundary", async () => {
    const body = validBody();
    const { result, verifyCaptcha } = execute(encode(body), undefined, {
      headers: { origin: SITE_URL },
    });

    await expect(result).resolves.toMatchObject({
      ok: true,
      value: {
        trustedOrigin: SITE_URL,
        idempotencyKey: body.idempotencyKey,
        answers: {
          locale: "en",
          overallRating: 5,
          ratings: [{ aspectKey: "views", label: "Views", rating: "positive" }],
        },
        session: { pointKey: SESSION_CONTEXT.pointKey },
        versionDisposition: "current",
      },
    });
    expect(verifyCaptcha).toHaveBeenCalledExactlyOnceWith("captcha-token");
  });

  it.each([
    ["transport", encode(validBody()), { method: "PUT" }, 405, "METHOD_NOT_ALLOWED"],
    ["origin", new TextEncoder().encode("not-json"), { headers: { origin: "https://attacker.example" } }, 403, "UNTRUSTED_REQUEST"],
    ["fetch metadata", encode(validBody()), { headers: { origin: SITE_URL, "sec-fetch-site": "cross-site" } }, 403, "UNTRUSTED_REQUEST"],
    ["closed JSON", encode({ ...validBody(), unexpected: true }), {}, 400, "VALIDATION_FAILED"],
    ["answers", encode({ ...validBody(), overallRating: 6 }), {}, 400, "VALIDATION_FAILED"],
    ["form age", encode({ ...validBody(), formLoadedAt: NOW * 1000 - 2_999 }), {}, 400, "VALIDATION_FAILED"],
    ["honeypot", encode({ ...validBody(), website: "bot" }), {}, 400, "VALIDATION_FAILED"],
  ])("stops at the first %s failure before CAPTCHA", async (_case, body, options, status, code) => {
    const { result, verifyCaptcha } = execute(body, undefined, options);

    await expect(result).resolves.toMatchObject({ ok: false, error: { status, code } });
    expect(verifyCaptcha).not.toHaveBeenCalled();
  });

  it("fails closed when injected CAPTCHA verification rejects", async () => {
    const verifyCaptcha = vi.fn(async () => ({ success: false }));
    const { result } = execute(encode(validBody()), verifyCaptcha);

    await expect(result).resolves.toEqual({
      ok: false,
      error: { status: 403, code: "CAPTCHA_FAILED" },
    });
    expect(verifyCaptcha).toHaveBeenCalledExactlyOnceWith("captcha-token");
  });

  it("fails closed when CAPTCHA success is a malformed truthy value", async () => {
    const verifyCaptcha = vi.fn(async () => ({ success: "false" }));
    const { result } = execute(encode(validBody()), verifyCaptcha);

    await expect(result).resolves.toEqual({
      ok: false,
      error: { status: 403, code: "CAPTCHA_FAILED" },
    });
  });

  it.each([
    ["invalid QR session", { sessionToken: "invalid" }, undefined, 401, "INVALID_SESSION"],
    [
      "expired version grace",
      {},
      [
        { versionKey: SESSION_CONTEXT.versionKey, status: "published", lastSupersededAtEpochSeconds: NOW - 1_801 },
        { versionKey: "visitor-2026-10", status: "published", lastSupersededAtEpochSeconds: null },
      ],
      410,
      "SESSION_EXPIRED",
    ],
  ])("stops after CAPTCHA at the first %s failure", async (_case, changes, versions, status, code) => {
    const { result, verifyCaptcha } = execute(
      encode({ ...validBody(), ...changes }),
      undefined,
      {
        activeVersionKey: versions ? "visitor-2026-10" : undefined,
        versions,
      },
    );

    await expect(result).resolves.toMatchObject({ ok: false, error: { status, code } });
    expect(verifyCaptcha).toHaveBeenCalledTimes(1);
  });
});
