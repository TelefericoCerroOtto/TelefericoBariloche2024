// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  buildGenerationData,
  buildOverlapDetails,
  captureDataCutoff,
  prepareAtomicCompletion,
  prepareDispatchCompensation,
  prepareRetryGeneration,
} from "./generation-lifecycle";
const period = { from: "2026-08-01", to: "2026-08-20" } as const;
const source = {
  documentId: "generation-document-1",
  reportRunId: "00000000-0000-4000-8000-000000000001",
  period,
  status: "failed" as const,
  stateVersion: 4,
  dataCutoffAt: "2026-08-21T00:00:00.000Z",
  snapshotDigest: "a".repeat(64),
  sourceRevision: "feedback-admin.v1",
};
describe("report generation lifecycle contracts", () => {
  it("captures a UTC cutoff before snapshot reads", () => {
    expect(captureDataCutoff(new Date("2026-09-22T15:04:05.000Z"))).toBe(
      "2026-09-22T15:04:05.000Z",
    );
    expect(() => captureDataCutoff(new Date("invalid"))).toThrow(
      "INVALID_CUTOFF",
    );
  });
  it("discloses every inclusive overlap with a stable digest", () => {
    const details = buildOverlapDetails(
      [
        {
          reportRunId: "run-b",
          period: { from: "2026-07-20", to: "2026-08-05" },
          status: "succeeded",
        },
        {
          reportRunId: "run-a",
          period: { from: "2026-08-10", to: "2026-08-20" },
          status: "queued",
        },
        {
          reportRunId: "run-c",
          period: { from: "2026-08-20", to: "2026-08-30" },
          status: "failed",
        },
      ],
      period,
    );
    expect(details.overlaps).toEqual([
      {
        reportRunId: "run-b",
        period: { from: "2026-07-20", to: "2026-08-05" },
        intersection: { from: "2026-08-01", to: "2026-08-05" },
      },
      {
        reportRunId: "run-a",
        period: { from: "2026-08-10", to: "2026-08-20" },
        intersection: { from: "2026-08-10", to: "2026-08-20" },
      },
      {
        reportRunId: "run-c",
        period: { from: "2026-08-20", to: "2026-08-30" },
        intersection: { from: "2026-08-20", to: "2026-08-20" },
      },
    ]);
    expect(details.overlapDigest).toMatch(/^[a-f0-9]{64}$/);
  });
  it("creates a fresh cutoff and immutable retry lineage", () => {
    expect(
      prepareRetryGeneration(
        source,
        new Date("2026-09-22T15:04:05.000Z"),
        () => "run-retry",
      ),
    ).toMatchObject({
      reportRunId: "run-retry",
      periodStart: period.from,
      periodEnd: period.to,
      dataCutoffAt: "2026-09-22T15:04:05.000Z",
      retryOfGeneration: { connect: [source.documentId] },
      status: "queued",
    });
    expect(() =>
      prepareRetryGeneration(
        { ...source, status: "succeeded" },
        new Date(),
        () => "run-retry",
      ),
    ).toThrow("INVALID_STATE");
  });
  it("compensates only an untouched queued run through CAS", () => {
    expect(
      prepareDispatchCompensation(
        { status: "queued", stateVersion: 2, taskName: null },
        2,
        "2026-09-22T15:04:05.000Z",
      ),
    ).toEqual({
      status: "failed",
      stateVersion: 3,
      completedAt: "2026-09-22T15:04:05.000Z",
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
    });
    expect(() =>
      prepareDispatchCompensation(
        { status: "queued", stateVersion: 2, taskName: "tb113-report-run" },
        2,
        "now",
      ),
    ).toThrow("TASK_ALREADY_CREATED");
  });
  it("requires every checkpoint and valid artifact before atomic completion", () => {
    const artifact = {
      objectKey: "private/report.pdf",
      sha256: "b".repeat(64),
      size: 12,
      mimeType: "application/pdf" as const,
      reportId: "attacker-report",
      generationRunId: "attacker-run",
      dataCutoffAt: "attacker-cutoff",
    };
    const completed = prepareAtomicCompletion({
      generation: { ...source, status: "running", stateVersion: 3 },
      expectedStateVersion: 3,
      reportId: "00000000-0000-4000-8000-000000000002",
      checkpoints: ["redact", "count", "direct", "validate", "render", "store"],
      validatedAnalysis: { schemaVersion: "survey-published-analysis.v1", sections: [] },
      analysisDigest: "c".repeat(64),
      rendererVersion: "renderer.v1",
      artifact,
      now: "2026-09-22T15:04:05.000Z",
    });
    expect(completed.generation).toEqual({
      status: "succeeded",
      stateVersion: 4,
      completedAt: "2026-09-22T15:04:05.000Z",
    });
    expect(completed.report).toMatchObject({
      reportId: "00000000-0000-4000-8000-000000000002",
      generationRunId: source.reportRunId,
      sourceGeneration: { connect: [source.documentId] },
      dataCutoffAt: source.dataCutoffAt,
      analysisContractVersion: "survey-published-analysis.v1",
      analysisDigest: "c".repeat(64),
      rendererVersion: "renderer.v1",
      objectKey: "private/report.pdf",
      artifactSha256: "b".repeat(64),
      artifactSize: 12,
    });
    expect(completed.report.reportId).not.toBe(artifact.reportId);
    expect(completed.report.generationRunId).toBe(source.reportRunId);
    expect(completed.report.dataCutoffAt).toBe(source.dataCutoffAt);
    expect(() =>
      prepareAtomicCompletion({
        generation: { ...source, status: "running", stateVersion: 3 },
        expectedStateVersion: 3,
        reportId: "00000000-0000-4000-8000-000000000002",
        checkpoints: ["redact"],
        artifact: {
          objectKey: "private/report.pdf",
          sha256: "b".repeat(64),
          size: 12,
          mimeType: "application/pdf",
        },
        now: "now",
      }),
    ).toThrow("CHECKPOINT_SET_INCOMPLETE");
  });
  it("builds the queued command with its cutoff and no synthetic requester", () => {
    expect(
      buildGenerationData(
        {
          contractVersion: "feedback-admin.v1",
          period,
          override: { accepted: false, overlapDigest: null },
        },
        new Date("2026-09-22T15:04:05.000Z"),
        () => "00000000-0000-4000-8000-000000000003",
      ),
    ).toMatchObject({
      reportRunId: "00000000-0000-4000-8000-000000000003",
      dataCutoffAt: "2026-09-22T15:04:05.000Z",
      requestedBy: null,
      status: "queued",
    });
  });
});
