'use strict';
const { createHash } = require('node:crypto');
const { validateWorkerClaimContracts, verifyCheckpointGraphV1 } = require('./checkpoint-contract');
function domainError(code) { return Object.assign(new Error(code), { code }); }
const REPORT_RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DISPATCH_EVIDENCE_VERSION = 'survey-dispatch-evidence.v1';
const SNAPSHOT_CONTRACT_VERSION = 'survey-snapshot.v1';
const WORKER_CHECKPOINT_KEYS = ['checkpointVersion', 'stageKey', 'stageIndex', 'route', 'stageType', 'status', 'inputDigest', 'outputDigest', 'attempts', 'completedAt', 'payload'];
const WORKER_COMPLETE_KEYS = ['contractVersion', 'expectedStateVersion', 'validatedAnalysis', 'analysisDigest', 'rendererVersion', 'artifact'];
const CHECKPOINT_STAGE_KEYS = ['redact', 'count', 'direct', 'validate', 'render', 'store'];
const EMPTY_EVIDENCE_PARAGRAPH = 'No hay comentarios elegibles para respaldar esta sección en el período analizado.';
const ANALYSIS_SECTION_KEYS = ['executive_summary', 'observed_changes', 'strengths', 'unfavorable_areas', 'recurrent_themes', 'minority_signals', 'coverage_limitations'];
const WORKER_FAILURE_MESSAGES = Object.freeze({
  PROVIDER_TRANSIENT: 'The report provider is temporarily unavailable.',
  PROVIDER_RATE_LIMIT: 'The report provider is temporarily busy.',
  PROVIDER_TIMEOUT: 'The report provider timed out.',
  CMS_TRANSIENT: 'Report state could not be persisted.',
  STORAGE_TRANSIENT: 'The report artifact could not be staged.',
  INVALID_OUTPUT: 'The report output did not satisfy its contract.',
  AUTHENTICATION: 'The report worker authentication failed.',
  CONFIGURATION: 'Report generation is not configured.',
  UNKNOWN_VERSION: 'The report contract version is not supported.',
  INVARIANT: 'The report state failed an integrity check.',
  PROHIBITED_CONTENT: 'The report output contained prohibited content.',
  QUEUE_ENQUEUE_EXHAUSTED: 'The report could not be queued.',
});

function compareCodePoints(left, right) {
  const a = Array.from(left, (value) => value.codePointAt(0));
  const b = Array.from(right, (value) => value.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) if (a[index] !== b[index]) return a[index] - b[index];
  return a.length - b.length;
}
function assertUnicodeScalarString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw domainError('DIGEST_MISMATCH');
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) throw domainError('DIGEST_MISMATCH');
  }
}
function canonicalizeJson(value) {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') { assertUnicodeScalarString(value); return JSON.stringify(value); }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw domainError('DIGEST_MISMATCH');
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(',')}]`;
  if (!value || typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw domainError('DIGEST_MISMATCH');
  return `{${Object.keys(value).sort(compareCodePoints).map((key) => { assertUnicodeScalarString(key); return `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`; }).join(',')}}`;
}
function prepareWorkerSnapshot(generation) {
  if (generation.status !== 'running') throw domainError('INVALID_STATE');
  let payload = generation.snapshotJson;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { throw domainError('DIGEST_MISMATCH'); }
  }
  if (!Number.isSafeInteger(generation.stateVersion) || generation.stateVersion < 1 ||
      typeof generation.sourceRevision !== 'string' || !generation.sourceRevision || generation.sourceRevision.length > 128 ||
      !payload || typeof payload !== 'object' || Array.isArray(payload) ||
      payload.contractVersion !== SNAPSHOT_CONTRACT_VERSION || payload.sourceRevision !== generation.sourceRevision)
    throw domainError('INVALID_STATE');
  if (!/^[a-f0-9]{64}$/.test(generation.snapshotDigest ?? '')) throw domainError('DIGEST_MISMATCH');
  let digestHex;
  try { digestHex = createHash('sha256').update(canonicalizeJson(payload)).digest('hex'); }
  catch (error) { if (error.code) throw error; throw domainError('DIGEST_MISMATCH'); }
  if (digestHex !== generation.snapshotDigest) throw domainError('DIGEST_MISMATCH');
  return { reportRunId: generation.reportRunId, stateVersion: generation.stateVersion,
    snapshot: { canonicalization: 'tb-json.v1', algorithm: 'sha256', digestHex, payload } };
}

function parseWorkerClaimJson(value) {
  let parsed = value;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch { throw domainError('INVALID_STATE'); }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    throw domainError('INVALID_STATE');
  return parsed;
}

function prepareWorkerClaim(generation) {
  try {
    const value = {
      checkpoints: parseWorkerClaimJson(generation.checkpointsJson),
      modelConfig: parseWorkerClaimJson(generation.modelConfigJson),
      pricingSnapshot: parseWorkerClaimJson(generation.pricingSnapshotJson),
    };
    validateWorkerClaimContracts({
      snapshotDigest: generation.snapshotDigest,
      sourceRevision: generation.sourceRevision,
      ...value,
    });
    return value;
  } catch {
    throw domainError('INVALID_STATE');
  }
}

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function validateWorkerCheckpointCommand(stageKey, command) {
  if (!CHECKPOINT_STAGE_KEYS.includes(stageKey) || !exactKeys(command, ['contractVersion', 'expectedStateVersion', 'checkpoint']) ||
      command.contractVersion !== 'survey-worker-cms.v1' || !Number.isSafeInteger(command.expectedStateVersion) || command.expectedStateVersion < 1 ||
      !exactKeys(command.checkpoint, WORKER_CHECKPOINT_KEYS) || command.checkpoint.stageKey !== stageKey ||
      command.checkpoint.checkpointVersion !== 'survey-checkpoint.v1' || command.checkpoint.stageType !== stageKey ||
      command.checkpoint.status !== 'valid' || !Number.isSafeInteger(command.checkpoint.stageIndex) ||
      !Number.isSafeInteger(command.checkpoint.attempts) || command.checkpoint.attempts < 1 ||
      !/^[a-f0-9]{64}$/.test(command.checkpoint.inputDigest ?? '') || !/^[a-f0-9]{64}$/.test(command.checkpoint.outputDigest ?? ''))
    return false;
  return true;
}

function validateWorkerCompleteCommand(command) {
  if (!exactKeys(command, WORKER_COMPLETE_KEYS) || command.contractVersion !== 'survey-worker-cms.v1' ||
      !Number.isSafeInteger(command.expectedStateVersion) || command.expectedStateVersion < 1 ||
      !exactKeys(command.validatedAnalysis, ['schemaVersion', 'sections']) ||
      command.validatedAnalysis.schemaVersion !== 'survey-published-analysis.v1' ||
      !Array.isArray(command.validatedAnalysis.sections) || command.validatedAnalysis.sections.length !== ANALYSIS_SECTION_KEYS.length ||
      !/^[a-f0-9]{64}$/.test(command.analysisDigest ?? '') || typeof command.rendererVersion !== 'string' ||
      !command.rendererVersion || command.rendererVersion.length > 128 ||
      !exactKeys(command.artifact, ['objectKey', 'sha256', 'size', 'mimeType']) ||
      typeof command.artifact.objectKey !== 'string' || !/^[a-f0-9]{64}$/.test(command.artifact.sha256 ?? '') ||
      !Number.isSafeInteger(command.artifact.size) || command.artifact.size < 1 || command.artifact.mimeType !== 'application/pdf')
    return false;
  const match = /^private\/feedback-reports\/([0-9a-f-]{36})\/report\.pdf$/.exec(command.artifact.objectKey);
  if (!match || !REPORT_RUN_ID_PATTERN.test(match[1])) return false;
  return command.validatedAnalysis.sections.every((section, index) =>
    exactKeys(section, ['key', 'status', 'paragraphsEs']) && section.key === ANALYSIS_SECTION_KEYS[index] &&
    ['supported', 'insufficient_evidence'].includes(section.status) && Array.isArray(section.paragraphsEs) &&
    section.paragraphsEs.length > 0 && section.paragraphsEs.every((paragraph) =>
      typeof paragraph === 'string' && paragraph.length > 0 && paragraph.length <= 4000) &&
    (section.status !== 'insufficient_evidence' ||
      section.paragraphsEs.length === 1 && section.paragraphsEs[0] === EMPTY_EVIDENCE_PARAGRAPH));
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

function deterministicReportId(reportRunId, artifactSha256) {
  const bytes = createHash('sha256')
    .update(`tb113-report-id.v1:${reportRunId}:${artifactSha256}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
function validateWorkerFailCommand(value) {
  return exactKeys(value, ['contractVersion', 'expectedStateVersion', 'failureCode', 'safeFailureMessage']) &&
    value.contractVersion === 'survey-worker-cms.v1' &&
    Number.isSafeInteger(value.expectedStateVersion) && value.expectedStateVersion > 0 &&
    Object.hasOwn(WORKER_FAILURE_MESSAGES, value.failureCode) &&
    value.safeFailureMessage === WORKER_FAILURE_MESSAGES[value.failureCode];
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
function createGenerationLifecycle({ withTransaction, now = () => new Date().toISOString(), createReportRunId, evidenceKeyProvider } = {}) {
  if (typeof withTransaction !== 'function') throw new TypeError('withTransaction is required');
  const resolveEvidenceKey = async (modelConfig, snapshot) => {
    if (!snapshot?.comments?.length) return null;
    if (typeof evidenceKeyProvider !== 'function') throw domainError('UNKNOWN_VERSION');
    let key;
    try { key = await evidenceKeyProvider(modelConfig.evidenceKeyId); } catch { throw domainError('UNKNOWN_VERSION'); }
    if (!(typeof key === 'string' || key instanceof Uint8Array)) throw domainError('UNKNOWN_VERSION');
    return key;
  };
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
        if (generation.status !== 'queued' && generation.status !== 'running')
          throw domainError('INVALID_STATE');
        const claimData = prepareWorkerClaim(generation);

        let disposition = 'resumed';
        if (generation.status === 'queued') {
          const patch = prepareGenerationTransition(generation, generation.stateVersion, 'running', now());
          await transaction.updateGeneration({ ...patch, expectedStatus: 'queued' });
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
          checkpoints: claimData.checkpoints,
          modelConfig: claimData.modelConfig,
          pricingSnapshot: claimData.pricingSnapshot,
        };
      });
    },
    async workerSnapshot({ reportRunId }) {
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockWorkerSnapshot(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        return prepareWorkerSnapshot(generation);
      });
    },
    async failWorker({ reportRunId, command }) {
      if (!validateWorkerFailCommand(command)) throw domainError('VALIDATION_FAILED');
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockGeneration(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');

        if (generation.status === 'failed' &&
            generation.stateVersion === command.expectedStateVersion + 1 &&
            generation.failureCode === command.failureCode &&
            generation.safeFailureMessage === command.safeFailureMessage) {
          return {
            reportRunId,
            stateVersion: generation.stateVersion,
            status: 'failed',
            failureCode: generation.failureCode,
            replayed: true,
          };
        }
        if (generation.status !== 'running') throw domainError('TERMINAL_CONFLICT');

        const transition = prepareGenerationTransition(
          generation,
          command.expectedStateVersion,
          'failed',
          now(),
        );
        const patch = {
          ...transition,
          expectedStatus: 'running',
          failureCode: command.failureCode,
          safeFailureMessage: command.safeFailureMessage,
        };
        await transaction.updateGeneration(patch);
        return {
          reportRunId,
          stateVersion: patch.stateVersion,
          status: 'failed',
          failureCode: patch.failureCode,
          replayed: false,
        };
      });
    },
    async writeWorkerCheckpoint({ reportRunId, stageKey, command }) {
      if (!validateWorkerCheckpointCommand(stageKey, command) || !REPORT_RUN_ID_PATTERN.test(reportRunId))
        throw domainError('VALIDATION_FAILED');
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockWorkerExecution(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        if (generation.status !== 'running') throw domainError('INVALID_STATE');

        let modelConfig;
        let checkpoints;
        try {
          modelConfig = parseWorkerClaimJson(generation.modelConfigJson);
          checkpoints = parseWorkerClaimJson(generation.checkpointsJson);
        } catch {
          throw domainError('INVALID_STATE');
        }
        const snapshotEnvelope = prepareWorkerSnapshot(generation).snapshot;
        const evidenceKey = snapshotEnvelope.payload.comments.length > 0 &&
          (['count', 'direct', 'validate'].includes(stageKey) || checkpoints.entries.some(({ stageKey: key }) => key === 'direct'))
          ? await resolveEvidenceKey(modelConfig, snapshotEnvelope.payload)
          : null;
        const storedRender = checkpoints.entries?.find(({ stageKey }) => stageKey === 'render');
        const rendererVersion = command.checkpoint.stageKey === 'render'
          ? command.checkpoint.payload.rendererVersion
          : storedRender?.payload?.rendererVersion ?? null;
        const result = verifyCheckpointGraphV1({
          run: {
            reportRunId: generation.reportRunId,
            status: generation.status,
            stateVersion: generation.stateVersion,
            snapshotDigest: generation.snapshotDigest,
            sourceRevision: generation.sourceRevision,
            modelConfig,
            rendererVersion,
          },
          snapshot: snapshotEnvelope.payload,
          checkpoints,
          candidate: command.checkpoint,
          expectedStateVersion: command.expectedStateVersion,
          evidenceKey,
        });
        if (result.status !== 'accepted') throw domainError('UNKNOWN_VERSION');
        if (!result.replayed) {
          await transaction.updateGeneration({
            status: 'running',
            stateVersion: result.stateVersion,
            checkpointsJson: result.checkpoints,
            expectedStatus: 'running',
          });
        }
        return {
          reportRunId,
          stateVersion: result.stateVersion,
          stageKey,
          status: 'valid',
          replayed: result.replayed,
        };
      });
    },
    async completeWorker({ reportRunId, command }) {
      if (!REPORT_RUN_ID_PATTERN.test(reportRunId) || !validateWorkerCompleteCommand(command))
        throw domainError('VALIDATION_FAILED');
      return withTransaction(async (transaction) => {
        const generation = await transaction.lockWorkerExecution(reportRunId);
        if (!generation) throw domainError('RUN_NOT_FOUND');
        const reportId = command.artifact.objectKey.split('/')[2];
        if (reportId !== deterministicReportId(reportRunId, command.artifact.sha256))
          throw domainError('DIGEST_MISMATCH');
        if (generation.status === 'succeeded') {
          if (generation.stateVersion !== command.expectedStateVersion + 1)
            throw domainError('TERMINAL_CONFLICT');
          const report = await transaction.findReportForGeneration(reportRunId);
          let commandAnalysisJson;
          let commandAnalysisDigest;
          let storedAnalysisMatches = false;
          try {
            commandAnalysisJson = canonicalizeJson(command.validatedAnalysis);
            commandAnalysisDigest = createHash('sha256').update(commandAnalysisJson).digest('hex');
            storedAnalysisMatches = Boolean(report) && canonicalizeJson(report.validatedAnalysisJson) === commandAnalysisJson;
          } catch {
            throw domainError('TERMINAL_CONFLICT');
          }
          if (!report || !storedAnalysisMatches || commandAnalysisDigest !== command.analysisDigest ||
              report.reportId !== reportId || report.analysisDigest !== command.analysisDigest ||
              report.rendererVersion !== command.rendererVersion || report.objectKey !== command.artifact.objectKey ||
              report.artifactSha256 !== command.artifact.sha256 || Number(report.artifactSize) !== command.artifact.size)
            throw domainError('TERMINAL_CONFLICT');
          return {
            reportRunId,
            stateVersion: generation.stateVersion,
            status: 'succeeded',
            reportId,
            artifactSha256: report.artifactSha256,
            artifactSize: Number(report.artifactSize),
            replayed: true,
          };
        }
        if (generation.status !== 'running' || generation.stateVersion !== command.expectedStateVersion)
          throw domainError(generation.status === 'running' ? 'STATE_VERSION_CONFLICT' : 'TERMINAL_CONFLICT');

        let modelConfig;
        let checkpoints;
        try {
          modelConfig = parseWorkerClaimJson(generation.modelConfigJson);
          checkpoints = parseWorkerClaimJson(generation.checkpointsJson);
        } catch {
          throw domainError('INVALID_STATE');
        }
        const snapshot = prepareWorkerSnapshot(generation).snapshot.payload;
        const evidenceKey = await resolveEvidenceKey(modelConfig, snapshot);
        const storeCheckpoint = checkpoints.entries?.at(-1);
        if (!storeCheckpoint || storeCheckpoint.stageKey !== 'store')
          throw domainError('CHECKPOINT_SET_INCOMPLETE');
        const graph = verifyCheckpointGraphV1({
          run: {
            reportRunId: generation.reportRunId,
            status: generation.status,
            stateVersion: generation.stateVersion,
            snapshotDigest: generation.snapshotDigest,
            sourceRevision: generation.sourceRevision,
            modelConfig,
            rendererVersion: command.rendererVersion,
          },
          snapshot,
          checkpoints,
          candidate: storeCheckpoint,
          expectedStateVersion: generation.stateVersion,
          evidenceKey,
        });
        if (graph.status !== 'accepted' || graph.checkpoints.route !== 'direct' ||
            graph.checkpoints.entries.length !== CHECKPOINT_STAGE_KEYS.length)
          throw domainError('CHECKPOINT_SET_INCOMPLETE');
        const validated = graph.checkpoints.entries.find(({ stageKey }) => stageKey === 'validate');
        const render = graph.checkpoints.entries.find(({ stageKey }) => stageKey === 'render');
        const store = graph.checkpoints.entries.find(({ stageKey }) => stageKey === 'store');
        if (!validated || validated.payload.kind !== 'validate' || !render || render.payload.kind !== 'render' ||
            !store || store.payload.kind !== 'store' ||
            canonicalizeJson(validated.payload.publishedAnalysis) !== canonicalizeJson(command.validatedAnalysis) ||
            createHash('sha256').update(canonicalizeJson(command.validatedAnalysis)).digest('hex') !== command.analysisDigest ||
            render.payload.rendererVersion !== command.rendererVersion ||
            store.payload.objectKey !== command.artifact.objectKey || store.payload.artifactSha256 !== command.artifact.sha256 ||
            store.payload.size !== command.artifact.size || store.payload.mimeType !== command.artifact.mimeType)
          throw domainError('DIGEST_MISMATCH');

        const prepared = prepareAtomicCompletion({
          generation,
          expectedStateVersion: command.expectedStateVersion,
          reportId,
          checkpoints: CHECKPOINT_STAGE_KEYS,
          artifact: command.artifact,
          validatedAnalysis: command.validatedAnalysis,
          analysisDigest: command.analysisDigest,
          rendererVersion: command.rendererVersion,
          now: now(),
        });
        prepared.report.sourceGeneration = { connect: [{ id: generation.id }] };
        await transaction.insertReport(prepared.report);
        await transaction.updateGeneration({ ...prepared.generation, expectedStatus: 'running' });
        return {
          reportRunId,
          stateVersion: prepared.generation.stateVersion,
          status: 'succeeded',
          reportId,
          artifactSha256: command.artifact.sha256,
          artifactSize: command.artifact.size,
          replayed: false,
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
  prepareWorkerSnapshot,
  validateDispatchStateCommand,
  validateWorkerClaimCommand,
  validateWorkerFailCommand,
};
