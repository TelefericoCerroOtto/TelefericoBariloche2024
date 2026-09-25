import { createHash, createHmac } from "node:crypto";

import { canonicalizeJson, type SnapshotV1 } from "../../../packages/survey-reporting-core/src";
import type { ModelConfigV1, PricingSnapshotV1, WorkerCheckpointStage } from "./contracts";
import { PUBLISHED_SECTION_KEYS } from "./contracts";

export const CHECKPOINT_CONTRACT_VERSIONS = {
  snapshot: "survey-snapshot.v1",
  checkpoint: "survey-checkpoint.v1",
  canonicalization: "tb-json.v1",
  evidenceRef: "survey-evidence-ref.v1",
  chunkMembership: "survey-chunk-membership.v1",
  stageConfig: "survey-stage-config.v1",
  stageInput: "survey-stage-input.v1",
} as const;

export type CheckpointContractVersions = typeof CHECKPOINT_CONTRACT_VERSIONS;
export type ChunkMembershipV1 = {
  readonly evidenceKeyId: string;
  readonly chunkIndex: number;
  readonly chunkCount: number;
  readonly coveredRefs: readonly string[];
  readonly membershipDigest: string;
};

export type WorkerStageCheckpointV1 = {
  readonly checkpointVersion: "survey-checkpoint.v1";
  readonly stageKey: WorkerCheckpointStage;
  readonly stageIndex: number;
  readonly route: "common" | "direct" | "map-reduce";
  readonly stageType: WorkerCheckpointStage;
  readonly status: "valid";
  readonly inputDigest: string;
  readonly outputDigest: string;
  readonly attempts: number;
  readonly completedAt: string;
  readonly payload:
    | { readonly kind: "redact"; readonly recordCount: number; readonly redactionVersion: string }
    | { readonly kind: "count"; readonly requestDigest: string; readonly segmentTokens: { readonly instructions: number; readonly schema: number; readonly metrics: number; readonly comments: number; readonly reservedOutput: number; readonly headroom: number }; readonly totalTokens: number }
    | { readonly kind: "count"; readonly route: "map-reduce"; readonly directRequestDigest: string; readonly directSegmentTokens: Record<string, number>; readonly directTotalTokens: number; readonly attempts: readonly unknown[]; readonly chunkCount: number }
    | { readonly kind: "direct"; readonly validatedOutput: unknown }
    | { readonly kind: "map"; readonly chunkId: string; readonly chunkIndex: number; readonly chunkCount: number; readonly evidenceKeyId: string; readonly coveredRefs: readonly string[]; readonly chunkMembershipDigest: string; readonly outputTokenCount: number; readonly outputRequestDigest: string; readonly validatedOutput: unknown }
    | { readonly kind: "reduce"; readonly outputTokenCount: number; readonly outputRequestDigest: string; readonly validatedOutput: unknown }
    | { readonly kind: "validate"; readonly publishedAnalysis: unknown; readonly validatorVersion: string }
    | {
        readonly kind: "render";
        readonly rendererVersion: string;
        readonly pdfSha256: string;
        readonly size: number;
      }
    | {
        readonly kind: "store";
        readonly objectKey: string;
        readonly artifactSha256: string;
        readonly size: number;
        readonly mimeType: "application/pdf";
      };
};

type MembershipInput = {
  readonly reportRunId: string;
  readonly snapshotDigest: string;
  readonly evidenceKeyId: string;
  readonly evidenceKey: string | Uint8Array;
  readonly chunkCount: number;
  readonly comments: readonly unknown[];
};

type StageInputV1 = {
  readonly stageKey: string;
  readonly stageIndex: number;
  readonly route: "common" | "direct" | "map-reduce";
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly contractVersions: CheckpointContractVersions;
  readonly stageConfigDigest: string;
  readonly orderedDependencyOutputDigests: readonly string[];
  readonly chunkMembershipDigest: string | null;
};

type StageConfigProjectionV1 = {
  readonly version: "survey-stage-config.v1";
  readonly stageKey: string;
  readonly modelConfig: Readonly<Record<string, unknown>>;
  readonly evidenceKeyId: string;
  readonly rendererVersion: string | null;
};

type DirectStageInputV1 = {
  readonly stageKey: "render" | "store";
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly modelConfig: unknown;
  readonly rendererVersion: string;
  readonly orderedDependencies: readonly {
    readonly stageKey: string;
    readonly outputDigest: string;
  }[];
};

const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RECORD_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const KEY_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const COMMENT_KEYS = [
  "recordId",
  "receipt",
  "period",
  "acceptedAt",
  "locale",
  "versionKey",
  "pointKey",
  "overallRating",
  "aspectRatings",
  "text",
] as const;
const ASPECT_KEYS = ["aspectKey", "label", "sortOrder", "rating"] as const;
const CONTRACT_KEYS = Object.keys(CHECKPOINT_CONTRACT_VERSIONS).sort();
const MODEL_CONFIG_KEYS = [
  "version",
  "evidenceKeyId",
  "provider",
  "vertexProjectId",
  "vertexLocation",
  "vertexApiEndpoint",
  "model",
  "temperature",
  "reasoning",
  "grounding",
  "promptVersion",
  "mapSchemaVersion",
  "analysisSchemaVersion",
  "redactionVersion",
  "validatorVersion",
  "chunkVersion",
  "verifiedInputTokenLimit",
  "map",
  "directReduce",
  "safetyHeadroomTokens",
  "sourceRevision",
] as const;
const PRICING_SNAPSHOT_KEYS = ["version", "currency", "units"] as const;
const PRICING_UNIT_KEYS = [
  "sku",
  "inputMicrosPerMillion",
  "outputMicrosPerMillion",
] as const;
const CHECKPOINT_KEYS = [
  "checkpointVersion",
  "stageKey",
  "stageIndex",
  "route",
  "stageType",
  "status",
  "inputDigest",
  "outputDigest",
  "attempts",
  "completedAt",
  "payload",
] as const;

function exactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function invalid(): never {
  throw new TypeError("Invalid checkpoint binding");
}

function compareCodePoints(left: string, right: string): number {
  const a = Array.from(left, (value) => value.codePointAt(0) ?? 0);
  const b = Array.from(right, (value) => value.codePointAt(0) ?? 0);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  }
  return a.length - b.length;
}

function validUtcInstant(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
    return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const expected = value.includes(".")
    ? value.replace(
        /\.(\d{1,3})Z$/,
        (_, digits: string) => `.${digits.padEnd(3, "0")}Z`,
      )
    : value.replace(/Z$/, ".000Z");
  return new Date(parsed).toISOString() === expected;
}

function assertDigest(value: string): void {
  if (!DIGEST_PATTERN.test(value)) invalid();
}

function validCheckpointInstant(value: unknown): value is string {
  if (typeof value !== "string" || !validUtcInstant(value)) return false;
  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateWorkerStageCheckpointV1(
  value: unknown,
  expected: {
    readonly reportRunId: string;
    readonly route: "direct" | "map-reduce";
    readonly chunkCount?: number;
    readonly snapshot?: SnapshotV1;
  },
): asserts value is WorkerStageCheckpointV1 {
  if (!exactKeys(value, CHECKPOINT_KEYS)) invalid();
  const stageKey = value.stageKey as WorkerCheckpointStage;
  const stageIndex = value.stageIndex as number;
  const mapMatch = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(String(stageKey));
  const ordinaryIndexes: Record<string, number> = expected.route === "direct"
    ? { redact: 0, count: 1, direct: 2, validate: 3, render: 4, store: 5 }
    : { redact: 0, count: 1, reduce: 0, validate: 0, render: 0, store: 0 };
  const expectedIndex = mapMatch
    ? Number(mapMatch[1]) + 1
    : expected.route === "map-reduce" && stageKey === "reduce"
      ? Number(expected.chunkCount) + 2
      : expected.route === "map-reduce" && ["validate", "render", "store"].includes(String(stageKey))
        ? Number(expected.chunkCount) + ({ validate: 3, render: 4, store: 5 } as Record<string, number>)[String(stageKey)]!
        : ordinaryIndexes[String(stageKey)];
  if (
    value.checkpointVersion !== CHECKPOINT_CONTRACT_VERSIONS.checkpoint ||
    (expectedIndex === undefined || !Number.isSafeInteger(expectedIndex)) ||
    (mapMatch ? value.stageType !== "map" : value.stageType !== value.stageKey) ||
    value.route !== (stageIndex <= 1 ? "common" : expected.route) ||
    stageIndex !== expectedIndex ||
    value.status !== "valid" ||
    typeof value.inputDigest !== "string" ||
    typeof value.outputDigest !== "string" ||
    !Number.isSafeInteger(value.attempts) ||
    Number(value.attempts) < 1 ||
    !validCheckpointInstant(value.completedAt) ||
    !isRecord(value.payload) ||
    (mapMatch ? value.payload.kind !== "map" : value.payload.kind !== value.stageKey)
  )
    invalid();

  const payload = value.payload as Record<string, unknown>;
  if (payload.kind === "redact") {
    const recordCount = payload.recordCount as number;
    if (!exactKeys(payload, ["kind", "recordCount", "redactionVersion"]) ||
        !Number.isSafeInteger(recordCount) || recordCount < 0 ||
        typeof payload.redactionVersion !== "string" || payload.redactionVersion.length === 0)
      invalid();
  } else if (payload.kind === "count") {
    const keys = ["instructions", "schema", "metrics", "comments", "reservedOutput", "headroom"];
    const validEvidence = (segmentTokens: unknown, totalTokens: unknown) => {
      if (!exactKeys(segmentTokens, keys)) return false;
      const values = segmentTokens as Record<string, number>;
      return keys.every((key) => Number.isSafeInteger(values[key]) && values[key] >= 0) &&
        Number.isSafeInteger(totalTokens) && totalTokens === keys.reduce((sum, key) => sum + values[key]!, 0);
    };
    if (payload.route === "map-reduce") {
      if (!exactKeys(payload, ["kind", "requestDigest", "segmentTokens", "totalTokens", "route", "directRequestDigest", "directSegmentTokens", "directTotalTokens", "attempts", "chunkCount"])) invalid();
      if (!DIGEST_PATTERN.test(String(payload.requestDigest)) || !validEvidence(payload.segmentTokens, payload.totalTokens) ||
          !DIGEST_PATTERN.test(String(payload.directRequestDigest)) || !validEvidence(payload.directSegmentTokens, payload.directTotalTokens)) invalid();
      if (!Number.isSafeInteger(payload.chunkCount) || Number(payload.chunkCount) < 1 ||
          expected.snapshot && Number(payload.chunkCount) > expected.snapshot.comments.length) invalid();
      if (!Array.isArray(payload.attempts) || payload.attempts.length !== payload.chunkCount) invalid();
      if (payload.attempts.some((attempt, attemptIndex) => !exactKeys(attempt, ["chunkCount", "chunks"]) || attempt.chunkCount !== attemptIndex + 1 ||
          !Array.isArray(attempt.chunks) || attempt.chunks.length !== attempt.chunkCount ||
          attempt.chunks.some((chunk: unknown) => !exactKeys(chunk, ["requestDigest", "segmentTokens", "totalTokens"]) ||
            !DIGEST_PATTERN.test(String(chunk.requestDigest)) || !validEvidence(chunk.segmentTokens, chunk.totalTokens)))) invalid();
    } else {
      const segmentTokens = payload.segmentTokens as Record<string, number>;
      const totalTokens = payload.totalTokens as number;
      if (!exactKeys(payload, ["kind", "requestDigest", "segmentTokens", "totalTokens"]) ||
          typeof payload.requestDigest !== "string" || !DIGEST_PATTERN.test(payload.requestDigest) ||
          !validEvidence(payload.segmentTokens, payload.totalTokens)) invalid();
    }
  } else if (payload.kind === "map") {
    if (!mapMatch || !exactKeys(payload, ["kind", "chunkId", "chunkIndex", "chunkCount", "evidenceKeyId", "coveredRefs", "chunkMembershipDigest", "outputTokenCount", "outputRequestDigest", "validatedOutput"]) ||
        payload.chunkId !== value.stageKey || Number(payload.chunkIndex) !== Number(mapMatch[1]) || Number(payload.chunkCount) !== Number(mapMatch[2]) ||
        typeof payload.evidenceKeyId !== "string" || !KEY_ID_PATTERN.test(payload.evidenceKeyId) || !Array.isArray(payload.coveredRefs) ||
        !DIGEST_PATTERN.test(String(payload.chunkMembershipDigest)) || !Number.isSafeInteger(payload.outputTokenCount) ||
         Number(payload.outputTokenCount) < 0 || !DIGEST_PATTERN.test(String(payload.outputRequestDigest))) invalid();
  } else if (payload.kind === "reduce") {
    const output = payload.validatedOutput;
    if (!exactKeys(payload, ["kind", "validatedOutput", "outputTokenCount", "outputRequestDigest"]) ||
        !Number.isSafeInteger(payload.outputTokenCount) || Number(payload.outputTokenCount) < 0 || !DIGEST_PATTERN.test(String(payload.outputRequestDigest)) ||
        !exactKeys(output, ["schemaVersion", "route", "sections", "mapOutputDigests"]) ||
        output.schemaVersion !== "survey-analysis.v1" || output.route !== "reduce" || !Array.isArray(output.sections) ||
        output.sections.length !== PUBLISHED_SECTION_KEYS.length || !Array.isArray(output.mapOutputDigests)) invalid();
  } else if (payload.kind === "direct") {
    const output = payload.validatedOutput;
    if (!exactKeys(payload, ["kind", "validatedOutput"]) ||
        !exactKeys(output, ["schemaVersion", "route", "sections"]) ||
        output.schemaVersion !== "survey-analysis.v1" || output.route !== "direct" ||
        !Array.isArray(output.sections) || output.sections.length !== PUBLISHED_SECTION_KEYS.length ||
        !output.sections.every((section, index) =>
          exactKeys(section, ["key", "status", "claims"]) &&
          section.key === PUBLISHED_SECTION_KEYS[index] &&
          (section.status === "supported" || section.status === "insufficient_evidence") &&
          Array.isArray(section.claims) &&
          (section.status !== "insufficient_evidence" || section.claims.length === 0) &&
          (section.status !== "supported" || section.claims.length > 0)))
      invalid();
  } else if (payload.kind === "validate") {
    const output = payload.publishedAnalysis;
    if (!exactKeys(payload, ["kind", "publishedAnalysis", "validatorVersion"]) ||
        typeof payload.validatorVersion !== "string" || payload.validatorVersion.length === 0 ||
        !exactKeys(output, ["schemaVersion", "sections"]) ||
        output.schemaVersion !== "survey-published-analysis.v1" ||
        !Array.isArray(output.sections) || output.sections.length !== PUBLISHED_SECTION_KEYS.length ||
        !output.sections.every((section, index) =>
          exactKeys(section, ["key", "status", "paragraphsEs"]) &&
          section.key === PUBLISHED_SECTION_KEYS[index] &&
          (section.status === "supported" || section.status === "insufficient_evidence") &&
          Array.isArray(section.paragraphsEs) && section.paragraphsEs.length > 0 &&
          section.paragraphsEs.every((paragraph) => typeof paragraph === "string" && paragraph.length > 0)))
      invalid();
  } else if (payload.kind === "render") {
    const size = payload.size as number;
    if (!exactKeys(payload, ["kind", "rendererVersion", "pdfSha256", "size"]) ||
        !Number.isSafeInteger(size) || size < 1)
      invalid();
    if (
      typeof payload.rendererVersion !== "string" ||
      payload.rendererVersion.length === 0 ||
      typeof payload.pdfSha256 !== "string"
    )
      invalid();
    assertDigest(payload.pdfSha256);
  } else if (payload.kind === "store") {
    const size = payload.size as number;
    if (!exactKeys(payload, ["kind", "objectKey", "artifactSha256", "size", "mimeType"]) ||
        !Number.isSafeInteger(size) || size < 1)
      invalid();
    if (
      typeof payload.objectKey !== "string" ||
      !(payload.objectKey ===
        `private/feedback-reports/staged/${expected.reportRunId}/report.pdf` ||
        /^private\/feedback-reports\/[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/report\.pdf$/.test(payload.objectKey)) ||
      typeof payload.artifactSha256 !== "string" ||
      payload.mimeType !== "application/pdf"
    )
      invalid();
    assertDigest(payload.artifactSha256);
  }
  assertDigest(value.inputDigest);
  assertDigest(value.outputDigest);
  if (value.outputDigest !== sha256(payload)) invalid();
}

function assertRunId(value: string): void {
  if (!RUN_ID_PATTERN.test(value) || value !== value.toLowerCase()) invalid();
}

function assertEvidenceKey(value: string | Uint8Array): void {
  const byteLength =
    typeof value === "string"
      ? Buffer.byteLength(value, "utf8")
      : value instanceof Uint8Array
        ? value.byteLength
        : 0;
  if (byteLength < 32) invalid();
}

function base32(bytes: Uint8Array): string {
  let bits = 0;
  let accumulator = 0;
  let result = "";
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += BASE32[(accumulator >>> bits) & 31];
    }
  }
  if (bits > 0) result += BASE32[(accumulator << (5 - bits)) & 31];
  return result;
}

export function deriveEvidenceRef(input: {
  readonly reportRunId: string;
  readonly recordId: string;
  readonly evidenceKey: string | Uint8Array;
}): string {
  assertRunId(input.reportRunId);
  if (!RECORD_ID_PATTERN.test(input.recordId)) invalid();
  assertEvidenceKey(input.evidenceKey);
  return `e_${base32(createHmac("sha256", input.evidenceKey).update(`${input.reportRunId}:${input.recordId}`, "utf8").digest()).slice(0, 20)}`;
}

function validateComment(
  value: unknown,
): asserts value is Record<string, unknown> {
  if (!exactKeys(value, COMMENT_KEYS)) invalid();
  if (
    typeof value.recordId !== "string" ||
    !RECORD_ID_PATTERN.test(value.recordId) ||
    typeof value.receipt !== "string" ||
    value.receipt.length === 0 ||
    !["current", "previous"].includes(String(value.period)) ||
    typeof value.acceptedAt !== "string" ||
    !validUtcInstant(value.acceptedAt) ||
    !["es", "en", "pt"].includes(String(value.locale)) ||
    typeof value.versionKey !== "string" ||
    value.versionKey.length === 0 ||
    typeof value.pointKey !== "string" ||
    value.pointKey.length === 0 ||
    !Number.isSafeInteger(value.overallRating) ||
    Number(value.overallRating) < 1 ||
    Number(value.overallRating) > 5 ||
    typeof value.text !== "string" ||
    !Array.isArray(value.aspectRatings)
  )
    invalid();
  for (const aspect of value.aspectRatings) {
    if (
      !exactKeys(aspect, ASPECT_KEYS) ||
      typeof aspect.aspectKey !== "string" ||
      aspect.aspectKey.length === 0 ||
      typeof aspect.label !== "string" ||
      !Number.isSafeInteger(aspect.sortOrder) ||
      !["positive", "neutral", "negative"].includes(String(aspect.rating))
    )
      invalid();
  }
  canonicalizeJson(value);
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(canonicalizeJson(value), "utf8")
    .digest("hex");
}

function validateModelConfig(
  value: unknown,
  evidenceKeyId: string,
): asserts value is Record<string, unknown> {
  if (
    !exactKeys(value, MODEL_CONFIG_KEYS) ||
    value.version !== "survey-model-config.v1" ||
    value.evidenceKeyId !== evidenceKeyId ||
    value.provider !== "vertex-ai" ||
    value.vertexProjectId !== "teleferico-bariloche-2024" ||
    value.vertexLocation !== "us" ||
    value.vertexApiEndpoint !== "aiplatform.us.rep.googleapis.com" ||
    value.model !== "gemini-3.8-flash" ||
    value.temperature !== 0 ||
    value.reasoning !== "LOW" ||
    value.grounding !== false ||
    typeof value.promptVersion !== "string" ||
    !value.promptVersion ||
    value.mapSchemaVersion !== "survey-map.v1" ||
    value.analysisSchemaVersion !== "survey-analysis.v1" ||
    typeof value.redactionVersion !== "string" ||
    !value.redactionVersion ||
    typeof value.validatorVersion !== "string" ||
    !value.validatorVersion ||
    typeof value.chunkVersion !== "string" ||
    !value.chunkVersion ||
    !Number.isSafeInteger(value.verifiedInputTokenLimit) ||
    Number(value.verifiedInputTokenLimit) < 1 ||
    !Number.isSafeInteger(value.safetyHeadroomTokens) ||
    Number(value.safetyHeadroomTokens) !==
      Math.max(2048, Math.ceil(Number(value.verifiedInputTokenLimit) * 0.1)) ||
    typeof value.sourceRevision !== "string" ||
    !value.sourceRevision ||
    !exactKeys(value.map, ["targetMin", "targetMax", "hardMax"]) ||
    value.map.targetMin !== 600 ||
    value.map.targetMax !== 1200 ||
    value.map.hardMax !== 4000 ||
    !exactKeys(value.directReduce, ["targetMin", "targetMax", "hardMax"]) ||
    value.directReduce.targetMin !== 1800 ||
    value.directReduce.targetMax !== 3000 ||
    value.directReduce.hardMax !== 8000
  )
    invalid();
}

export function validateGenerationInputContractsV1(input: {
  readonly modelConfig: unknown;
  readonly pricingSnapshot: unknown;
  readonly evidenceKeyId: string;
  readonly sourceRevision: string;
}): void {
  if (
    !KEY_ID_PATTERN.test(input.evidenceKeyId) ||
    !input.sourceRevision ||
    !input.modelConfig ||
    typeof input.modelConfig !== "object" ||
    Array.isArray(input.modelConfig) ||
    (input.modelConfig as Record<string, unknown>).sourceRevision !==
      input.sourceRevision
  )
    invalid();

  validateModelConfig(input.modelConfig, input.evidenceKeyId);
  validatePricingSnapshotV1(input.pricingSnapshot);
  if (
    !Array.isArray((input.pricingSnapshot as PricingSnapshotV1).units) ||
    (input.pricingSnapshot as PricingSnapshotV1).units.length === 0
  )
    invalid();
}

function validatePricingSnapshotV1(
  value: unknown,
): asserts value is PricingSnapshotV1 {
  if (
    !exactKeys(value, PRICING_SNAPSHOT_KEYS) ||
    typeof value.version !== "string" ||
    value.version.length === 0 ||
    value.currency !== "USD" ||
    !Array.isArray(value.units)
  )
    invalid();

  const seenSkus = new Set<string>();
  for (const unit of value.units) {
    if (
      !exactKeys(unit, PRICING_UNIT_KEYS) ||
      typeof unit.sku !== "string" ||
      unit.sku.length === 0 ||
      seenSkus.has(unit.sku)
    )
      invalid();
    seenSkus.add(unit.sku);
    for (const price of [
      unit.inputMicrosPerMillion,
      unit.outputMicrosPerMillion,
    ]) {
      if (
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        !Number.isSafeInteger(price) ||
        price < 0
      )
        invalid();
    }
  }
  canonicalizeJson(value);
}

function modelConfigEvidenceKeyId(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  const evidenceKeyId = (value as Record<string, unknown>).evidenceKeyId;
  if (typeof evidenceKeyId !== "string") invalid();
  return evidenceKeyId;
}

export function stageConfigDigest(projection: StageConfigProjectionV1): string {
  if (
    !exactKeys(projection, [
      "version",
      "stageKey",
      "modelConfig",
      "evidenceKeyId",
      "rendererVersion",
    ]) ||
    projection.version !== CHECKPOINT_CONTRACT_VERSIONS.stageConfig ||
    typeof projection.stageKey !== "string" ||
    !projection.stageKey ||
    !projection.modelConfig ||
    typeof projection.modelConfig !== "object" ||
    Array.isArray(projection.modelConfig) ||
    typeof projection.evidenceKeyId !== "string" ||
    !KEY_ID_PATTERN.test(projection.evidenceKeyId) ||
    (projection.rendererVersion !== null &&
      (typeof projection.rendererVersion !== "string" ||
        !projection.rendererVersion)) ||
    (projection.stageKey === "render" || projection.stageKey === "store") !==
      (projection.rendererVersion !== null)
  )
    invalid();
  validateModelConfig(projection.modelConfig, projection.evidenceKeyId);
  return sha256(projection);
}

export function validateDirectStageConfigV1(input: {
  readonly modelConfig: unknown;
  readonly pricingSnapshot: unknown;
  readonly rendererVersion: string;
}): void {
  validatePricingSnapshotV1(input.pricingSnapshot);
  stageConfigDigest({
    version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
    stageKey: "render",
    modelConfig: input.modelConfig as Readonly<Record<string, unknown>>,
    evidenceKeyId: modelConfigEvidenceKeyId(input.modelConfig),
    rendererVersion: input.rendererVersion,
  });
}

function validateContractVersions(
  value: unknown,
): asserts value is CheckpointContractVersions {
  if (
    !exactKeys(value, CONTRACT_KEYS) ||
    CONTRACT_KEYS.some(
      (key) =>
        value[key] !==
        CHECKPOINT_CONTRACT_VERSIONS[
          key as keyof typeof CHECKPOINT_CONTRACT_VERSIONS
        ],
    )
  )
    invalid();
}

export function stageInputDigestV1(input: StageInputV1): string {
  if (
    !exactKeys(input, [
      "stageKey",
      "stageIndex",
      "route",
      "snapshotDigest",
      "sourceRevision",
      "contractVersions",
      "stageConfigDigest",
      "orderedDependencyOutputDigests",
      "chunkMembershipDigest",
    ]) ||
    typeof input.stageKey !== "string" ||
    !input.stageKey ||
    !Number.isSafeInteger(input.stageIndex) ||
    input.stageIndex < 0 ||
    !["common", "direct", "map-reduce"].includes(input.route) ||
    typeof input.sourceRevision !== "string" ||
    !input.sourceRevision ||
    !Array.isArray(input.orderedDependencyOutputDigests) ||
    (input.chunkMembershipDigest !== null &&
      typeof input.chunkMembershipDigest !== "string")
  )
    invalid();
  const mapKey = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(input.stageKey);
  if (
    mapKey &&
    (input.route !== "map-reduce" ||
      input.stageIndex !== Number(mapKey[1]) + 1 ||
      Number(mapKey[1]) > Number(mapKey[2]) ||
      input.chunkMembershipDigest === null)
  )
    invalid();
  if (!mapKey && input.chunkMembershipDigest !== null) invalid();
  assertDigest(input.snapshotDigest);
  assertDigest(input.stageConfigDigest);
  validateContractVersions(input.contractVersions);
  input.orderedDependencyOutputDigests.forEach(assertDigest);
  if (input.chunkMembershipDigest !== null)
    assertDigest(input.chunkMembershipDigest);
  return sha256(input);
}

export function deriveWorkerStageInputDigestV1(input: {
  readonly stageKey: Exclude<WorkerCheckpointStage, "render" | "store">;
  readonly stageIndex: number;
  readonly route: "common" | "direct";
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly modelConfig: ModelConfigV1;
  readonly orderedDependencyOutputDigests: readonly string[];
}): string {
  const projection: StageConfigProjectionV1 = {
    version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
    stageKey: input.stageKey,
    modelConfig: input.modelConfig,
    evidenceKeyId: input.modelConfig.evidenceKeyId,
    rendererVersion: null,
  };
  return stageInputDigestV1({
    stageKey: input.stageKey,
    stageIndex: input.stageIndex,
    route: input.route,
    snapshotDigest: input.snapshotDigest,
    sourceRevision: input.sourceRevision,
    contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: stageConfigDigest(projection),
    orderedDependencyOutputDigests: input.orderedDependencyOutputDigests,
    chunkMembershipDigest: null,
  });
}

export function deriveStageInputDigestV1(input: DirectStageInputV1): string {
  if (input.stageKey !== "render" && input.stageKey !== "store") invalid();
  const expectedDependency =
    input.stageKey === "render" ? "validate" : "render";
  const expectedIndex = input.stageKey === "render" ? 4 : 5;
  if (
    !Array.isArray(input.orderedDependencies) ||
    input.orderedDependencies.length !== 1 ||
    input.orderedDependencies[0]?.stageKey !== expectedDependency
  )
    invalid();

  const configDigest = stageConfigDigest({
    version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
    stageKey: input.stageKey,
    modelConfig: input.modelConfig as Readonly<Record<string, unknown>>,
    evidenceKeyId: modelConfigEvidenceKeyId(input.modelConfig),
    rendererVersion: input.rendererVersion,
  });
  return stageInputDigestV1({
    stageKey: input.stageKey,
    stageIndex: expectedIndex,
    route: "direct",
    snapshotDigest: input.snapshotDigest,
    sourceRevision: input.sourceRevision,
    contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
    stageConfigDigest: configDigest,
    orderedDependencyOutputDigests: [input.orderedDependencies[0].outputDigest],
    chunkMembershipDigest: null,
  });
}

export function deriveChunkMembership(
  input: MembershipInput,
): readonly ChunkMembershipV1[] {
  assertRunId(input.reportRunId);
  assertDigest(input.snapshotDigest);
  assertEvidenceKey(input.evidenceKey);
  if (
    !KEY_ID_PATTERN.test(input.evidenceKeyId) ||
    !Number.isSafeInteger(input.chunkCount) ||
    input.chunkCount < 1 ||
    !Array.isArray(input.comments) ||
    input.chunkCount > input.comments.length
  )
    invalid();
  const records = input.comments.map((comment) => {
    validateComment(comment);
    return {
      comment,
      recordId: String(comment.recordId),
      acceptedEpoch: Date.parse(String(comment.acceptedAt)),
      weightBytes: Buffer.byteLength(canonicalizeJson(comment), "utf8"),
      evidenceRef: deriveEvidenceRef({
        reportRunId: input.reportRunId,
        recordId: String(comment.recordId),
        evidenceKey: input.evidenceKey,
      }),
    };
  });
  if (
    new Set(records.map(({ recordId }) => recordId)).size !== records.length ||
    new Set(records.map(({ evidenceRef }) => evidenceRef)).size !==
      records.length
  )
    invalid();
  records.sort(
    (left, right) =>
      compareCodePoints(
        String(left.comment.period),
        String(right.comment.period),
      ) ||
      left.acceptedEpoch - right.acceptedEpoch ||
      compareCodePoints(left.recordId, right.recordId),
  );
  const chunks = Array.from({ length: input.chunkCount }, () => ({
    weightBytes: 0,
    records: [] as typeof records,
  }));
  for (const record of records) {
    let selected = 0;
    for (let index = 1; index < chunks.length; index += 1)
      if (chunks[index]!.weightBytes < chunks[selected]!.weightBytes)
        selected = index;
    chunks[selected]!.records.push(record);
    chunks[selected]!.weightBytes += record.weightBytes;
  }
  return chunks.map((chunk, index) => ({
    evidenceKeyId: input.evidenceKeyId,
    chunkIndex: index + 1,
    chunkCount: input.chunkCount,
    coveredRefs: chunk.records.map(({ evidenceRef }) => evidenceRef),
    membershipDigest: sha256({
      version: CHECKPOINT_CONTRACT_VERSIONS.chunkMembership,
      evidenceKeyId: input.evidenceKeyId,
      reportRunId: input.reportRunId,
      snapshotDigest: input.snapshotDigest,
      chunkIndex: index + 1,
      chunkCount: input.chunkCount,
      records: chunk.records.map(({ recordId, evidenceRef, weightBytes }) => ({
        recordId,
        evidenceRef,
        weightBytes,
      })),
    }),
  }));
}

export function verifyChunkMembership(
  input: MembershipInput,
  candidate: unknown,
): boolean {
  try {
    if (
      !exactKeys(candidate, [
        "evidenceKeyId",
        "chunkIndex",
        "chunkCount",
        "coveredRefs",
        "membershipDigest",
      ])
    )
      return false;
    const expected =
      deriveChunkMembership(input)[Number(candidate.chunkIndex) - 1];
    return Boolean(
      expected &&
      candidate.evidenceKeyId === expected.evidenceKeyId &&
      candidate.chunkIndex === expected.chunkIndex &&
      candidate.chunkCount === expected.chunkCount &&
      candidate.membershipDigest === expected.membershipDigest &&
      Array.isArray(candidate.coveredRefs) &&
      candidate.coveredRefs.length === expected.coveredRefs.length &&
      candidate.coveredRefs.every(
        (reference, index) => reference === expected.coveredRefs[index],
      ),
    );
  } catch {
    return false;
  }
}
