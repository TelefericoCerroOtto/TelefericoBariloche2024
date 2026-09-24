const assert = require("node:assert/strict");
const test = require("node:test");
const { measureDispatchFailureRequestBody } = require("../../../src/api/survey-report-generation/services/dispatch-failure-request");
const { createGenerationLifecycle, prepareAtomicCompletion, prepareDispatchFailure, prepareRetryGeneration } = require("../../../src/api/survey-report-generation/services/lifecycle");
const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000001";
const TASK_NAME = "tb113-report-00000000000040008000000000000001";
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
    reportRunId: "00000000-0000-4000-8000-000000000001",
    status: "queued",
    stateVersion: 1,
    taskName: null,
  });
  const lifecycle = createGenerationLifecycle({ withTransaction: queued.withTransaction, now: () => "2026-09-22T15:04:05.000Z" });
  await lifecycle.compensateDispatchFailure({
    reportRunId: "00000000-0000-4000-8000-000000000001",
    expectedStateVersion: 1,
    taskName: "tb113-report-00000000000040008000000000000001",
    dispatchAttemptCount: 3,
  });
  assert.deepEqual(queued.generation("00000000-0000-4000-8000-000000000001"), {
    reportRunId: "00000000-0000-4000-8000-000000000001",
    status: "failed",
    stateVersion: 2,
    taskName: null,
    completedAt: "2026-09-22T15:04:05.000Z",
    failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
    dispatchAttemptCount: 3,
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
  assert.deepEqual(prepareDispatchFailure({ status: "queued", stateVersion: 2, taskName: null }, 2, "now", 3),
    {
      status: "failed",
      stateVersion: 3,
      completedAt: "now",
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
      dispatchAttemptCount: 3,
    },
  );
  assert.throws(() => prepareRetryGeneration({ status: "succeeded" }), {
    code: "INVALID_STATE",
  });
  assert.throws(() => prepareAtomicCompletion({ status: "running", stateVersion: 1 }, 2, { checkpoints: [] }), { code: "STATE_VERSION_CONFLICT" });
});

test("dispatch compensation replays identically and rejects altered, claimed, or stale generations", async () => {
  const value = store({ reportRunId: "00000000-0000-4000-8000-000000000001", status: "queued", stateVersion: 1, taskName: null, claimedAt: null, dispatchAttemptCount: 0 });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction, now: () => "2026-09-22T15:04:05.000Z" });
  const command = { reportRunId: "00000000-0000-4000-8000-000000000001", expectedStateVersion: 1, taskName: "tb113-report-00000000000040008000000000000001", dispatchAttemptCount: 3 };
  assert.deepEqual(await lifecycle.compensateDispatchFailure(command), {
    reportRunId: command.reportRunId, stateVersion: 2, status: "failed", failureCode: "QUEUE_ENQUEUE_EXHAUSTED", replayed: false,
  });
  assert.equal((await lifecycle.compensateDispatchFailure(command)).replayed, true);
  await assert.rejects(lifecycle.compensateDispatchFailure({ ...command, dispatchAttemptCount: 2 }), { code: "STATE_VERSION_CONFLICT" });
  await assert.rejects(lifecycle.compensateDispatchFailure({ ...command, expectedStateVersion: 0 }), { code: "STATE_VERSION_CONFLICT" });

  const claimed = store({ reportRunId: "00000000-0000-4000-8000-000000000002", status: "queued", stateVersion: 1, taskName: null, claimedAt: "2026-09-22T15:00:00.000Z" });
  const claimedLifecycle = createGenerationLifecycle({ withTransaction: claimed.withTransaction });
  await assert.rejects(claimedLifecycle.compensateDispatchFailure({
    ...command,
    reportRunId: "00000000-0000-4000-8000-000000000002",
    taskName: "tb113-report-00000000000040008000000000000002",
  }), { code: "INVALID_STATE" });

  const taskCreated = store({ reportRunId: "00000000-0000-4000-8000-000000000003", status: "queued", stateVersion: 1, taskName: "tb113-report-00000000000040008000000000000003" });
  const taskLifecycle = createGenerationLifecycle({ withTransaction: taskCreated.withTransaction });
  await assert.rejects(taskLifecycle.compensateDispatchFailure({
    ...command,
    reportRunId: "00000000-0000-4000-8000-000000000003",
    taskName: "tb113-report-00000000000040008000000000000003",
  }), { code: "TASK_ALREADY_CREATED" });
});

test("dispatch reservation records identity without treating it as a created task", async () => {
  const value = store({ reportRunId: REPORT_RUN_ID, status: "queued", stateVersion: 1, taskName: null, dispatchState: "unreserved", dispatchAttemptCount: 0 });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  const command = { contractVersion: "survey-dispatch-state.v1", action: "reserve", expectedStateVersion: 1, taskName: TASK_NAME };

  assert.deepEqual(await lifecycle.reserveDispatch({ reportRunId: REPORT_RUN_ID, command }), {
    reportRunId: REPORT_RUN_ID, taskName: TASK_NAME, stateVersion: 2, status: "queued", dispatchState: "reserved", replayed: false,
  });
  assert.equal((await lifecycle.reserveDispatch({ reportRunId: REPORT_RUN_ID, command })).replayed, true);
  assert.deepEqual(value.generation(REPORT_RUN_ID), {
    reportRunId: REPORT_RUN_ID, status: "queued", stateVersion: 2, taskName: TASK_NAME,
    dispatchState: "reserved", dispatchEvidenceJson: null, dispatchAttemptCount: 0,
  });

  await assert.rejects(lifecycle.compensateDispatchFailure({
    reportRunId: REPORT_RUN_ID, expectedStateVersion: 2, taskName: TASK_NAME, dispatchAttemptCount: 3,
  }), { code: "TASK_ALREADY_CREATED" });
  await assert.rejects(lifecycle.reserveDispatch({
    reportRunId: REPORT_RUN_ID,
    command: { ...command, expectedStateVersion: 2 },
  }), { code: "TASK_ALREADY_CREATED" });
});

test("ambiguous dispatch remains queued and blocks blind re-enqueue", async () => {
  const value = store({ reportRunId: REPORT_RUN_ID, status: "queued", stateVersion: 1, taskName: null, dispatchState: "unreserved", dispatchAttemptCount: 0 });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  await lifecycle.reserveDispatch({
    reportRunId: REPORT_RUN_ID,
    command: { contractVersion: "survey-dispatch-state.v1", action: "reserve", expectedStateVersion: 1, taskName: TASK_NAME },
  });
  const command = {
    contractVersion: "survey-dispatch-state.v1", action: "record", expectedStateVersion: 2,
    taskName: TASK_NAME, outcome: "unknown", dispatchAttemptCount: 1,
    evidence: {
      contractVersion: "survey-dispatch-evidence.v1", outcome: "unknown", taskName: TASK_NAME,
      dispatchAttemptCount: 1, reasonCode: "AMBIGUOUS_RESPONSE",
    },
  };

  assert.deepEqual(await lifecycle.recordDispatchOutcome({ reportRunId: REPORT_RUN_ID, command }), {
    reportRunId: REPORT_RUN_ID, taskName: TASK_NAME, stateVersion: 3, status: "queued",
    dispatchState: "unknown", dispatchAttemptCount: 1, failureCode: null, replayed: false,
  });
  await assert.rejects(lifecycle.reserveDispatch({
    reportRunId: REPORT_RUN_ID,
    command: { contractVersion: "survey-dispatch-state.v1", action: "reserve", expectedStateVersion: 3, taskName: TASK_NAME },
  }), { code: "TASK_ALREADY_CREATED" });
  await assert.rejects(lifecycle.compensateDispatchFailure({
    reportRunId: REPORT_RUN_ID, expectedStateVersion: 3, taskName: TASK_NAME, dispatchAttemptCount: 3,
  }), { code: "TASK_ALREADY_CREATED" });
});

test("confirmed task creation cannot be compensated through the dispatch-state action", async () => {
  const value = store({ reportRunId: REPORT_RUN_ID, status: "queued", stateVersion: 1, taskName: null, dispatchState: "unreserved", dispatchAttemptCount: 0 });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  await lifecycle.reserveDispatch({
    reportRunId: REPORT_RUN_ID,
    command: { contractVersion: "survey-dispatch-state.v1", action: "reserve", expectedStateVersion: 1, taskName: TASK_NAME },
  });
  const created = {
    contractVersion: "survey-dispatch-state.v1", action: "record", expectedStateVersion: 2,
    taskName: TASK_NAME, outcome: "created", dispatchAttemptCount: 1,
    evidence: {
      contractVersion: "survey-dispatch-evidence.v1", outcome: "created", taskName: TASK_NAME,
      dispatchAttemptCount: 1, verifiedAt: "2026-09-23T22:00:00.000Z",
    },
  };
  await lifecycle.recordDispatchOutcome({ reportRunId: REPORT_RUN_ID, command: created });

  assert.equal(value.generation(REPORT_RUN_ID).status, "queued");
  assert.equal(value.generation(REPORT_RUN_ID).dispatchState, "created");
  await assert.rejects(lifecycle.recordDispatchOutcome({
    reportRunId: REPORT_RUN_ID,
    command: {
      ...created,
      expectedStateVersion: 3,
      outcome: "absent",
      dispatchAttemptCount: 3,
      evidence: {
        contractVersion: "survey-dispatch-evidence.v1", outcome: "absent", taskName: TASK_NAME,
        dispatchAttemptCount: 3, lookupResult: "not-found", verifiedAt: "2026-09-23T22:01:00.000Z",
      },
    },
  }), { code: "VALIDATION_FAILED" });
  await assert.rejects(lifecycle.compensateDispatchFailure({
    reportRunId: REPORT_RUN_ID, expectedStateVersion: 3, taskName: TASK_NAME, dispatchAttemptCount: 3,
  }), { code: "TASK_ALREADY_CREATED" });
});

test("dispatch-state rejects caller-asserted absence without changing reservation", async () => {
  const value = store({ reportRunId: REPORT_RUN_ID, status: "queued", stateVersion: 1, taskName: null, dispatchState: "unreserved", dispatchAttemptCount: 0 });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  await lifecycle.reserveDispatch({
    reportRunId: REPORT_RUN_ID,
    command: { contractVersion: "survey-dispatch-state.v1", action: "reserve", expectedStateVersion: 1, taskName: TASK_NAME },
  });

  const unverifiedAbsence = {
    contractVersion: "survey-dispatch-state.v1", action: "record", expectedStateVersion: 2,
    taskName: TASK_NAME, outcome: "absent", dispatchAttemptCount: 3,
    evidence: {
      contractVersion: "survey-dispatch-evidence.v1", outcome: "absent", taskName: TASK_NAME,
      dispatchAttemptCount: 3, lookupResult: "not-found", verifiedAt: "2026-09-23T22:00:00.000Z",
    },
  };

  await assert.rejects(lifecycle.recordDispatchOutcome({ reportRunId: REPORT_RUN_ID, command: unverifiedAbsence }), { code: "VALIDATION_FAILED" });
  assert.deepEqual(value.generation(REPORT_RUN_ID), {
    reportRunId: REPORT_RUN_ID, status: "queued", stateVersion: 2, taskName: TASK_NAME,
    dispatchState: "reserved", dispatchEvidenceJson: null, dispatchAttemptCount: 0,
  });
  await assert.rejects(lifecycle.compensateDispatchFailure({
    reportRunId: REPORT_RUN_ID, expectedStateVersion: 2, taskName: TASK_NAME, dispatchAttemptCount: 3,
  }), { code: "TASK_ALREADY_CREATED" });
});

test("dispatch-failure request size fails closed without raw bytes or bounded Content-Length", () => {
  const body = Buffer.from("{}" + " ".repeat(68_197), "utf8");
  assert.ok(body.byteLength > 16 * 1024);
  assert.equal(
    measureDispatchFailureRequestBody({ rawBody: body, headers: {} }),
    body.byteLength,
  );
  assert.equal(
    measureDispatchFailureRequestBody({ headers: { "content-length": String(body.byteLength) } }),
    body.byteLength,
  );
  assert.equal(
    measureDispatchFailureRequestBody({ headers: { "transfer-encoding": "chunked" } }),
    null,
  );
  assert.equal(
    measureDispatchFailureRequestBody({ headers: {} }),
    null,
  );
  assert.equal(
    measureDispatchFailureRequestBody({ headers: { "content-length": "68197", "transfer-encoding": "chunked" } }),
    null,
  );
});
