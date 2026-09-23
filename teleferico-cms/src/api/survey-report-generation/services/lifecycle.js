'use strict';
function domainError(code) { return Object.assign(new Error(code), { code }); }
function assertReportCreation(generation) {
  if (generation.status !== 'running') throw domainError('INVALID_STATE');
}
function prepareGenerationTransition(generation, expectedStateVersion, status, now) {
  if (generation.stateVersion !== expectedStateVersion) throw domainError('STATE_VERSION_CONFLICT');
  if (['succeeded', 'failed'].includes(generation.status)) throw domainError('TERMINAL_CONFLICT');
  const allowed = generation.status === 'queued'
    ? new Set(['running', 'failed'])
    : new Set(['succeeded', 'failed']);
  if (!allowed.has(status)) throw domainError('INVALID_STATE');
  return Object.freeze({
    status,
    stateVersion: expectedStateVersion + 1,
    ...(status === 'running' ? { claimedAt: now } : { completedAt: now }),
  });
}
function prepareDispatchFailure(generation, expectedStateVersion, now, dispatchAttemptCount) {
  if (generation.stateVersion !== expectedStateVersion)
    throw domainError('STATE_VERSION_CONFLICT');
  if (generation.status !== 'queued') throw domainError('INVALID_STATE');
  if (generation.claimedAt) throw domainError('INVALID_STATE');
  if (generation.taskName) throw domainError('TASK_ALREADY_CREATED');
  if (!Number.isSafeInteger(dispatchAttemptCount) || dispatchAttemptCount < 1 || dispatchAttemptCount > 3)
    throw domainError('VALIDATION_FAILED');
  return { status: 'failed', stateVersion: expectedStateVersion + 1, completedAt: now, failureCode: 'QUEUE_ENQUEUE_EXHAUSTED', dispatchAttemptCount };
}
function prepareRetryGeneration(generation, now, createReportRunId = () => require('node:crypto').randomUUID()) {
  if (generation.status !== 'failed' || !generation.documentId) throw domainError('INVALID_STATE');
  return {
    reportRunId: createReportRunId(), periodStart: generation.periodStart,
    periodEnd: generation.periodEnd, dataCutoffAt: now,
    overlapOverrideAccepted: false, snapshotDigest: '0'.repeat(64),
    sourceRevision: 'feedback-admin.v1',
    snapshotJson: {}, checkpointsJson: {}, modelConfigJson: {},
    usageJson: {}, pricingSnapshotJson: {},
    status: 'queued',
    requestedBy: null,
    retryOfGeneration: { connect: [generation.documentId] },
  };
}
function prepareAtomicCompletion(input, expectedStateVersion, details) {
  const value = expectedStateVersion === undefined ? input : { generation: input, expectedStateVersion, ...details };
  if (value.generation.stateVersion !== value.expectedStateVersion) throw domainError('STATE_VERSION_CONFLICT');
  if (value.generation.status !== 'running') throw domainError('TERMINAL_CONFLICT');
  const required = ['redact', 'count', 'direct', 'validate', 'render', 'store'];
  if (!value.checkpoints || new Set(value.checkpoints).size !== required.length || required.some((key) => !value.checkpoints.includes(key))) throw domainError('CHECKPOINT_SET_INCOMPLETE');
  if (
    !value.reportId ||
    !value.generation.documentId ||
    !value.artifact ||
    !value.artifact.objectKey ||
    value.artifact.objectKey.length > 500 ||
    !/^[a-f0-9]{64}$/.test(value.artifact.sha256) ||
    !Number.isSafeInteger(value.artifact.size) ||
    value.artifact.size < 1 ||
    value.artifact.mimeType !== 'application/pdf' ||
    !value.validatedAnalysis ||
    value.validatedAnalysis.schemaVersion !== 'survey-published-analysis.v1' ||
    !Array.isArray(value.validatedAnalysis.sections) ||
    !/^[a-f0-9]{64}$/.test(value.analysisDigest) ||
    !value.rendererVersion ||
    value.rendererVersion.length > 128
  ) throw domainError('VALIDATION_FAILED');
  return {
    generation: {
      status: 'succeeded',
      stateVersion: value.expectedStateVersion + 1,
      completedAt: value.now,
    },
    report: {
      reportId: value.reportId,
      generationRunId: value.generation.reportRunId,
      periodStart: value.generation.periodStart,
      periodEnd: value.generation.periodEnd,
      dataCutoffAt: value.generation.dataCutoffAt,
      snapshotDigest: value.generation.snapshotDigest,
      sourceRevision: value.generation.sourceRevision,
      validatedAnalysisJson: value.validatedAnalysis,
      analysisContractVersion: value.validatedAnalysis.schemaVersion,
      analysisDigest: value.analysisDigest,
      rendererVersion: value.rendererVersion,
      objectKey: value.artifact.objectKey,
      artifactSha256: value.artifact.sha256,
      artifactSize: value.artifact.size,
      mimeType: value.artifact.mimeType,
      sourceGeneration: { connect: [value.generation.documentId] },
    },
  };
}
function createGenerationLifecycle({ withTransaction, now = () => new Date().toISOString(), createReportRunId } = {}) {
  if (typeof withTransaction !== 'function') throw new TypeError('withTransaction is required');
  return {
    async compensateDispatchFailure({ reportRunId, expectedStateVersion, taskName, dispatchAttemptCount }) {
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockGeneration(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        if (generation.status === 'failed' && generation.failureCode === 'QUEUE_ENQUEUE_EXHAUSTED' &&
            generation.stateVersion === expectedStateVersion + 1 && generation.dispatchAttemptCount === dispatchAttemptCount &&
            taskName === `tb113-report-${reportRunId.replaceAll('-', '')}`)
          return { reportRunId, stateVersion: generation.stateVersion, status: 'failed', failureCode: 'QUEUE_ENQUEUE_EXHAUSTED', replayed: true };
        if (taskName !== `tb113-report-${reportRunId.replaceAll('-', '')}`) throw domainError('VALIDATION_FAILED');
        const patch = prepareDispatchFailure(generation, expectedStateVersion, now(), dispatchAttemptCount);
        await transaction.updateGeneration(patch);
        return { reportRunId, stateVersion: patch.stateVersion, status: 'failed', failureCode: patch.failureCode, replayed: false };
      });
    },
    async retry({ sourceRunId }) {
      return withTransaction(async (transaction) => {
        const source = await transaction.lockGeneration(sourceRunId);
        const next = prepareRetryGeneration(source, now(), createReportRunId);
        await transaction.insertGeneration(next);
        return next;
      });
    },
    async complete(input) {
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockGeneration(input.reportRunId);
        const prepared = prepareAtomicCompletion({
          ...input,
          generation,
          now: now(),
        });
        await transaction.insertReport(prepared.report);
        await transaction.updateGeneration(prepared.generation);
        return prepared;
      });
    },
  };
}
module.exports = {
  assertReportCreation,
  createGenerationLifecycle,
  prepareAtomicCompletion,
  prepareDispatchFailure,
  prepareGenerationTransition,
  prepareRetryGeneration,
};
