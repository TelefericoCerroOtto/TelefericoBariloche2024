"use strict";

const { createCoreController } = require("@strapi/strapi").factories;
const { measureDispatchFailureRequestBody } = require("../services/dispatch-failure-request");
const {
  validateDispatchStateCommand,
  validateWorkerClaimCommand,
  validateWorkerFailCommand,
} = require("../services/lifecycle");

function validDispatchFailure(value) {
  const keys = ["contractVersion", "expectedStateVersion", "taskName", "dispatchAttemptCount", "failureCode"];
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)) &&
    value.contractVersion === "survey-dispatch-command.v1" && Number.isSafeInteger(value.expectedStateVersion) && value.expectedStateVersion > 0 &&
    typeof value.taskName === "string" && /^tb113-report-[0-9a-f]{32}$/.test(value.taskName) &&
    Number.isSafeInteger(value.dispatchAttemptCount) && value.dispatchAttemptCount >= 1 && value.dispatchAttemptCount <= 3 &&
    value.failureCode === "QUEUE_ENQUEUE_EXHAUSTED";
}

function hasCustomContentApiTokenIdentity(ctx) {
  const auth = ctx.state.auth;
  return auth?.strategy?.name === "content-api-token" &&
    auth.credentials?.kind === "content-api" &&
    auth.credentials?.type === "custom";
}

module.exports = createCoreController(
  "api::survey-report-generation.survey-report-generation",
  ({ strapi }) => ({
    async dispatchFailure(ctx) {
      const command = ctx.request.body;
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 16 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: "PAYLOAD_TOO_LARGE", message: "The dispatch command is too large" } };
        return;
      }
      if (!validDispatchFailure(command) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ctx.params.reportRunId)) {
        ctx.status = 400;
        ctx.body = { error: { code: "VALIDATION_FAILED", message: "The dispatch command is invalid" } };
        return;
      }
      try {
        const result = await strapi.service("api::survey-report-generation.survey-report-generation").compensateDispatchFailure({
          reportRunId: ctx.params.reportRunId,
          expectedStateVersion: command.expectedStateVersion,
          taskName: command.taskName,
          dispatchAttemptCount: command.dispatchAttemptCount,
        });
        ctx.status = 200;
        ctx.body = { contractVersion: "survey-dispatch-command.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, STATE_VERSION_CONFLICT: 409, INVALID_STATE: 409, TERMINAL_CONFLICT: 409, TASK_ALREADY_CREATED: 409, VALIDATION_FAILED: 400 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The dispatch command failed" : "The dispatch command was rejected" } };
      }
    },
    async dispatchState(ctx) {
      const command = ctx.request.body;
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 16 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: "PAYLOAD_TOO_LARGE", message: "The dispatch command is too large" } };
        return;
      }
      if (!validateDispatchStateCommand(command, ctx.params.reportRunId)) {
        ctx.status = 400;
        ctx.body = { error: { code: "VALIDATION_FAILED", message: "The dispatch command is invalid" } };
        return;
      }
      try {
        const service = strapi.service("api::survey-report-generation.survey-report-generation");
        const result = command.action === "reserve"
          ? await service.reserveDispatch({ reportRunId: ctx.params.reportRunId, command })
          : await service.recordDispatchOutcome({ reportRunId: ctx.params.reportRunId, command });
        ctx.status = 200;
        ctx.body = { contractVersion: "survey-dispatch-state.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, STATE_VERSION_CONFLICT: 409, INVALID_STATE: 409, TASK_ALREADY_CREATED: 409, TASK_IDENTITY_CONFLICT: 409, VALIDATION_FAILED: 400 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The dispatch command failed" : "The dispatch command was rejected" } };
      }
    },
    async workerClaim(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: "FORBIDDEN", message: "The worker claim request is not authorized" } };
        return;
      }
      const command = ctx.request.body;
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 4 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: "PAYLOAD_TOO_LARGE", message: "The worker command is too large" } };
        return;
      }
      if (!validateWorkerClaimCommand(command) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ctx.params.reportRunId)) {
        ctx.status = 400;
        ctx.body = { error: { code: "INVALID_COMMAND", message: "The worker command is invalid" } };
        return;
      }
      try {
        const result = await strapi.service("api::survey-report-generation.survey-report-generation").claimWorker({
          reportRunId: ctx.params.reportRunId,
        });
        ctx.status = 200;
        ctx.body = { contractVersion: "survey-worker-cms.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, STATE_VERSION_CONFLICT: 409, INVALID_STATE: 409 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The worker command failed" : "The worker command was rejected" } };
      }
    },
    async workerFail(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: "FORBIDDEN", message: "The worker failure request is not authorized" } };
        return;
      }
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 4 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: "PAYLOAD_TOO_LARGE", message: "The worker command is too large" } };
        return;
      }
      const command = ctx.request.body;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ctx.params.reportRunId) ||
          !validateWorkerFailCommand(command)) {
        ctx.status = 400;
        ctx.body = { error: { code: "VALIDATION_FAILED", message: "The worker failure command is invalid" } };
        return;
      }
      try {
        const result = await strapi.service("api::survey-report-generation.survey-report-generation").failWorker({
          reportRunId: ctx.params.reportRunId,
          command,
        });
        ctx.status = 200;
        ctx.body = { contractVersion: "survey-worker-cms.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, STATE_VERSION_CONFLICT: 409, TERMINAL_CONFLICT: 409, VALIDATION_FAILED: 400 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The worker failure could not be recorded" : "The worker failure was rejected" } };
      }
    },
    async workerSnapshot(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: "FORBIDDEN", message: "The worker snapshot request is not authorized" } };
        return;
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ctx.params.reportRunId)) {
        ctx.status = 400;
        ctx.body = { error: { code: "VALIDATION_FAILED", message: "The worker snapshot request is invalid" } };
        return;
      }
      try {
        const result = await strapi.service("api::survey-report-generation.survey-report-generation").workerSnapshot({ reportRunId: ctx.params.reportRunId });
        ctx.status = 200;
        ctx.body = { contractVersion: "survey-worker-cms.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, INVALID_STATE: 409, DIGEST_MISMATCH: 409 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The worker snapshot could not be read" : "The worker snapshot was rejected" } };
      }
    },
    async workerSourceRead(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: 'FORBIDDEN', message: 'The worker source request is not authorized' } };
        return;
      }
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 4 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: 'PAYLOAD_TOO_LARGE', message: 'The worker source query is too large' } };
        return;
      }
      try {
        const result = await strapi.service('api::survey-report-generation.survey-report-generation')
          .readWorkerReportSourcePage(ctx.request.body);
        ctx.status = 200;
        ctx.body = result;
      } catch (error) {
        const code = error.code ?? 'INTERNAL_ERROR';
        const status = code === 'VALIDATION_FAILED' ? 400 : code === 'SOURCE_UNAVAILABLE' ? 503 : 500;
        ctx.status = status;
        ctx.body = {
          error: {
            code: status === 500 ? 'INTERNAL_ERROR' : status === 503 ? 'UPSTREAM_UNAVAILABLE' : code,
            message: status === 400 ? 'The worker source query is invalid' : status === 503 ? 'The worker source is unavailable' : 'The worker source could not be read',
          },
        };
      }
    },
    async workerReportDownloadMetadata(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: 'FORBIDDEN', message: 'The report metadata request is not authorized' } };
        return;
      }
      if (ctx.query && Object.keys(ctx.query).length > 0) {
        ctx.status = 400;
        ctx.body = { error: { code: 'VALIDATION_FAILED', message: 'The report metadata request is invalid' } };
        return;
      }
      try {
        const result = await strapi.service('api::survey-report-generation.survey-report-generation')
          .readPrivateReportDownloadMetadata(ctx.params.reportId);
        ctx.status = 200;
        ctx.body = result;
      } catch (error) {
        const code = error.code ?? 'INTERNAL_ERROR';
        const status = code === 'VALIDATION_FAILED' ? 400 : code === 'NOT_FOUND' ? 404 : 503;
        ctx.status = status;
        ctx.body = {
          error: {
            code: status === 400 ? 'VALIDATION_FAILED' : status === 404 ? 'NOT_FOUND' : 'UPSTREAM_UNAVAILABLE',
            message: status === 400 ? 'The report identifier is invalid' : status === 404 ? 'The report was not found' : 'The report metadata is unavailable',
          },
        };
      }
    },
    async workerCheckpoint(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: "FORBIDDEN", message: "The worker checkpoint request is not authorized" } };
        return;
      }
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 4 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: "PAYLOAD_TOO_LARGE", message: "The worker command is too large" } };
        return;
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ctx.params.reportRunId)) {
        ctx.status = 400;
        ctx.body = { error: { code: "VALIDATION_FAILED", message: "The worker checkpoint request is invalid" } };
        return;
      }
      const command = ctx.request.body;
      try {
        const result = await strapi.service("api::survey-report-generation.survey-report-generation").writeWorkerCheckpoint({
          reportRunId: ctx.params.reportRunId,
          stageKey: ctx.params.stageKey,
          command,
        });
        ctx.status = 200;
        ctx.body = { contractVersion: "survey-worker-cms.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, INVALID_STATE: 409, STATE_VERSION_CONFLICT: 409, CHECKPOINT_CONFLICT: 409, DEPENDENCY_NOT_READY: 409, DIGEST_MISMATCH: 409, UNKNOWN_VERSION: 400, VALIDATION_FAILED: 400 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The worker checkpoint could not be saved" : "The worker checkpoint was rejected" } };
      }
    },
    async workerComplete(ctx) {
      if (!hasCustomContentApiTokenIdentity(ctx)) {
        ctx.status = 403;
        ctx.body = { error: { code: "FORBIDDEN", message: "The worker completion request is not authorized" } };
        return;
      }
      const bodySize = measureDispatchFailureRequestBody(ctx.request);
      if (bodySize === null || bodySize > 4 * 1024) {
        ctx.status = 413;
        ctx.body = { error: { code: "PAYLOAD_TOO_LARGE", message: "The worker command is too large" } };
        return;
      }
      const command = ctx.request.body;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ctx.params.reportRunId)) {
        ctx.status = 400;
        ctx.body = { error: { code: "VALIDATION_FAILED", message: "The worker completion request is invalid" } };
        return;
      }
      try {
        const result = await strapi.service("api::survey-report-generation.survey-report-generation").completeWorker({
          reportRunId: ctx.params.reportRunId,
          command,
        });
        ctx.status = result.replayed ? 200 : 201;
        ctx.body = { contractVersion: "survey-worker-cms.v1", ...result };
      } catch (error) {
        const code = error.code ?? "INTERNAL_ERROR";
        const statuses = { RUN_NOT_FOUND: 404, INVALID_STATE: 409, STATE_VERSION_CONFLICT: 409, CHECKPOINT_SET_INCOMPLETE: 409, DIGEST_MISMATCH: 409, TERMINAL_CONFLICT: 409, VALIDATION_FAILED: 400 };
        const status = statuses[code] ?? 500;
        const safeCode = status === 500 ? "INTERNAL_ERROR" : code;
        ctx.status = status;
        ctx.body = { error: { code: safeCode, message: status === 500 ? "The worker completion could not be recorded" : "The worker completion was rejected" } };
      }
    },
  }),
);
