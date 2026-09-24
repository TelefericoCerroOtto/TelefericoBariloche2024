"use strict";

const { createHash, createHmac } = require("node:crypto");

const CHECKPOINT_CONTRACT_VERSIONS = Object.freeze({
  snapshot: "survey-snapshot.v1",
  checkpoint: "survey-checkpoint.v1",
  canonicalization: "tb-json.v1",
  evidenceRef: "survey-evidence-ref.v1",
  chunkMembership: "survey-chunk-membership.v1",
  stageConfig: "survey-stage-config.v1",
  stageInput: "survey-stage-input.v1",
});
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
];
const ASPECT_KEYS = ["aspectKey", "label", "sortOrder", "rating"];
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
];

function compareCodePoints(left, right) {
  const a = Array.from(left, (value) => value.codePointAt(0));
  const b = Array.from(right, (value) => value.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index += 1)
    if (a[index] !== b[index]) return a[index] - b[index];
  return a.length - b.length;
}

function validUtcInstant(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value))
    return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return false;
  const expected = value.includes(".")
    ? value.replace(
        /\.(\d{1,3})Z$/,
        (_, digits) => `.${digits.padEnd(3, "0")}Z`,
      )
    : value.replace(/Z$/, ".000Z");
  return new Date(parsed).toISOString() === expected;
}

function assertUnicodeScalarString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff))
        throw new TypeError("Invalid checkpoint binding");
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff)
      throw new TypeError("Invalid checkpoint binding");
  }
}

function canonicalizeJson(value) {
  if (value === null || typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    assertUnicodeScalarString(value);
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw new TypeError("Invalid checkpoint binding");
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  if (
    !value ||
    typeof value !== "object" ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  )
    throw new TypeError("Invalid checkpoint binding");
  return `{${Object.keys(value)
    .sort(compareCodePoints)
    .map((key) => {
      assertUnicodeScalarString(key);
      return `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`;
    })
    .join(",")}}`;
}

function exactKeys(value, keys) {
  return (
    Boolean(value && typeof value === "object" && !Array.isArray(value)) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function invalid() {
  throw new TypeError("Invalid checkpoint binding");
}
function assertDigest(value) {
  if (typeof value !== "string" || !DIGEST_PATTERN.test(value)) invalid();
}
function assertRunId(value) {
  if (
    typeof value !== "string" ||
    !RUN_ID_PATTERN.test(value) ||
    value !== value.toLowerCase()
  )
    invalid();
}
function assertEvidenceKey(value) {
  const byteLength =
    typeof value === "string"
      ? Buffer.byteLength(value, "utf8")
      : value instanceof Uint8Array
        ? value.byteLength
        : 0;
  if (byteLength < 32) invalid();
}
function base32(bytes) {
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

function deriveEvidenceRef({ reportRunId, recordId, evidenceKey }) {
  assertRunId(reportRunId);
  if (typeof recordId !== "string" || !RECORD_ID_PATTERN.test(recordId))
    invalid();
  assertEvidenceKey(evidenceKey);
  return `e_${base32(createHmac("sha256", evidenceKey).update(`${reportRunId}:${recordId}`, "utf8").digest()).slice(0, 20)}`;
}

function validateComment(value) {
  if (
    !exactKeys(value, COMMENT_KEYS) ||
    typeof value.recordId !== "string" ||
    !RECORD_ID_PATTERN.test(value.recordId) ||
    typeof value.receipt !== "string" ||
    value.receipt.length === 0 ||
    !["current", "previous"].includes(value.period) ||
    typeof value.acceptedAt !== "string" ||
    !validUtcInstant(value.acceptedAt) ||
    !["es", "en", "pt"].includes(value.locale) ||
    typeof value.versionKey !== "string" ||
    value.versionKey.length === 0 ||
    typeof value.pointKey !== "string" ||
    value.pointKey.length === 0 ||
    !Number.isSafeInteger(value.overallRating) ||
    value.overallRating < 1 ||
    value.overallRating > 5 ||
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
      !["positive", "neutral", "negative"].includes(aspect.rating)
    )
      invalid();
  }
  canonicalizeJson(value);
}

function sha256(value) {
  return createHash("sha256")
    .update(canonicalizeJson(value), "utf8")
    .digest("hex");
}
function validateContractVersions(value) {
  if (
    !exactKeys(value, CONTRACT_KEYS) ||
    CONTRACT_KEYS.some(
      (key) => value[key] !== CHECKPOINT_CONTRACT_VERSIONS[key],
    )
  )
    invalid();
}
function validateModelConfig(value, evidenceKeyId) {
  if (
    !exactKeys(value, MODEL_CONFIG_KEYS) ||
    value.version !== "survey-model-config.v1" ||
    value.evidenceKeyId !== evidenceKeyId ||
    value.provider !== "vertex-ai" ||
    value.vertexProjectId !== "teleferico-bariloche-2024" ||
    value.vertexLocation !== "us" ||
    value.vertexApiEndpoint !== "aiplatform.us.rep.googleapis.com" ||
    typeof value.model !== "string" ||
    !value.model ||
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
    value.verifiedInputTokenLimit < 1 ||
    !Number.isSafeInteger(value.safetyHeadroomTokens) ||
    value.safetyHeadroomTokens < 0 ||
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

function stageConfigDigest(projection) {
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

function stageInputDigestV1(input) {
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

function deriveChunkMembership(input) {
  assertRunId(input.reportRunId);
  assertDigest(input.snapshotDigest);
  assertEvidenceKey(input.evidenceKey);
  if (
    typeof input.evidenceKeyId !== "string" ||
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
      recordId: comment.recordId,
      acceptedEpoch: Date.parse(comment.acceptedAt),
      weightBytes: Buffer.byteLength(canonicalizeJson(comment), "utf8"),
      evidenceRef: deriveEvidenceRef({
        reportRunId: input.reportRunId,
        recordId: comment.recordId,
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
      compareCodePoints(left.comment.period, right.comment.period) ||
      left.acceptedEpoch - right.acceptedEpoch ||
      compareCodePoints(left.recordId, right.recordId),
  );
  const chunks = Array.from({ length: input.chunkCount }, () => ({
    weightBytes: 0,
    records: [],
  }));
  for (const record of records) {
    let selected = 0;
    for (let index = 1; index < chunks.length; index += 1)
      if (chunks[index].weightBytes < chunks[selected].weightBytes)
        selected = index;
    chunks[selected].records.push(record);
    chunks[selected].weightBytes += record.weightBytes;
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

function verifyChunkMembership(input, candidate) {
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
    const expected = deriveChunkMembership(input)[candidate.chunkIndex - 1];
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

module.exports = {
  CHECKPOINT_CONTRACT_VERSIONS,
  deriveChunkMembership,
  deriveEvidenceRef,
  stageConfigDigest,
  stageInputDigestV1,
  verifyChunkMembership,
};
