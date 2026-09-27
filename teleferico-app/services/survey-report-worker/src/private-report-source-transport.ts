import "server-only";

import { validateTrustedCmsOrigin } from "./cms-origin";
import type {
  GenerationSourcePageQueryV1,
  GenerationSourcePageV1,
  GenerationSourceResourceV1,
} from "./authoritative-generation-source";

const SOURCE_PATH = "/api/tb113/worker/report-source";
const CONTRACT_VERSION = "survey-generation-source.v1";
const PAGE_SIZE = 25;
const MAX_REQUEST_BYTES = 4 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_WINDOW_MILLISECONDS = 732 * 24 * 60 * 60 * 1000;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]{1,1024}$/;

export type PrivateReportSourcePageResponseV1 = {
  readonly contractVersion: typeof CONTRACT_VERSION;
  readonly resource: GenerationSourceResourceV1;
  readonly cursor: string | null;
  readonly nextCursor: string | null;
  readonly total: number;
  readonly items: readonly unknown[];
};

export type PrivateReportSourceTransportOptions = {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly tokenProvider: (signal: AbortSignal) => Promise<string>;
  readonly fetchImplementation?: typeof fetch;
};

export type PrivateReportSourceTransportErrorCode =
  | "INVALID_CONFIGURATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UPSTREAM_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "PAYLOAD_TOO_LARGE"
  | "TIMEOUT";

export class PrivateReportSourceTransportError extends Error {
  constructor(readonly code: PrivateReportSourceTransportErrorCode) {
    super("Private report source is unavailable");
    this.name = "PrivateReportSourceTransportError";
  }
}

type JsonRecord = Record<string, unknown>;

function fail(code: PrivateReportSourceTransportErrorCode): never {
  throw new PrivateReportSourceTransportError(code);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validInstant(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
    return false;
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function validateQuery(query: GenerationSourcePageQueryV1): void {
  if (
    !["submissions", "versions", "points"].includes(query.resource) ||
    !validInstant(query.acceptedAtGte) ||
    !validInstant(query.acceptedAtLte) ||
    !validInstant(query.dataCutoffAt) ||
    Date.parse(query.acceptedAtGte) > Date.parse(query.acceptedAtLte) ||
    Date.parse(query.acceptedAtLte) - Date.parse(query.acceptedAtGte) >
      MAX_WINDOW_MILLISECONDS ||
    (query.cursor !== null && !CURSOR_PATTERN.test(query.cursor))
  )
    fail("INVALID_CONFIGURATION");
}

function isExactResponse(value: unknown): value is PrivateReportSourcePageResponseV1 {
  if (!isRecord(value)) return false;
  const keys = [
    "contractVersion",
    "resource",
    "cursor",
    "nextCursor",
    "total",
    "items",
  ];
  if (
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key)) ||
    value.contractVersion !== CONTRACT_VERSION ||
    !["submissions", "versions", "points"].includes(String(value.resource)) ||
    (value.cursor !== null &&
      (typeof value.cursor !== "string" || !CURSOR_PATTERN.test(value.cursor))) ||
    (value.nextCursor !== null &&
      (typeof value.nextCursor !== "string" ||
        !CURSOR_PATTERN.test(value.nextCursor))) ||
    !Number.isSafeInteger(value.total) ||
    (value.total as number) < 0 ||
    !Array.isArray(value.items) ||
    value.items.length > PAGE_SIZE ||
    !value.items.every(isRecord)
  )
    return false;
  return true;
}

function validatePage(
  value: unknown,
  query: GenerationSourcePageQueryV1,
): GenerationSourcePageV1 {
  if (
    !isExactResponse(value) ||
    value.resource !== query.resource ||
    value.cursor !== query.cursor ||
    (value.nextCursor !== null && value.nextCursor === query.cursor) ||
    (value.nextCursor !== null && value.items.length === 0) ||
    (query.cursor === null &&
      value.nextCursor === null &&
      value.items.length !== value.total) ||
    (value.nextCursor === null && value.items.length > value.total) ||
    (value.nextCursor !== null && value.items.length >= value.total)
  )
    return fail("INVALID_RESPONSE");

  return {
    cursor: value.cursor,
    nextCursor: value.nextCursor,
    total: value.total,
    items: value.items,
  };
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return fail("INVALID_RESPONSE");
    if (Number(contentLength) > MAX_RESPONSE_BYTES)
      return fail("PAYLOAD_TOO_LARGE");
  }
  if (!response.body) return fail("INVALID_RESPONSE");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return fail("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof PrivateReportSourceTransportError) throw error;
    return fail("UPSTREAM_UNAVAILABLE");
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

async function withinDeadline<T>(
  signal: AbortSignal,
  operation: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new PrivateReportSourceTransportError("TIMEOUT"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    Promise.resolve()
      .then(operation)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

function safeError(error: unknown): PrivateReportSourceTransportError {
  if (error instanceof PrivateReportSourceTransportError) return error;
  return new PrivateReportSourceTransportError("UPSTREAM_UNAVAILABLE");
}

export function createPrivateReportSourceTransport(
  options: PrivateReportSourceTransportOptions,
) {
  let baseUrl: URL;
  try {
    baseUrl = validateTrustedCmsOrigin(options.baseUrl, options.allowedOrigins);
  } catch {
    return fail("INVALID_CONFIGURATION");
  }
  if (typeof options.tokenProvider !== "function")
    fail("INVALID_CONFIGURATION");
  const fetchImplementation = options.fetchImplementation ?? fetch;

  return {
    async readPage(query: GenerationSourcePageQueryV1): Promise<GenerationSourcePageV1> {
      validateQuery(query);
      const body = JSON.stringify({
        contractVersion: CONTRACT_VERSION,
        resource: query.resource,
        acceptedAtGte: query.acceptedAtGte,
        acceptedAtLte: query.acceptedAtLte,
        dataCutoffAt: query.dataCutoffAt,
        cursor: query.cursor,
        pageSize: PAGE_SIZE,
      });
      if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES)
        fail("PAYLOAD_TOO_LARGE");

      const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      try {
        const token = await withinDeadline(signal, () => options.tokenProvider(signal));
        if (
          typeof token !== "string" ||
          token.length === 0 ||
          token.length > 8192 ||
          /[\u0000-\u0020\u007f]/.test(token)
        )
          fail("INVALID_CONFIGURATION");

        const response = await withinDeadline(signal, () =>
          fetchImplementation(new URL(SOURCE_PATH, baseUrl), {
            method: "POST",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body,
            cache: "no-store",
            redirect: "error",
            signal,
          }),
        );
        if (
          response.redirected ||
          (response.url !== "" && new URL(response.url).origin !== baseUrl.origin)
        )
          fail("UPSTREAM_UNAVAILABLE");
        if (!response.ok) {
          if (response.status === 401) fail("UNAUTHORIZED");
          if (response.status === 403) fail("FORBIDDEN");
          fail("UPSTREAM_UNAVAILABLE");
        }
        if (
          !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
            response.headers.get("content-type") ?? "",
          )
        )
          fail("INVALID_RESPONSE");

        let raw: unknown;
        try {
          const bytes = await withinDeadline(signal, () => readBoundedBody(response));
          raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
        } catch (error) {
          if (error instanceof PrivateReportSourceTransportError) throw error;
          fail("INVALID_RESPONSE");
        }
        return validatePage(raw, query);
      } catch (error) {
        throw safeError(error);
      }
    },
  };
}
