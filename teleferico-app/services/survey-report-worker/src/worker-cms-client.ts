import "server-only";

import { validateSnapshotEnvelope } from "../../../packages/survey-reporting-core/src";
import {
  WorkerCmsConflictError,
  type CheckpointWrite,
  type CheckpointWriteResult,
  type CompleteCommand,
  type CompleteResult,
  type FailCommand,
  type FailResult,
  type RuntimeFailureCode,
  type WorkerClaimResult,
  type WorkerSnapshotResult,
} from "./contracts";
import { validateTrustedCmsOrigin } from "./cms-origin";
import { validateWorkerStageCheckpointV1 } from "./checkpoint-contract";

const WORKER_PATH = "/api/tb113/worker/generations";
const MAX_REQUEST_BYTES = 4 * 1024;
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const REPORT_RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RUNTIME_FAILURE_CODES: readonly RuntimeFailureCode[] = [
  "PROVIDER_TRANSIENT",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_TIMEOUT",
  "CMS_TRANSIENT",
  "STORAGE_TRANSIENT",
  "INVALID_OUTPUT",
  "AUTHENTICATION",
  "CONFIGURATION",
  "UNKNOWN_VERSION",
  "INVARIANT",
  "PROHIBITED_CONTENT",
  "QUEUE_ENQUEUE_EXHAUSTED",
];
const SAFE_FAILURE_MESSAGES: Record<RuntimeFailureCode, string> = {
  PROVIDER_TRANSIENT: "The report provider is temporarily unavailable.",
  PROVIDER_RATE_LIMIT: "The report provider is temporarily busy.",
  PROVIDER_TIMEOUT: "The report provider timed out.",
  CMS_TRANSIENT: "Report state could not be persisted.",
  STORAGE_TRANSIENT: "The report artifact could not be staged.",
  INVALID_OUTPUT: "The report output did not satisfy its contract.",
  AUTHENTICATION: "The report worker authentication failed.",
  CONFIGURATION: "Report generation is not configured.",
  UNKNOWN_VERSION: "The report contract version is not supported.",
  INVARIANT: "The report state failed an integrity check.",
  PROHIBITED_CONTENT: "The report output contained prohibited content.",
  QUEUE_ENQUEUE_EXHAUSTED: "The report could not be queued.",
};

export type WorkerCmsAction =
  | "api::survey-report-generation.survey-report-generation.workerClaim"
  | "api::survey-report-generation.survey-report-generation.workerSnapshot"
  | "api::survey-report-generation.survey-report-generation.workerFail";

export type WorkerCmsToken = {
  readonly action: WorkerCmsAction;
  readonly value: string;
};

export type WorkerCmsClientOptions = {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly tokenProvider: (action: WorkerCmsAction) => Promise<WorkerCmsToken>;
  readonly fetchImplementation?: typeof fetch;
};

export type WorkerCmsClientErrorCode =
  | "INVALID_CONFIGURATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CMS_TRANSIENT"
  | "INVALID_RESPONSE"
  | "PAYLOAD_TOO_LARGE"
  | "TIMEOUT"
  | "UNKNOWN_VERSION"
  | "UNSUPPORTED_OPERATION";

export class WorkerCmsClientError extends Error {
  constructor(readonly code: WorkerCmsClientErrorCode) {
    super("Worker CMS operation failed");
    this.name = "WorkerCmsClientError";
  }
}

type JsonRecord = Record<string, unknown>;

function fail(code: WorkerCmsClientErrorCode): never {
  throw new WorkerCmsClientError(code);
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: unknown, keys: readonly string[]): value is JsonRecord {
  return (
    isRecord(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function validRunId(value: string): boolean {
  return REPORT_RUN_ID_PATTERN.test(value) && value === value.toLowerCase();
}

function validStateVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

function validateClaim(value: unknown, reportRunId: string): WorkerClaimResult {
  if (
    !isRecord(value) ||
    value.contractVersion !== "survey-worker-cms.v1" ||
    value.reportRunId !== reportRunId ||
    !validStateVersion(value.stateVersion)
  )
    return fail("INVALID_RESPONSE");

  if (value.status === "succeeded" || value.status === "failed") {
    if (
      !exactKeys(value, [
        "contractVersion",
        "reportRunId",
        "stateVersion",
        "status",
        "disposition",
      ]) ||
      value.disposition !== "terminal-replay"
    )
      return fail("INVALID_RESPONSE");
    return value as WorkerClaimResult;
  }

  if (
    !exactKeys(value, [
      "contractVersion",
      "reportRunId",
      "stateVersion",
      "status",
      "disposition",
      "checkpoints",
      "modelConfig",
      "pricingSnapshot",
    ]) ||
    value.status !== "running" ||
    (value.disposition !== "claimed" && value.disposition !== "resumed")
  )
    return fail("INVALID_RESPONSE");

  const checkpoints = value.checkpoints;
  if (
    !exactKeys(checkpoints, [
      "version",
      "snapshotDigest",
      "route",
      "chunkCount",
      "entries",
    ]) ||
    checkpoints.version !== "survey-checkpoints.v1" ||
    !/^[a-f0-9]{64}$/.test(String(checkpoints.snapshotDigest)) ||
    checkpoints.route !== "direct" ||
    checkpoints.chunkCount !== null ||
    !Array.isArray(checkpoints.entries)
  )
    return fail("INVALID_RESPONSE");
  try {
    for (const checkpoint of checkpoints.entries)
      validateWorkerStageCheckpointV1(checkpoint, { reportRunId, route: "direct" });
  } catch {
    return fail("INVALID_RESPONSE");
  }
  if (!isRecord(value.modelConfig) || !isRecord(value.pricingSnapshot))
    return fail("INVALID_RESPONSE");
  return value as WorkerClaimResult;
}

function validateSnapshot(value: unknown, reportRunId: string): WorkerSnapshotResult {
  if (
    !exactKeys(value, ["contractVersion", "reportRunId", "stateVersion", "snapshot"]) ||
    value.contractVersion !== "survey-worker-cms.v1" ||
    value.reportRunId !== reportRunId ||
    !validStateVersion(value.stateVersion) ||
    !exactKeys(value.snapshot, ["canonicalization", "algorithm", "digestHex", "payload"])
  )
    return fail("INVALID_RESPONSE");
  try {
    validateSnapshotEnvelope(
      value.snapshot as unknown as WorkerSnapshotResult["snapshot"],
    );
  } catch {
    return fail("INVALID_RESPONSE");
  }
  return value as WorkerSnapshotResult;
}

function validateFailCommand(command: FailCommand): void {
  if (
    !exactKeys(command, [
      "contractVersion",
      "expectedStateVersion",
      "failureCode",
      "safeFailureMessage",
    ]) ||
    command.contractVersion !== "survey-worker-cms.v1" ||
    !validStateVersion(command.expectedStateVersion) ||
    !RUNTIME_FAILURE_CODES.includes(command.failureCode) ||
    command.safeFailureMessage !== SAFE_FAILURE_MESSAGES[command.failureCode]
  )
    fail("INVALID_CONFIGURATION");
}

function validateClaimRequest(reportRunId: string): string {
  if (!validRunId(reportRunId)) fail("INVALID_CONFIGURATION");
  return JSON.stringify({ commandVersion: "survey-report-command.v1" });
}

function validateFailResult(
  value: unknown,
  reportRunId: string,
  failureCode: RuntimeFailureCode,
): FailResult {
  if (
    !exactKeys(value, [
      "contractVersion",
      "reportRunId",
      "stateVersion",
      "status",
      "failureCode",
      "replayed",
    ]) ||
    value.contractVersion !== "survey-worker-cms.v1" ||
    value.reportRunId !== reportRunId ||
    !validStateVersion(value.stateVersion) ||
    value.status !== "failed" ||
    value.failureCode !== failureCode ||
    typeof value.replayed !== "boolean"
  )
    return fail("INVALID_RESPONSE");
  return value as FailResult;
}

function readSafeError(error: unknown): WorkerCmsClientError {
  if (error instanceof WorkerCmsClientError) return error;
  return new WorkerCmsClientError("CMS_TRANSIENT");
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return fail("INVALID_RESPONSE");
    if (Number(contentLength) > MAX_RESPONSE_BYTES) return fail("PAYLOAD_TOO_LARGE");
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
    if (error instanceof WorkerCmsClientError) throw error;
    return fail("CMS_TRANSIENT");
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function withinDeadline<T>(
  signal: AbortSignal,
  operation: () => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new WorkerCmsClientError("TIMEOUT"));
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    Promise.resolve()
      .then(operation)
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export function createWorkerCmsClient(options: WorkerCmsClientOptions) {
  let baseUrl: URL;
  try {
    baseUrl = validateTrustedCmsOrigin(options.baseUrl, options.allowedOrigins);
  } catch {
    return fail("INVALID_CONFIGURATION");
  }
  if (typeof options.tokenProvider !== "function") fail("INVALID_CONFIGURATION");
  const fetchImplementation = options.fetchImplementation ?? fetch;

  async function request<T>(input: {
    readonly reportRunId: string;
    readonly action: WorkerCmsAction;
    readonly method: "GET" | "POST";
    readonly suffix: "claim" | "snapshot" | "fail";
    readonly body?: string;
    readonly validate: (value: unknown, reportRunId: string) => T;
  }): Promise<T> {
    if (!validRunId(input.reportRunId)) fail("INVALID_CONFIGURATION");
    if (
      input.body !== undefined &&
      new TextEncoder().encode(input.body).byteLength > MAX_REQUEST_BYTES
    )
      fail("PAYLOAD_TOO_LARGE");

    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    try {
      const provided = await withinDeadline(signal, () =>
        options.tokenProvider(input.action),
      );
      if (
        !isRecord(provided) ||
        provided.action !== input.action ||
        typeof provided.value !== "string" ||
        provided.value.length === 0 ||
        provided.value.length > 8192 ||
        /[\u0000-\u0020\u007f]/.test(provided.value)
      )
        fail("INVALID_CONFIGURATION");

      const url = new URL(
        `${WORKER_PATH}/${encodeURIComponent(input.reportRunId)}/${input.suffix}`,
        baseUrl,
      );
      const response = await withinDeadline(signal, () =>
        fetchImplementation(url, {
          method: input.method,
          headers: {
            accept: "application/json",
            authorization: `Bearer ${provided.value}`,
            ...(input.body === undefined ? {} : { "content-type": "application/json" }),
          },
          ...(input.body === undefined ? {} : { body: input.body }),
          cache: "no-store",
          redirect: "error",
          signal,
        }),
      );
      if (
        response.redirected ||
        (response.url !== "" && new URL(response.url).origin !== baseUrl.origin)
      )
        fail("CMS_TRANSIENT");
      if (!response.ok) {
        if (response.status === 401) fail("UNAUTHORIZED");
        if (response.status === 403) fail("FORBIDDEN");
        if (response.status === 409) throw new WorkerCmsConflictError();
        if (response.status === 413) fail("PAYLOAD_TOO_LARGE");
        fail(response.status >= 500 ? "CMS_TRANSIENT" : "INVALID_RESPONSE");
      }
      if (
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
          response.headers.get("content-type") ?? "",
        )
      )
        fail("INVALID_RESPONSE");

      let decoded: unknown;
      try {
        const bytes = await withinDeadline(signal, () => readBoundedBody(response));
        decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      } catch (error) {
        if (error instanceof WorkerCmsClientError) throw error;
        fail("INVALID_RESPONSE");
      }
      return input.validate(decoded, input.reportRunId);
    } catch (error) {
      if (error instanceof WorkerCmsConflictError) throw error;
      throw readSafeError(error);
    }
  }

  return {
    async claim(reportRunId: string): Promise<WorkerClaimResult> {
      const body = validateClaimRequest(reportRunId);
      return request({
        reportRunId,
        action:
          "api::survey-report-generation.survey-report-generation.workerClaim",
        method: "POST",
        suffix: "claim",
        body,
        validate: validateClaim,
      });
    },
    snapshot(reportRunId: string): Promise<WorkerSnapshotResult> {
      return request({
        reportRunId,
        action:
          "api::survey-report-generation.survey-report-generation.workerSnapshot",
        method: "GET",
        suffix: "snapshot",
        validate: validateSnapshot,
      });
    },
    checkpoint(
      _reportRunId: string,
      _command: CheckpointWrite,
    ): Promise<CheckpointWriteResult> {
      return Promise.reject(new WorkerCmsClientError("UNKNOWN_VERSION"));
    },
    complete(
      _reportRunId: string,
      _command: CompleteCommand,
    ): Promise<CompleteResult> {
      return Promise.reject(new WorkerCmsClientError("UNSUPPORTED_OPERATION"));
    },
    async fail(reportRunId: string, command: FailCommand): Promise<FailResult> {
      validateFailCommand(command);
      return request({
        reportRunId,
        action: "api::survey-report-generation.survey-report-generation.workerFail",
        method: "POST",
        suffix: "fail",
        body: JSON.stringify(command),
        validate: (value, id) => validateFailResult(value, id, command.failureCode),
      });
    },
  };
}
