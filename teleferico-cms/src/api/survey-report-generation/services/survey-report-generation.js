'use strict';
const { createCoreService } = require('@strapi/strapi').factories;
const lifecycle = require('./lifecycle');
const UID = 'api::survey-report-generation.survey-report-generation';

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
            'dispatch_attempt_count',
            'checkpoints_json',
            'model_config_json',
            'pricing_snapshot_json',
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
            dispatchAttemptCount: row.dispatch_attempt_count,
            checkpointsJson: row.checkpoints_json,
            modelConfigJson: row.model_config_json,
            pricingSnapshotJson: row.pricing_snapshot_json,
          }
        );
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
            dispatch_attempt_count: patch.dispatchAttemptCount,
            task_name: patch.taskName,
            dispatch_state: patch.dispatchState,
            dispatch_evidence_json: patch.dispatchEvidenceJson,
          }).filter(([, value]) => value !== undefined),
        );
        const changed = await trx('survey_report_generations')
          .where({
            report_run_id: lockedRunId,
            state_version: patch.stateVersion - 1,
            status: 'queued',
          })
          .update(values);
        if (changed !== 1)
          throw Object.assign(new Error('STATE_VERSION_CONFLICT'), {
            code: 'STATE_VERSION_CONFLICT',
          });
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
    workerSnapshot(input) {
      return lifecycle.createGenerationLifecycle({
        withTransaction: createTransaction(strapi),
      }).workerSnapshot(input);
    },
  }),
);
