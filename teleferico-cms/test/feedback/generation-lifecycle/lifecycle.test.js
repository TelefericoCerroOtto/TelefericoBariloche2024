const assert = require("node:assert/strict");
const test = require("node:test");
const { createGenerationLifecycle, prepareAtomicCompletion, prepareDispatchFailure, prepareRetryGeneration } = require("../../../src/api/survey-report-generation/services/lifecycle");
function store(initial) {
  const generations = new Map([[initial.reportRunId, { ...initial }]]);
  const reports = [];
  return {
    reports,
    async withTransaction(operation) {
      const before = { generations: new Map(generations), reports: [...reports] };
      let lockedRunId;
      try {
        return await operation({
          async lockGeneration(runId) {
            lockedRunId = runId;
            return { ...generations.get(runId) };
          },
          async updateGeneration(patch) {
            const run = generations.get(lockedRunId);
            generations.set(run.reportRunId, { ...run, ...patch });
          },
          async insertReport(report) { reports.push(report); },
          async insertGeneration(next) { generations.set(next.reportRunId, { ...next }); },
        });
      } catch (error) {
        generations.clear();
        before.generations.forEach((generation, runId) => generations.set(runId, generation));
        reports.splice(0, reports.length, ...before.reports);
        throw error;
      }
    },
    generation(runId) { return generations.get(runId); },
  };
}
test("dispatch compensation and retry preserve lifecycle ownership", async () => {
  const queued = store({
    reportRunId: "run-1",
    status: "queued",
    stateVersion: 1,
    taskName: null,
  });
  const lifecycle = createGenerationLifecycle({ withTransaction: queued.withTransaction, now: () => "2026-09-22T15:04:05.000Z" });
  await lifecycle.compensateDispatchFailure({ reportRunId: "run-1", expectedStateVersion: 1 });
  assert.deepEqual(queued.generation("run-1"), {
    reportRunId: "run-1",
    status: "failed",
    stateVersion: 2,
    taskName: null,
    completedAt: "2026-09-22T15:04:05.000Z",
    failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
  });
  const failed = store({
    reportRunId: "run-2",
    status: "failed",
    stateVersion: 4,
    periodStart: "2026-08-01",
    periodEnd: "2026-08-20",
    documentId: "doc-2",
  });
  const retry = createGenerationLifecycle({ withTransaction: failed.withTransaction, now: () => "2026-09-22T15:04:05.000Z", createReportRunId: () => "run-3" });
  const originalFailed = { ...failed.generation("run-2") };
  await retry.retry({ sourceRunId: "run-2" });
  assert.deepEqual(failed.generation("run-2"), originalFailed);
  assert.equal(failed.generation("run-3").status, "queued");
  assert.deepEqual(failed.generation("run-3").retryOfGeneration, { connect: ["doc-2"] });
  });
test("completion commits generation and report as one transaction", async () => {
  const value = store({
    reportRunId: "run-4",
    status: "running",
    stateVersion: 3,
    documentId: "generation-document-4",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-20",
    dataCutoffAt: "2026-09-22T00:00:00.000Z",
    snapshotDigest: "a".repeat(64),
    sourceRevision: "v1",
  });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction, now: () => "2026-09-22T15:04:05.000Z" });
  await lifecycle.complete({
    reportRunId: "run-4",
    expectedStateVersion: 3,
    reportId: "report-4",
    checkpoints: ["redact", "count", "direct", "validate", "render", "store"],
    validatedAnalysis: { schemaVersion: "survey-published-analysis.v1", sections: [] },
    analysisDigest: "c".repeat(64),
    rendererVersion: "renderer.v1",
    artifact: {
      objectKey: "private/report.pdf",
      sha256: "b".repeat(64),
      size: 12,
      mimeType: "application/pdf",
      reportId: "attacker-report",
      generationRunId: "attacker-run",
      dataCutoffAt: "attacker-cutoff",
    },
  });
  assert.equal(value.generation("run-4").status, "succeeded");
  assert.equal(value.reports.length, 1);
  assert.equal(value.reports[0].generationRunId, "run-4");
  assert.equal(value.reports[0].reportId, "report-4");
  assert.equal(value.reports[0].dataCutoffAt, "2026-09-22T00:00:00.000Z");
  assert.equal(value.reports[0].analysisContractVersion, "survey-published-analysis.v1");
  assert.equal(value.reports[0].artifactSha256, "b".repeat(64));
  assert.equal(value.reports[0].artifactSize, 12);
  assert.deepEqual(value.reports[0].sourceGeneration, { connect: ["generation-document-4"] });
  });
test("pure preparation rejects stale, terminal, incomplete, and invalid transitions", () => {
  assert.deepEqual(prepareDispatchFailure({ status: "queued", stateVersion: 2, taskName: null }, 2, "now"),
    {
      status: "failed",
      stateVersion: 3,
      completedAt: "now",
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
    },
  );
  assert.throws(() => prepareRetryGeneration({ status: "succeeded" }), {
    code: "INVALID_STATE",
  });
  assert.throws(() => prepareAtomicCompletion({ status: "running", stateVersion: 1 }, 2, { checkpoints: [] }), { code: "STATE_VERSION_CONFLICT" });
});
