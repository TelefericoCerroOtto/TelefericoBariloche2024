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
  readonly violationCodes?: readonly string[];
};

const DIRECT_PREFLIGHT_CODES = new Set([
  "invalid_snapshot",
  "invalid_evidence_key_id",
  "invalid_output_contract",
  "invalid_evidence_context",
  "duplicate_snapshot_record_identity",
  "invalid_section_shape",
  "invalid_section_order_or_status",
  "claims_in_insufficient_section",
  "empty_supported_section",
  "invalid_claim_shape",
  "duplicate_or_unsorted_claim_id",
  "section_signal_mismatch",
  "invalid_claim_text",
  "missing_or_malformed_evidence_ref",
  "duplicate_evidence_ref",
  "foreign_evidence_ref",
  "evidence_threshold_not_met",
]);

function safeDirectCodes(
  stage: OutputRejectionStage,
  reasonCategory: OutputRejectionCategory,
  value: unknown,
): readonly string[] | undefined {
  if (stage !== "direct" || reasonCategory !== "output_contract_preflight" ||
      !Array.isArray(value) || value.length === 0 || value.length > DIRECT_PREFLIGHT_CODES.size ||
      value.some((code) => typeof code !== "string" || !DIRECT_PREFLIGHT_CODES.has(code)) ||
      new Set(value).size !== value.length)
    return undefined;
  return Object.freeze([...value].sort());
}

export function createOutputRejectionError(
  stage: OutputRejectionStage,
  reasonCategory: Exclude<OutputRejectionCategory, "unclassified">,
  message: string,
  violationCodes?: readonly string[],
): Error & {
  readonly code: "INVALID_OUTPUT";
  readonly outputRejection: OutputRejection;
} {
  const safeCodes = safeDirectCodes(stage, reasonCategory, violationCodes);
  return Object.assign(new TypeError(message), {
    code: "INVALID_OUTPUT" as const,
    outputRejection: Object.freeze({
      stage,
      reasonCategory,
      ...(safeCodes ? { violationCodes: safeCodes } : {}),
    }),
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
    ) {
      const violationCodes = safeDirectCodes(
        stage as OutputRejectionStage,
        reasonCategory as OutputRejectionCategory,
        (value as { violationCodes?: unknown }).violationCodes,
      );
      return {
        stage: stage as OutputRejectionStage,
        reasonCategory: reasonCategory as OutputRejectionCategory,
        ...(violationCodes ? { violationCodes } : {}),
      };
    }
  }
  return fallbackStage
    ? { stage: fallbackStage, reasonCategory: "unclassified" }
    : null;
}
