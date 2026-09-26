"use strict";

module.exports = {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/tb113/admin/generations/:reportRunId/dispatch-failure",
      handler: "survey-report-generation.dispatchFailure",
    },
    {
      method: "POST",
      path: "/tb113/admin/generations/:reportRunId/dispatch-state",
      handler: "survey-report-generation.dispatchState",
    },
    {
      method: "POST",
      path: "/tb113/worker/generations/:reportRunId/claim",
      handler: "survey-report-generation.workerClaim",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerClaim"],
        },
      },
    },
    {
      method: "POST",
      path: "/tb113/worker/generations/:reportRunId/fail",
      handler: "survey-report-generation.workerFail",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerFail"],
        },
      },
    },
    {
      method: "GET",
      path: "/tb113/worker/generations/:reportRunId/snapshot",
      handler: "survey-report-generation.workerSnapshot",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerSnapshot"],
        },
      },
    },
    {
      method: "POST",
      path: "/tb113/worker/report-source",
      handler: "survey-report-generation.workerSourceRead",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerSourceRead"],
        },
      },
    },
    {
      method: "POST",
      path: "/tb113/admin/feedback/read",
      handler: "survey-report-generation.feedbackAdminRead",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.feedbackAdminRead"],
        },
      },
    },
    {
      method: "GET",
      path: "/tb113/worker/reports/:reportId/download-metadata",
      handler: "survey-report-generation.workerReportDownloadMetadata",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata"],
        },
      },
    },
    {
      method: "PUT",
      path: "/tb113/worker/generations/:reportRunId/checkpoints/:stageKey",
      handler: "survey-report-generation.workerCheckpoint",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerCheckpoint"],
        },
      },
    },
    {
      method: "POST",
      path: "/tb113/worker/generations/:reportRunId/complete",
      handler: "survey-report-generation.workerComplete",
      config: {
        auth: {
          strategies: ["content-api-token"],
          scope: ["api::survey-report-generation.survey-report-generation.workerComplete"],
        },
      },
    },
  ],
};
