import { describe, expect, it, vi } from "vitest";

import {
  priceProviderUsageV1,
  validateProviderUsageV1,
} from "../../../services/survey-report-worker/src/worker-cost";
import { deliverPendingWorkerAlerts } from "../../../services/survey-report-worker/src/worker-alerts";
import type { WorkerAlertIntentV1 } from "../../../services/survey-report-worker/src/contracts";

const pricingSnapshot = {
  version: "synthetic-pricing.v1",
  currency: "USD" as const,
  units: [{
    sku: "synthetic-sku",
    inputMicrosPerMillion: 1,
    outputMicrosPerMillion: 2,
  }],
};

function providerUsage(overrides: Record<string, unknown> = {}) {
  return {
    model: "synthetic-model",
    modelRevision: "synthetic-revision-1",
    sku: "synthetic-sku",
    usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1 },
    ...overrides,
  };
}

describe("worker usage cost", () => {
  it("validates returned model, revision, SKU, and token usage before pricing", () => {
    expect(validateProviderUsageV1(providerUsage(), "synthetic-model")).toEqual(providerUsage());

    for (const malformed of [
      { ...providerUsage(), model: "other-model" },
      { ...providerUsage(), modelRevision: "" },
      { ...providerUsage(), sku: "" },
      { ...providerUsage(), usageMetadata: { promptTokenCount: -1, candidatesTokenCount: 0 } },
      { ...providerUsage(), usageMetadata: { promptTokenCount: 0, candidatesTokenCount: 1.5 } },
      { ...providerUsage(), extra: true },
    ]) {
      expect(() => validateProviderUsageV1(malformed, "synthetic-model")).toThrow();
    }
  });

  it("rejects provider prompt usage above the immutable model input limit", () => {
    expect(() => validateProviderUsageV1({
      ...providerUsage(),
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 1 },
    }, "synthetic-model", 2)).toThrow();
    expect(validateProviderUsageV1(providerUsage(), "synthetic-model", 2)).toEqual(providerUsage());
  });

  it("rounds input and output micro-USD independently using returned token counts", () => {
    const usage = validateProviderUsageV1(providerUsage(), "synthetic-model");
    expect(priceProviderUsageV1(usage, pricingSnapshot, "synthetic-model", "direct")).toEqual({
      ...providerUsage(),
      stageKey: "direct",
      pricingSnapshotVersion: "synthetic-pricing.v1",
      costMicros: "2",
    });
  });

  it("fails closed for an unknown SKU, malformed prices, or unsafe computed cost", () => {
    const usage = validateProviderUsageV1(providerUsage(), "synthetic-model");
    expect(() => priceProviderUsageV1({ ...usage, sku: "unpriced" }, pricingSnapshot, "synthetic-model", "direct")).toThrow();
    expect(() => priceProviderUsageV1(usage, {
      ...pricingSnapshot,
      units: [{ ...pricingSnapshot.units[0], inputMicrosPerMillion: 1.5 }],
    }, "synthetic-model", "direct")).toThrow();
    expect(() => priceProviderUsageV1({
      ...usage,
      usageMetadata: { promptTokenCount: Number.MAX_SAFE_INTEGER, candidatesTokenCount: 0 },
    }, {
      ...pricingSnapshot,
      units: [{ ...pricingSnapshot.units[0], inputMicrosPerMillion: Number.MAX_SAFE_INTEGER }],
    }, "synthetic-model", "direct")).toThrow();
  });

  it("uses stable notifier idempotency and acknowledges only confirmed acceptance", async () => {
    const reportRunId = "00000000-0000-4000-8000-000000000113";
    const intent: WorkerAlertIntentV1 = {
      deduplicationKey: `tb113:cost-over-10-usd:${reportRunId}:v1`,
      kind: "cost-threshold" as const,
      reportRunId,
      cumulativeCostMicros: "10000001",
    };
    const effects = new Set<string>();
    let acknowledgementCalls = 0;
    const acknowledgement = vi.fn(async (_runId: string, command: { deduplicationKey: string }) => ({
      reportRunId,
      deduplicationKey: command.deduplicationKey,
      status: "delivered" as const,
      replayed: acknowledgementCalls++ > 0,
    }));
    const notifier = vi.fn(async (event: WorkerAlertIntentV1) => {
      if (notifier.mock.calls.length === 1) throw new Error("synthetic notifier outage");
      effects.add(event.deduplicationKey);
      return { accepted: true as const, idempotencyKey: event.deduplicationKey };
    });
    const input = {
      reportRunId,
      alerts: [intent],
      dependencies: {
        cms: { acknowledgeAlert: acknowledgement } as never,
        usageNotifier: notifier,
      },
    };

    await expect(deliverPendingWorkerAlerts(input)).resolves.toBeUndefined();
    expect(acknowledgement).not.toHaveBeenCalled();
    await expect(deliverPendingWorkerAlerts(input)).resolves.toBeUndefined();
    await expect(deliverPendingWorkerAlerts(input)).resolves.toBeUndefined();

    expect(notifier.mock.calls.map(([event]) => event.deduplicationKey)).toEqual([
      intent.deduplicationKey,
      intent.deduplicationKey,
      intent.deduplicationKey,
    ]);
    expect(effects.size).toBe(1);
    expect(acknowledgement).toHaveBeenCalledTimes(2);
  });
});
