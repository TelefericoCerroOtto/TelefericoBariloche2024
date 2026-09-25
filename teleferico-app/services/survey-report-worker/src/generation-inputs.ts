import {
  canonicalizeJson,
  createSnapshot,
  validateSnapshotEnvelope,
  type SnapshotV1,
} from "../../../packages/survey-reporting-core/src";
import type { ModelConfigV1, PricingSnapshotV1 } from "./contracts";
import { validateGenerationInputContractsV1 } from "./checkpoint-contract";

export type MaterializedGenerationInputsV1 = {
  readonly snapshotDigest: string;
  readonly sourceRevision: string;
  readonly snapshotJson: SnapshotV1;
  readonly checkpointsJson: {
    readonly version: "survey-checkpoints.v1";
    readonly snapshotDigest: string;
    readonly route: "undecided";
    readonly chunkCount: null;
    readonly entries: readonly [];
  };
  readonly modelConfigJson: ModelConfigV1;
  readonly pricingSnapshotJson: PricingSnapshotV1;
};

export type MaterializeGenerationInputsV1 = {
  readonly snapshot: Parameters<typeof createSnapshot>[0];
  readonly modelConfig: ModelConfigV1;
  readonly pricingSnapshot: PricingSnapshotV1;
  readonly evidenceKeyId: string;
};

export function materializeGenerationInputsV1(
  input: MaterializeGenerationInputsV1,
): MaterializedGenerationInputsV1 {
  try {
    validateGenerationInputContractsV1({
      modelConfig: input.modelConfig,
      pricingSnapshot: input.pricingSnapshot,
      evidenceKeyId: input.evidenceKeyId,
      sourceRevision: input.snapshot.sourceRevision,
    });
  } catch {
    throw new TypeError("INVALID_GENERATION_INPUTS");
  }

  const envelope = createSnapshot(input.snapshot);
  const checkpointsJson = deepFreeze({
    version: "survey-checkpoints.v1" as const,
    snapshotDigest: envelope.digestHex,
    route: "undecided" as const,
    chunkCount: null,
    entries: [] as const,
  });
  const modelConfigJson = deepFreeze(
    JSON.parse(canonicalizeJson(input.modelConfig)) as ModelConfigV1,
  );
  const pricingSnapshotJson = deepFreeze(
    JSON.parse(canonicalizeJson(input.pricingSnapshot)) as PricingSnapshotV1,
  );
  const materialized: MaterializedGenerationInputsV1 = deepFreeze({
    snapshotDigest: envelope.digestHex,
    sourceRevision: input.snapshot.sourceRevision,
    snapshotJson: envelope.payload,
    checkpointsJson,
    modelConfigJson,
    pricingSnapshotJson,
  });

  return validateMaterializedGenerationInputsV1(materialized);
}

export function validateMaterializedGenerationInputsV1(
  value: unknown,
): MaterializedGenerationInputsV1 {
  try {
    if (
      !exactKeys(value, [
        "snapshotDigest",
        "sourceRevision",
        "snapshotJson",
        "checkpointsJson",
        "modelConfigJson",
        "pricingSnapshotJson",
      ])
    )
      throw new TypeError();

    const inputs = value as MaterializedGenerationInputsV1;
    if (
      !isDigest(inputs.snapshotDigest) ||
      inputs.snapshotDigest === "0".repeat(64) ||
      typeof inputs.sourceRevision !== "string" ||
      !inputs.sourceRevision ||
      inputs.snapshotJson.sourceRevision !== inputs.sourceRevision ||
      inputs.modelConfigJson.sourceRevision !== inputs.sourceRevision
    )
      throw new TypeError();

    const snapshotEnvelope = {
      canonicalization: "tb-json.v1" as const,
      algorithm: "sha256" as const,
      digestHex: inputs.snapshotDigest,
      payload: inputs.snapshotJson,
    };
    validateSnapshotEnvelope(snapshotEnvelope);
    canonicalizeJson(inputs.snapshotJson);

    if (
      !exactKeys(inputs.checkpointsJson, [
        "version",
        "snapshotDigest",
        "route",
        "chunkCount",
        "entries",
      ]) ||
      inputs.checkpointsJson.version !== "survey-checkpoints.v1" ||
      inputs.checkpointsJson.snapshotDigest !== inputs.snapshotDigest ||
      inputs.checkpointsJson.route !== "undecided" ||
      inputs.checkpointsJson.chunkCount !== null ||
      !Array.isArray(inputs.checkpointsJson.entries) ||
      inputs.checkpointsJson.entries.length !== 0
    )
      throw new TypeError();

    validateGenerationInputContractsV1({
      modelConfig: inputs.modelConfigJson,
      pricingSnapshot: inputs.pricingSnapshotJson,
      evidenceKeyId: inputs.modelConfigJson.evidenceKeyId,
      sourceRevision: inputs.sourceRevision,
    });
    return inputs;
  } catch {
    throw new TypeError("INVALID_GENERATION_INPUTS");
  }
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function exactKeys(value: unknown, keys: readonly string[]): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}
