import type { RuntimeFailureCode } from "./contracts";

const TRANSIENT_CODES = new Set<RuntimeFailureCode>([
  "PROVIDER_TRANSIENT",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_TIMEOUT",
  "CMS_TRANSIENT",
  "STORAGE_TRANSIENT",
]);

const TRANSIENT_TRANSPORT_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
]);

export function retryableFailureCode(error: unknown): RuntimeFailureCode | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { code?: unknown; status?: unknown; statusCode?: unknown; name?: unknown };
  if (record.name === "PdfRendererError") return "STORAGE_TRANSIENT";
  if (typeof record.code === "string" && TRANSIENT_CODES.has(record.code as RuntimeFailureCode))
    return record.code as RuntimeFailureCode;
  if (record.code === "TIMEOUT") return "PROVIDER_TIMEOUT";
  if (typeof record.code === "string" && TRANSIENT_TRANSPORT_CODES.has(record.code))
    return "PROVIDER_TRANSIENT";
  const status = typeof record.status === "number" ? record.status : record.statusCode;
  if (status === 429) return "PROVIDER_RATE_LIMIT";
  if (status === 408) return "PROVIDER_TIMEOUT";
  if (typeof status === "number" && status >= 500 && status <= 599)
    return "PROVIDER_TRANSIENT";
  return null;
}

export async function retryTransient<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (retryableFailureCode(error) === null || attempt >= 2) throw error;
    }
  }
}
