import {
  decideFeedbackDispatchFailure,
  type FeedbackTaskCreateFailureKind,
} from "./dispatch-policy";

const REPORT_RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type FeedbackDispatchRequest = {
  readonly reportRunId: string;
  readonly taskName: string;
  readonly expectedStateVersion?: number;
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

export class FeedbackTaskCreateError extends Error {
  constructor(
    readonly kind: FeedbackTaskCreateFailureKind,
    readonly reasonCode:
      | "AMBIGUOUS_RESPONSE"
      | "PROVIDER_UNAVAILABLE"
      | "UNCLASSIFIED" = "UNCLASSIFIED",
  ) {
    super("Feedback task creation did not return a verified result");
    this.name = "FeedbackTaskCreateError";
  }
}

export type FeedbackCloudTaskClient = {
  readonly trust: "verified";
  readonly createTask: (input: {
    readonly taskName: string;
    readonly reportRunId: string;
    readonly commandVersion: "survey-report-command.v1";
  }) => Promise<{ readonly taskName: string; readonly reportRunId: string }>;
  readonly verifyExistingTask: (input: {
    readonly taskName: string;
    readonly reportRunId: string;
  }) => Promise<{
    readonly status: "verified";
    readonly taskName: string;
    readonly reportRunId: string;
    readonly state: "created";
  } | null>;
};

export type FeedbackDispatchStateReservation = {
  readonly reportRunId: string;
  readonly taskName: string;
  readonly stateVersion: number;
  readonly dispatchState: "reserved";
  readonly dispatchAttemptCount: number;
  readonly replayed: boolean;
};

export type FeedbackDispatchStatePort = {
  readonly trust: "verified";
  readonly reserve: (input: {
    readonly reportRunId: string;
    readonly expectedStateVersion: number;
    readonly taskName: string;
  }) => Promise<FeedbackDispatchStateReservation>;
  readonly record: (input: {
    readonly reportRunId: string;
    readonly expectedStateVersion: number;
    readonly taskName: string;
    readonly outcome: "created" | "unknown";
    readonly dispatchAttemptCount: 1 | 2 | 3;
    readonly evidence:
      | {
          readonly contractVersion: "survey-dispatch-evidence.v1";
          readonly outcome: "created";
          readonly taskName: string;
          readonly dispatchAttemptCount: 1 | 2 | 3;
          readonly verifiedAt: string;
        }
      | {
          readonly contractVersion: "survey-dispatch-evidence.v1";
          readonly outcome: "unknown";
          readonly taskName: string;
          readonly dispatchAttemptCount: 1 | 2 | 3;
          readonly reasonCode:
            | "AMBIGUOUS_RESPONSE"
            | "PROVIDER_UNAVAILABLE"
            | "UNCLASSIFIED";
        };
  }) => Promise<{
    readonly reportRunId: string;
    readonly taskName: string;
    readonly stateVersion: number;
    readonly dispatchState: "created" | "unknown";
    readonly dispatchAttemptCount: number;
    readonly replayed: boolean;
  }>;
};

function unavailableResult(taskName: string, attempts: 0 | 1 | 2 | 3) {
  return {
    contractVersion: "survey-dispatch-command.v1" as const,
    status: "queued" as const,
    disposition: "dispatcher-unavailable" as const,
    taskName,
    dispatchAttemptCount: attempts,
    failureCode: "DISPATCH_UNAVAILABLE" as const,
  };
}

function isValidReservation(
  value: FeedbackDispatchStateReservation,
  request: FeedbackDispatchRequest,
): boolean {
  return (
    value.reportRunId === request.reportRunId &&
    value.taskName === request.taskName &&
    value.dispatchState === "reserved" &&
    Number.isSafeInteger(value.stateVersion) &&
    value.stateVersion === request.expectedStateVersion! + 1 &&
    Number.isSafeInteger(value.dispatchAttemptCount) &&
    value.dispatchAttemptCount >= 0 &&
    value.dispatchAttemptCount <= 3
  );
}

export function createCoordinatedFeedbackDispatcher(options: {
  readonly taskClient: FeedbackCloudTaskClient;
  readonly dispatchState: FeedbackDispatchStatePort;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly now?: () => string;
  readonly observe?: (event: {
    readonly outcome: "created" | "unknown" | "unavailable";
    readonly attemptCount: number;
  }) => void;
}): FeedbackReportDispatcher {
  if (
    options.taskClient.trust !== "verified" ||
    options.dispatchState.trust !== "verified"
  )
    return createUnavailableFeedbackDispatcher();

  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const now = options.now ?? (() => new Date().toISOString());
  const inFlight = new Map<string, Promise<FeedbackDispatchResult>>();
  const completed = new Map<string, FeedbackDispatchResult>();
  const emit = (outcome: "created" | "unknown" | "unavailable", attemptCount: number) => {
    try {
      options.observe?.({ outcome, attemptCount });
    } catch {
      // Observability must not change dispatch safety or result handling.
    }
  };

  return {
    async dispatch(request) {
      const expectedName = createFeedbackTaskName(request.reportRunId);
      if (
        !expectedName ||
        expectedName !== request.taskName ||
        !Number.isSafeInteger(request.expectedStateVersion) ||
        request.expectedStateVersion! < 1
      ) {
        emit("unavailable", 0);
        return unavailableResult(request.taskName, 0);
      }

      const key = `${request.reportRunId}:${request.taskName}`;
      const prior = completed.get(key);
      if (prior) return prior;
      const existing = inFlight.get(key);
      if (existing) return existing;

      const operation = (async (): Promise<FeedbackDispatchResult> => {
        let reservation: FeedbackDispatchStateReservation;
        const reserveInput = {
          reportRunId: request.reportRunId,
          expectedStateVersion: request.expectedStateVersion!,
          taskName: request.taskName,
        };
        try {
          reservation = await options.dispatchState.reserve(reserveInput);
        } catch {
          try {
            // CMS reserve is an identical-command CAS replay, so retrying this
            // request cannot create a task or reserve a different identity.
            reservation = await options.dispatchState.reserve(reserveInput);
          } catch {
            emit("unavailable", 0);
            return unavailableResult(request.taskName, 0);
          }
        }
        if (!isValidReservation(reservation, request)) {
          emit("unknown", 0);
          return unavailableResult(request.taskName, 0);
        }

        const recordUnknown = async (
          attempts: 1 | 2 | 3,
          reasonCode: "AMBIGUOUS_RESPONSE" | "PROVIDER_UNAVAILABLE" | "UNCLASSIFIED",
        ) => {
          const recordInput = {
            reportRunId: request.reportRunId,
            expectedStateVersion: reservation.stateVersion,
            taskName: request.taskName,
            outcome: "unknown" as const,
            dispatchAttemptCount: attempts,
            evidence: {
              contractVersion: "survey-dispatch-evidence.v1" as const,
              outcome: "unknown" as const,
              taskName: request.taskName,
              dispatchAttemptCount: attempts,
              reasonCode,
            },
          };
          try {
            let recorded;
            try {
              recorded = await options.dispatchState.record(recordInput);
            } catch {
              // Identical CMS outcome commands replay without another write.
              recorded = await options.dispatchState.record(recordInput);
            }
            if (
              recorded.reportRunId !== request.reportRunId ||
              recorded.taskName !== request.taskName ||
              recorded.dispatchState !== "unknown" ||
              recorded.stateVersion !== reservation.stateVersion + 1 ||
              recorded.dispatchAttemptCount !== attempts
            )
              throw new Error("Dispatch state identity mismatch");
          } catch {
            // The reserved CMS row still prevents a second enqueue attempt.
          }
          emit("unknown", attempts);
          return unavailableResult(request.taskName, attempts);
        };

        if (reservation.replayed) {
          return recordUnknown(
            Math.max(1, reservation.dispatchAttemptCount) as 1 | 2 | 3,
            "UNCLASSIFIED",
          );
        }

        for (let attempt = 1; attempt <= 3; attempt += 1) {
          let created: { readonly taskName: string; readonly reportRunId: string };
          try {
            created = await options.taskClient.createTask({
              taskName: request.taskName,
              reportRunId: request.reportRunId,
              commandVersion: "survey-report-command.v1",
            });
          } catch (error) {
            const failure =
              error instanceof FeedbackTaskCreateError
                ? error
                : new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
            const decision = decideFeedbackDispatchFailure(failure.kind, attempt);
            if (failure.kind === "already-exists") {
              let existingTask: Awaited<ReturnType<typeof options.taskClient.verifyExistingTask>>;
              try {
                existingTask = await options.taskClient.verifyExistingTask({
                  taskName: request.taskName,
                  reportRunId: request.reportRunId,
                });
              } catch {
                existingTask = null;
              }
              if (
                existingTask?.status === "verified" &&
                existingTask.taskName === request.taskName &&
                existingTask.reportRunId === request.reportRunId &&
                existingTask.state === "created"
              ) {
                created = {
                  taskName: existingTask.taskName,
                  reportRunId: existingTask.reportRunId,
                };
              } else {
                return recordUnknown(attempt as 1 | 2 | 3, "UNCLASSIFIED");
              }
            } else if (decision === "retry") {
              await sleep(attempt * 1000);
              continue;
            } else {
              return recordUnknown(
                attempt as 1 | 2 | 3,
                failure.reasonCode,
              );
            }
          }

          if (
            created.taskName !== request.taskName ||
            created.reportRunId !== request.reportRunId
          )
            return recordUnknown(attempt as 1 | 2 | 3, "AMBIGUOUS_RESPONSE");

          try {
            const recordInput = {
              reportRunId: request.reportRunId,
              expectedStateVersion: reservation.stateVersion,
              taskName: request.taskName,
              outcome: "created",
              dispatchAttemptCount: attempt as 1 | 2 | 3,
              evidence: {
                contractVersion: "survey-dispatch-evidence.v1",
                outcome: "created",
                taskName: request.taskName,
                dispatchAttemptCount: attempt as 1 | 2 | 3,
                verifiedAt: now(),
              },
            } as const;
            let recorded;
            try {
              recorded = await options.dispatchState.record(recordInput);
            } catch {
              recorded = await options.dispatchState.record(recordInput);
            }
            if (
              recorded.reportRunId !== request.reportRunId ||
              recorded.taskName !== request.taskName ||
              recorded.dispatchState !== "created" ||
              recorded.stateVersion !== reservation.stateVersion + 1 ||
              recorded.dispatchAttemptCount !== attempt
            )
              throw new Error("Dispatch state identity mismatch");
          } catch {
            return recordUnknown(attempt as 1 | 2 | 3, "AMBIGUOUS_RESPONSE");
          }

          emit("created", attempt);
          return {
            contractVersion: "survey-dispatch-command.v1",
            status: "dispatched",
            taskName: request.taskName,
            dispatchAttemptCount: attempt,
          };
        }

        return recordUnknown(3, "PROVIDER_UNAVAILABLE");
      })();
      inFlight.set(key, operation);
      try {
        const result = await operation;
        completed.set(key, result);
        if (completed.size > 1000)
          completed.delete(completed.keys().next().value!);
        return result;
      } finally {
        inFlight.delete(key);
      }
    },
  };
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
