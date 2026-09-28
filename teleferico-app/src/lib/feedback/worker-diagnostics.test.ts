import { describe, expect, it } from "vitest";
import {
  createWorkerDiagnosticBundleV1,
  projectWorkerDiagnosticEventV1,
  WORKER_DIAGNOSTIC_MAX_BYTES,
  WORKER_DIAGNOSTIC_RETENTION_DAYS,
} from "../../../services/survey-report-worker/src/worker-diagnostics";

const event = {
  reportRunId: "123e4567-e89b-42d3-a456-426614174000",
  stage: "direct",
  status: "failed",
  attempt: 1,
  model: "gemini-3.8-flash",
  inputTokens: 120,
  outputTokens: 12,
  chunks: 0,
  durationMs: 450,
  errorCode: "INVALID_OUTPUT",
  sourceRevision: "survey-source.v1",
};

describe("worker diagnostic projection", () => {
  it("projects only bounded safe fields and derives the fixed error message and labels", () => {
    expect(projectWorkerDiagnosticEventV1(event)).toEqual({
      contractVersion: "survey-worker-diagnostic-event.v1",
      reportRunId: event.reportRunId,
      stage: "direct",
      status: "failed",
      attempt: 1,
      model: "gemini-3.8-flash",
      inputTokens: 120,
      outputTokens: 12,
      chunks: 0,
      durationMs: 450,
      error: {
        code: "INVALID_OUTPUT",
        message: "The report output did not satisfy its contract.",
      },
      sourceRevision: "survey-source.v1",
      labels: { feature: "survey-reporting", service: "survey-report-worker" },
    });
  });

  it.each([
    { prompt: "visitor text" },
    { comment: "visitor text" },
    { rawModelOutput: "model text" },
    { credential: "secret" },
    { signedUrl: "https://storage.invalid/object?signature=secret" },
  ])("rejects unknown potentially sensitive fields: %o", (extra) => {
    expect(() => projectWorkerDiagnosticEventV1({ ...event, ...extra })).toThrow("Invalid worker diagnostic event");
  });

  it.each([
    { model: "other-model" },
    { attempt: 4 },
    { inputTokens: 1.5 },
    { outputTokens: -1 },
    { chunks: 1_001 },
    { durationMs: 1_800_001 },
    { errorCode: "unknown" },
    { sourceRevision: "https://host.invalid/?token=secret" },
    { sourceRevision: "secret-token-value" },
  ])("rejects mismatched or unbounded values: %o", (override) => {
    expect(() => projectWorkerDiagnosticEventV1({ ...event, ...override })).toThrow("Invalid worker diagnostic event");
  });

  it("creates the exact private bundle key with bounded bytes and a 30-day expiry", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    const result = createWorkerDiagnosticBundleV1(event, now);
    expect(result.objectKey).toBe(`private/report-diagnostics/${event.reportRunId}/bundle.json`);
    expect(result.bundle.expiresAt).toBe("2026-10-26T12:00:00.000Z");
    expect(result.bundle.events).toHaveLength(1);
    expect(result.bytes.byteLength).toBeLessThanOrEqual(WORKER_DIAGNOSTIC_MAX_BYTES);
    expect(WORKER_DIAGNOSTIC_RETENTION_DAYS).toBe(30);
    expect(new TextDecoder().decode(result.bytes)).not.toMatch(/visitor text|model text|signature=secret/);
  });
});
