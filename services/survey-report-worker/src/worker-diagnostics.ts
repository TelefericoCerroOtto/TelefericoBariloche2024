export const WORKER_DIAGNOSTIC_RETENTION_DAYS = 30;
export const WORKER_DIAGNOSTIC_MAX_BYTES = 4 * 1024;

const DAY_MS = 24 * 60 * 60 * 1000;
const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SAFE_REVISION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const STAGE = /^(worker|redact|count|direct|map\.[1-9]\d*-of-[1-9]\d*|reduce|validate|render|store)$/;

const SAFE_ERRORS = {
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
} as const;

const LABELS = Object.freeze({
  feature: "survey-reporting",
  service: "survey-report-worker",
});

export type WorkerDiagnosticEventV1 = {
  readonly contractVersion: "survey-worker-diagnostic-event.v1";
  readonly reportRunId: string;
  readonly stage: string;
  readonly status: "failed";
  readonly attempt: number;
  readonly model: "gemini-3.8-flash";
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly chunks: number;
  readonly durationMs: number;
  readonly error: {
    readonly code: keyof typeof SAFE_ERRORS;
    readonly message: (typeof SAFE_ERRORS)[keyof typeof SAFE_ERRORS];
  };
  readonly sourceRevision: string;
  readonly labels: typeof LABELS;
};

export type WorkerDiagnosticBundleV1 = {
  readonly contractVersion: "survey-worker-diagnostic-bundle.v1";
  readonly expiresAt: string;
  readonly events: readonly [WorkerDiagnosticEventV1];
};

export type WorkerDiagnosticStore = {
  writeIfAbsent(input: {
    readonly objectKey: string;
    readonly bytes: Uint8Array;
    readonly expiresAt: string;
  }): Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  return Object.keys(value).length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function boundedInteger(value: unknown, max: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= max;
}

export function projectWorkerDiagnosticEventV1(input: unknown): WorkerDiagnosticEventV1 {
  const keys = [
    "reportRunId", "stage", "status", "attempt", "model", "inputTokens",
    "outputTokens", "chunks", "durationMs", "errorCode", "sourceRevision",
  ];
  if (!isRecord(input) || !exactKeys(input, keys)) throw new TypeError("Invalid worker diagnostic event");
  if (
    typeof input.reportRunId !== "string" || !RUN_ID.test(input.reportRunId) ||
    typeof input.stage !== "string" || !STAGE.test(input.stage) ||
    input.status !== "failed" || !boundedInteger(input.attempt, 3) || input.attempt < 1 ||
    input.model !== "gemini-3.8-flash" ||
    !boundedInteger(input.inputTokens, 1_000_000) ||
    !boundedInteger(input.outputTokens, 1_000_000) ||
    !boundedInteger(input.chunks, 1_000) ||
    !boundedInteger(input.durationMs, 1_800_000) ||
    typeof input.errorCode !== "string" || !Object.hasOwn(SAFE_ERRORS, input.errorCode) ||
    typeof input.sourceRevision !== "string" || !SAFE_REVISION.test(input.sourceRevision) ||
    /(secret|token|credential|private.?key|bearer|https?)/i.test(input.sourceRevision)
  ) throw new TypeError("Invalid worker diagnostic event");

  const code = input.errorCode as keyof typeof SAFE_ERRORS;
  return Object.freeze({
    contractVersion: "survey-worker-diagnostic-event.v1",
    reportRunId: input.reportRunId,
    stage: input.stage,
    status: "failed",
    attempt: input.attempt,
    model: "gemini-3.8-flash",
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    chunks: input.chunks,
    durationMs: input.durationMs,
    error: Object.freeze({ code, message: SAFE_ERRORS[code] }),
    sourceRevision: input.sourceRevision,
    labels: LABELS,
  });
}

export function createWorkerDiagnosticBundleV1(
  eventInput: unknown,
  now: Date,
): { readonly objectKey: string; readonly bundle: WorkerDiagnosticBundleV1; readonly bytes: Uint8Array } {
  const event = projectWorkerDiagnosticEventV1(eventInput);
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new TypeError("Invalid diagnostic timestamp");
  const expiresAt = new Date(now.getTime() + WORKER_DIAGNOSTIC_RETENTION_DAYS * DAY_MS).toISOString();
  const bundle = Object.freeze({
    contractVersion: "survey-worker-diagnostic-bundle.v1" as const,
    expiresAt,
    events: Object.freeze([event]) as readonly [WorkerDiagnosticEventV1],
  });
  const json = JSON.stringify(bundle);
  const bytes = new TextEncoder().encode(json);
  if (bytes.byteLength > WORKER_DIAGNOSTIC_MAX_BYTES) throw new TypeError("Worker diagnostic bundle exceeds its size limit");
  return Object.freeze({
    objectKey: `private/report-diagnostics/${event.reportRunId}/bundle.json`,
    bundle,
    bytes,
  });
}
