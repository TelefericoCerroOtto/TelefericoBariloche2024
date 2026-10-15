export const OUTPUT_REJECTION_STAGES = ["direct", "map", "reduce", "render"] as const;
export type OutputRejectionStage = (typeof OUTPUT_REJECTION_STAGES)[number];

export const OUTPUT_REJECTION_CATEGORIES = [
  "provider_response_shape",
  "provider_candidate",
  "provider_json",
  "provider_usage",
  "output_token_budget",
  "output_contract_preflight",
  "published_analysis_contract",
  "chart_contract",
  "evidence_reference",
  "verbatim_comment_rule",
  "unclassified",
] as const;
export type OutputRejectionCategory =
  (typeof OUTPUT_REJECTION_CATEGORIES)[number];

export type OutputRejection = {
  readonly stage: OutputRejectionStage;
  readonly reasonCategory: OutputRejectionCategory;
};

export function createOutputRejectionError(
  stage: OutputRejectionStage,
  reasonCategory: Exclude<OutputRejectionCategory, "unclassified">,
  message: string,
): Error & {
  readonly code: "INVALID_OUTPUT";
  readonly outputRejection: OutputRejection;
} {
  return Object.assign(new TypeError(message), {
    code: "INVALID_OUTPUT" as const,
    outputRejection: Object.freeze({ stage, reasonCategory }),
  });
}

export function outputRejectionFor(
  error: unknown,
  fallbackStage?: OutputRejectionStage,
): OutputRejection | null {
  if (
    !error ||
    typeof error !== "object" ||
    (error as { code?: unknown }).code !== "INVALID_OUTPUT"
  )
    return null;
  const value = (error as { outputRejection?: unknown }).outputRejection;
  if (value && typeof value === "object") {
    const stage = (value as { stage?: unknown }).stage;
    const reasonCategory = (value as { reasonCategory?: unknown })
      .reasonCategory;
    if (
      OUTPUT_REJECTION_STAGES.includes(stage as OutputRejectionStage) &&
      OUTPUT_REJECTION_CATEGORIES.includes(
        reasonCategory as OutputRejectionCategory,
      )
    )
      return {
        stage: stage as OutputRejectionStage,
        reasonCategory: reasonCategory as OutputRejectionCategory,
      };
  }
  return fallbackStage
    ? { stage: fallbackStage, reasonCategory: "unclassified" }
    : null;
}
