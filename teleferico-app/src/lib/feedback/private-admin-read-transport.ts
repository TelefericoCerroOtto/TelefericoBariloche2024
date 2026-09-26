import "server-only";

import { validateTrustedCmsOrigin } from "../../../services/survey-report-worker/src/cms-origin";

export const FEEDBACK_ADMIN_READ_ACTION =
  "api::survey-report-generation.survey-report-generation.feedbackAdminRead" as const;

const READ_PATH = "/api/tb113/admin/feedback/read";
const CONTRACT = "feedback-admin-source.v1";
const PAGE_SIZE = 25;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const TIMEOUT_MS = 10_000;

export type FeedbackAdminSourceResource =
  | "submissions"
  | "versions"
  | "points"
  | "reports";

export type FeedbackAdminSourcePageQuery = {
  readonly resource: FeedbackAdminSourceResource;
  readonly acceptedAtGte: string;
  readonly acceptedAtLte: string;
  readonly dataCutoffAt: string;
  readonly cursor: string | null;
};

export type FeedbackAdminSourcePage = {
  readonly resource: FeedbackAdminSourceResource;
  readonly cursor: string | null;
  readonly nextCursor: string | null;
  readonly total: number;
  readonly items: readonly Record<string, unknown>[];
};

export class FeedbackAdminTransportError extends Error {
  constructor(readonly code: "INVALID_CONFIGURATION" | "UNAUTHORIZED" | "FORBIDDEN" | "UPSTREAM_UNAVAILABLE" | "INVALID_RESPONSE") {
    super("Private feedback administration source is unavailable");
    this.name = "FeedbackAdminTransportError";
  }
}

export type PrivateFeedbackAdminReadTransportOptions = {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly tokenProvider: (
    action: typeof FEEDBACK_ADMIN_READ_ACTION,
    signal: AbortSignal,
  ) => Promise<{ readonly action: string; readonly value: string }>;
  readonly fetchImplementation?: typeof fetch;
};

function fail(code: ConstructorParameters<typeof FeedbackAdminTransportError>[0]): never {
  throw new FeedbackAdminTransportError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validatePage(value: unknown, query: FeedbackAdminSourcePageQuery): FeedbackAdminSourcePage {
  if (!isRecord(value)) return fail("INVALID_RESPONSE");
  const keys = ["contractVersion", "resource", "cursor", "nextCursor", "total", "items"];
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key)) ||
      value.contractVersion !== CONTRACT || value.resource !== query.resource || value.cursor !== query.cursor ||
      (value.nextCursor !== null && typeof value.nextCursor !== "string") ||
      (value.nextCursor !== null && value.nextCursor === query.cursor) ||
      !Number.isSafeInteger(value.total) || Number(value.total) < 0 || !Array.isArray(value.items) ||
      value.items.length > PAGE_SIZE || !value.items.every(isRecord) ||
      (value.nextCursor !== null && (value.items.length === 0 || value.items.length >= Number(value.total))))
    return fail("INVALID_RESPONSE");
  return value as unknown as FeedbackAdminSourcePage;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES))
    return fail("INVALID_RESPONSE");
  if (!response.body) return fail("INVALID_RESPONSE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return fail("INVALID_RESPONSE");
      }
      chunks.push(part.value);
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
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return fail("INVALID_RESPONSE");
  }
}

export function createPrivateFeedbackAdminReadTransport(
  options: PrivateFeedbackAdminReadTransportOptions,
) {
  let origin: URL;
  try {
    origin = validateTrustedCmsOrigin(options.baseUrl, options.allowedOrigins);
  } catch {
    return fail("INVALID_CONFIGURATION");
  }
  const fetchImplementation = options.fetchImplementation ?? fetch;
  return Object.freeze({
    async readPage(query: FeedbackAdminSourcePageQuery): Promise<FeedbackAdminSourcePage> {
      if (!options.tokenProvider || !["submissions", "versions", "points", "reports"].includes(query.resource))
        return fail("INVALID_CONFIGURATION");
      const signal = AbortSignal.timeout(TIMEOUT_MS);
      try {
        const token = await options.tokenProvider(FEEDBACK_ADMIN_READ_ACTION, signal);
        if (token?.action !== FEEDBACK_ADMIN_READ_ACTION || typeof token.value !== "string" ||
            token.value.length === 0 || token.value.length > 8192 || /[\u0000-\u0020\u007f]/.test(token.value))
          return fail("INVALID_CONFIGURATION");
        const response = await fetchImplementation(new URL(READ_PATH, origin), {
          method: "POST",
          headers: {
            authorization: `Bearer ${token.value}`,
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            contractVersion: CONTRACT,
            resource: query.resource,
            acceptedAtGte: query.acceptedAtGte,
            acceptedAtLte: query.acceptedAtLte,
            dataCutoffAt: query.dataCutoffAt,
            cursor: query.cursor,
            pageSize: PAGE_SIZE,
          }),
          cache: "no-store",
          redirect: "error",
          signal,
        });
        if (response.redirected || (response.url !== "" && new URL(response.url).origin !== origin.origin))
          return fail("UPSTREAM_UNAVAILABLE");
        if (response.status === 401) return fail("UNAUTHORIZED");
        if (response.status === 403) return fail("FORBIDDEN");
        if (!response.ok) return fail("UPSTREAM_UNAVAILABLE");
        if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? ""))
          return fail("INVALID_RESPONSE");
        return validatePage(await readBoundedJson(response), query);
      } catch (error) {
        if (error instanceof FeedbackAdminTransportError) throw error;
        return fail("UPSTREAM_UNAVAILABLE");
      }
    },
  });
}
