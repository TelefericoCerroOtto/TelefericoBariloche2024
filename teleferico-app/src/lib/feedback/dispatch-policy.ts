export type FeedbackTaskCreateFailureKind =
  | "not-sent-transient"
  | "unknown"
  | "terminal"
  | "already-exists";

export type FeedbackDispatchDecision = "retry" | "unknown" | "terminal";

export function decideFeedbackDispatchFailure(
  kind: FeedbackTaskCreateFailureKind,
  attempt: number,
): FeedbackDispatchDecision {
  if (kind === "not-sent-transient" && attempt < 3) return "retry";
  if (kind === "unknown" || kind === "not-sent-transient") return "unknown";
  return "terminal";
}
