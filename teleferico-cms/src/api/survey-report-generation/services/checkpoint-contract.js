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
const CHECKPOINT_KEYS = [
  "checkpointVersion", "stageKey", "stageIndex", "route", "stageType", "status",
  "inputDigest", "outputDigest", "attempts", "completedAt", "payload",
];
const EMPTY_EVIDENCE_PARAGRAPH =
  'No hay comentarios elegibles para respaldar esta sección en el período analizado.';
const ANALYSIS_SECTION_KEYS = [
  'executive_summary', 'observed_changes', 'strengths', 'unfavorable_areas',
  'recurrent_themes', 'minority_signals', 'coverage_limitations',
];
const DIRECT_COUNT_INSTRUCTIONS =
  'Return structured Spanish descriptions only. Use the exact seven-section order and closed schema. Cite eligible evidence refs on every claim. Do not include recommendations, actions, causality, official metric values, private identifiers, evidence refs in prose, or verbatim comment text. Leave unsupported sections empty. Semantic truth is not machine-verified.';
const DIRECT_COUNT_SCHEMA = canonicalizeJson({
  schemaVersion: 'survey-analysis.v1',
  route: 'direct',
  sections: ANALYSIS_SECTION_KEYS.map((key) => ({
    key,
    status: { enum: ['supported', 'insufficient_evidence'] },
    claims: [{
      claimId: 'lowercase-stable-id',
      textEs: 'Spanish descriptive text',
      evidenceRefs: ['e_<20-lowercase-base32-characters>'],
      signal: { enum: ['recurrent', 'minority', 'descriptive'] },
    }],
  })),
});
const MAP_INSTRUCTIONS =
  'Extract descriptive evidence and themes only from this complete comment chunk. Return the exact closed survey-map.v1 schema, cite only supplied opaque evidence refs, and do not calculate official metrics, recommend actions, claim causality, or reproduce comments. Semantic truth is not machine-verified.';
const MAP_SCHEMA = canonicalizeJson({
  schemaVersion: 'survey-map.v1', chunkId: 'map.<index>-of-<count>',
  coveredRefs: ['e_<20-lowercase-base32-characters>'],
  themes: [{ themeKey: 'lowercase-stable-id', labelEs: 'Spanish descriptive label', claims: [{
    claimId: 'lowercase-stable-id', textEs: 'Spanish descriptive text',
    evidenceRefs: ['e_<20-lowercase-base32-characters>'], signal: { enum: ['recurrent', 'minority', 'descriptive'] },
  }] }], limitations: ['Spanish descriptive limitation'],
});
const REDUCE_INSTRUCTIONS =
  'Combine only the validated map outputs and immutable official metrics supplied. Return the exact seven-section survey-analysis.v1 reduce schema. Do not calculate or alter metrics, invent evidence refs, recommend actions, claim causality, or reproduce comments. Semantic truth is not machine-verified.';
const REDUCE_SCHEMA = canonicalizeJson({
  schemaVersion: 'survey-analysis.v1', route: 'reduce',
  sections: [{ key: { enum: ANALYSIS_SECTION_KEYS }, status: { enum: ['supported', 'insufficient_evidence'] }, claims: [{
    claimId: 'lowercase-stable-id', textEs: 'Spanish descriptive text', evidenceRefs: ['e_<20-lowercase-base32-characters>'],
    signal: { enum: ['recurrent', 'minority', 'descriptive'] },
  }] }], mapOutputDigests: ['sha256'],
});

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
    value.safetyHeadroomTokens !== Math.max(2048, Math.ceil(value.verifiedInputTokenLimit * 0.1)) ||
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

function validateWorkerClaimContracts({
  snapshotDigest,
  sourceRevision,
  checkpoints,
  modelConfig,
  pricingSnapshot,
}) {
  assertDigest(snapshotDigest);
  if (
    typeof sourceRevision !== "string" ||
    sourceRevision.length === 0 ||
    sourceRevision.length > 128 ||
    !exactKeys(checkpoints, [
      "version",
      "snapshotDigest",
      "route",
      "chunkCount",
      "entries",
    ]) ||
    checkpoints.version !== "survey-checkpoints.v1" ||
    checkpoints.snapshotDigest !== snapshotDigest ||
    !["direct", "undecided", "map-reduce"].includes(checkpoints.route) ||
    (checkpoints.route === "map-reduce"
      ? (!Number.isSafeInteger(checkpoints.chunkCount) || checkpoints.chunkCount < 1)
      : checkpoints.chunkCount !== null) ||
    !Array.isArray(checkpoints.entries) ||
    (checkpoints.route === "undecided" && (checkpoints.entries.length > 1 || checkpoints.entries.some(({ stageKey }) => stageKey !== "redact"))) ||
    !modelConfig ||
    typeof modelConfig !== "object" ||
    Array.isArray(modelConfig)
  )
    invalid();

  const evidenceKeyId = modelConfig.evidenceKeyId;
  if (
    typeof evidenceKeyId !== "string" ||
    !KEY_ID_PATTERN.test(evidenceKeyId) ||
    modelConfig.model !== "gemini-3.8-flash" ||
    modelConfig.sourceRevision !== sourceRevision
  )
    invalid();
  validateModelConfig(modelConfig, evidenceKeyId);

  if (
    !exactKeys(pricingSnapshot, ["version", "currency", "units"]) ||
    typeof pricingSnapshot.version !== "string" ||
    pricingSnapshot.version.length === 0 ||
    pricingSnapshot.currency !== "USD" ||
    !Array.isArray(pricingSnapshot.units) ||
    pricingSnapshot.units.length === 0
  )
    invalid();

  const seenSkus = new Set();
  for (const unit of pricingSnapshot.units) {
    if (
      !exactKeys(unit, [
        "sku",
        "inputMicrosPerMillion",
        "outputMicrosPerMillion",
      ]) ||
      typeof unit.sku !== "string" ||
      unit.sku.length === 0 ||
      seenSkus.has(unit.sku) ||
      !Number.isSafeInteger(unit.inputMicrosPerMillion) ||
      unit.inputMicrosPerMillion < 0 ||
      !Number.isSafeInteger(unit.outputMicrosPerMillion) ||
      unit.outputMicrosPerMillion < 0
    )
      invalid();
    seenSkus.add(unit.sku);
  }

  const route = checkpoints.route;
  const chunkCount = route === 'map-reduce' ? checkpoints.chunkCount : 0;
  const expected = expectedStageKeys(route, chunkCount);
  if (!expected || checkpoints.entries.length > expected.length) invalid();
  for (let index = 0; index < checkpoints.entries.length; index += 1) {
    const entry = checkpoints.entries[index];
    const stage = checkpointStage(entry?.stageKey);
    const stageNumber = stage && stageIndex(stage, route, chunkCount);
    const selectedRoute = stage?.key === 'redact' || stage?.key === 'count' ? 'common' : route;
    if (!exactKeys(entry, CHECKPOINT_KEYS) || !stage || entry.stageKey !== expected[index] ||
        entry.stageIndex !== stageNumber || entry.route !== selectedRoute || entry.stageType !== stage.type ||
        entry.checkpointVersion !== 'survey-checkpoint.v1' || entry.status !== 'valid' ||
        !Number.isSafeInteger(entry.attempts) || entry.attempts < 1 || !validUtcInstant(entry.completedAt) ||
        !DIGEST_PATTERN.test(entry.inputDigest) || !DIGEST_PATTERN.test(entry.outputDigest)) invalid();
  }

  canonicalizeJson(checkpoints);
  canonicalizeJson(modelConfig);
  canonicalizeJson(pricingSnapshot);
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

function checkpointError(code) {
  throw Object.assign(new TypeError("Invalid checkpoint binding"), { code });
}

function checkpointStage(stageKey) {
  if (typeof stageKey !== "string") return null;
  if (["redact", "count", "direct", "validate", "render", "store"].includes(stageKey))
    return { key: stageKey, type: stageKey };
  if (/^map\.[1-9]\d*-of-[1-9]\d*$/.test(stageKey))
    return { key: stageKey, type: "map" };
  if (stageKey === "reduce") return { key: stageKey, type: "reduce" };
  return null;
}

function stageIndex(stage, route, chunkCount) {
  if (stage.key === "redact") return 0;
  if (stage.key === "count") return 1;
  if (stage.key === "direct" && route === "direct") return 2;
  if (stage.type === "map" && route === "map-reduce") return Number(/^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(stage.key)?.[1]) + 1;
  if (stage.key === "reduce" && route === "map-reduce") return chunkCount + 2;
  if (stage.key === "validate") return route === "direct" ? 3 : chunkCount + 3;
  if (stage.key === "render") return route === "direct" ? 4 : chunkCount + 4;
  if (stage.key === "store") return route === "direct" ? 5 : chunkCount + 5;
  return null;
}

function expectedStageKeys(route, chunkCount) {
  if (route === "undecided") return ["redact", "count"];
  if (route === "direct") return ["redact", "count", "direct", "validate", "render", "store"];
  if (route === "map-reduce") return [
    "redact", "count",
    ...Array.from({ length: chunkCount }, (_, index) => `map.${index + 1}-of-${chunkCount}`),
    "reduce", "validate", "render", "store",
  ];
  return null;
}

function directModelCommentsJson(snapshot, reportRunId, evidenceKey) {
  if (snapshot.comments.length === 0) return canonicalizeJson([]);
  if (snapshot.comments.length > 0) assertEvidenceKey(evidenceKey);
  return canonicalizeJson({
    contractVersion: 'survey-model-input.v1',
    comments: snapshot.comments.map((comment) => ({
      period: comment.period,
      text: comment.text
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[EMAIL]')
      .replace(/https?:\/\/[^\s]+|www\.[^\s]+/giu, '[URL]')
      .replace(/(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/gu, '[PHONE]'),
      evidenceRef: deriveEvidenceRef({ reportRunId, recordId: comment.recordId, evidenceKey: evidenceKey || 'empty-snapshot-unused-key' }),
    })),
  });
}

function narrativeHasPrivateText(text, comments) {
  if (/e_[a-z2-7]{20}/u.test(text) || /(?:https?:\/\/|www\.)/iu.test(text) ||
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.test(text) ||
      /(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/u.test(text)) return true;
  const tokenize = (value) => value.toLocaleLowerCase('es').match(/[\p{L}\p{N}]+/gu) || [];
  const output = tokenize(text);
  return comments.some(({ text: comment }) => {
    const source = tokenize(comment);
    const width = Math.min(8, source.length);
    for (let start = 0; start <= source.length - width; start += 1) {
      const phrase = source.slice(start, start + width);
      if (source.length < 8 && phrase.length !== source.length) continue;
      if (output.some((_, index) => phrase.every((token, offset) => output[index + offset] === token))) return true;
    }
    return false;
  });
}

function snapshotMetricValues(value, values = new Set()) {
  if (typeof value === 'number' && Number.isFinite(value)) values.add(String(value));
  else if (Array.isArray(value)) value.forEach((item) => snapshotMetricValues(item, values));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => snapshotMetricValues(item, values));
  return values;
}

function introducesMetricValue(text, officialValues) {
  return (text.match(/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?%?/gu) || [])
    .some((value) => !officialValues.has(value.replace(',', '.').replace(/%$/, '')));
}

function safeDirectOutput(output, modelConfig, snapshot, reportRunId, evidenceKey) {
  if (!exactKeys(output, ['schemaVersion', 'route', 'sections']) || output.schemaVersion !== 'survey-analysis.v1' ||
      output.route !== 'direct' || !Array.isArray(output.sections) || output.sections.length !== ANALYSIS_SECTION_KEYS.length) return false;
  if (snapshot.comments.length && (!evidenceKey || (() => { try { assertEvidenceKey(evidenceKey); return false; } catch { return true; } })())) return false;
  const references = new Set(snapshot.comments.map(({ recordId }) => deriveEvidenceRef({
    reportRunId, recordId, evidenceKey: evidenceKey || 'synthetic-empty-evidence-key-material',
  })));
  const claimIds = new Set();
  const officialValues = snapshotMetricValues(snapshot.metrics);
  for (let index = 0; index < output.sections.length; index += 1) {
    const section = output.sections[index];
    if (!exactKeys(section, ['key', 'status', 'claims']) || section.key !== ANALYSIS_SECTION_KEYS[index] ||
        !['supported', 'insufficient_evidence'].includes(section.status) || !Array.isArray(section.claims) ||
        (section.status === 'supported') !== (section.claims.length > 0)) return false;
    let previous = '';
    for (const claim of section.claims) {
      const threshold = claim.signal === 'recurrent' ? Math.max(10, Math.ceil(snapshot.comments.length * 0.02)) : claim.signal === 'minority' ? 4 : 1;
      if (!exactKeys(claim, ['claimId', 'textEs', 'evidenceRefs', 'signal']) || typeof claim.claimId !== 'string' ||
          !RECORD_ID_PATTERN.test(claim.claimId) || compareCodePoints(claim.claimId, previous) <= 0 || claimIds.has(claim.claimId) ||
          typeof claim.textEs !== 'string' || claim.textEs.length < 1 || claim.textEs.length > 4000 ||
          !Array.isArray(claim.evidenceRefs) || !['recurrent', 'minority', 'descriptive'].includes(claim.signal) ||
          (section.key === 'recurrent_themes' && claim.signal !== 'recurrent') ||
          (section.key === 'minority_signals' && claim.signal !== 'minority') ||
          new Set(claim.evidenceRefs).size !== claim.evidenceRefs.length || claim.evidenceRefs.length < threshold ||
          claim.evidenceRefs.some((ref) => typeof ref !== 'string' || !/^e_[a-z2-7]{20}$/.test(ref) || !references.has(ref)) ||
          /\b(?:debe|deben|debería|recomiendo|recomendamos|recomendar|sugiero|sugerimos|conviene|implementar|cambiar|mejorar|garantiza|garantizan|causa|causan|provoca|provocan|demuestra|demuestran|recommend(?:s|ed|ing)?|should|must|need(?:s|ed)? to|improve|change|implement)\b/iu.test(claim.textEs) ||
          introducesMetricValue(claim.textEs, officialValues) ||
          narrativeHasPrivateText(claim.textEs, snapshot.comments)) return false;
      previous = claim.claimId;
      claimIds.add(claim.claimId);
    }
  }
  return true;
}

function outputTokenRequestDigest(output, modelConfig, stage) {
  return sha256({
    contractVersion: 'survey-count-request.v1',
    modelConfig,
    segments: {
      instructions: stage === 'map' ? MAP_INSTRUCTIONS : REDUCE_INSTRUCTIONS,
      schema: stage === 'map' ? MAP_SCHEMA : REDUCE_SCHEMA,
      metrics: '{}',
      comments: canonicalizeJson(output),
    },
  });
}

function safeMapOutput(payload, modelConfig, snapshot, reportRunId, evidenceKey) {
  if (!exactKeys(payload, ['kind', 'chunkId', 'chunkIndex', 'chunkCount', 'evidenceKeyId', 'coveredRefs', 'chunkMembershipDigest', 'outputTokenCount', 'outputRequestDigest', 'validatedOutput']) ||
      payload.kind !== 'map' || !Number.isSafeInteger(payload.outputTokenCount) || payload.outputTokenCount < 0 ||
      payload.outputTokenCount > modelConfig.map.hardMax || !DIGEST_PATTERN.test(payload.outputRequestDigest) ||
      payload.outputRequestDigest !== outputTokenRequestDigest(payload.validatedOutput, modelConfig, 'map')) return false;
  const key = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(payload.chunkId);
  const output = payload.validatedOutput;
  if (!key || Number(key[1]) !== payload.chunkIndex || Number(key[2]) !== payload.chunkCount ||
      payload.evidenceKeyId !== modelConfig.evidenceKeyId ||
      !exactKeys(output, ['schemaVersion', 'chunkId', 'coveredRefs', 'themes', 'limitations']) ||
      output.schemaVersion !== 'survey-map.v1' || output.chunkId !== payload.chunkId ||
      !Array.isArray(output.coveredRefs) || !Array.isArray(output.themes) || !Array.isArray(output.limitations)) return false;
  const membership = {
    evidenceKeyId: payload.evidenceKeyId,
    chunkIndex: payload.chunkIndex,
    chunkCount: payload.chunkCount,
    coveredRefs: payload.coveredRefs,
    membershipDigest: payload.chunkMembershipDigest,
  };
  if (!verifyChunkMembership({
    reportRunId,
    snapshotDigest: sha256(snapshot),
    evidenceKeyId: modelConfig.evidenceKeyId,
    evidenceKey,
    chunkCount: payload.chunkCount,
    comments: snapshot.comments,
  }, membership) || canonicalizeJson(output.coveredRefs) !== canonicalizeJson(payload.coveredRefs)) return false;
  const membershipRefs = new Set(payload.coveredRefs);
  const commentText = snapshot.comments.map(({ text }) => text);
  const claimIds = new Set();
  let previousTheme = '';
  const minimums = {
    recurrent: Math.max(10, Math.ceil(snapshot.comments.length * 0.02)),
    minority: 4,
    descriptive: 1,
  };
  for (const theme of output.themes) {
    if (!exactKeys(theme, ['themeKey', 'labelEs', 'claims']) || typeof theme.themeKey !== 'string' ||
        !RECORD_ID_PATTERN.test(theme.themeKey) || compareCodePoints(theme.themeKey, previousTheme) <= 0 ||
        typeof theme.labelEs !== 'string' || theme.labelEs.length < 1 || theme.labelEs.length > 500 ||
        !Array.isArray(theme.claims) || narrativeHasPrivateText(theme.labelEs, snapshot.comments) ||
        /\d/u.test(theme.labelEs)) return false;
    previousTheme = theme.themeKey;
    let previousClaimId = '';
    for (const claim of theme.claims) {
      if (!exactKeys(claim, ['claimId', 'textEs', 'evidenceRefs', 'signal']) || typeof claim.claimId !== 'string' ||
          !RECORD_ID_PATTERN.test(claim.claimId) || compareCodePoints(claim.claimId, previousClaimId) <= 0 || claimIds.has(claim.claimId) ||
          typeof claim.textEs !== 'string' || claim.textEs.length < 1 || claim.textEs.length > 4000 ||
          !Array.isArray(claim.evidenceRefs) || !['recurrent', 'minority', 'descriptive'].includes(claim.signal) ||
          claim.evidenceRefs.length < minimums[claim.signal] || new Set(claim.evidenceRefs).size !== claim.evidenceRefs.length ||
          claim.evidenceRefs.some((ref) => !membershipRefs.has(ref)) ||
          /\d/u.test(claim.textEs) || /\b(?:debe|deben|debería|recomiendo|recomendamos|recomendar|sugiero|sugerimos|conviene|implementar|cambiar|mejorar|garantiza|garantizan|causa|causan|provoca|provocan|demuestra|demuestran|recommend(?:s|ed|ing)?|should|must|need(?:s|ed)? to|improve|change|implement)\b/iu.test(claim.textEs) ||
          narrativeHasPrivateText(claim.textEs, snapshot.comments)) return false;
      previousClaimId = claim.claimId;
      claimIds.add(claim.claimId);
    }
  }
  for (const limitation of output.limitations) {
    if (typeof limitation !== 'string' || limitation.length < 1 || limitation.length > 4000 || /\d/u.test(limitation) ||
        narrativeHasPrivateText(limitation, snapshot.comments)) return false;
  }
  return true;
}

function safeReduceOutput(payload, modelConfig, snapshot, reportRunId, evidenceKey) {
  if (!exactKeys(payload, ['kind', 'validatedOutput', 'outputTokenCount', 'outputRequestDigest']) ||
      payload.kind !== 'reduce' || !Number.isSafeInteger(payload.outputTokenCount) || payload.outputTokenCount < 0 ||
      payload.outputTokenCount > modelConfig.directReduce.hardMax || !DIGEST_PATTERN.test(payload.outputRequestDigest) ||
      payload.outputRequestDigest !== outputTokenRequestDigest(payload.validatedOutput, modelConfig, 'reduce')) return false;
  const output = payload.validatedOutput;
  if (!exactKeys(output, ['schemaVersion', 'route', 'sections', 'mapOutputDigests']) || output.schemaVersion !== 'survey-analysis.v1' ||
      output.route !== 'reduce' || !Array.isArray(output.mapOutputDigests) || output.mapOutputDigests.length === 0 ||
      output.mapOutputDigests.some((value) => !DIGEST_PATTERN.test(value)) || new Set(output.mapOutputDigests).size !== output.mapOutputDigests.length ||
      !Array.isArray(output.sections)) return false;
  return safeDirectOutput({ schemaVersion: output.schemaVersion, route: 'direct', sections: output.sections }, modelConfig, snapshot, reportRunId, evidenceKey);
}

function safeCheckpointPayload(stage, payload, modelConfig, snapshot, reportRunId, evidenceKey) {
  if (stage.type === "redact")
    return exactKeys(payload, ["kind", "recordCount", "redactionVersion"]) &&
      payload.kind === "redact" && Number.isSafeInteger(payload.recordCount) &&
      payload.recordCount >= 0 && payload.recordCount === snapshot?.comments?.length &&
      payload.redactionVersion === modelConfig.redactionVersion;
  if (stage.type === "count") {
    if (payload?.route === "map-reduce")
      return safeMapReduceCount(payload, modelConfig, snapshot, reportRunId, evidenceKey);
    const segments = ["instructions", "schema", "metrics", "comments", "reservedOutput", "headroom"];
    const expectedRequestDigest = snapshot && sha256({
      contractVersion: 'survey-count-request.v1',
      modelConfig,
      segments: {
        instructions: DIRECT_COUNT_INSTRUCTIONS,
        schema: DIRECT_COUNT_SCHEMA,
        metrics: canonicalizeJson(snapshot.metrics),
        comments: directModelCommentsJson(snapshot, reportRunId, evidenceKey),
      },
    });
    return exactKeys(payload, ["kind", "requestDigest", "segmentTokens", "totalTokens"]) && payload.kind === "count" &&
      (expectedRequestDigest === undefined || payload.requestDigest === expectedRequestDigest) &&
      exactKeys(payload.segmentTokens, segments) && segments.every((key) => Number.isSafeInteger(payload.segmentTokens[key]) && payload.segmentTokens[key] >= 0) &&
      Number.isSafeInteger(payload.totalTokens) && payload.totalTokens === segments.reduce((sum, key) => sum + payload.segmentTokens[key], 0) &&
      payload.segmentTokens.headroom === Math.max(2048, Math.ceil(modelConfig.verifiedInputTokenLimit * 0.1)) &&
      payload.segmentTokens.reservedOutput === modelConfig.directReduce.targetMax &&
      payload.totalTokens <= modelConfig.verifiedInputTokenLimit;
  }
  if (stage.type === "direct") {
    const output = payload?.validatedOutput;
    return exactKeys(payload, ["kind", "validatedOutput"]) && payload.kind === "direct" &&
      Boolean(snapshot && safeDirectOutput(output, modelConfig, snapshot, reportRunId, evidenceKey));
  }
  if (stage.type === "map")
    return Boolean(snapshot && safeMapOutput(payload, modelConfig, snapshot, reportRunId, evidenceKey));
  if (stage.type === "reduce")
    return Boolean(snapshot && safeReduceOutput(payload, modelConfig, snapshot, reportRunId, evidenceKey));
  if (stage.type === "validate") {
    const output = payload?.publishedAnalysis;
    return exactKeys(payload, ["kind", "publishedAnalysis", "validatorVersion"]) &&
      payload.kind === "validate" && payload.validatorVersion === modelConfig.validatorVersion &&
      exactKeys(output, ["schemaVersion", "sections"]) && output.schemaVersion === "survey-published-analysis.v1" &&
      Array.isArray(output.sections) && output.sections.length === ANALYSIS_SECTION_KEYS.length &&
      output.sections.every((section, index) => exactKeys(section, ["key", "status", "paragraphsEs"]) &&
        section.key === ANALYSIS_SECTION_KEYS[index] && ['supported', 'insufficient_evidence'].includes(section.status) &&
        Array.isArray(section.paragraphsEs) && section.paragraphsEs.length > 0 &&
        section.paragraphsEs.every((paragraph) => typeof paragraph === 'string' && paragraph.length > 0) &&
        (section.status !== 'insufficient_evidence' || section.paragraphsEs.length === 1 && section.paragraphsEs[0] === EMPTY_EVIDENCE_PARAGRAPH));
  }
  if (stage.type === "render")
    return exactKeys(payload, ["kind", "rendererVersion", "pdfSha256", "size"]) && payload.kind === "render" &&
      typeof payload.rendererVersion === "string" && payload.rendererVersion.length > 0 &&
      typeof payload.pdfSha256 === "string" && DIGEST_PATTERN.test(payload.pdfSha256) && Number.isSafeInteger(payload.size) && payload.size > 0;
  if (stage.type === "store")
    return exactKeys(payload, ["kind", "objectKey", "artifactSha256", "size", "mimeType"]) && payload.kind === "store" &&
      typeof payload.objectKey === "string" && payload.objectKey.startsWith("private/feedback-reports/") &&
      payload.objectKey.length <= 500 && payload.objectKey.split("/").every((part) =>
        Boolean(part) && part !== "." && part !== ".." && /^[A-Za-z0-9._-]+$/.test(part)) &&
      typeof payload.artifactSha256 === "string" && DIGEST_PATTERN.test(payload.artifactSha256) &&
      Number.isSafeInteger(payload.size) && payload.size > 0 && payload.mimeType === "application/pdf";
  return false;
}

function checkpointDependencies(stageKey, entries, route, chunkCount) {
  const keys = stageKey === "redact" ? []
    : stageKey === "count" ? ["redact"]
      : stageKey === "direct" ? ["count"]
        : /^map\.[1-9]\d*-of-[1-9]\d*$/.test(stageKey) ? ["count"]
          : stageKey === "reduce" ? ["count", ...Array.from({ length: chunkCount }, (_, index) => `map.${index + 1}-of-${chunkCount}`)]
            : stageKey === "validate" ? [route === "direct" ? "direct" : "reduce"]
              : stageKey === "render" ? ["validate"]
                : stageKey === "store" ? ["render"] : null;
  if (!keys || keys.some((key) => !entries.has(key))) checkpointError("DEPENDENCY_NOT_READY");
  return keys.map((key) => entries.get(key));
}

function incompleteGraphResult(structurallyVerifiedStageKeys, pendingStageKeys) {
  const semanticStages = new Set(["direct", "validate", "render", "store"]);
  const reason = pendingStageKeys.some((stageKey) => semanticStages.has(stageKey))
    ? "SEMANTIC_VALIDATION_REQUIRED"
    : "CHECKPOINT_GRAPH_INCOMPLETE";
  return {
    status: "incomplete",
    reason,
    structurallyVerifiedStageKeys: [...new Set(structurallyVerifiedStageKeys)],
    pendingStageKeys: [...new Set(pendingStageKeys)],
  };
}

function mapModelRequest(snapshot, snapshotDigest, modelConfig, reportRunId, evidenceKey, evidenceKeyId, chunkCount, chunkIndex) {
  const memberships = deriveChunkMembership({
    reportRunId, snapshotDigest,
    evidenceKeyId, evidenceKey, chunkCount, comments: snapshot.comments,
  });
  const membership = memberships[chunkIndex - 1];
  if (!membership) invalid();
  const refsById = new Map(snapshot.comments.map((comment) => [comment.recordId,
    deriveEvidenceRef({ reportRunId, recordId: comment.recordId, evidenceKey })]));
  const covered = new Set(membership.coveredRefs);
  const modelRequest = {
    contractVersion: 'survey-map-input.v1',
    chunkId: `map.${chunkIndex}-of-${chunkCount}`,
    chunkIndex,
    chunkCount,
    metrics: snapshot.metrics,
    comments: snapshot.comments.filter((comment) => covered.has(refsById.get(comment.recordId))).map((comment) => ({
      period: comment.period,
      text: comment.text
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[EMAIL]')
        .replace(/https?:\/\/[^\s]+|www\.[^\s]+/giu, '[URL]')
        .replace(/(?<!\w)(?:\+?\d[\d\s().-]{7,}\d)(?!\w)/gu, '[PHONE]'),
      evidenceRef: refsById.get(comment.recordId),
    })),
  };
  const request = {
    contractVersion: 'survey-count-request.v1',
    modelConfig,
    segments: { instructions: MAP_INSTRUCTIONS, schema: MAP_SCHEMA, metrics: canonicalizeJson(snapshot.metrics), comments: canonicalizeJson(modelRequest) },
  };
  return { membership, modelRequest, request };
}

function validCountEvidence(value, modelConfig, reservation, digestRequest) {
  const keys = ['instructions', 'schema', 'metrics', 'comments', 'reservedOutput', 'headroom'];
  return exactKeys(value, keys) && keys.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0) &&
    value.reservedOutput === reservation && value.headroom === Math.max(2048, Math.ceil(modelConfig.verifiedInputTokenLimit * 0.1)) &&
    typeof digestRequest === 'string' && DIGEST_PATTERN.test(digestRequest);
}

function safeMapReduceCount(payload, modelConfig, snapshot, reportRunId, evidenceKey) {
  if (!exactKeys(payload, ['kind', 'requestDigest', 'segmentTokens', 'totalTokens', 'route', 'directRequestDigest', 'directSegmentTokens', 'directTotalTokens', 'attempts', 'chunkCount']) ||
      payload.kind !== 'count' || payload.route !== 'map-reduce' || !snapshot || !evidenceKey ||
      !Number.isSafeInteger(payload.chunkCount) || payload.chunkCount < 1 || payload.chunkCount > snapshot.comments.length ||
      !Array.isArray(payload.attempts) || payload.attempts.length !== payload.chunkCount ||
      !validCountEvidence(payload.segmentTokens, modelConfig, modelConfig.directReduce.targetMax, payload.requestDigest) ||
      !validCountEvidence(payload.directSegmentTokens, modelConfig, modelConfig.directReduce.targetMax, payload.directRequestDigest) ||
      payload.segmentTokens !== payload.directSegmentTokens && canonicalizeJson(payload.segmentTokens) !== canonicalizeJson(payload.directSegmentTokens) ||
      payload.requestDigest !== payload.directRequestDigest || payload.totalTokens !== payload.directTotalTokens ||
      !Number.isSafeInteger(payload.totalTokens) ||
      payload.totalTokens !== Object.values(payload.segmentTokens).reduce((sum, value) => sum + value, 0) ||
      payload.totalTokens <= modelConfig.verifiedInputTokenLimit)
    return false;
  const directRequestDigest = sha256({
    contractVersion: 'survey-count-request.v1', modelConfig,
    segments: {
      instructions: DIRECT_COUNT_INSTRUCTIONS,
      schema: DIRECT_COUNT_SCHEMA,
      metrics: canonicalizeJson(snapshot.metrics),
      comments: directModelCommentsJson(snapshot, reportRunId, evidenceKey),
    },
  });
  if (payload.directRequestDigest !== directRequestDigest) return false;
  for (let attemptIndex = 0; attemptIndex < payload.attempts.length; attemptIndex += 1) {
    const attempt = payload.attempts[attemptIndex];
    const chunkCount = attemptIndex + 1;
    if (!exactKeys(attempt, ['chunkCount', 'chunks']) || attempt.chunkCount !== chunkCount ||
        !Array.isArray(attempt.chunks) || attempt.chunks.length !== chunkCount) return false;
    let allFit = true;
    for (let chunkIndex = 1; chunkIndex <= chunkCount; chunkIndex += 1) {
      const chunk = attempt.chunks[chunkIndex - 1];
      const built = mapModelRequest(snapshot, sha256(snapshot), modelConfig, reportRunId, evidenceKey, modelConfig.evidenceKeyId, chunkCount, chunkIndex);
      if (!exactKeys(chunk, ['requestDigest', 'segmentTokens', 'totalTokens']) ||
          chunk.requestDigest !== sha256(built.request) ||
          !validCountEvidence(chunk.segmentTokens, modelConfig, modelConfig.map.targetMax, chunk.requestDigest) ||
          !Number.isSafeInteger(chunk.totalTokens) ||
          chunk.totalTokens !== Object.values(chunk.segmentTokens).reduce((sum, value) => sum + value, 0)) return false;
      if (chunk.totalTokens > modelConfig.verifiedInputTokenLimit) allFit = false;
    }
    if (chunkCount < payload.chunkCount && allFit) return false;
    if (chunkCount === payload.chunkCount && !allFit) return false;
  }
  return true;
}

function exactCountResult(value) {
  const keys = ['instructions', 'schema', 'metrics', 'comments'];
  return exactKeys(value, keys) && keys.every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0);
}

async function verifyMapReduceCountAuthorityV1({ payload, modelConfig, snapshot, reportRunId, evidenceKey, countTokens }) {
  if (typeof countTokens !== 'function' || !safeMapReduceCount(payload, modelConfig, snapshot, reportRunId, evidenceKey)) return false;
  const directRequest = {
    contractVersion: 'survey-count-request.v1', modelConfig,
    segments: {
      instructions: DIRECT_COUNT_INSTRUCTIONS,
      schema: DIRECT_COUNT_SCHEMA,
      metrics: canonicalizeJson(snapshot.metrics),
      comments: directModelCommentsJson(snapshot, reportRunId, evidenceKey),
    },
  };
  const directCount = await countTokens(directRequest);
  if (!exactCountResult(directCount) ||
      ['instructions', 'schema', 'metrics', 'comments'].some((key) => directCount[key] !== payload.directSegmentTokens[key])) return false;
  for (const attempt of payload.attempts) {
    for (let chunkIndex = 1; chunkIndex <= attempt.chunkCount; chunkIndex += 1) {
      const built = mapModelRequest(snapshot, sha256(snapshot), modelConfig, reportRunId, evidenceKey,
        modelConfig.evidenceKeyId, attempt.chunkCount, chunkIndex);
      const counted = await countTokens(built.request);
      const evidence = attempt.chunks[chunkIndex - 1];
      if (!exactCountResult(counted) ||
          ['instructions', 'schema', 'metrics', 'comments'].some((key) => counted[key] !== evidence.segmentTokens[key])) return false;
    }
  }
  return true;
}

async function verifyGeneratedOutputCountV1({ output, modelConfig, stage, outputTokenCount, outputRequestDigest, countTokens }) {
  if (typeof countTokens !== 'function') return false;
  const request = {
    contractVersion: 'survey-count-request.v1', modelConfig,
    segments: {
      instructions: stage === 'map' ? MAP_INSTRUCTIONS : REDUCE_INSTRUCTIONS,
      schema: stage === 'map' ? MAP_SCHEMA : REDUCE_SCHEMA,
      metrics: '{}',
      comments: canonicalizeJson(output),
    },
  };
  const counted = await countTokens(request);
  return exactCountResult(counted) && counted.comments === outputTokenCount &&
    outputRequestDigest === sha256(request) && counted.comments <= (stage === 'map' ? modelConfig.map.hardMax : modelConfig.directReduce.hardMax);
}

function verifyCheckpointGraphV1({ run, snapshot, checkpoints, candidate, expectedStateVersion, evidenceKey }) {
  if (!run || !exactKeys(checkpoints, ["version", "snapshotDigest", "route", "chunkCount", "entries"]) ||
      checkpoints.version !== "survey-checkpoints.v1" || !Array.isArray(checkpoints.entries) ||
      !exactKeys(run, ["reportRunId", "status", "stateVersion", "snapshotDigest", "sourceRevision", "modelConfig", "rendererVersion"]) ||
      run.status !== "running" || !Number.isSafeInteger(run.stateVersion) || run.stateVersion < 1 ||
      !Number.isSafeInteger(expectedStateVersion) || expectedStateVersion < 1)
    checkpointError("INVALID_STATE");
  assertRunId(run.reportRunId);
  assertDigest(run.snapshotDigest);
  if (snapshot && (typeof snapshot !== "object" || Array.isArray(snapshot) || !Array.isArray(snapshot.comments)))
    checkpointError("INVALID_STATE");
  if (checkpoints.snapshotDigest !== run.snapshotDigest) checkpointError("DIGEST_MISMATCH");
  if (typeof run.sourceRevision !== "string" || !run.sourceRevision || run.sourceRevision !== run.modelConfig?.sourceRevision)
    checkpointError("DIGEST_MISMATCH");

  let route = checkpoints.route;
  let chunkCount = checkpoints.chunkCount;
  if (route !== "undecided" && route !== "direct" && route !== "map-reduce") checkpointError("UNKNOWN_VERSION");
  if (route === "map-reduce" && (!Number.isSafeInteger(chunkCount) || chunkCount < 1 || chunkCount > (snapshot?.comments?.length ?? 0)))
    checkpointError("UNKNOWN_VERSION");
  if (route !== "map-reduce" && chunkCount !== null) checkpointError("VALIDATION_FAILED");
  const entries = new Map();
  const structurallyVerifiedStageKeys = [];
  const pendingStageKeys = [];
  let priorIndex = -1;

  const verifyEntry = (entry) => {
    if (!exactKeys(entry, CHECKPOINT_KEYS)) checkpointError("VALIDATION_FAILED");
    const stage = checkpointStage(entry.stageKey);
    if (!stage) checkpointError("UNKNOWN_VERSION");
    const selectedRoute = stage.key === "redact" || stage.key === "count" ? "common" : route;
    const index = stageIndex(stage, route, chunkCount ?? 0);
    if (index === null || entry.stageIndex !== index || entry.route !== selectedRoute || entry.stageType !== stage.type ||
        entry.checkpointVersion !== CHECKPOINT_CONTRACT_VERSIONS.checkpoint || entry.status !== "valid" ||
        !Number.isSafeInteger(entry.attempts) || entry.attempts < 1 || !validUtcInstant(entry.completedAt))
      checkpointError("VALIDATION_FAILED");
    if (!route || route === "undecided" && stage.key !== "redact" && stage.key !== "count")
      checkpointError("UNKNOWN_VERSION");
    if (entries.has(entry.stageKey) || index <= priorIndex) checkpointError("CHECKPOINT_CONFLICT");
    if (stage.type === "map") {
      const mapIdentity = /^map\.([1-9]\d*)-of-([1-9]\d*)$/.exec(entry.stageKey);
      if (!mapIdentity || route !== "map-reduce" || entry.route !== "map-reduce" ||
          entry.stageIndex !== Number(mapIdentity[1]) + 1 ||
          entry.payload?.kind !== "map" || entry.payload.chunkId !== entry.stageKey ||
          entry.payload.chunkIndex !== Number(mapIdentity[1]) ||
          entry.payload.chunkCount !== Number(mapIdentity[2]) ||
          entry.payload.chunkCount !== chunkCount)
        checkpointError("VALIDATION_FAILED");
    }
    const dependencies = checkpointDependencies(entry.stageKey, entries, route, chunkCount ?? 0);
    const rendererVersion = entry.stageKey === "render" || entry.stageKey === "store"
      ? run.rendererVersion : null;
    if ((entry.stageKey === "render" || entry.stageKey === "store") &&
        (typeof rendererVersion !== "string" || !rendererVersion || entry.payload?.rendererVersion !== undefined && entry.payload.rendererVersion !== rendererVersion))
      checkpointError("DIGEST_MISMATCH");
    const projection = {
      version: CHECKPOINT_CONTRACT_VERSIONS.stageConfig,
      stageKey: entry.stageKey,
      modelConfig: run.modelConfig,
      evidenceKeyId: run.modelConfig.evidenceKeyId,
      rendererVersion,
    };
    const expectedInput = stageInputDigestV1({
      stageKey: entry.stageKey,
      stageIndex: index,
      route: selectedRoute,
      snapshotDigest: run.snapshotDigest,
      sourceRevision: run.sourceRevision,
      contractVersions: CHECKPOINT_CONTRACT_VERSIONS,
      stageConfigDigest: stageConfigDigest(projection),
      orderedDependencyOutputDigests: dependencies.map(({ outputDigest }) => outputDigest),
      chunkMembershipDigest: entry.payload?.kind === "map" ? entry.payload.chunkMembershipDigest : null,
    });
    if (entry.inputDigest !== expectedInput) checkpointError("DIGEST_MISMATCH");
    let expectedOutput;
    try { expectedOutput = sha256(entry.payload); } catch { checkpointError("DIGEST_MISMATCH"); }
    if (entry.outputDigest !== expectedOutput) checkpointError("DIGEST_MISMATCH");
    const payloadIsSafe = safeCheckpointPayload(stage, entry.payload, run.modelConfig, snapshot, run.reportRunId, evidenceKey);
    if (stage.type === "validate" && snapshot) {
      const source = entries.get(route === "direct" ? "direct" : "reduce")?.payload?.validatedOutput;
      const output = route === "direct" ? source : source && {
        schemaVersion: source.schemaVersion,
        route: "direct",
        sections: source.sections,
      };
      const published = exactKeys(output, ["schemaVersion", "route", "sections"]) && output.route === "direct" &&
        Array.isArray(output.sections) && {
        schemaVersion: "survey-published-analysis.v1",
        sections: output.sections.map((section) => ({
          key: section.key,
          status: section.status,
          paragraphsEs: section.status === "insufficient_evidence"
            ? [EMPTY_EVIDENCE_PARAGRAPH]
            : section.claims.map(({ textEs }) => textEs),
        })),
      };
      if (!published || canonicalizeJson(entry.payload.publishedAnalysis) !== canonicalizeJson(published))
        checkpointError("VALIDATION_FAILED");
    }
    if (stage.type === "reduce") {
      const expectedDigests = dependencies.slice(1).map(({ outputDigest }) => outputDigest);
      if (!Array.isArray(entry.payload?.validatedOutput?.mapOutputDigests) ||
          canonicalizeJson(entry.payload.validatedOutput.mapOutputDigests) !== canonicalizeJson(expectedDigests))
        checkpointError("DIGEST_MISMATCH");
    }
    if ((snapshot && ["redact", "count"].includes(stage.type) || ["render", "store"].includes(stage.type)) && !payloadIsSafe)
      checkpointError("VALIDATION_FAILED");
    if (snapshot && ["map", "reduce", "validate"].includes(stage.type) && !payloadIsSafe)
      checkpointError("VALIDATION_FAILED");
    const ancestorsStructurallyVerified = dependencies.every((dependency) => dependency.structurallyVerified);
    const structuralOnlyFoundation = !snapshot && (stage.type === "redact" || stage.type === "count");
    const structurallyVerified = (payloadIsSafe || structuralOnlyFoundation) && ancestorsStructurallyVerified;
    if (structurallyVerified) structurallyVerifiedStageKeys.push(entry.stageKey);
    else {
      pendingStageKeys.push(entry.stageKey);
    }
    entries.set(entry.stageKey, { ...entry, structurallyVerified });
    priorIndex = index;
  };

  if (route === "undecided" && checkpoints.entries.some((entry) => entry.stageKey !== "redact"))
    checkpointError("UNKNOWN_VERSION");
  for (const entry of checkpoints.entries) verifyEntry(entry);

  if (!candidate || !exactKeys(candidate, CHECKPOINT_KEYS)) checkpointError("VALIDATION_FAILED");
  const candidateStage = checkpointStage(candidate.stageKey);
  if (!candidateStage) checkpointError("UNKNOWN_VERSION");
  const existing = entries.get(candidate.stageKey);
  if (existing) {
    const { structurallyVerified: _structurallyVerified, ...storedCheckpoint } = existing;
    if (canonicalizeJson(storedCheckpoint) !== canonicalizeJson(candidate)) checkpointError("CHECKPOINT_CONFLICT");
    if (!snapshot || [...entries.values()].some((entry) => !entry.structurallyVerified))
      return incompleteGraphResult(structurallyVerifiedStageKeys, [
        ...pendingStageKeys,
        ...expectedStageKeys(route, chunkCount).filter((stageKey) => !entries.has(stageKey)),
      ]);
    return {
      status: "accepted",
      checkpoints: {
        version: checkpoints.version,
        snapshotDigest: checkpoints.snapshotDigest,
        route,
        chunkCount,
        entries: checkpoints.entries,
      },
      reportRunId: run.reportRunId,
      stateVersion: run.stateVersion,
      stageKey: candidate.stageKey,
      replayed: true,
    };
  }
  if (expectedStateVersion !== run.stateVersion) checkpointError("STATE_VERSION_CONFLICT");
  if (route === "undecided") {
    if (candidate.stageKey === "redact" && entries.size === 0) {
      // The graph remains undecided until a validated CountTokens result fits the direct budget.
    } else if (candidate.stageKey === "count" && entries.has("redact")) {
      if (!safeCheckpointPayload(candidateStage, candidate.payload, run.modelConfig, snapshot, run.reportRunId, evidenceKey))
        checkpointError("UNKNOWN_VERSION");
      if (candidate.payload.route === "map-reduce") {
        route = "map-reduce";
        chunkCount = candidate.payload.chunkCount;
      } else {
        route = "direct";
      }
    } else {
      checkpointError("UNKNOWN_VERSION");
    }
  }
  const expectedKeys = expectedStageKeys(route, chunkCount ?? 0);
  if (!expectedKeys || candidate.stageKey !== expectedKeys[entries.size]) checkpointError("VALIDATION_FAILED");
  verifyEntry(candidate);
  entries.set(candidate.stageKey, { ...candidate, structurallyVerified: true });
  if (!snapshot || [...entries.values()].some((entry) => !entry.structurallyVerified))
    return incompleteGraphResult(
      structurallyVerifiedStageKeys,
      [...pendingStageKeys, ...expectedStageKeys(route, chunkCount ?? 0).filter((key) => !entries.has(key))],
    );
  const persistedEntries = [...entries.values()].map(({ structurallyVerified: _verified, ...entry }) => entry);
  return {
    status: "accepted",
    checkpoints: {
      version: checkpoints.version,
      snapshotDigest: checkpoints.snapshotDigest,
      route,
      chunkCount,
      entries: persistedEntries,
    },
    reportRunId: run.reportRunId,
    stateVersion: expectedStateVersion + 1,
    stageKey: candidate.stageKey,
    replayed: false,
  };
}

module.exports = {
  CHECKPOINT_CONTRACT_VERSIONS,
  deriveChunkMembership,
  deriveEvidenceRef,
  stageConfigDigest,
  stageInputDigestV1,
  validateWorkerClaimContracts,
  verifyCheckpointGraphV1,
  verifyChunkMembership,
  verifyMapReduceCountAuthorityV1,
  verifyGeneratedOutputCountV1,
};
