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
  'Describe only evidence supported by the supplied snapshot. Do not infer when there are no eligible comments.';
const DIRECT_COUNT_SCHEMA = canonicalizeJson({
  schemaVersion: 'survey-analysis.v1',
  route: 'direct',
  sections: ANALYSIS_SECTION_KEYS.map((key) => ({ key, status: 'insufficient_evidence', claims: [] })),
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
    (checkpoints.route !== "direct" && checkpoints.route !== "undecided") ||
    checkpoints.chunkCount !== null ||
    !Array.isArray(checkpoints.entries) ||
    (checkpoints.route === "undecided" && checkpoints.entries.length !== 0) ||
    (checkpoints.route === "direct" && checkpoints.entries.length !== 0) ||
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
  return null;
}

function stageIndex(stage) {
  if (stage.key === "redact") return 0;
  if (stage.key === "count") return 1;
  if (stage.key === "direct") return 2;
  if (stage.key === "validate") return 3;
  if (stage.key === "render") return 4;
  if (stage.key === "store") return 5;
  return null;
}

function expectedStageKeys() {
  return ["redact", "count", "direct", "validate", "render", "store"];
}

function safeCheckpointPayload(stage, payload, modelConfig, snapshot) {
  if (stage.type === "redact")
    return exactKeys(payload, ["kind", "recordCount", "redactionVersion"]) &&
      payload.kind === "redact" && Number.isSafeInteger(payload.recordCount) &&
      payload.recordCount >= 0 && payload.recordCount === snapshot?.comments?.length &&
      payload.redactionVersion === modelConfig.redactionVersion;
  if (stage.type === "count") {
    const segments = ["instructions", "schema", "metrics", "comments", "reservedOutput", "headroom"];
    const expectedRequestDigest = snapshot && sha256({
      contractVersion: 'survey-count-request.v1',
      modelConfig,
      segments: {
        instructions: DIRECT_COUNT_INSTRUCTIONS,
        schema: DIRECT_COUNT_SCHEMA,
        metrics: canonicalizeJson(snapshot.metrics),
        comments: canonicalizeJson(snapshot.comments),
      },
    });
    return exactKeys(payload, ["kind", "requestDigest", "segmentTokens", "totalTokens"]) && payload.kind === "count" &&
      (expectedRequestDigest === undefined || payload.requestDigest === expectedRequestDigest) &&
      exactKeys(payload.segmentTokens, segments) && segments.every((key) => Number.isSafeInteger(payload.segmentTokens[key]) && payload.segmentTokens[key] >= 0) &&
      Number.isSafeInteger(payload.totalTokens) && payload.totalTokens === segments.reduce((sum, key) => sum + payload.segmentTokens[key], 0) &&
      payload.segmentTokens.headroom === Math.max(2048, Math.ceil(modelConfig.verifiedInputTokenLimit * 0.1)) &&
      payload.segmentTokens.reservedOutput === modelConfig.directReduce.targetMax &&
      payload.segmentTokens.comments === 0 && payload.totalTokens <= modelConfig.verifiedInputTokenLimit;
  }
  if (stage.type === "direct") {
    const output = payload?.validatedOutput;
    return snapshot?.comments?.length === 0 && exactKeys(payload, ["kind", "validatedOutput"]) &&
      payload.kind === "direct" && exactKeys(output, ["schemaVersion", "route", "sections"]) &&
      output.schemaVersion === "survey-analysis.v1" && output.route === "direct" &&
      Array.isArray(output.sections) && output.sections.length === ANALYSIS_SECTION_KEYS.length &&
      output.sections.every((section, index) => exactKeys(section, ["key", "status", "claims"]) &&
        section.key === ANALYSIS_SECTION_KEYS[index] && section.status === "insufficient_evidence" &&
        Array.isArray(section.claims) && section.claims.length === 0);
  }
  if (stage.type === "validate") {
    const output = payload?.publishedAnalysis;
    return snapshot?.comments?.length === 0 && exactKeys(payload, ["kind", "publishedAnalysis", "validatorVersion"]) &&
      payload.kind === "validate" && payload.validatorVersion === modelConfig.validatorVersion &&
      exactKeys(output, ["schemaVersion", "sections"]) && output.schemaVersion === "survey-published-analysis.v1" &&
      Array.isArray(output.sections) && output.sections.length === ANALYSIS_SECTION_KEYS.length &&
      output.sections.every((section, index) => exactKeys(section, ["key", "status", "paragraphsEs"]) &&
        section.key === ANALYSIS_SECTION_KEYS[index] && section.status === "insufficient_evidence" &&
        Array.isArray(section.paragraphsEs) && section.paragraphsEs.length === 1 &&
        section.paragraphsEs[0] === EMPTY_EVIDENCE_PARAGRAPH);
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

function checkpointDependencies(stageKey, entries) {
  const keys = stageKey === "redact" ? []
    : stageKey === "count" ? ["redact"]
      : stageKey === "direct" ? ["count"]
        : stageKey === "validate" ? ["direct"]
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

function verifyCheckpointGraphV1({ run, snapshot, checkpoints, candidate, expectedStateVersion }) {
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
  const chunkCount = checkpoints.chunkCount;
  if (route !== "undecided" && route !== "direct" && route !== "map-reduce") checkpointError("UNKNOWN_VERSION");
  if (route === "map-reduce") checkpointError("UNKNOWN_VERSION");
  if (chunkCount !== null) checkpointError("VALIDATION_FAILED");
  const entries = new Map();
  const structurallyVerifiedStageKeys = [];
  const pendingStageKeys = [];
  let priorIndex = -1;

  const verifyEntry = (entry) => {
    if (!exactKeys(entry, CHECKPOINT_KEYS)) checkpointError("VALIDATION_FAILED");
    const stage = checkpointStage(entry.stageKey);
    if (!stage) checkpointError("UNKNOWN_VERSION");
    const selectedRoute = stage.key === "redact" || stage.key === "count" ? "common" : route;
    const index = stageIndex(stage);
    if (index === null || entry.stageIndex !== index || entry.route !== selectedRoute || entry.stageType !== stage.type ||
        entry.checkpointVersion !== CHECKPOINT_CONTRACT_VERSIONS.checkpoint || entry.status !== "valid" ||
        !Number.isSafeInteger(entry.attempts) || entry.attempts < 1 || !validUtcInstant(entry.completedAt))
      checkpointError("VALIDATION_FAILED");
    if (!route || route === "undecided" && stage.key !== "redact" && stage.key !== "count")
      checkpointError("UNKNOWN_VERSION");
    if (entries.has(entry.stageKey) || index <= priorIndex) checkpointError("CHECKPOINT_CONFLICT");
    const dependencies = checkpointDependencies(entry.stageKey, entries);
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
      chunkMembershipDigest: null,
    });
    if (entry.inputDigest !== expectedInput) checkpointError("DIGEST_MISMATCH");
    let expectedOutput;
    try { expectedOutput = sha256(entry.payload); } catch { checkpointError("DIGEST_MISMATCH"); }
    if (entry.outputDigest !== expectedOutput) checkpointError("DIGEST_MISMATCH");
    const payloadIsSafe = safeCheckpointPayload(stage, entry.payload, run.modelConfig, snapshot);
    if ((snapshot && ["redact", "count"].includes(stage.type) || ["render", "store"].includes(stage.type)) && !payloadIsSafe)
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
        ...expectedStageKeys().filter((stageKey) => !entries.has(stageKey)),
      ]);
    return {
      status: "accepted",
      checkpoints: {
        version: checkpoints.version,
        snapshotDigest: checkpoints.snapshotDigest,
        route,
        chunkCount: null,
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
      if (!safeCheckpointPayload(candidateStage, candidate.payload, run.modelConfig, snapshot))
        checkpointError("UNKNOWN_VERSION");
      route = "direct";
    } else {
      checkpointError("UNKNOWN_VERSION");
    }
  }
  const expectedKeys = expectedStageKeys();
  if (!expectedKeys || candidate.stageKey !== expectedKeys[entries.size]) checkpointError("VALIDATION_FAILED");
  verifyEntry(candidate);
  entries.set(candidate.stageKey, { ...candidate, structurallyVerified: true });
  if (!snapshot || [...entries.values()].some((entry) => !entry.structurallyVerified))
    return incompleteGraphResult(
      structurallyVerifiedStageKeys,
      [...pendingStageKeys, ...expectedStageKeys().filter((key) => !entries.has(key))],
    );
  const persistedEntries = [...entries.values()].map(({ structurallyVerified: _verified, ...entry }) => entry);
  return {
    status: "accepted",
    checkpoints: {
      version: checkpoints.version,
      snapshotDigest: checkpoints.snapshotDigest,
      route,
      chunkCount: null,
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
};
