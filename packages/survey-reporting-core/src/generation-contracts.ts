import { canonicalizeJson } from "./canonical-json";
import type { ModelConfigV1, PricingSnapshotV1 } from "./contracts";

const KEY_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
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

function invalid(): never {
  throw new TypeError("Invalid checkpoint binding");
}

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

export function validateModelConfigV1(
  value: unknown,
  evidenceKeyId: string,
): asserts value is ModelConfigV1 {
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
  canonicalizeJson(value);
}

export function validatePricingSnapshotV1(
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

  validateModelConfigV1(input.modelConfig, input.evidenceKeyId);
  validatePricingSnapshotV1(input.pricingSnapshot);
  if (
    !Array.isArray((input.pricingSnapshot as PricingSnapshotV1).units) ||
    (input.pricingSnapshot as PricingSnapshotV1).units.length === 0
  )
    invalid();
}
