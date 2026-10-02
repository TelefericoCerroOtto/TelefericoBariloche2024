import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ISSUER = "https://tb113-local-development.invalid";
const PRINCIPAL = "tb113-local-task-invoker";
const ALGORITHM = "HS256";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(key, input) {
  return createHmac("sha256", key).update(input).digest();
}

export function createLocalDevelopmentOidc({ audience, nowSeconds = () => Math.floor(Date.now() / 1000) }) {
  if (typeof audience !== "string" || !audience.startsWith("http://127.0.0.1:"))
    throw new TypeError("Local worker audience is invalid");
  const key = randomBytes(32);
  const issuerAllowlist = Object.freeze([ISSUER]);

  return Object.freeze({
    principal: PRINCIPAL,
    audience,
    issuerAllowlist,
    createToken() {
      const now = nowSeconds();
      const content = `${encode({ alg: ALGORITHM, typ: "JWT" })}.${encode({
        iss: ISSUER,
        aud: audience,
        sub: PRINCIPAL,
        email: PRINCIPAL,
        iat: now,
        exp: now + 60,
      })}`;
      return `${content}.${signature(key, content).toString("base64url")}`;
    },
    async verifySignedToken(token) {
      if (typeof token !== "string") return null;
      const parts = token.split(".");
      if (parts.length !== 3) return null;
      const input = `${parts[0]}.${parts[1]}`;
      let supplied;
      let header;
      let claims;
      try {
        supplied = Buffer.from(parts[2], "base64url");
        header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      } catch {
        return null;
      }
      const expected = signature(key, input);
      if (supplied.byteLength !== expected.byteLength || !timingSafeEqual(supplied, expected) ||
          header.alg !== ALGORITHM || header.typ !== "JWT" || claims.iss !== ISSUER ||
          claims.aud !== audience || claims.sub !== PRINCIPAL || claims.email !== PRINCIPAL)
        return null;
      return {
        signatureVerified: true,
        issuer: claims.iss,
        audience: claims.aud,
        principal: claims.sub,
        issuedAt: claims.iat,
        expiresAt: claims.exp,
      };
    },
  });
}
