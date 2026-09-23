"use strict";

module.exports = {
  type: "content-api",
  routes: [
    {
      method: "POST",
      path: "/tb113/admin/generations/:reportRunId/dispatch-failure",
      handler: "survey-report-generation.dispatchFailure",
    },
  ],
};
