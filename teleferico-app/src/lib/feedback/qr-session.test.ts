import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  QR_SESSION_CAPABILITY,
  QR_SESSION_TTL_SECONDS,
  issueQrSessionToken,
  resolveQrSessionContext,
  verifyQrSessionToken,
} from "./qr-session";

const signingKey = "test-only-signing-key-with-enough-entropy";
const now = 1_800_000_000;
const publicCode = "Abcdefghijklmnopqrstuvwxyz_12345";
const context = {
  pointKey: "lower-station",
  publicCode,
  versionKey: "visitor-2026-09",
  versionRevision: 7,
} as const;

function records(overrides: Record<string, unknown> = {}) {
  return {
    points: [
      {
        pointKey: context.pointKey,
        publicCode,
        displayName: "Lower station",
        status: "active" as const,
      },
    ],
    versions: [
      {
        versionKey: context.versionKey,
        revision: context.versionRevision,
        status: "published" as const,
      },
    ],
    activeVersionKey: context.versionKey,
    ...overrides,
  };
}

function issue() {
  return issueQrSessionToken(context, {
    signingKey,
    now,
    nonce: "0123456789abcdef0123456789abcdef",
  });
}

function tamper(token: string) {
  return `${token.slice(0, -1)}${token.endsWith("x") ? "y" : "x"}`;
}

function resign(token: string, changes: Record<string, unknown>) {
  const [header, payload] = token.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  const changedPayload = Buffer.from(
    JSON.stringify({ ...claims, ...changes }),
  ).toString("base64url");
  const signature = createHmac("sha256", signingKey)
    .update(`${header}.${changedPayload}`)
    .digest("base64url");
  return `${header}.${changedPayload}.${signature}`;
}

describe("QR session resolution", () => {
  it("resolves only the active QR point and current published survey version", () => {
    expect(resolveQrSessionContext(publicCode, records())).toEqual({
      ok: true,
      value: {
        ...context,
        displayName: "Lower station",
      },
    });
  });

  it.each([
    ["unknown QR", "unknown", records()],
    ["inactive QR", publicCode, records({ points: [{ ...records().points[0], status: "inactive" }] })],
    ["missing active version", publicCode, records({ activeVersionKey: null })],
    ["draft active version", publicCode, records({ versions: [{ ...records().versions[0], status: "draft" }] })],
  ])("fails closed for %s", (_case, code, availableRecords) => {
    expect(resolveQrSessionContext(code, availableRecords)).toEqual({
      ok: false,
      error: { status: 410, code: "SURVEY_UNAVAILABLE" },
    });
  });
});

describe("QR-bound two-hour session token", () => {
  it("issues verifiable claims bound to QR, version revision, time, nonce, and capability", () => {
    const token = issue();
    const result = verifyQrSessionToken(token, {
      signingKey,
      now,
      expected: context,
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        v: 1,
        pointKey: context.pointKey,
        versionKey: context.versionKey,
        versionRevision: context.versionRevision,
        capability: QR_SESSION_CAPABILITY,
        nonce: "0123456789abcdef0123456789abcdef",
        iat: now,
        exp: now + QR_SESSION_TTL_SECONDS,
      },
    });
    expect(token.split(".")).toHaveLength(3);
  });

  it("accepts the last second and expires at exactly two hours", () => {
    const token = issue();

    expect(
      verifyQrSessionToken(token, {
        signingKey,
        now: now + QR_SESSION_TTL_SECONDS - 1,
        expected: context,
      }).ok,
    ).toBe(true);
    expect(
      verifyQrSessionToken(token, {
        signingKey,
        now: now + QR_SESSION_TTL_SECONDS,
        expected: context,
      }),
    ).toEqual({ ok: false, error: { status: 410, code: "SESSION_EXPIRED" } });
  });

  it.each([
    ["malformed", "not.a.valid.token"],
    ["tampered", tamper(issue())],
    ["future issuance", issueQrSessionToken(context, { signingKey, now: now + 1, nonce: "0123456789abcdef0123456789abcdef" })],
    ["wrong capability", resign(issue(), { capability: "feedback:admin" })],
  ])("rejects %s tokens", (_case, token) => {
    expect(verifyQrSessionToken(token, { signingKey, now, expected: context })).toEqual({
      ok: false,
      error: { status: 401, code: "INVALID_SESSION" },
    });
  });

  it.each([
    ["QR", { ...context, publicCode: `${publicCode}x` }],
    ["point", { ...context, pointKey: "summit" }],
    ["version", { ...context, versionKey: "visitor-2026-10" }],
    ["revision", { ...context, versionRevision: 8 }],
  ])("rejects a token bound to the wrong %s", (_case, expected) => {
    expect(verifyQrSessionToken(issue(), { signingKey, now, expected })).toEqual({
      ok: false,
      error: { status: 401, code: "INVALID_SESSION" },
    });
  });
});
