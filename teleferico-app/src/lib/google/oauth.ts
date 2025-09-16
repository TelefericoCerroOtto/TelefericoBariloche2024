import crypto from "node:crypto";
import { google } from "googleapis";
import { ENV_KEYS, REQUIRED_ENV_KEYS, SCOPES } from "./constants";

export function assertEnv(required: string[] = REQUIRED_ENV_KEYS) {
  const missing = required.filter(
    (k) => !process.env[k] || process.env[k] === "",
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required env variables: ${missing.join(", ")}. Check your .env configuration.`,
    );
  }
}

export function createOAuthClient() {
  assertEnv();
  const clientId = process.env[ENV_KEYS.GOOGLE_CLIENT_ID] as string;
  const clientSecret = process.env[ENV_KEYS.GOOGLE_CLIENT_SECRET] as string;
  const redirectUri = process.env[ENV_KEYS.OAUTH_REDIRECT_URI] as string;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// CSRF state helpers (HMAC-signed state)
export function generateState(): string {
  const secret = process.env[ENV_KEYS.CSRF_STATE_SECRET] as string;
  const nonce = crypto.randomBytes(16).toString("hex");
  const ts = Date.now().toString();
  const h = crypto
    .createHmac("sha256", secret)
    .update(`${nonce}.${ts}`)
    .digest("hex");
  return `${nonce}.${ts}.${h}`;
}

export function verifyState(state: string, maxAgeMs = 10 * 60 * 1000): boolean {
  try {
    const secret = process.env[ENV_KEYS.CSRF_STATE_SECRET] as string;
    const [nonce, ts, sig] = state.split(".");
    if (!nonce || !ts || !sig) return false;
    const age = Date.now() - Number(ts);
    if (Number.isNaN(age) || age < 0 || age > maxAgeMs) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${nonce}.${ts}`)
      .digest("hex");
    // timing-safe comparison
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function buildAuthUrl(oauthClient = createOAuthClient()) {
  return oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: Array.from(SCOPES),
    prompt: "consent",
  });
}
