import { describe, expect, it } from "vitest";
import {
  INTAKE_BODY_LIMIT_BYTES,
  validateDraftIdentifier,
  validateIntakeEnvelope,
  validatePublicCode,
} from "./intake-boundary";

const encoder = new TextEncoder();
const publicCode = "Abcdefghijklmnopqrstuvwxyz_12345";
const draftId = "018f47a2-7b23-7c91-8d52-9f144f7a0c31";

function validBody(extra: Record<string, unknown> = {}) {
  return {
    contractVersion: "feedback-public.v1",
    sessionToken: "opaque-token",
    idempotencyKey: "request-12345678",
    locale: "es",
    overallRating: 5,
    aspects: [{ aspectKey: "views", rating: "positive" }],
    formLoadedAt: 1_700_000_000_000,
    website: "",
    captchaToken: "captcha-token",
    ...extra,
  };
}

function envelope(overrides: Record<string, unknown> = {}) {
  const body = encoder.encode(JSON.stringify(validBody()));
  return {
    method: "POST",
    contentType: "application/json; charset=utf-8",
    contentLength: String(body.byteLength),
    url: "https://example.test/api/feedback/submissions",
    body,
    ...overrides,
  };
}

describe("canonical intake path identifiers", () => {
  it("accepts a canonical QR public code and UUID draft identifier", () => {
    expect(validatePublicCode(publicCode)).toEqual({ ok: true, value: publicCode });
    expect(validateDraftIdentifier(draftId)).toEqual({ ok: true, value: draftId });
  });

  it.each([
    ["encoded", "%41bcdefghijklmnopqrstuvwxyz_12345"],
    ["dot", `${publicCode}.`],
    ["extra segment", `${publicCode}/extra`],
    ["malformed", "with spaces"],
    ["overlong", "a".repeat(129)],
  ])("rejects %s QR public codes", (_case, value) => {
    expect(validatePublicCode(value)).toEqual({
      ok: false,
      error: { code: "INVALID_PATH_IDENTIFIER", field: "publicCode", status: 400 },
    });
  });

  it.each([
    ["encoded", `%30${draftId.slice(2)}`],
    ["uppercase", draftId.toUpperCase()],
    ["dot", `${draftId}.`],
    ["extra segment", `${draftId}/extra`],
    ["overlong", `${draftId}0`],
  ])("rejects %s draft identifiers", (_case, value) => {
    expect(validateDraftIdentifier(value)).toEqual({
      ok: false,
      error: { code: "INVALID_PATH_IDENTIFIER", field: "draftId", status: 400 },
    });
  });
});

describe("public intake request envelope", () => {
  it("accepts bounded UTF-8 JSON with the exact submission field policy", () => {
    const result = validateIntakeEnvelope(envelope());

    expect(result).toEqual({ ok: true, value: validBody() });
  });

  it.each([
    ["wrong method", { method: "GET" }, 405, "METHOD_NOT_ALLOWED"],
    ["wrong media type", { contentType: "text/plain" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    ["non-UTF-8 charset", { contentType: "application/json; charset=latin1" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    ["query parameter", { url: "https://example.test/api/feedback/submissions?debug=1" }, 400, "VALIDATION_FAILED"],
    ["oversized body", { body: new Uint8Array(INTAKE_BODY_LIMIT_BYTES + 1), contentLength: null }, 413, "PAYLOAD_TOO_LARGE"],
  ])("rejects %s", (_case, overrides, status, code) => {
    expect(validateIntakeEnvelope(envelope(overrides))).toMatchObject({
      ok: false,
      error: { status, code },
    });
  });

  it.each([
    ["malformed content length", { contentLength: "12x" }, ["content-length"]],
    ["mismatched content length", { contentLength: "1" }, ["content-length"]],
    ["invalid UTF-8", { body: Uint8Array.from([0xc3, 0x28]), contentLength: "2" }, ["body"]],
    ["malformed JSON", { body: encoder.encode("{"), contentLength: "1" }, ["body"]],
  ])("fails closed for %s", (_case, overrides, fields) => {
    expect(validateIntakeEnvelope(envelope(overrides))).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields, status: 400 },
    });
  });

  it("reports missing and unknown fields deterministically", () => {
    const body = validBody({ debug: true });
    delete (body as Partial<typeof body>).captchaToken;
    const bytes = encoder.encode(JSON.stringify(body));

    expect(
      validateIntakeEnvelope(envelope({ body: bytes, contentLength: String(bytes.byteLength) })),
    ).toEqual({
      ok: false,
      error: {
        code: "VALIDATION_FAILED",
        fields: ["captchaToken", "debug"],
        status: 400,
      },
    });
  });
});
