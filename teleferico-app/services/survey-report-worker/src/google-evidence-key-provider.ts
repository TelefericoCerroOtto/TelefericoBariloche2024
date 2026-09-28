import "server-only";

import { GoogleAuth } from "google-auth-library";
import type { EvidenceKeyProvider } from "./contracts";
import { assertKeylessCloudRunEnvironment } from "./google-auth-runtime";

const PROJECT_ID = "teleferico-bariloche-2024";
const SECRET_VERSION_PATTERN = new RegExp(`^projects/${PROJECT_ID}/secrets/[a-zA-Z0-9_-]{1,255}/versions/[1-9][0-9]*$`);
const MAX_RESPONSE_BYTES = 16 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES))
    throw new Error("invalid-secret-response");
  if (!response.body) throw new Error("invalid-secret-response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error("invalid-secret-response");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

export function createGoogleEvidenceKeyProvider(input: {
  readonly secretVersion: string;
  readonly evidenceKeyId: string;
  readonly accessTokenProvider?: () => Promise<string>;
  readonly fetchImplementation?: typeof fetch;
}): EvidenceKeyProvider {
  if (!SECRET_VERSION_PATTERN.test(input.secretVersion) ||
      !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(input.evidenceKeyId))
    throw new TypeError("TB-113 evidence-key configuration is invalid");
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const accessTokenProvider = input.accessTokenProvider ?? (async () => {
    assertKeylessCloudRunEnvironment();
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const result = await client.getAccessToken();
    if (!result.token) throw new Error("application-default-credentials-unavailable");
    return result.token;
  });

  return async (evidenceKeyId) => {
    if (evidenceKeyId !== input.evidenceKeyId)
      throw Object.assign(new TypeError("Evidence key identifier is not configured"), { code: "CONFIGURATION" as const });
    const signal = AbortSignal.timeout(10_000);
    let accessToken: string;
    try {
      accessToken = await new Promise<string>((resolve, reject) => {
        const abort = () => reject(new Error("secret-token-timeout"));
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve(accessTokenProvider()).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
        if (signal.aborted) abort();
      });
    } catch {
      throw Object.assign(new Error("Evidence key authentication is unavailable"), { code: "AUTHENTICATION" as const });
    }
    if (!accessToken || /[\u0000-\u0020\u007f]/.test(accessToken))
      throw Object.assign(new Error("Evidence key authentication is unavailable"), { code: "AUTHENTICATION" as const });
    if (signal.aborted)
      throw Object.assign(new Error("Evidence key access timed out"), { code: "PROVIDER_TIMEOUT" as const });

    let response: Response;
    try {
      response = await fetchImplementation(`https://secretmanager.googleapis.com/v1/${input.secretVersion}:access`, {
        method: "GET",
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
        cache: "no-store",
        redirect: "error",
        signal,
      });
    } catch {
      throw Object.assign(new Error("Evidence key service is unavailable"), { code: signal.aborted ? "PROVIDER_TIMEOUT" : "PROVIDER_TRANSIENT" });
    }
    if (response.redirected || !response.ok ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? ""))
      throw Object.assign(new Error("Evidence key service is unavailable"), {
        code: response.status === 401 || response.status === 403 ? "AUTHENTICATION" : response.status >= 500 ? "PROVIDER_TRANSIENT" : "CONFIGURATION",
      });
    let result: unknown;
    try { result = await readJson(response); } catch {
      throw Object.assign(new Error("Evidence key response is invalid"), { code: "CONFIGURATION" as const });
    }
    if (!isRecord(result) || result.name !== input.secretVersion || !isRecord(result.payload) || typeof result.payload.data !== "string")
      throw Object.assign(new Error("Evidence key response is invalid"), { code: "CONFIGURATION" as const });
    const encoded = result.payload.data;
    let key: Buffer;
    try { key = Buffer.from(encoded, "base64"); } catch {
      throw Object.assign(new Error("Evidence key response is invalid"), { code: "CONFIGURATION" as const });
    }
    if (key.byteLength < 32 || key.toString("base64") !== encoded)
      throw Object.assign(new Error("Evidence key response is invalid"), { code: "CONFIGURATION" as const });
    return new Uint8Array(key);
  };
}
