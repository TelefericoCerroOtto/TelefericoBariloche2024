import { ENV_KEYS } from "@/lib/constants/env.const";
import crypto from "node:crypto";

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
