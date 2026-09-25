const assert = require("node:assert/strict");
const test = require("node:test");
const { measureDispatchFailureRequestBody } = require("../../../src/api/survey-report-generation/services/dispatch-failure-request");
const { createGenerationLifecycle, prepareAtomicCompletion, prepareDispatchFailure, prepareRetryGeneration, validateWorkerClaimCommand, validateWorkerFailCommand } = require("../../../src/api/survey-report-generation/services/lifecycle");
const { CHECKPOINT_CONTRACT_VERSIONS, deriveChunkMembership, deriveEvidenceRef, stageConfigDigest, stageInputDigestV1, verifyCheckpointGraphV1, verifyChunkMembership } = require("../../../src/api/survey-report-generation/services/checkpoint-contract");
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
function workerClaimState(overrides = {}) {
  const snapshotDigest = "a".repeat(64);
  const modelConfigJson = syntheticModelConfig("test-only-2026-01");
  const pricingSnapshotJson = {
    version: "pricing.v1",
    currency: "USD",
    units: [{ sku: "gemini-input", inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
  };
  const checkpointsJson = {
    version: "survey-checkpoints.v1",
    snapshotDigest,
    route: "direct",
    chunkCount: null,
    entries: [],
  };
  return {
    sourceRevision: modelConfigJson.sourceRevision,
    snapshotDigest,
    checkpointsJson,
    modelConfigJson,
    pricingSnapshotJson,
    ...overrides,
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
          async lockWorkerExecution(runId) {
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
    ...workerClaimState({
      checkpointsJson: JSON.stringify(workerClaimState().checkpointsJson),
      modelConfigJson: JSON.stringify(workerClaimState().modelConfigJson),
      pricingSnapshotJson: JSON.stringify(workerClaimState().pricingSnapshotJson),
    }),
    comment: "must never be returned",
  });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction, now: () => "2026-09-24T12:00:00.000Z" });
  assert.equal(validateWorkerClaimCommand({ commandVersion: "survey-report-command.v1" }), true);
  assert.equal(validateWorkerClaimCommand({ commandVersion: "survey-report-command.v1", extra: true }), false);
  const claimData = workerClaimState();
  assert.deepEqual(await lifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId, stateVersion: 2, status: "running", disposition: "claimed",
    checkpoints: claimData.checkpointsJson,
    modelConfig: claimData.modelConfigJson,
    pricingSnapshot: claimData.pricingSnapshotJson,
  });
  assert.deepEqual(await lifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId, stateVersion: 2, status: "running", disposition: "resumed",
    checkpoints: claimData.checkpointsJson,
    modelConfig: claimData.modelConfigJson,
    pricingSnapshot: claimData.pricingSnapshotJson,
  });
  assert.equal(value.generation(runId).status, "running");
  assert.equal(value.generation(runId).stateVersion, 2);
  const terminal = store({ reportRunId: runId, status: "failed", stateVersion: 4, checkpointsJson: { secret: "not returned" }, comment: "not returned" });
  const terminalLifecycle = createGenerationLifecycle({ withTransaction: terminal.withTransaction });
  assert.deepEqual(await terminalLifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId, stateVersion: 4, status: "failed", disposition: "terminal-replay",
  });
});

test("worker claim rejects malformed, double-encoded, placeholder, and unsupported stored contracts without changing queued state", async () => {
  const runId = "00000000-0000-4000-8000-000000000114";
  const valid = workerClaimState();
  const cases = [
    ["malformed checkpoint JSON", { ...valid, checkpointsJson: "{" }],
    ["double-encoded checkpoint JSON", { ...valid, checkpointsJson: JSON.stringify(JSON.stringify(valid.checkpointsJson)) }],
    ["checkpoint digest mismatch", { ...valid, checkpointsJson: { ...valid.checkpointsJson, snapshotDigest: "b".repeat(64) } }],
    ["unknown checkpoint route", { ...valid, checkpointsJson: { ...valid.checkpointsJson, route: "unknown" } }],
    ["undecided route with entries", { ...valid, checkpointsJson: { ...valid.checkpointsJson, route: "undecided", entries: [{ unsupported: true }] } }],
    ["undecided route with a chunk count", { ...valid, checkpointsJson: { ...valid.checkpointsJson, route: "undecided", chunkCount: 1 } }],
    ["nonempty unsupported checkpoints", { ...valid, checkpointsJson: { ...valid.checkpointsJson, entries: [{ unsupported: true }] } }],
    ["placeholder model config", { ...valid, modelConfigJson: { version: "survey-model-config.v1" } }],
    ["model source revision mismatch", { ...valid, modelConfigJson: { ...valid.modelConfigJson, sourceRevision: "different-source" } }],
    ["empty pricing units", { ...valid, pricingSnapshotJson: { ...valid.pricingSnapshotJson, units: [] } }],
    ["duplicate pricing SKU", { ...valid, pricingSnapshotJson: { ...valid.pricingSnapshotJson, units: [...valid.pricingSnapshotJson.units, ...valid.pricingSnapshotJson.units] } }],
    ["negative pricing rate", { ...valid, pricingSnapshotJson: { ...valid.pricingSnapshotJson, units: [{ ...valid.pricingSnapshotJson.units[0], inputMicrosPerMillion: -1 }] } }],
  ];

  for (const [label, claimData] of cases) {
    const value = store({ reportRunId: runId, status: "queued", stateVersion: 1, ...claimData });
    const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
    await assert.rejects(lifecycle.claimWorker({ reportRunId: runId }), { code: "INVALID_STATE" }, label);
    assert.equal(value.generation(runId).status, "queued", label);
    assert.equal(value.generation(runId).stateVersion, 1, label);
    assert.equal(value.generation(runId).claimedAt, undefined, label);
  }
});

test("worker claim accepts the closed empty undecided initial route", async () => {
  const runId = "00000000-0000-4000-8000-000000000116";
  const data = workerClaimState({
    checkpointsJson: {
      ...workerClaimState().checkpointsJson,
      route: "undecided",
    },
  });
  const value = store({ reportRunId: runId, status: "queued", stateVersion: 1, ...data });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });

  assert.deepEqual(await lifecycle.claimWorker({ reportRunId: runId }), {
    reportRunId: runId,
    stateVersion: 2,
    status: "running",
    disposition: "claimed",
    checkpoints: data.checkpointsJson,
    modelConfig: data.modelConfigJson,
    pricingSnapshot: data.pricingSnapshotJson,
  });
  assert.equal(value.generation(runId).status, "running");
  assert.equal(value.generation(runId).stateVersion, 2);
});

test("worker resume rejects invalid stored contract data without changing running state", async () => {
  const runId = "00000000-0000-4000-8000-000000000115";
  const value = store({
    reportRunId: runId,
    status: "running",
    stateVersion: 2,
    ...workerClaimState({ pricingSnapshotJson: JSON.stringify("not-an-object") }),
  });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction });
  await assert.rejects(lifecycle.claimWorker({ reportRunId: runId }), { code: "INVALID_STATE" });
  assert.equal(value.generation(runId).status, "running");
  assert.equal(value.generation(runId).stateVersion, 2);
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

test("worker checkpoint writes reject when the transaction lacks an authoritative snapshot", async () => {
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
  let transactionCalls = 0;
  const lifecycle = createGenerationLifecycle({
    withTransaction(operation) {
      transactionCalls += 1;
      return value.withTransaction(operation);
    },
  });
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
    code: "INVALID_STATE",
  });
  assert.equal(transactionCalls, 1);
  assert.deepEqual(value.generation(runId), initial);
});

test("worker failure is running-only, safe, CAS-protected, and idempotent", async () => {
  const runId = "00000000-0000-4000-8000-000000000009";
  const command = {
    contractVersion: "survey-worker-cms.v1",
    expectedStateVersion: 3,
    failureCode: "INVALID_OUTPUT",
    safeFailureMessage: "The report output did not satisfy its contract.",
  };
  assert.equal(validateWorkerFailCommand(command), true);
  assert.equal(validateWorkerFailCommand({ ...command, safeFailureMessage: "caller text" }), false);
  assert.equal(validateWorkerFailCommand({ ...command, extra: true }), false);
  const value = store({ reportRunId: runId, status: "running", stateVersion: 3, reportId: null });
  const lifecycle = createGenerationLifecycle({ withTransaction: value.withTransaction, now: () => "2026-09-25T12:00:00.000Z" });

  assert.deepEqual(await lifecycle.failWorker({ reportRunId: runId, command }), {
    reportRunId: runId, stateVersion: 4, status: "failed", failureCode: "INVALID_OUTPUT", replayed: false,
  });
  const failed = { ...value.generation(runId) };
  assert.equal(failed.completedAt, "2026-09-25T12:00:00.000Z");
  assert.equal(failed.failureCode, "INVALID_OUTPUT");
  assert.equal(failed.safeFailureMessage, command.safeFailureMessage);
  assert.equal(value.reports.length, 0);

  assert.deepEqual(await lifecycle.failWorker({ reportRunId: runId, command }), {
    reportRunId: runId, stateVersion: 4, status: "failed", failureCode: "INVALID_OUTPUT", replayed: true,
  });
  assert.deepEqual(value.generation(runId), failed);

  await assert.rejects(lifecycle.failWorker({
    reportRunId: runId,
    command: {
      ...command,
      failureCode: "INVARIANT",
      safeFailureMessage: "The report state failed an integrity check.",
    },
  }), { code: "TERMINAL_CONFLICT" });

  const stale = store({ reportRunId: runId, status: "running", stateVersion: 3 });
  const staleLifecycle = createGenerationLifecycle({ withTransaction: stale.withTransaction });
  await assert.rejects(staleLifecycle.failWorker({
    reportRunId: runId,
    command: { ...command, expectedStateVersion: 2 },
  }), { code: "STATE_VERSION_CONFLICT" });

  for (const status of ["queued", "succeeded"]) {
    const invalid = store({ reportRunId: runId, status, stateVersion: 3 });
    const invalidLifecycle = createGenerationLifecycle({ withTransaction: invalid.withTransaction });
    await assert.rejects(invalidLifecycle.failWorker({ reportRunId: runId, command }), {
      code: "TERMINAL_CONFLICT",
    });
    assert.equal(invalid.generation(runId).stateVersion, 3);
    assert.equal(invalid.generation(runId).failureCode, undefined);
  }
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

test("checkpoint graph verifier binds safe stage digests and leaves semantic outputs incomplete", () => {
  const run = {
    reportRunId: REPORT_RUN_ID,
    status: "running",
    stateVersion: 4,
    snapshotDigest: "a".repeat(64),
    sourceRevision: "test-source",
    modelConfig: syntheticModelConfig("test-only-2026-01"),
    rendererVersion: "renderer.test.v1",
  };
  const checkpoints = {
    version: "survey-checkpoints.v1",
    snapshotDigest: run.snapshotDigest,
    route: "direct",
    chunkCount: null,
    entries: [],
  };
  const payload = { kind: "redact", recordCount: 3, redactionVersion: "redaction.v1" };
  const projection = {
    version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
    stageKey: "redact",
    modelConfig: run.modelConfig,
    evidenceKeyId: run.modelConfig.evidenceKeyId,
    rendererVersion: null,
  };
  const configDigest = stageConfigDigest(projection);
  const inputDigest = stageInputDigestV1({
    stageKey: "redact",
    stageIndex: 0,
    route: "common",
    snapshotDigest: run.snapshotDigest,
    sourceRevision: run.sourceRevision,
    contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: configDigest,
    orderedDependencyOutputDigests: [],
    chunkMembershipDigest: null,
  });
  const outputDigest = require("node:crypto").createHash("sha256")
    .update(canonicalize(payload), "utf8").digest("hex");
  const candidate = {
    checkpointVersion: "survey-checkpoint.v1",
    stageKey: "redact",
    stageIndex: 0,
    route: "common",
    stageType: "redact",
    status: "valid",
    inputDigest,
    outputDigest,
    attempts: 1,
    completedAt: "2026-09-25T12:00:00.000Z",
    payload,
  };

  const result = verifyCheckpointGraphV1({ run, checkpoints, candidate, expectedStateVersion: 4 });
  assert.equal(result.status, "incomplete");
  assert.equal(result.reason, "SEMANTIC_VALIDATION_REQUIRED");
  assert.equal(Object.hasOwn(result, "checkpoints"), false);
  assert.deepEqual(result.structurallyVerifiedStageKeys, ["redact"]);
  assert.deepEqual(result.pendingStageKeys, ["count", "direct", "validate", "render", "store"]);
  assert.deepEqual(checkpoints.entries, []);

  const countPayload = {
    kind: "count",
    segmentTokens: { instructions: 1, schema: 2, metrics: 3, comments: 4, reservedOutput: 5, headroom: 6 },
    totalTokens: 21,
  };
  const countProjection = { ...projection, stageKey: "count" };
  const countInputDigest = stageInputDigestV1({
    stageKey: "count", stageIndex: 1, route: "common", snapshotDigest: run.snapshotDigest,
    sourceRevision: run.sourceRevision, contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: stageConfigDigest(countProjection),
    orderedDependencyOutputDigests: [candidate.outputDigest], chunkMembershipDigest: null,
  });
  const countCandidate = {
    ...candidate,
    stageKey: "count", stageIndex: 1, stageType: "count", inputDigest: countInputDigest,
    outputDigest: require("node:crypto").createHash("sha256")
      .update(canonicalize(countPayload), "utf8").digest("hex"),
    payload: countPayload,
  };
  const countResult = verifyCheckpointGraphV1({
    run: { ...run, stateVersion: 5 },
    checkpoints: { ...checkpoints, route: "direct", entries: [candidate] },
    candidate: countCandidate,
    expectedStateVersion: 5,
  });
  assert.deepEqual(countResult.structurallyVerifiedStageKeys, ["redact", "count"]);
  assert.equal(Object.hasOwn(countResult, "checkpoints"), false);

  const directPayload = { kind: "direct", validatedOutput: { arbitrary: "not independently validated" } };
  const directProjection = { ...projection, stageKey: "direct" };
  const directCandidate = {
    ...countCandidate,
    stageKey: "direct", stageIndex: 2, route: "direct", stageType: "direct",
    inputDigest: stageInputDigestV1({
      stageKey: "direct", stageIndex: 2, route: "direct", snapshotDigest: run.snapshotDigest,
      sourceRevision: run.sourceRevision, contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
      stageConfigDigest: stageConfigDigest(directProjection),
      orderedDependencyOutputDigests: [countCandidate.outputDigest], chunkMembershipDigest: null,
    }),
    outputDigest: require("node:crypto").createHash("sha256")
      .update(canonicalize(directPayload), "utf8").digest("hex"),
    payload: directPayload,
  };
  const directResult = verifyCheckpointGraphV1({
    run: { ...run, stateVersion: 6 },
    checkpoints: { ...checkpoints, route: "direct", entries: [candidate, countCandidate] },
    candidate: directCandidate,
    expectedStateVersion: 6,
  });
  assert.equal(directResult.status, "incomplete");
  assert.equal(directResult.reason, "SEMANTIC_VALIDATION_REQUIRED");
  assert.deepEqual(Object.keys(directResult).sort(), [
    "pendingStageKeys", "reason", "status", "structurallyVerifiedStageKeys",
  ]);
  assert.equal(Object.hasOwn(directResult, "checkpoints"), false);
  assert.equal(Object.hasOwn(directResult, "entries"), false);
  assert.equal(JSON.stringify(directResult).includes('"status":"valid"'), false);
  assert.deepEqual(directResult.structurallyVerifiedStageKeys, ["redact", "count"]);
  assert.ok(directResult.pendingStageKeys.includes("direct"));

  const directHistory = {
    ...checkpoints,
    route: "direct",
    entries: [candidate, countCandidate, directCandidate],
  };
  const directReplay = verifyCheckpointGraphV1({
    run: { ...run, stateVersion: 7 },
    checkpoints: directHistory,
    candidate: directCandidate,
    expectedStateVersion: 7,
  });
  assert.equal(directReplay.status, "incomplete");
  assert.equal(directReplay.reason, "SEMANTIC_VALIDATION_REQUIRED");
  assert.deepEqual(Object.keys(directReplay).sort(), [
    "pendingStageKeys", "reason", "status", "structurallyVerifiedStageKeys",
  ]);
  assert.equal(Object.hasOwn(directReplay, "checkpoints"), false);
  assert.equal(Object.hasOwn(directReplay, "entries"), false);
  assert.equal(JSON.stringify(directReplay).includes('"status":"valid"'), false);

  const replay = verifyCheckpointGraphV1({
    run,
    checkpoints: { ...checkpoints, route: "direct", entries: [candidate] },
    candidate,
    expectedStateVersion: 4,
  });
  assert.equal(replay.status, "incomplete");
  assert.equal(replay.reason, "SEMANTIC_VALIDATION_REQUIRED");
  assert.equal(Object.hasOwn(replay, "checkpoints"), false);
  assert.equal(JSON.stringify(replay).includes('"status":"valid"'), false);

  assert.throws(() => verifyCheckpointGraphV1({
    run,
    checkpoints: { ...checkpoints, entries: [{ ...candidate, completedAt: "2026-09-25T12:00:01.000Z" }] },
    candidate,
    expectedStateVersion: 4,
  }), { code: "CHECKPOINT_CONFLICT" });
  assert.throws(() => verifyCheckpointGraphV1({
    run: { ...run, snapshotDigest: "c".repeat(64) },
    checkpoints: { ...checkpoints, entries: [candidate] },
    candidate,
    expectedStateVersion: 4,
  }), { code: "DIGEST_MISMATCH" });
  assert.throws(() => verifyCheckpointGraphV1({
    run: { ...run, modelConfig: { ...run.modelConfig, promptVersion: "changed-prompt.v1" } },
    checkpoints: { ...checkpoints, entries: [candidate] },
    candidate,
    expectedStateVersion: 4,
  }), { code: "DIGEST_MISMATCH" });
  assert.throws(() => verifyCheckpointGraphV1({
    run,
    checkpoints,
    candidate,
    expectedStateVersion: 3,
  }), { code: "STATE_VERSION_CONFLICT" });
  assert.throws(() => verifyCheckpointGraphV1({
    run,
    checkpoints: { ...checkpoints, route: "map-reduce" },
    candidate,
    expectedStateVersion: 4,
  }), { code: "UNKNOWN_VERSION" });
});

test("checkpoint graph verifier enforces the full direct dependency chain and private store shape", () => {
  const run = {
    reportRunId: REPORT_RUN_ID,
    status: "running",
    stateVersion: 1,
    snapshotDigest: "a".repeat(64),
    sourceRevision: "test-source",
    modelConfig: syntheticModelConfig("test-only-2026-01"),
    rendererVersion: "renderer.test.v1",
  };
  let checkpoints = {
    version: "survey-checkpoints.v1", snapshotDigest: run.snapshotDigest,
    route: "undecided", chunkCount: null, entries: [],
  };
  const outputs = [
    { stageKey: "redact", stageIndex: 0, route: "common", stageType: "redact", payload: { kind: "redact", recordCount: 1, redactionVersion: run.modelConfig.redactionVersion } },
    { stageKey: "count", stageIndex: 1, route: "common", stageType: "count", payload: { kind: "count", segmentTokens: { instructions: 1, schema: 1, metrics: 1, comments: 1, reservedOutput: 1, headroom: 1 }, totalTokens: 6 } },
    { stageKey: "direct", stageIndex: 2, route: "direct", stageType: "direct", payload: { kind: "direct", validatedOutput: { unchecked: true } } },
    { stageKey: "validate", stageIndex: 3, route: "direct", stageType: "validate", payload: { kind: "validate", publishedAnalysis: { unchecked: true }, validatorVersion: "validator.v1" } },
    { stageKey: "render", stageIndex: 4, route: "direct", stageType: "render", payload: { kind: "render", rendererVersion: run.rendererVersion, pdfSha256: "b".repeat(64), size: 12 } },
  ];
  let stateVersion = run.stateVersion;
  for (const { stageKey, stageIndex, route, stageType, payload } of outputs) {
    const rendererVersion = stageKey === "render" ? run.rendererVersion : null;
    const dependencies = checkpoints.entries.length ? [checkpoints.entries.at(-1).outputDigest] : [];
    const inputDigest = stageInputDigestV1({
      stageKey, stageIndex, route, snapshotDigest: run.snapshotDigest,
      sourceRevision: run.sourceRevision, contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
      stageConfigDigest: stageConfigDigest({
        version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig, stageKey,
        modelConfig: run.modelConfig, evidenceKeyId: run.modelConfig.evidenceKeyId,
        rendererVersion,
      }),
      orderedDependencyOutputDigests: dependencies, chunkMembershipDigest: null,
    });
    const candidate = {
      checkpointVersion: CHECKPOINT_CONTRACT_VERSIONS.checkpoint,
      stageKey, stageIndex, route, stageType, status: "valid", inputDigest,
      outputDigest: require("node:crypto").createHash("sha256")
        .update(canonicalize(payload), "utf8").digest("hex"),
      attempts: 1, completedAt: "2026-09-25T12:00:00.000Z", payload,
    };
    const result = verifyCheckpointGraphV1({
      run: { ...run, stateVersion }, checkpoints, candidate,
      expectedStateVersion: stateVersion,
    });
    assert.equal(result.status, "incomplete");
    assert.equal(Object.hasOwn(result, "checkpoints"), false);
    checkpoints = {
      ...checkpoints,
      route: "direct",
      entries: [...checkpoints.entries, candidate],
    };
    stateVersion += 1;
  }

  const storePayload = {
    kind: "store", objectKey: "private/feedback-reports/run-1/report.pdf",
    artifactSha256: "c".repeat(64), size: 12, mimeType: "application/pdf",
  };
  const storeInputDigest = stageInputDigestV1({
    stageKey: "store", stageIndex: 5, route: "direct", snapshotDigest: run.snapshotDigest,
    sourceRevision: run.sourceRevision, contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: stageConfigDigest({
      version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig, stageKey: "store",
      modelConfig: run.modelConfig, evidenceKeyId: run.modelConfig.evidenceKeyId,
      rendererVersion: run.rendererVersion,
    }),
    orderedDependencyOutputDigests: [checkpoints.entries.at(-1).outputDigest],
    chunkMembershipDigest: null,
  });
  const storeCandidate = {
    checkpointVersion: CHECKPOINT_CONTRACT_VERSIONS.checkpoint,
    stageKey: "store", stageIndex: 5, route: "direct", stageType: "store",
    status: "valid", inputDigest: storeInputDigest,
    outputDigest: require("node:crypto").createHash("sha256")
      .update(canonicalize(storePayload), "utf8").digest("hex"),
    attempts: 1, completedAt: "2026-09-25T12:00:00.000Z", payload: storePayload,
  };
  const completeGraph = verifyCheckpointGraphV1({
    run: { ...run, stateVersion }, checkpoints, candidate: storeCandidate,
    expectedStateVersion: stateVersion,
  });
  assert.equal(completeGraph.status, "incomplete");
  assert.equal(completeGraph.reason, "SEMANTIC_VALIDATION_REQUIRED");
  assert.equal(Object.hasOwn(completeGraph, "checkpoints"), false);
  assert.ok(completeGraph.pendingStageKeys.includes("direct"));
  assert.ok(completeGraph.pendingStageKeys.includes("store"));
  assert.deepEqual(completeGraph.structurallyVerifiedStageKeys, ["redact", "count"]);
  assert.throws(() => verifyCheckpointGraphV1({
    run: { ...run, stateVersion }, checkpoints,
    candidate: {
      ...storeCandidate,
      outputDigest: require("node:crypto").createHash("sha256")
        .update(canonicalize({ ...storePayload, objectKey: "https://public.invalid/report.pdf" }), "utf8").digest("hex"),
      payload: { ...storePayload, objectKey: "https://public.invalid/report.pdf" },
    },
    expectedStateVersion: stateVersion,
  }), { code: "VALIDATION_FAILED" });
});

test("checkpoint graph verifier sanitizes replay of persisted Validate history", () => {
  const run = {
    reportRunId: REPORT_RUN_ID,
    status: "running",
    stateVersion: 9,
    snapshotDigest: "a".repeat(64),
    sourceRevision: "test-source",
    modelConfig: syntheticModelConfig("test-only-2026-01"),
    rendererVersion: "renderer.test.v1",
  };
  const payloads = [
    { stageKey: "redact", stageIndex: 0, route: "common", stageType: "redact", payload: { kind: "redact", recordCount: 1, redactionVersion: run.modelConfig.redactionVersion } },
    { stageKey: "count", stageIndex: 1, route: "common", stageType: "count", payload: { kind: "count", segmentTokens: { instructions: 1, schema: 1, metrics: 1, comments: 1, reservedOutput: 1, headroom: 1 }, totalTokens: 6 } },
    { stageKey: "direct", stageIndex: 2, route: "direct", stageType: "direct", payload: { kind: "direct", validatedOutput: { semanticMarker: "unverified-direct" } } },
    { stageKey: "validate", stageIndex: 3, route: "direct", stageType: "validate", payload: { kind: "validate", publishedAnalysis: { semanticMarker: "unverified-validate" }, validatorVersion: "validator.v1" } },
  ];
  const entries = [];
  for (const { stageKey, stageIndex, route, stageType, payload } of payloads) {
    const inputDigest = stageInputDigestV1({
      stageKey,
      stageIndex,
      route,
      snapshotDigest: run.snapshotDigest,
      sourceRevision: run.sourceRevision,
      contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
      stageConfigDigest: stageConfigDigest({
        version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
        stageKey,
        modelConfig: run.modelConfig,
        evidenceKeyId: run.modelConfig.evidenceKeyId,
        rendererVersion: null,
      }),
      orderedDependencyOutputDigests: entries.length ? [entries.at(-1).outputDigest] : [],
      chunkMembershipDigest: null,
    });
    entries.push({
      checkpointVersion: CHECKPOINT_CONTRACT_VERSIONS.checkpoint,
      stageKey,
      stageIndex,
      route,
      stageType,
      status: "valid",
      inputDigest,
      outputDigest: require("node:crypto").createHash("sha256")
        .update(canonicalize(payload), "utf8").digest("hex"),
      attempts: 1,
      completedAt: "2026-09-25T12:00:00.000Z",
      payload,
    });
  }
  const checkpoints = {
    version: "survey-checkpoints.v1",
    snapshotDigest: run.snapshotDigest,
    route: "direct",
    chunkCount: null,
    entries,
  };
  const validateCandidate = entries[3];

  assert.deepEqual(entries.map(({ stageKey }) => stageKey), ["redact", "count", "direct", "validate"]);
  assert.equal(entries[2].status, "valid");
  assert.equal(entries[3].status, "valid");
  const replay = verifyCheckpointGraphV1({
    run,
    checkpoints,
    candidate: validateCandidate,
    expectedStateVersion: run.stateVersion,
  });

  assert.deepEqual(Object.keys(replay).sort(), [
    "pendingStageKeys", "reason", "status", "structurallyVerifiedStageKeys",
  ]);
  assert.equal(replay.status, "incomplete");
  assert.equal(replay.reason, "SEMANTIC_VALIDATION_REQUIRED");
  assert.deepEqual(replay.structurallyVerifiedStageKeys, ["redact", "count"]);
  assert.deepEqual(replay.pendingStageKeys, ["direct", "validate", "render", "store"]);
  assert.equal(JSON.stringify(replay).includes('"status":"valid"'), false);
  assert.equal(JSON.stringify(replay).includes("unverified-direct"), false);
  assert.equal(JSON.stringify(replay).includes("unverified-validate"), false);
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
