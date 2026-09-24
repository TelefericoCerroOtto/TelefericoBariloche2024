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
    },
    {
      method: "GET",
      path: "/tb113/worker/generations/:reportRunId/snapshot",
      handler: "survey-report-generation.workerSnapshot",
    },
    {
      method: "PUT",
      path: "/tb113/worker/generations/:reportRunId/checkpoints/:stageKey",
      handler: "survey-report-generation.workerCheckpoint",
    },
  ],
};
