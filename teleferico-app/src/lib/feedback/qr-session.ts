import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const QR_SESSION_TTL_SECONDS = 2 * 60 * 60;
export const QR_SESSION_CAPABILITY = "feedback:submit" as const;

const HEADER = { alg: "HS256", typ: "TB113", v: 1 } as const;
const NONCE_PATTERN = /^[0-9a-f]{32,128}$/;

type Unavailable = {
  readonly ok: false;
  readonly error: { readonly status: 410; readonly code: "SURVEY_UNAVAILABLE" };
};

type InvalidSession = {
  readonly ok: false;
  readonly error:
    | { readonly status: 401; readonly code: "INVALID_SESSION" }
    | { readonly status: 410; readonly code: "SESSION_EXPIRED" };
};

export type QrSessionContext = {
  readonly pointKey: string;
  readonly publicCode: string;
  readonly versionKey: string;
  readonly versionRevision: number;
};

export type QrSessionRecords = {
  readonly points: readonly {
    readonly pointKey: string;
    readonly publicCode: string;
    readonly displayName: string;
    readonly status: "active" | "inactive";
  }[];
  readonly versions: readonly {
    readonly versionKey: string;
    readonly revision: number;
    readonly status: "draft" | "published";
  }[];
  readonly activeVersionKey: string | null;
};

export type QrSessionClaims = {
  readonly v: 1;
  readonly pointKey: string;
  readonly publicCodeHash: string;
  readonly versionKey: string;
  readonly versionRevision: number;
  readonly capability: typeof QR_SESSION_CAPABILITY;
  readonly nonce: string;
  readonly iat: number;
  readonly exp: number;
};

type VerifyInput = {
  readonly signingKey: string | Uint8Array;
  readonly now: number;
  readonly expected: QrSessionContext;
};

function unavailable(): Unavailable {
  return { ok: false, error: { status: 410, code: "SURVEY_UNAVAILABLE" } };
}

export function resolveQrSessionContext(
  publicCode: string,
  records: QrSessionRecords,
): { readonly ok: true; readonly value: QrSessionContext & { readonly displayName: string } } | Unavailable {
  const point = records.points.find(
    (candidate) => candidate.publicCode === publicCode && candidate.status === "active",
  );
  if (!point || records.activeVersionKey === null) return unavailable();

  const version = records.versions.find(
    (candidate) =>
      candidate.versionKey === records.activeVersionKey && candidate.status === "published",
  );
  if (!version || !Number.isSafeInteger(version.revision) || version.revision < 1) {
    return unavailable();
  }

  return {
    ok: true,
    value: {
      pointKey: point.pointKey,
      publicCode: point.publicCode,
      displayName: point.displayName,
      versionKey: version.versionKey,
      versionRevision: version.revision,
    },
  };
}

function publicCodeHash(publicCode: string): string {
  return createHash("sha256").update(publicCode, "utf8").digest("hex");
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signature(content: string, signingKey: string | Uint8Array): Buffer {
  return createHmac("sha256", signingKey).update(content, "utf8").digest();
}

export function issueQrSessionToken(
  context: QrSessionContext,
  input: { readonly signingKey: string | Uint8Array; readonly now: number; readonly nonce: string },
): string {
  if (!Number.isSafeInteger(input.now) || !NONCE_PATTERN.test(input.nonce)) {
    throw new TypeError("Invalid QR session issuance input");
  }

  const claims: QrSessionClaims = {
    v: 1,
    pointKey: context.pointKey,
    publicCodeHash: publicCodeHash(context.publicCode),
    versionKey: context.versionKey,
    versionRevision: context.versionRevision,
    capability: QR_SESSION_CAPABILITY,
    nonce: input.nonce,
    iat: input.now,
    exp: input.now + QR_SESSION_TTL_SECONDS,
  };
  const content = `${encode(HEADER)}.${encode(claims)}`;
  return `${content}.${signature(content, input.signingKey).toString("base64url")}`;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
}

function parseClaims(token: string, signingKey: string | Uint8Array): QrSessionClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) return null;

  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const content = `${encodedHeader}.${encodedPayload}`;
    const suppliedSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = signature(content, signingKey);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const header: unknown = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
    const claims: unknown = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (typeof header !== "object" || header === null || Array.isArray(header)) return null;
    if (typeof claims !== "object" || claims === null || Array.isArray(claims)) return null;
    const headerRecord = header as Record<string, unknown>;
    const claimRecord = claims as Record<string, unknown>;
    if (!hasExactKeys(headerRecord, ["alg", "typ", "v"])) return null;
    if (headerRecord.alg !== "HS256" || headerRecord.typ !== "TB113" || headerRecord.v !== 1) {
      return null;
    }
    if (
      !hasExactKeys(claimRecord, [
        "capability", "exp", "iat", "nonce", "pointKey", "publicCodeHash",
        "v", "versionKey", "versionRevision",
      ]) ||
      claimRecord.v !== 1 ||
      typeof claimRecord.pointKey !== "string" ||
      typeof claimRecord.publicCodeHash !== "string" ||
      typeof claimRecord.versionKey !== "string" ||
      !Number.isSafeInteger(claimRecord.versionRevision) ||
      claimRecord.capability !== QR_SESSION_CAPABILITY ||
      typeof claimRecord.nonce !== "string" ||
      !NONCE_PATTERN.test(claimRecord.nonce) ||
      !Number.isSafeInteger(claimRecord.iat) ||
      !Number.isSafeInteger(claimRecord.exp)
    ) {
      return null;
    }
    return claimRecord as QrSessionClaims;
  } catch {
    return null;
  }
}

export function verifyQrSessionToken(
  token: string,
  input: VerifyInput,
): { readonly ok: true; readonly value: QrSessionClaims } | InvalidSession {
  const claims = parseClaims(token, input.signingKey);
  if (!claims || claims.iat > input.now || claims.exp !== claims.iat + QR_SESSION_TTL_SECONDS) {
    return { ok: false, error: { status: 401, code: "INVALID_SESSION" } };
  }
  if (input.now >= claims.exp) {
    return { ok: false, error: { status: 410, code: "SESSION_EXPIRED" } };
  }

  const expected = input.expected;
  if (
    claims.pointKey !== expected.pointKey ||
    claims.publicCodeHash !== publicCodeHash(expected.publicCode) ||
    claims.versionKey !== expected.versionKey ||
    claims.versionRevision !== expected.versionRevision
  ) {
    return { ok: false, error: { status: 401, code: "INVALID_SESSION" } };
  }
  return { ok: true, value: claims };
}
