'use strict';
function domainError(code) { return Object.assign(new Error(code), { code }); }
const REPORT_RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DISPATCH_EVIDENCE_VERSION = 'survey-dispatch-evidence.v1';

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function sameDispatchEvidence(left, right) {
  if (typeof left === 'string') {
    try { left = JSON.parse(left); } catch { return false; }
  }
  return exactKeys(left, Object.keys(right)) &&
    Object.keys(right).every((key) => left[key] === right[key]);
}

function expectedTaskName(reportRunId) {
  if (!REPORT_RUN_ID_PATTERN.test(reportRunId)) return null;
  return `tb113-report-${reportRunId.replaceAll('-', '')}`;
}

function validTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed) && new Date(parsed).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'));
}

function validateDispatchStateCommand(value, reportRunId) {
  const taskName = expectedTaskName(reportRunId);
  if (!taskName || !value || typeof value !== 'object' || Array.isArray(value) ||
      value.contractVersion !== 'survey-dispatch-state.v1' ||
      !Number.isSafeInteger(value.expectedStateVersion) || value.expectedStateVersion < 1 ||
      value.taskName !== taskName) return false;

  if (value.action === 'reserve')
    return exactKeys(value, ['contractVersion', 'action', 'expectedStateVersion', 'taskName']);

  if (value.action !== 'record' ||
      !exactKeys(value, ['contractVersion', 'action', 'expectedStateVersion', 'taskName', 'outcome', 'dispatchAttemptCount', 'evidence']) ||
      !Number.isSafeInteger(value.dispatchAttemptCount) || value.dispatchAttemptCount < 1 || value.dispatchAttemptCount > 3 ||
      !value.evidence || typeof value.evidence !== 'object' || Array.isArray(value.evidence)) return false;

  const evidence = value.evidence;
  if (evidence.contractVersion !== DISPATCH_EVIDENCE_VERSION || evidence.taskName !== taskName ||
      evidence.dispatchAttemptCount !== value.dispatchAttemptCount) return false;

  if (value.outcome === 'created')
    return evidence.outcome === 'created' &&
      exactKeys(evidence, ['contractVersion', 'outcome', 'taskName', 'dispatchAttemptCount', 'verifiedAt']) &&
      validTimestamp(evidence.verifiedAt);

  if (value.outcome === 'unknown')
    return evidence.outcome === 'unknown' &&
      exactKeys(evidence, ['contractVersion', 'outcome', 'taskName', 'dispatchAttemptCount', 'reasonCode']) &&
      ['AMBIGUOUS_RESPONSE', 'PROVIDER_UNAVAILABLE', 'UNCLASSIFIED'].includes(evidence.reasonCode);

  return false;
}

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
function prepareDispatchReservation(generation, expectedStateVersion, taskName) {
  if (generation.stateVersion !== expectedStateVersion) throw domainError('STATE_VERSION_CONFLICT');
  if (generation.status !== 'queued' || generation.claimedAt) throw domainError('INVALID_STATE');
  if (generation.taskName || generation.dispatchEvidenceJson || generation.dispatchAttemptCount > 0 ||
      (generation.dispatchState ?? 'unreserved') !== 'unreserved') throw domainError('TASK_ALREADY_CREATED');
  return {
    taskName,
    dispatchState: 'reserved',
    dispatchEvidenceJson: null,
    stateVersion: expectedStateVersion + 1,
  };
}

function prepareDispatchOutcome(generation, command) {
  if (generation.stateVersion !== command.expectedStateVersion) throw domainError('STATE_VERSION_CONFLICT');
  if (generation.status !== 'queued' || generation.claimedAt) throw domainError('INVALID_STATE');
  if (generation.taskName !== command.taskName) throw domainError('TASK_IDENTITY_CONFLICT');
  if (!['reserved', 'unknown'].includes(generation.dispatchState ?? 'unreserved')) throw domainError('INVALID_STATE');
  if (command.dispatchAttemptCount < (generation.dispatchAttemptCount ?? 0)) throw domainError('STATE_VERSION_CONFLICT');

  return {
    status: 'queued',
    dispatchState: command.outcome,
    dispatchEvidenceJson: command.evidence,
    stateVersion: command.expectedStateVersion + 1,
    dispatchAttemptCount: command.dispatchAttemptCount,
  };
}
function validateWorkerClaimCommand(value) {
  return exactKeys(value, ['commandVersion']) &&
    value.commandVersion === 'survey-report-command.v1';
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
    async reserveDispatch({ reportRunId, command }) {
      if (!validateDispatchStateCommand(command, reportRunId) || command.action !== 'reserve')
        throw domainError('VALIDATION_FAILED');
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockGeneration(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        if (generation.dispatchState === 'reserved' && generation.taskName === command.taskName &&
            generation.stateVersion === command.expectedStateVersion + 1)
          return { reportRunId, taskName: command.taskName, stateVersion: generation.stateVersion, status: generation.status, dispatchState: 'reserved', dispatchAttemptCount: generation.dispatchAttemptCount ?? 0, failureCode: generation.failureCode ?? null, replayed: true };
        const patch = prepareDispatchReservation(generation, command.expectedStateVersion, command.taskName);
        await transaction.updateGeneration(patch);
        return { reportRunId, taskName: command.taskName, stateVersion: patch.stateVersion, status: 'queued', dispatchState: 'reserved', dispatchAttemptCount: generation.dispatchAttemptCount ?? 0, failureCode: generation.failureCode ?? null, replayed: false };
      });
    },
    async recordDispatchOutcome({ reportRunId, command }) {
      if (!validateDispatchStateCommand(command, reportRunId) || command.action !== 'record')
        throw domainError('VALIDATION_FAILED');
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockGeneration(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        const expectedState = command.outcome;
        if (generation.dispatchState === expectedState && generation.taskName === command.taskName &&
            generation.stateVersion === command.expectedStateVersion + 1 &&
            generation.dispatchAttemptCount === command.dispatchAttemptCount &&
            sameDispatchEvidence(generation.dispatchEvidenceJson, command.evidence))
          return { reportRunId, taskName: command.taskName, stateVersion: generation.stateVersion, status: generation.status, dispatchState: expectedState, dispatchAttemptCount: generation.dispatchAttemptCount, failureCode: generation.failureCode ?? null, replayed: true };

        const patch = prepareDispatchOutcome(generation, command);
        await transaction.updateGeneration(patch);
        return { reportRunId, taskName: command.taskName, stateVersion: patch.stateVersion, status: patch.status, dispatchState: patch.dispatchState, dispatchAttemptCount: patch.dispatchAttemptCount, failureCode: patch.failureCode ?? null, replayed: false };
      });
    },
    async claimWorker({ reportRunId }) {
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockGeneration(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        if (['succeeded', 'failed'].includes(generation.status))
          return { reportRunId, stateVersion: generation.stateVersion, status: generation.status, disposition: 'terminal-replay' };

        let disposition = 'resumed';
        if (generation.status === 'queued') {
          const patch = prepareGenerationTransition(generation, generation.stateVersion, 'running', now());
          await transaction.updateGeneration(patch);
          generation.status = patch.status;
          generation.stateVersion = patch.stateVersion;
          disposition = 'claimed';
        } else if (generation.status !== 'running') {
          throw domainError('INVALID_STATE');
        }

        return {
          reportRunId,
          stateVersion: generation.stateVersion,
          status: 'running',
          disposition,
          checkpoints: generation.checkpointsJson,
          modelConfig: generation.modelConfigJson,
          pricingSnapshot: generation.pricingSnapshotJson,
        };
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
  prepareDispatchOutcome,
  prepareDispatchReservation,
  prepareGenerationTransition,
  prepareRetryGeneration,
  validateDispatchStateCommand,
  validateWorkerClaimCommand,
};
