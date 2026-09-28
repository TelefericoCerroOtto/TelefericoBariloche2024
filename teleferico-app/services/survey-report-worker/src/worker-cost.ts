import type { PricingSnapshotV1 } from "./contracts";

export const COST_ALERT_THRESHOLD_MICROS = 10_000_000n;

export type ProviderUsageV1 = {
  readonly model: string;
  readonly modelRevision: string;
  readonly sku: string;
  readonly usageMetadata: {
    readonly promptTokenCount: number;
    readonly candidatesTokenCount: number;
  };
};

export type PersistedStageUsageV1 = ProviderUsageV1 & {
  readonly stageKey: string;
  readonly pricingSnapshotVersion: string;
  readonly costMicros: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateProviderUsageV1(
  value: unknown,
  expectedModel: string,
): ProviderUsageV1 {
  if (!isRecord(value) ||
      Object.keys(value).length !== 4 ||
      typeof value.model !== "string" || value.model !== expectedModel ||
      typeof value.modelRevision !== "string" || value.modelRevision.length === 0 || value.modelRevision.length > 128 ||
      typeof value.sku !== "string" || value.sku.length === 0 || value.sku.length > 128 ||
      !isRecord(value.usageMetadata) || Object.keys(value.usageMetadata).length !== 2 ||
      !Number.isSafeInteger(value.usageMetadata.promptTokenCount) || Number(value.usageMetadata.promptTokenCount) < 0 ||
      !Number.isSafeInteger(value.usageMetadata.candidatesTokenCount) || Number(value.usageMetadata.candidatesTokenCount) < 0)
    throw Object.assign(new TypeError("Provider usage evidence is missing or malformed"), { code: "CONFIGURATION" as const });

  return value as unknown as ProviderUsageV1;
}

export function priceProviderUsageV1(
  usage: ProviderUsageV1,
  pricingSnapshot: PricingSnapshotV1,
  model: string,
  stageKey: string,
): PersistedStageUsageV1 {
  if (!pricingSnapshot || pricingSnapshot.currency !== "USD" ||
      typeof pricingSnapshot.version !== "string" || pricingSnapshot.version.length === 0 || pricingSnapshot.version.length > 128 ||
      !Array.isArray(pricingSnapshot.units) ||
      Object.keys(pricingSnapshot).length !== 3 ||
      !["direct", "reduce"].includes(stageKey) && !/^map\.[1-9]\d*-of-[1-9]\d*$/.test(stageKey))
    throw Object.assign(new TypeError("Pricing snapshot is invalid"), { code: "CONFIGURATION" as const });
  if (pricingSnapshot.units.some((unit) => !isRecord(unit) ||
      Object.keys(unit).length !== 3 || typeof unit.sku !== "string" || unit.sku.length === 0 || unit.sku.length > 128))
    throw Object.assign(new TypeError("Pricing snapshot is invalid"), { code: "CONFIGURATION" as const });
  if (new Set(pricingSnapshot.units.map(({ sku }) => sku)).size !== pricingSnapshot.units.length)
    throw Object.assign(new TypeError("Pricing snapshot is invalid"), { code: "CONFIGURATION" as const });
  const unit = pricingSnapshot.units.find(({ sku }) => sku === usage.sku);
  if (usage.model !== model || !unit ||
      !Number.isSafeInteger(unit.inputMicrosPerMillion) || unit.inputMicrosPerMillion < 0 ||
      !Number.isSafeInteger(unit.outputMicrosPerMillion) || unit.outputMicrosPerMillion < 0)
    throw Object.assign(new TypeError("Provider usage does not match the immutable pricing snapshot"), { code: "CONFIGURATION" as const });

  const inputMicros = (BigInt(usage.usageMetadata.promptTokenCount) * BigInt(unit.inputMicrosPerMillion) + 999_999n) / 1_000_000n;
  const outputMicros = (BigInt(usage.usageMetadata.candidatesTokenCount) * BigInt(unit.outputMicrosPerMillion) + 999_999n) / 1_000_000n;
  const costMicros = inputMicros + outputMicros;
  if (costMicros > BigInt(Number.MAX_SAFE_INTEGER))
    throw Object.assign(new TypeError("Provider usage cost exceeds the supported range"), { code: "CONFIGURATION" as const });
  return {
    ...usage,
    stageKey,
    pricingSnapshotVersion: pricingSnapshot.version,
    costMicros: costMicros.toString(),
  };
}
