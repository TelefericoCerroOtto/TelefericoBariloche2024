import "server-only";

import { OAuth2Client } from "google-auth-library";
import type { ReportWorkerOidcPolicy, VerifiedOidcClaims } from "./worker-http";

const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GoogleIdTokenVerifier = {
  verifyIdToken(input: { idToken: string; audience: string }): Promise<{
    getPayload(): {
      readonly iss?: unknown;
      readonly aud?: unknown;
      readonly email?: unknown;
      readonly email_verified?: unknown;
      readonly iat?: unknown;
      readonly exp?: unknown;
      readonly nbf?: unknown;
    } | undefined;
  }>;
};

export function createGoogleTaskOidcPolicy(input: {
  readonly audience: string;
  readonly principal: string;
  readonly issuerAllowlist: readonly string[];
  readonly verifier?: GoogleIdTokenVerifier;
  readonly nowSeconds?: () => number;
}): ReportWorkerOidcPolicy {
  const issuers = [...input.issuerAllowlist];
  let audience: URL;
  try {
    audience = new URL(input.audience);
  } catch {
    throw new TypeError("Google task OIDC policy is incomplete");
  }
  if (
    audience.protocol !== "https:" || audience.origin !== input.audience ||
    !input.principal.endsWith(".iam.gserviceaccount.com") || !EMAIL_PATTERN.test(input.principal) ||
    issuers.length === 0 ||
    new Set(issuers).size !== issuers.length ||
    issuers.some((issuer) => !GOOGLE_ISSUERS.has(issuer))
  )
    throw new TypeError("Google task OIDC policy is incomplete");

  const verifier = input.verifier ?? new OAuth2Client();
  const nowSeconds = input.nowSeconds ?? (() => Math.floor(Date.now() / 1000));

  return Object.freeze({
    issuerAllowlist: Object.freeze(issuers),
    audience: input.audience,
    principal: input.principal,
    nowSeconds,
    async verifySignedToken(token: string): Promise<VerifiedOidcClaims | null> {
      try {
        const payload = (await verifier.verifyIdToken({
          idToken: token,
          audience: input.audience,
        })).getPayload() as {
          readonly iss?: unknown;
          readonly aud?: unknown;
          readonly email?: unknown;
          readonly email_verified?: unknown;
          readonly iat?: unknown;
          readonly exp?: unknown;
          readonly nbf?: unknown;
        } | undefined;
        if (!payload || typeof payload.iss !== "string" || !issuers.includes(payload.iss)) return null;
        if (
          payload.aud !== input.audience ||
          typeof payload.email !== "string" || !EMAIL_PATTERN.test(payload.email) ||
          payload.email_verified !== true ||
          !Number.isSafeInteger(payload.iat) ||
          !Number.isSafeInteger(payload.exp) ||
          (payload.nbf !== undefined && !Number.isSafeInteger(payload.nbf))
        ) return null;
        const now = nowSeconds();
        const issuedAt = payload.iat as number;
        const expiresAt = payload.exp as number;
        const notBefore = payload.nbf as number | undefined;
        if (issuedAt > now + 30 || expiresAt <= now || expiresAt <= issuedAt || (notBefore !== undefined && notBefore > now))
          return null;
        return {
          signatureVerified: true,
          issuer: payload.iss,
          audience: input.audience,
          principal: payload.email,
          issuedAt,
          expiresAt,
          ...(notBefore === undefined ? {} : { notBefore }),
        };
      } catch {
        return null;
      }
    },
  });
}
