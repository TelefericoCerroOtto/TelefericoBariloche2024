const REPORT_RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type FeedbackDispatchRequest = {
  readonly reportRunId: string;
  readonly taskName: string;
};

export function createFeedbackTaskName(reportRunId: string): string | null {
  if (!REPORT_RUN_ID_PATTERN.test(reportRunId)) return null;
  return `tb113-report-${reportRunId.replaceAll("-", "")}`;
}

export type FeedbackDispatchResult =
  | {
      readonly contractVersion: "survey-dispatch-command.v1";
      readonly status: "dispatched";
      readonly taskName: string;
      readonly dispatchAttemptCount: number;
    }
  | {
      readonly contractVersion: "survey-dispatch-command.v1";
      readonly status: "queued";
      readonly disposition: "dispatcher-unavailable";
      readonly taskName: string;
      readonly dispatchAttemptCount: number;
      readonly failureCode: "DISPATCH_UNAVAILABLE";
    }
  | {
      readonly contractVersion: "survey-dispatch-command.v1";
      readonly status: "exhausted";
      readonly noTaskCreated: true;
      readonly taskName: string;
      readonly dispatchAttemptCount: 3;
      readonly failureCode: "QUEUE_ENQUEUE_EXHAUSTED";
    };

export interface FeedbackReportDispatcher {
  dispatch(_request: FeedbackDispatchRequest): Promise<FeedbackDispatchResult>;
}

export function createUnavailableFeedbackDispatcher(
  reason = "External task dispatch is not configured",
): FeedbackReportDispatcher {
  return {
    async dispatch({ taskName }) {
      void reason;
      return {
        contractVersion: "survey-dispatch-command.v1",
        status: "queued",
        disposition: "dispatcher-unavailable",
        taskName,
        dispatchAttemptCount: 0,
        failureCode: "DISPATCH_UNAVAILABLE",
      };
    },
  };
}
