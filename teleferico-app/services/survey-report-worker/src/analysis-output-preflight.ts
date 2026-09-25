import {
  validateSnapshotEnvelope,
  type SnapshotEnvelopeV1,
} from "../../../packages/survey-reporting-core/src";
import { deriveEvidenceRef } from "./checkpoint-contract";
import { PUBLISHED_SECTION_KEYS } from "./contracts";

type EvidenceClaim = {
  readonly claimId: string;
  readonly textEs: string;
  readonly evidenceRefs: readonly string[];
  readonly signal: "recurrent" | "minority" | "descriptive";
};

type DirectAnalysis = {
  readonly schemaVersion: "survey-analysis.v1";
  readonly route: "direct";
  readonly sections: readonly {
    readonly key: (typeof PUBLISHED_SECTION_KEYS)[number];
    readonly status: "supported" | "insufficient_evidence";
    readonly claims: readonly EvidenceClaim[];
  }[];
};

export type DirectOutputPreflight =
  | { readonly status: "rejected"; readonly violations: readonly string[] }
  | {
      readonly status: "incomplete";
      readonly checked: readonly string[];
      readonly blockers: readonly string[];
    };

const CLAIM_KEYS = ["claimId", "textEs", "evidenceRefs", "signal"];
const SECTION_KEYS = ["key", "status", "claims"];
const OUTPUT_KEYS = ["schemaVersion", "route", "sections"];
const REF_PATTERN = /^e_[a-z2-7]{20}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const KEY_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const FORBIDDEN_CLAIM =
  /\b(?:debe|deben|debería|recomiendo|recomendamos|recomendar|sugiero|sugerimos|conviene|implementar|cambiar|mejorar|garantiza|garantizan|causa|causan|provoca|provocan|demuestra|demuestran|proves?|causes?|causes|recommend(?:s|ed|ing)?|should|must|need(?:s|ed)? to|improve|change|implement)\b/iu;

function exactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return false;
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const b = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1)
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  return a.length - b.length;
}

function tokens(value: string): string[] {
  return value.toLocaleLowerCase("es").match(/[\p{L}\p{N}]+/gu) ?? [];
}

function leaksComment(text: string, comments: readonly string[]): boolean {
  const outputTokens = tokens(text);
  return comments.some((comment) => {
    const commentTokens = tokens(comment);
    if (commentTokens.length === 0) return false;
    const width = Math.min(8, commentTokens.length);
    for (let start = 0; start <= commentTokens.length - width; start += 1) {
      const phrase = commentTokens.slice(start, start + width);
      if (commentTokens.length < 8 && phrase.length !== commentTokens.length)
        continue;
      if (
        outputTokens.some((_, index) =>
          phrase.every(
            (token, offset) => outputTokens[index + offset] === token,
          ),
        )
      )
        return true;
    }
    return false;
  });
}

/** Checks independently provable direct-output constraints without accepting incomplete evidence semantics. */
export function preflightDirectAnalysis(
  value: unknown,
  input: {
    readonly snapshot: SnapshotEnvelopeV1;
    readonly reportRunId: string;
    readonly evidenceKeyId: string;
    readonly evidenceKey: string | Uint8Array;
  },
): DirectOutputPreflight {
  const violations = new Set<string>();
  let snapshot;
  try {
    snapshot = validateSnapshotEnvelope(input.snapshot);
  } catch {
    return { status: "rejected", violations: ["invalid_snapshot"] };
  }
  if (
    typeof input.evidenceKeyId !== "string" ||
    !KEY_ID_PATTERN.test(input.evidenceKeyId)
  )
    return { status: "rejected", violations: ["invalid_evidence_key_id"] };

  if (
    !exactKeys(value, OUTPUT_KEYS) ||
    value.schemaVersion !== "survey-analysis.v1" ||
    value.route !== "direct" ||
    !Array.isArray(value.sections) ||
    value.sections.length !== PUBLISHED_SECTION_KEYS.length
  )
    return { status: "rejected", violations: ["invalid_output_contract"] };

  const allowedRefs = new Set<string>();
  try {
    for (const comment of snapshot.comments)
      allowedRefs.add(
        deriveEvidenceRef({
          reportRunId: input.reportRunId,
          recordId: comment.recordId,
          evidenceKey: input.evidenceKey,
        }),
      );
  } catch {
    return { status: "rejected", violations: ["invalid_evidence_context"] };
  }
  if (allowedRefs.size !== snapshot.comments.length)
    violations.add("duplicate_snapshot_record_identity");

  const commentText = snapshot.comments.map(({ text }) => text);
  const commentCount = snapshot.comments.length;
  const recurrentMinimum = Math.max(10, Math.ceil((commentCount * 2) / 100));
  const claimIds = new Set<string>();

  value.sections.forEach((section, index) => {
    if (!exactKeys(section, SECTION_KEYS)) {
      violations.add("invalid_section_shape");
      return;
    }
    if (
      section.key !== PUBLISHED_SECTION_KEYS[index] ||
      !Array.isArray(section.claims) ||
      (section.status !== "supported" &&
        section.status !== "insufficient_evidence")
    ) {
      violations.add("invalid_section_order_or_status");
      return;
    }
    if (
      section.status === "insufficient_evidence" &&
      section.claims.length !== 0
    )
      violations.add("claims_in_insufficient_section");
    if (section.status === "supported" && section.claims.length === 0)
      violations.add("empty_supported_section");

    let previousClaimId = "";
    section.claims.forEach((claim) => {
      if (
        !exactKeys(claim, CLAIM_KEYS) ||
        typeof claim.claimId !== "string" ||
        !ID_PATTERN.test(claim.claimId) ||
        typeof claim.textEs !== "string" ||
        !Array.isArray(claim.evidenceRefs) ||
        !["recurrent", "minority", "descriptive"].includes(String(claim.signal))
      ) {
        violations.add("invalid_claim_shape");
        return;
      }
      if (
        compareCodePoints(claim.claimId, previousClaimId) <= 0 ||
        claimIds.has(claim.claimId)
      )
        violations.add("duplicate_or_unsorted_claim_id");
      previousClaimId = claim.claimId;
      claimIds.add(claim.claimId);
      if (
        (section.key === "recurrent_themes" && claim.signal !== "recurrent") ||
        (section.key === "minority_signals" && claim.signal !== "minority")
      )
        violations.add("section_signal_mismatch");
      if (
        claim.textEs.length === 0 ||
        claim.textEs.length > 4_000 ||
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
          claim.textEs,
        )
      )
        violations.add("invalid_claim_text");
      if (FORBIDDEN_CLAIM.test(claim.textEs))
        violations.add("action_or_causal_claim");
      if (leaksComment(claim.textEs, commentText))
        violations.add("verbatim_comment_leak");
      const refs = claim.evidenceRefs;
      if (
        refs.length === 0 ||
        refs.some((ref) => typeof ref !== "string" || !REF_PATTERN.test(ref))
      )
        violations.add("missing_or_malformed_evidence_ref");
      if (new Set(refs).size !== refs.length)
        violations.add("duplicate_evidence_ref");
      if (refs.some((ref) => !allowedRefs.has(ref)))
        violations.add("foreign_evidence_ref");
      const minimum =
        claim.signal === "recurrent"
          ? recurrentMinimum
          : claim.signal === "minority"
            ? 4
            : 1;
      if (refs.length < minimum) violations.add("evidence_threshold_not_met");
    });
  });

  if (violations.size > 0)
    return {
      status: "rejected",
      violations: [...violations].sort(compareCodePoints),
    };
  return {
    status: "incomplete",
    checked: [
      "closed_direct_schema",
      "ordered_sections",
      "evidence_ref_membership_and_thresholds",
      "recurrent_and_minority_section_signal_consistency",
      "prohibited_claim_markers",
      "verbatim_comment_leakage",
      "unicode_scalar_text",
    ],
    blockers: [
      "immutable_per_run_evidence_key_selection",
      "exact_claim_to_metric_grounding_and_contradiction_analysis",
      "provider-evidence semantic validation",
      "versioned insufficient-evidence Spanish text",
    ],
  };
}
