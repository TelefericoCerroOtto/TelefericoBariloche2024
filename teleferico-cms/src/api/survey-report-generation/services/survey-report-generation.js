'use strict';
const { createCoreService } = require('@strapi/strapi').factories;
const lifecycle = require('./lifecycle');
const { createPrivateReportSourceReader } = require('./private-report-source');
const UID = 'api::survey-report-generation.survey-report-generation';
const REPORT_UID = 'api::survey-report.survey-report';

function createTransaction(strapi) {
  return (operation) =>
    strapi.db.transaction(async ({ trx }) => {
    let lockedRunId;
    return operation({
      async lockGeneration(reportRunId) {
        lockedRunId = reportRunId;
        const row = await trx('survey_report_generations')
          .select(
            'report_run_id',
            'status',
            'state_version',
            'task_name',
            'dispatch_state',
            'dispatch_evidence_json',
            'claimed_at',
            'failure_code',
            'safe_failure_message',
            'completed_at',
            'dispatch_attempt_count',
            'checkpoints_json',
            'model_config_json',
            'pricing_snapshot_json',
            'snapshot_digest',
            'source_revision',
          )
          .where({ report_run_id: reportRunId })
          .forUpdate()
          .first();
        return (
          row && {
            reportRunId: row.report_run_id,
            status: row.status,
            stateVersion: row.state_version,
            taskName: row.task_name,
            dispatchState: row.dispatch_state,
            dispatchEvidenceJson: row.dispatch_evidence_json,
            claimedAt: row.claimed_at,
            failureCode: row.failure_code,
            safeFailureMessage: row.safe_failure_message,
            completedAt: row.completed_at,
            dispatchAttemptCount: row.dispatch_attempt_count,
            checkpointsJson: row.checkpoints_json,
            modelConfigJson: row.model_config_json,
            pricingSnapshotJson: row.pricing_snapshot_json,
            snapshotDigest: row.snapshot_digest,
            sourceRevision: row.source_revision,
          }
        );
      },
      async lockWorkerExecution(reportRunId) {
        lockedRunId = reportRunId;
        const row = await trx('survey_report_generations')
          .select(
            'id', 'document_id', 'report_run_id', 'period_start', 'period_end',
            'data_cutoff_at', 'status', 'state_version', 'checkpoints_json',
            'model_config_json', 'snapshot_digest', 'source_revision', 'snapshot_json',
          )
          .where({ report_run_id: reportRunId })
          .forUpdate()
          .first();
        return row && {
          id: row.id,
          documentId: row.document_id,
          reportRunId: row.report_run_id,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          dataCutoffAt: row.data_cutoff_at,
          status: row.status,
          stateVersion: row.state_version,
          checkpointsJson: row.checkpoints_json,
          modelConfigJson: row.model_config_json,
          snapshotDigest: row.snapshot_digest,
          sourceRevision: row.source_revision,
          snapshotJson: row.snapshot_json,
        };
      },
      async lockWorkerSnapshot(reportRunId) {
        const row = await trx('survey_report_generations')
          .select('report_run_id', 'status', 'state_version', 'snapshot_digest', 'source_revision', 'snapshot_json')
          .where({ report_run_id: reportRunId })
          .forUpdate()
          .first();
        return row && {
          reportRunId: row.report_run_id,
          status: row.status,
          stateVersion: row.state_version,
          snapshotDigest: row.snapshot_digest,
          sourceRevision: row.source_revision,
          snapshotJson: row.snapshot_json,
        };
      },
      async updateGeneration(patch) {
        const values = Object.fromEntries(
          Object.entries({
            status: patch.status,
            state_version: patch.stateVersion,
            completed_at: patch.completedAt,
            claimed_at: patch.claimedAt,
            failure_code: patch.failureCode,
            safe_failure_message: patch.safeFailureMessage,
            dispatch_attempt_count: patch.dispatchAttemptCount,
            task_name: patch.taskName,
            dispatch_state: patch.dispatchState,
            dispatch_evidence_json: patch.dispatchEvidenceJson,
            checkpoints_json: patch.checkpointsJson,
          }).filter(([, value]) => value !== undefined),
        );
        const changed = await trx('survey_report_generations')
          .where({
            report_run_id: lockedRunId,
            state_version: patch.stateVersion - 1,
            status: patch.expectedStatus ?? 'queued',
          })
          .update(values);
        if (changed !== 1)
          throw Object.assign(new Error('STATE_VERSION_CONFLICT'), {
            code: 'STATE_VERSION_CONFLICT',
          });
      },
      async insertReport(data) {
        return strapi.db.query(REPORT_UID).create({ data });
      },
      async findReportForGeneration(reportRunId) {
        return strapi.db.query(REPORT_UID).findOne({ where: { generationRunId: reportRunId } });
      },
    });
    });
}

module.exports = createCoreService(
  UID,
  ({ strapi }) => ({
    assertReportCreation: lifecycle.assertReportCreation,
    createLifecycle: lifecycle.createGenerationLifecycle,
    prepareCompletion: lifecycle.prepareAtomicCompletion,
    prepareDispatchFailure: lifecycle.prepareDispatchFailure,
    prepareRetry: lifecycle.prepareRetryGeneration,
    prepareTransition: lifecycle.prepareGenerationTransition,
    compensateDispatchFailure(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).compensateDispatchFailure(input);
    },
    reserveDispatch(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).reserveDispatch(input);
    },
    recordDispatchOutcome(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).recordDispatchOutcome(input);
    },
    claimWorker(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).claimWorker(input);
    },
    failWorker(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).failWorker(input);
    },
    workerSnapshot(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).workerSnapshot(input);
    },
    readWorkerReportSourcePage(input) {
      return createPrivateReportSourceReader(strapi).readPage(input);
    },
    writeWorkerCheckpoint(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
        evidenceKeyProvider: strapi.config.get('feedback.workerEvidenceKeyProvider'),
        countTokensProvider: strapi.config.get('feedback.workerCountTokensProvider'),
      }).writeWorkerCheckpoint(input);
    },
    completeWorker(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
        evidenceKeyProvider: strapi.config.get('feedback.workerEvidenceKeyProvider'),
        countTokensProvider: strapi.config.get('feedback.workerCountTokensProvider'),
      }).completeWorker(input);
    },
  }),
);
