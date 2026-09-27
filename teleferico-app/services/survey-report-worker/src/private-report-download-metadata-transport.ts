import "server-only";

import { validateTrustedCmsOrigin } from "./cms-origin";

export const REPORT_DOWNLOAD_METADATA_ACTION =
  "api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata" as const;
export const MAX_REPORT_PDF_BYTES = 25 * 1024 * 1024;

const PATH_ROOT = "/api/tb113/worker/reports";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 4 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type PrivateReportDownloadMetadataV1 = {
  readonly contractVersion: "survey-report-download-metadata.v1";
  readonly reportId: string;
  readonly reportRunId: string;
  readonly generationStatus: "succeeded";
  readonly objectKey: string;
  readonly sha256: string;
  readonly size: number;
  readonly mimeType: "application/pdf";
};

export type ReportDownloadMetadataTransportErrorCode =
  | "INVALID_CONFIGURATION"
  | "NOT_FOUND"
  | "UPSTREAM_UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "TIMEOUT";

export class ReportDownloadMetadataTransportError extends Error {
  constructor(readonly code: ReportDownloadMetadataTransportErrorCode) {
    super("Private report metadata is unavailable");
    this.name = "ReportDownloadMetadataTransportError";
  }
}

export type ReportDownloadMetadataTransportOptions = {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly tokenProvider: (
    action: typeof REPORT_DOWNLOAD_METADATA_ACTION,
    signal: AbortSignal,
  ) => Promise<{ readonly action: string; readonly value: string }>;
  readonly fetchImplementation?: typeof fetch;
};

function fail(code: ReportDownloadMetadataTransportErrorCode): never {
  throw new ReportDownloadMetadataTransportError(code);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateReportDownloadMetadata(
  value: unknown,
  expectedReportId: string,
): PrivateReportDownloadMetadataV1 {
  if (!UUID_PATTERN.test(expectedReportId) || !isRecord(value))
    return fail("INVALID_RESPONSE");
  const keys = [
    "contractVersion",
    "reportId",
    "reportRunId",
    "generationStatus",
    "objectKey",
    "sha256",
    "size",
    "mimeType",
  ];
  if (
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key)) ||
    value.contractVersion !== "survey-report-download-metadata.v1" ||
    value.reportId !== expectedReportId ||
    typeof value.reportRunId !== "string" ||
    !UUID_PATTERN.test(value.reportRunId) ||
    value.generationStatus !== "succeeded" ||
    value.objectKey !== `private/feedback-reports/${expectedReportId}/report.pdf` ||
    typeof value.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.sha256) ||
    !Number.isSafeInteger(value.size) ||
    (value.size as number) < 1 ||
    (value.size as number) > MAX_REPORT_PDF_BYTES ||
    value.mimeType !== "application/pdf"
  )
    return fail("INVALID_RESPONSE");

  return value as PrivateReportDownloadMetadataV1;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_RESPONSE_BYTES)
  )
    return fail("INVALID_RESPONSE");
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
        return fail("INVALID_RESPONSE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
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

async function withinDeadline<T>(
  signal: AbortSignal,
  operation: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new ReportDownloadMetadataTransportError("TIMEOUT"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    Promise.resolve()
      .then(operation)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export function createPrivateReportDownloadMetadataTransport(
  options: ReportDownloadMetadataTransportOptions,
) {
  let baseUrl: URL;
  try {
    baseUrl = validateTrustedCmsOrigin(options.baseUrl, options.allowedOrigins);
  } catch {
    return fail("INVALID_CONFIGURATION");
  }
  if (typeof options.tokenProvider !== "function")
    return fail("INVALID_CONFIGURATION");
  const fetchImplementation = options.fetchImplementation ?? fetch;

  return Object.freeze({
    async read(reportId: string): Promise<PrivateReportDownloadMetadataV1> {
      if (!UUID_PATTERN.test(reportId)) return fail("INVALID_CONFIGURATION");
      const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      try {
        const token = await withinDeadline(signal, () =>
          options.tokenProvider(REPORT_DOWNLOAD_METADATA_ACTION, signal),
        );
        if (
          token?.action !== REPORT_DOWNLOAD_METADATA_ACTION ||
          typeof token.value !== "string" ||
          token.value.length === 0 ||
          token.value.length > 8192 ||
          /[\u0000-\u0020\u007f]/.test(token.value)
        )
          return fail("INVALID_CONFIGURATION");
        const url = new URL(
          `${PATH_ROOT}/${reportId}/download-metadata`,
          baseUrl,
        );
        const response = await withinDeadline(signal, () =>
          fetchImplementation(url, {
            method: "GET",
            headers: {
              accept: "application/json",
              authorization: `Bearer ${token.value}`,
            },
            cache: "no-store",
            redirect: "error",
            signal,
          },
        ));
        if (
          response.redirected ||
          (response.url !== "" && new URL(response.url).origin !== baseUrl.origin)
        )
          return fail("UPSTREAM_UNAVAILABLE");
        if (response.status === 404) return fail("NOT_FOUND");
        if (!response.ok) return fail("UPSTREAM_UNAVAILABLE");
        if (
          !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
            response.headers.get("content-type") ?? "",
          )
        )
          return fail("INVALID_RESPONSE");
        const decoded = await withinDeadline(signal, () => readBoundedJson(response));
        return validateReportDownloadMetadata(decoded, reportId);
      } catch (error) {
        if (error instanceof ReportDownloadMetadataTransportError) throw error;
        return fail(signal.aborted ? "TIMEOUT" : "UPSTREAM_UNAVAILABLE");
      }
    },
  });
}
