import {
  validateSnapshotEnvelope,
  type SnapshotEnvelopeV1,
} from "../../../packages/survey-reporting-core/src";
import {
  deriveChunkMembership,
  deriveEvidenceRef,
  type ChunkMembershipV1,
} from "./checkpoint-contract";
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
  | { readonly status: "accepted"; readonly checked: readonly string[] }
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
const MAP_KEYS = [
  "schemaVersion",
  "chunkId",
  "coveredRefs",
  "themes",
  "limitations",
];
const THEME_KEYS = ["themeKey", "labelEs", "claims"];
const REDUCE_KEYS = ["schemaVersion", "route", "sections", "mapOutputDigests"];

type MapPreflightInput = {
  readonly snapshot: SnapshotEnvelopeV1;
  readonly reportRunId: string;
  readonly evidenceKeyId: string;
  readonly evidenceKey: string | Uint8Array;
  readonly chunkCount: number;
};

type ReducePreflightInput = Omit<MapPreflightInput, "chunkCount">;

type PreflightViolation = {
  readonly status: "rejected";
  readonly violations: readonly string[];
};

function invalidUnicode(value: string): boolean {
  return /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(
    value,
  );
}

function validText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= maxLength &&
    !invalidUnicode(value)
  );
}

function sortedViolations(violations: Set<string>): PreflightViolation | null {
  if (violations.size === 0) return null;
  return {
    status: "rejected",
    violations: [...violations].sort(compareCodePoints),
  };
}

function preflightContext(input: {
  readonly snapshot: SnapshotEnvelopeV1;
  readonly reportRunId: string;
  readonly evidenceKeyId: string;
  readonly evidenceKey: string | Uint8Array;
}):
  | {
      readonly comments: readonly SnapshotEnvelopeV1["payload"]["comments"][number][];
      readonly refs: ReadonlySet<string>;
    }
  | PreflightViolation {
  let snapshot: SnapshotEnvelopeV1["payload"];
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
  const evidenceKeyLength = typeof input.evidenceKey === "string"
    ? new TextEncoder().encode(input.evidenceKey).byteLength
    : input.evidenceKey instanceof Uint8Array ? input.evidenceKey.byteLength : 0;
  if (evidenceKeyLength < 32)
    return { status: "rejected", violations: ["invalid_evidence_key"] };

  try {
    const refs = new Set(
      snapshot.comments.map(({ recordId }) =>
        deriveEvidenceRef({
          reportRunId: input.reportRunId,
          recordId,
          evidenceKey: input.evidenceKey,
        }),
      ),
    );
    if (refs.size !== snapshot.comments.length)
      return {
        status: "rejected",
        violations: ["duplicate_snapshot_record_identity"],
      };
    return { comments: snapshot.comments, refs };
  } catch {
    return { status: "rejected", violations: ["invalid_evidence_context"] };
  }
}

function validateClaimCollection(
  value: unknown,
  input: {
    readonly commentText: readonly string[];
    readonly allowedRefs: ReadonlySet<string>;
    readonly claimIds: Set<string>;
    readonly violations: Set<string>;
    readonly refScope?: ReadonlySet<string>;
  },
): void {
  if (!Array.isArray(value)) {
    input.violations.add("invalid_claim_list");
    return;
  }

  let previousClaimId = "";
  for (const claim of value) {
    if (
      !exactKeys(claim, CLAIM_KEYS) ||
      typeof claim.claimId !== "string" ||
      !ID_PATTERN.test(claim.claimId) ||
      !validText(claim.textEs, 4_000) ||
      !Array.isArray(claim.evidenceRefs) ||
      !["recurrent", "minority", "descriptive"].includes(String(claim.signal))
    ) {
      input.violations.add("invalid_claim_shape");
      continue;
    }
    if (
      compareCodePoints(claim.claimId, previousClaimId) <= 0 ||
      input.claimIds.has(claim.claimId)
    )
      input.violations.add("duplicate_or_unsorted_claim_id");
    previousClaimId = claim.claimId;
    input.claimIds.add(claim.claimId);

    if (FORBIDDEN_CLAIM.test(claim.textEs))
      input.violations.add("action_or_causal_claim");
    if (leaksComment(claim.textEs, input.commentText))
      input.violations.add("verbatim_comment_leak");
    if (REF_PATTERN.test(claim.textEs))
      input.violations.add("exposed_evidence_ref");

    const refs = claim.evidenceRefs;
    if (
      refs.length === 0 ||
      refs.some((ref) => typeof ref !== "string" || !REF_PATTERN.test(ref))
    )
      input.violations.add("missing_or_malformed_evidence_ref");
    if (new Set(refs).size !== refs.length)
      input.violations.add("duplicate_evidence_ref");
    if (refs.some((ref) => !input.allowedRefs.has(ref)))
      input.violations.add("foreign_evidence_ref");
    if (input.refScope && refs.some((ref) => !input.refScope!.has(ref)))
      input.violations.add("evidence_ref_outside_map_chunk");
  }
}

function checkProse(
  value: unknown,
  maxLength: number,
  commentText: readonly string[],
  violations: Set<string>,
): void {
  if (!validText(value, maxLength)) {
    violations.add("invalid_output_text");
    return;
  }
  if (FORBIDDEN_CLAIM.test(value)) violations.add("action_or_causal_claim");
  if (leaksComment(value, commentText)) violations.add("verbatim_comment_leak");
  if (REF_PATTERN.test(value)) violations.add("exposed_evidence_ref");
}

function validateSections(
  value: unknown,
  context: {
    readonly commentText: readonly string[];
    readonly allowedRefs: ReadonlySet<string>;
    readonly violations: Set<string>;
  },
): void {
  if (!Array.isArray(value) || value.length !== PUBLISHED_SECTION_KEYS.length) {
    context.violations.add("invalid_section_order_or_status");
    return;
  }
  const claimIds = new Set<string>();
  value.forEach((section, index) => {
    if (!exactKeys(section, SECTION_KEYS)) {
      context.violations.add("invalid_section_shape");
      return;
    }
    if (
      section.key !== PUBLISHED_SECTION_KEYS[index] ||
      !Array.isArray(section.claims) ||
      (section.status !== "supported" &&
        section.status !== "insufficient_evidence")
    ) {
      context.violations.add("invalid_section_order_or_status");
      return;
    }
    if (
      (section.status === "insufficient_evidence" &&
        section.claims.length !== 0) ||
      (section.status === "supported" && section.claims.length === 0)
    )
      context.violations.add("section_status_claim_mismatch");
    if (
      (section.key === "recurrent_themes" &&
        section.claims.some(
          (claim: { signal?: unknown }) => claim?.signal !== "recurrent",
        )) ||
      (section.key === "minority_signals" &&
        section.claims.some(
          (claim: { signal?: unknown }) => claim?.signal !== "minority",
        ))
    )
      context.violations.add("section_signal_mismatch");
    validateClaimCollection(section.claims, {
      commentText: context.commentText,
      allowedRefs: context.allowedRefs,
      claimIds,
      violations: context.violations,
    });
  });
}

/** Rejects detectable MapV1 contract violations without treating worker-supplied membership as evidence. */
export function preflightMapAnalysis(
  value: unknown,
  input: MapPreflightInput,
): DirectOutputPreflight {
  const context = preflightContext(input);
  if ("status" in context) return context;

  const violations = new Set<string>();
  if (
    !exactKeys(value, MAP_KEYS) ||
    value.schemaVersion !== "survey-map.v1" ||
    typeof value.chunkId !== "string" ||
    !Array.isArray(value.coveredRefs) ||
    !Array.isArray(value.themes) ||
    !Array.isArray(value.limitations)
  )
    return { status: "rejected", violations: ["invalid_map_output_contract"] };

  const chunkId = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(value.chunkId);
  if (!chunkId)
    return { status: "rejected", violations: ["invalid_map_chunk_id"] };
  const chunkIndex = Number(chunkId[1]);
  const chunkCount = Number(chunkId[2]);
  if (
    !Number.isSafeInteger(chunkIndex) ||
    !Number.isSafeInteger(chunkCount) ||
    chunkCount !== input.chunkCount ||
    chunkIndex > chunkCount
  )
    return { status: "rejected", violations: ["invalid_map_chunk_id"] };

  let memberships: readonly ChunkMembershipV1[];
  try {
    memberships = deriveChunkMembership({
      reportRunId: input.reportRunId,
      snapshotDigest: input.snapshot.digestHex,
      evidenceKeyId: input.evidenceKeyId,
      evidenceKey: input.evidenceKey,
      chunkCount,
      comments: context.comments,
    });
  } catch {
    return { status: "rejected", violations: ["invalid_evidence_context"] };
  }
  const membership = memberships[chunkIndex - 1];
  if (
    !membership ||
    value.coveredRefs.length !== membership.coveredRefs.length ||
    !value.coveredRefs.every(
      (ref: unknown, index: number) => ref === membership.coveredRefs[index],
    )
  )
    violations.add("map_covered_refs_mismatch");

  const commentText = context.comments.map(({ text }) => text);
  const themeKeys = new Set<string>();
  const claimIds = new Set<string>();
  let previousThemeKey = "";
  const chunkRefs = new Set(membership?.coveredRefs ?? []);
  for (const theme of value.themes) {
    if (
      !exactKeys(theme, THEME_KEYS) ||
      typeof theme.themeKey !== "string" ||
      !ID_PATTERN.test(theme.themeKey) ||
      !Array.isArray(theme.claims)
    ) {
      violations.add("invalid_theme_shape");
      continue;
    }
    if (
      compareCodePoints(theme.themeKey, previousThemeKey) <= 0 ||
      themeKeys.has(theme.themeKey)
    )
      violations.add("duplicate_or_unsorted_theme_key");
    previousThemeKey = theme.themeKey;
    themeKeys.add(theme.themeKey);
    checkProse(theme.labelEs, 500, commentText, violations);
    validateClaimCollection(theme.claims, {
      commentText,
      allowedRefs: context.refs,
      refScope: chunkRefs,
      claimIds,
      violations,
    });
  }
  for (const limitation of value.limitations)
    checkProse(limitation, 4_000, commentText, violations);

  const rejected = sortedViolations(violations);
  if (rejected) return rejected;
  return {
    status: "incomplete",
    checked: [
      "closed_map_schema_and_version",
      "canonical_map_chunk_id_and_order",
      "derived_map_chunk_membership",
      "unique_sorted_theme_and_claim_ids",
      "map_claim_refs_within_derived_chunk",
      "prohibited_content_and_verbatim_comment_leakage",
    ],
    blockers: [
      "count_tokens_chunk_selection_authority",
      "immutable_per_run_evidence_key_provider",
      "map_semantic_and_metric_validation",
      "cms_recomputed_checkpoint_bindings_and_CAS",
    ],
  };
}

/** Rejects detectable ReduceV1 contract violations without asserting model-semantic validity. */
export function preflightReduceAnalysis(
  value: unknown,
  input: ReducePreflightInput,
): DirectOutputPreflight {
  const context = preflightContext(input);
  if ("status" in context) return context;
  const violations = new Set<string>();
  if (
    !exactKeys(value, REDUCE_KEYS) ||
    value.schemaVersion !== "survey-analysis.v1" ||
    value.route !== "reduce" ||
    !Array.isArray(value.sections) ||
    !Array.isArray(value.mapOutputDigests)
  )
    return {
      status: "rejected",
      violations: ["invalid_reduce_output_contract"],
    };

  if (
    value.mapOutputDigests.length === 0 ||
    value.mapOutputDigests.some(
      (digest: unknown) =>
        typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest),
    ) ||
    new Set(value.mapOutputDigests).size !== value.mapOutputDigests.length
  )
    violations.add("invalid_or_duplicate_map_output_digest");

  const commentText = context.comments.map(({ text }) => text);
  validateSections(value.sections, {
    commentText,
    allowedRefs: context.refs,
    violations,
  });

  const rejected = sortedViolations(violations);
  if (rejected) return rejected;
  return {
    status: "incomplete",
    checked: [
      "closed_reduce_schema_and_version",
      "ordered_sections_and_unique_sorted_claim_ids",
      "map_output_digest_syntax_and_uniqueness",
      "snapshot_evidence_ref_membership",
      "prohibited_content_and_verbatim_comment_leakage",
    ],
    blockers: [
      "independently_verified_cms_map_checkpoint_output_digests",
      "immutable_per_run_evidence_key_provider",
      "map_semantic_and_metric_validation",
      "reduce_semantic_and_metric_validation",
      "cms_recomputed_checkpoint_bindings_and_CAS",
    ],
  };
}

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

function numericValues(value: unknown, values = new Set<string>()): Set<string> {
  if (typeof value === "number" && Number.isFinite(value)) values.add(String(value));
  else if (Array.isArray(value)) value.forEach((item) => numericValues(item, values));
  else if (value && typeof value === "object")
    Object.values(value).forEach((item) => numericValues(item, values));
  return values;
}

function introducesMetricValue(text: string, officialValues: ReadonlySet<string>): boolean {
  return (text.match(/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?%?/gu) ?? []).some((value) =>
    !officialValues.has(value.replace(",", ".").replace(/%$/, "")),
  );
}

function containsRecognizablePrivateData(text: string): boolean {
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(text) ||
    /(?:https?:\/\/|www\.)[^\s]+/iu.test(text) ||
    /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/u.test(text);
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
  const officialValues = numericValues(snapshot.metrics);
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
      if (introducesMetricValue(claim.textEs, officialValues))
        violations.add("unsupported_official_metric_value");
      if (containsRecognizablePrivateData(claim.textEs))
        violations.add("personal_data_or_url");
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
    status: "accepted",
    checked: [
      "closed_direct_schema",
      "ordered_sections",
      "evidence_ref_membership_and_thresholds",
      "recurrent_and_minority_section_signal_consistency",
      "prohibited_claim_markers",
      "verbatim_comment_leakage",
      "unicode_scalar_text",
      "immutable_per_run_evidence_key_membership",
    ],
  };
}
