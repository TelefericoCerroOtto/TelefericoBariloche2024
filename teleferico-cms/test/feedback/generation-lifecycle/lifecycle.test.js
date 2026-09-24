const assert = require("node:assert/strict");
const test = require("node:test");
const { measureDispatchFailureRequestBody } = require("../../../src/api/survey-report-generation/services/dispatch-failure-request");
const { createGenerationLifecycle, prepareAtomicCompletion, prepareDispatchFailure, prepareRetryGeneration, validateWorkerClaimCommand } = require("../../../src/api/survey-report-generation/services/lifecycle");
const { CHECKPOINT_CONTRACT_VERSIONS, deriveChunkMembership, deriveEvidenceRef, stageConfigDigest, stageInputDigestV1, verifyChunkMembership } = require("../../../src/api/survey-report-generation/services/checkpoint-contract");
const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000001";
const TASK_NAME = "tb113-report-00000000000040008000000000000001";
function canonicalize(value) {
  return Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]`
    : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`
      : JSON.stringify(value);
}
function syntheticMembershipInput() {
  return {
    reportRunId: "00000000-0000-4000-8000-000000000113",
    snapshotDigest: "a".repeat(64), evidenceKeyId: "test-only-2026-01",
    evidenceKey: "tb113 synthetic-only evidence key v1", chunkCount: 2,
    comments: [
      { recordId: "r-3", receipt: "receipt-3", period: "current", acceptedAt: "2026-09-24T10:02:00.000Z", locale: "es", versionKey: "v1", pointKey: "p1", overallRating: 4, aspectRatings: [], text: "Buena vista" },
      { recordId: "r-1", receipt: "receipt-1", period: "previous", acceptedAt: "2026-09-23T10:00:00.000Z", locale: "es", versionKey: "v1", pointKey: "p1", overallRating: 5, aspectRatings: [], text: "Qué hermoso 🚡" },
      { recordId: "r-2", receipt: "receipt-2", period: "current", acceptedAt: "2026-09-24T10:01:00.000Z", locale: "en", versionKey: "v1", pointKey: "p2", overallRating: 3, aspectRatings: [], text: "Very nice" },
    ],
  };
}
function projectionFor(input) {
  return {
    version: "survey-stage-config.v1", stageKey: "map.1-of-2",
    evidenceKeyId: input.evidenceKeyId, rendererVersion: null,
    modelConfig: syntheticModelConfig(input.evidenceKeyId),
  };
}
function syntheticModelConfig(evidenceKeyId) {
  return {
    version: "survey-model-config.v1", evidenceKeyId, provider: "vertex-ai",
    vertexProjectId: "teleferico-bariloche-2024", vertexLocation: "us",
    vertexApiEndpoint: "aiplatform.us.rep.googleapis.com", model: "gemini-3.8-flash",
    temperature: 0, reasoning: "LOW", grounding: false, promptVersion: "prompt.v1",
    mapSchemaVersion: "survey-map.v1", analysisSchemaVersion: "survey-analysis.v1",
    redactionVersion: "redaction.v1", validatorVersion: "validator.v1", chunkVersion: "chunk.v1",
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048, sourceRevision: "test-source",
  };
}
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
          async lockWorkerSnapshot(runId) {
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
test("worker claim is atomic, resumable, and returns only minimal terminal replay", async () => {
  const runId = "00000000-0000-4000-8000-000000000004";
  const value = store({
    reportRunId: runId, status: "queued", stateVersion: 1,
    checkpointsJson: { version: "survey-checkpoints.v1", entries: [] },
    modelConfigJson: { version: "survey-model-config.v1" },
    pricingSnapshotJson: { version: "pricing.v1" },
    comment: "must never be returned",
  });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction, now: () => "2026-09-24T12:00:00.000Z" });
  assert.equal(validateWorkerClaimCommand({ commandVersion: "survey-report-command.v1" }), true);
  assert.equal(validateWorkerClaimCommand({ commandVersion: "survey-report-command.v1", extra: true }), false);
  assert.deepEqual(await lifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId, stateVersion: 2, status: "running", disposition: "claimed",
    checkpoints: { version: "survey-checkpoints.v1", entries: [] },
    modelConfig: { version: "survey-model-config.v1" }, pricingSnapshot: { version: "pricing.v1" },
  });
  assert.deepEqual(await lifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId, stateVersion: 2, status: "running", disposition: "resumed",
    checkpoints: { version: "survey-checkpoints.v1", entries: [] },
    modelConfig: { version: "survey-model-config.v1" }, pricingSnapshot: { version: "pricing.v1" },
  });
  const terminal = store({ reportRunId: runId, status: "failed", stateVersion: 4, checkpointsJson: { secret: "not returned" }, comment: "not returned" });
  const terminalLifecycle = createGenerationLifecycle({ withTransaction: terminal.withTransaction });
  assert.deepEqual(await terminalLifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId, stateVersion: 4, status: "failed", disposition: "terminal-replay",
  });
});

test("worker snapshot returns the deterministic v1 envelope only for running valid state", async () => {
  const { createHash } = require("node:crypto");
  const payload = {
    contractVersion: "survey-snapshot.v1", sourceRevision: "feedback-admin.v1",
    createdAt: "2026-09-24T12:00:00.000Z",
    population: { currentSubmissionCount: 0, previousSubmissionCount: 0 },
    metrics: { current: { submissionCount: 0 }, previous: { submissionCount: 0 } },
    comments: [{ text: "private worker comment" }],
  };
  const canonicalize = (value) => Array.isArray(value) ? `[${value.map(canonicalize).join(",")}]`
    : value && typeof value === "object" ? `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`
      : JSON.stringify(value);
  const digestHex = createHash("sha256").update(canonicalize(payload)).digest("hex");
  const generation = { reportRunId: REPORT_RUN_ID, status: "running", stateVersion: 3,
    sourceRevision: "feedback-admin.v1", snapshotDigest: digestHex, snapshotJson: payload,
    comment: "must not be returned outside the snapshot" };
  const value = store(generation);
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  const result = await lifecycle.workerSnapshot({ reportRunId: REPORT_RUN_ID });
  assert.deepEqual(result, { reportRunId: REPORT_RUN_ID, stateVersion: 3,
    snapshot: { canonicalization: "tb-json.v1", algorithm: "sha256", digestHex, payload } });
  assert.deepEqual(await lifecycle.workerSnapshot({ reportRunId: REPORT_RUN_ID }), result);
  assert.equal(JSON.stringify(result).includes("must not be returned outside"), false);
  for (const [invalid, code] of [
    [{ ...generation, status: "queued" }, "INVALID_STATE"],
    [{ ...generation, snapshotJson: { ...payload, contractVersion: "survey-snapshot.v2" } }, "INVALID_STATE"],
    [{ ...generation, snapshotDigest: "0".repeat(64) }, "DIGEST_MISMATCH"],
    [{ ...generation, stateVersion: 0 }, "INVALID_STATE"],
  ]) {
    const invalidStore = store(invalid);
    const invalidLifecycle = createGenerationLifecycle({ withTransaction: invalidStore.withTransaction });
    await assert.rejects(invalidLifecycle.workerSnapshot({ reportRunId: REPORT_RUN_ID }), { code });
  }
});

test("worker checkpoint writes fail closed until CMS can verify checkpoint bindings", async () => {
  const runId = "00000000-0000-4000-8000-000000000008";
  const initial = {
    reportRunId: runId,
    status: "running",
    stateVersion: 2,
    sourceRevision: "feedback-admin.v1",
    snapshotDigest: "a".repeat(64),
    checkpointsJson: {
      version: "survey-checkpoints.v1",
      snapshotDigest: "a".repeat(64),
      route: "undecided",
      chunkCount: null,
      entries: [],
    },
  };
  const value = store(initial);
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  const payload = { kind: "redact", recordCount: 0, redactionVersion: "redaction.v1" };
  const command = {
    contractVersion: "survey-worker-cms.v1",
    expectedStateVersion: 2,
    checkpoint: {
      checkpointVersion: "survey-checkpoint.v1",
      stageKey: "redact",
      stageIndex: 0,
      route: "common",
      stageType: "redact",
      status: "valid",
      inputDigest: "b".repeat(64),
      outputDigest: require("node:crypto").createHash("sha256").update(canonicalize(payload)).digest("hex"),
      attempts: 1,
      completedAt: "2026-09-24T12:00:00.000Z",
      payload,
    },
  };

  await assert.rejects(lifecycle.writeWorkerCheckpoint({ reportRunId: runId, stageKey: "redact", command }), {
    code: "UNKNOWN_VERSION",
  });
  assert.deepEqual(value.generation(runId), initial);
});

test("CMS matches the worker synthetic evidence-membership and stage-digest vectors", () => {
  const input = syntheticMembershipInput();
  const memberships = deriveChunkMembership(input);
  assert.equal(deriveEvidenceRef({ reportRunId: input.reportRunId, recordId: "r-1", evidenceKey: input.evidenceKey }), "e_3uu4ks66il7pihr5iwyc");
  assert.deepEqual(memberships, [
    { evidenceKeyId: "test-only-2026-01", chunkIndex: 1, chunkCount: 2, coveredRefs: ["e_rahjw52nxuyppbb45gh3", "e_3uu4ks66il7pihr5iwyc"], membershipDigest: "c5935102850b59e161216f0748b25ac61c2d72d2569ff7db7456ff9003a28b03" },
    { evidenceKeyId: "test-only-2026-01", chunkIndex: 2, chunkCount: 2, coveredRefs: ["e_k6lijsqcwjyjvs6ztpgs"], membershipDigest: "2c9a2139ad235c11e34a867e5781e0ef27eba9919aa592edae2d5121209351df" },
  ]);
  const refs = memberships.flatMap(({ coveredRefs }) => coveredRefs);
  assert.equal(refs.length, input.comments.length);
  assert.equal(new Set(refs).size, input.comments.length);
  assert.equal(refs.every((reference) => /^e_[a-z2-7]{20}$/.test(reference)), true);
  assert.equal(memberships.every(({ membershipDigest }) => /^[a-f0-9]{64}$/.test(membershipDigest)), true);
  assert.deepEqual(deriveChunkMembership({ ...input, comments: [...input.comments].reverse() }), memberships);
  assert.equal(JSON.stringify(memberships).includes("Qué hermoso"), false);
  assert.equal(JSON.stringify(memberships).includes("r-1"), false);
  assert.equal(JSON.stringify(memberships).includes(input.evidenceKey), false);
  const projection = projectionFor(input);
  const configDigest = stageConfigDigest(projection);
  assert.equal(configDigest, "79ee5e80eb4d3d2546b25885a22b7018342b47326cbc3030419a6ce5cddd0613");
  const stageInput = { stageKey: "map.1-of-2", stageIndex: 2, route: "map-reduce", snapshotDigest: input.snapshotDigest, sourceRevision: "test-source", contractVersions: CHECKPOINT_CONTRACT_VERSIONS, stageConfigDigest: configDigest, orderedDependencyOutputDigests: ["b".repeat(64), "c".repeat(64)], chunkMembershipDigest: memberships[0].membershipDigest };
  assert.equal(stageInputDigestV1(stageInput), "ae8cc9b362b0983c70bd3ae386542a0973e74633feba1a034b0048a0f584cea4");
  assert.notEqual(stageInputDigestV1({ ...stageInput, orderedDependencyOutputDigests: [...stageInput.orderedDependencyOutputDigests].reverse() }), stageInputDigestV1(stageInput));
});

test("CMS rejects altered membership, version/config bindings, and invalid Unicode", () => {
  const input = syntheticMembershipInput();
  const membership = deriveChunkMembership(input)[0];
  const changedId = { ...input, comments: input.comments.map((record) => record.recordId === "r-2" ? { ...record, recordId: "r-4" } : record) };
  assert.equal(verifyChunkMembership(changedId, membership), false);
  for (const coveredRefs of [[...membership.coveredRefs].reverse(), membership.coveredRefs.slice(1), [...membership.coveredRefs, membership.coveredRefs[0]], [...membership.coveredRefs, "e_foreignreference123456"]]) {
    assert.equal(verifyChunkMembership(input, { ...membership, coveredRefs }), false);
  }
  for (const changed of [
    { ...input, evidenceKeyId: "test-only-2026-02" },
    { ...input, evidenceKey: "different synthetic key" },
    { ...input, evidenceKey: "short" },
    { ...input, chunkCount: 3 },
    { ...input, snapshotDigest: "b".repeat(64) },
  ]) assert.equal(verifyChunkMembership(changed, membership), false);
  assert.throws(() => deriveChunkMembership({ ...input, comments: [...input.comments, { ...input.comments[0], recordId: "r-1" }], chunkCount: 2 }));
  assert.notEqual(stageConfigDigest({ ...projectionFor(input), modelConfig: { ...projectionFor(input).modelConfig, model: "different-model" } }), stageConfigDigest(projectionFor(input)));
  assert.throws(() => deriveChunkMembership({ ...input, comments: [{ ...input.comments[0], text: "\uD800" }] }));
  assert.throws(() => deriveChunkMembership({ ...input, comments: [{ ...input.comments[0], acceptedAt: "2026-02-30T10:00:00.000Z" }] }));
  const decomposed = { ...input, comments: input.comments.map((record) => record.recordId === "r-1" ? { ...record, text: "Que\u0301 hermoso 🚡" } : record) };
  assert.equal(verifyChunkMembership(decomposed, membership), false);
  assert.throws(() => stageInputDigestV1({
    stageKey: "map.1-of-2", stageIndex: 2, route: "map-reduce", snapshotDigest: input.snapshotDigest,
    sourceRevision: "test-source", contractVersions: { ...CHECKPOINT_CONTRACT_VERSIONS, unknown: "bad" },
    stageConfigDigest: "d".repeat(64), orderedDependencyOutputDigests: [], chunkMembershipDigest: membership.membershipDigest,
  }));
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
    reportRunId: REPORT_RUN_ID, taskName: TASK_NAME, stateVersion: 2, status: "queued",
    dispatchState: "reserved", dispatchAttemptCount: 0, failureCode: null, replayed: false,
  });
  assert.deepEqual(await lifecycle.reserveDispatch({ reportRunId: REPORT_RUN_ID, command }), {
    reportRunId: REPORT_RUN_ID, taskName: TASK_NAME, stateVersion: 2, status: "queued",
    dispatchState: "reserved", dispatchAttemptCount: 0, failureCode: null, replayed: true,
  });
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
