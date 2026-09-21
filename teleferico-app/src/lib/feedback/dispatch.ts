export type FeedbackDispatchRequest = {
  readonly reportRunId: string;
  readonly taskName: string;
};

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
    };

export interface FeedbackReportDispatcher {
  dispatch(request: FeedbackDispatchRequest): Promise<FeedbackDispatchResult>;
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
