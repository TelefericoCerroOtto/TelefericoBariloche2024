import { describe, expect, it } from "vitest";

import { normalizePeriod } from "./periods";
import {
  MetricError,
  buildEligiblePopulations,
  calculateRecurrentEvidenceThreshold,
  calculateMetrics,
  calculateRateBps,
  calculateRelativeChangeBps,
  classifyEvidenceCategories,
  type MetricSubmission,
} from "./metrics";

const submission = (
  receipt: string, acceptedAt: string, overallRating: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<MetricSubmission> = {},
): MetricSubmission => ({
  receipt,
  acceptedAt,
  source: "valid_qr",
  versionKey: "v1",
  pointKey: "summit",
  overallRating,
  commentText: null,
  aspects: [],
  ...overrides,
});

describe("exact metric arithmetic", () => {
  it("uses BigInt scaling and sign-aware half-up rounding", () => {
    expect(calculateRateBps("9007199254740990", "9007199254740990")).toBe(10000);
    expect(calculateRelativeChangeBps("1", "3")).toBe(-6667);
    expect(calculateRelativeChangeBps("7", "0")).toBeNull();
  });

  it("rejects malformed counts and unsafe final values as metric_overflow", () => {
    expect(() => calculateRateBps("-1", "2")).toThrow(MetricError);
    expect(() => calculateRelativeChangeBps(Number.MAX_SAFE_INTEGER.toString(), "1")).toThrow(
      expect.objectContaining({ code: "metric_overflow" }),
    );
  });
});

describe("eligible populations", () => {
  it("applies accepted valid-QR ranges, cutoff, scope, and stable ordering", () => {
    const period = normalizePeriod({ from: "2026-08-11", to: "2026-08-12" });
    const result = buildEligiblePopulations(
      [
        submission("b", "2026-08-11T03:00:00.000Z", 5),
        submission("a", "2026-08-11T03:00:00.000Z", 4),
        submission("previous", "2026-08-10T03:00:00.000Z", 3),
        submission("outside-range", "2026-08-13T03:00:00.000Z", 2),
        submission("after-cutoff", "2026-08-12T12:00:00.001Z", 1),
        submission("wrong-source", "2026-08-11T04:00:00.000Z", 1, { source: "imported" }),
        submission("wrong-point", "2026-08-11T04:00:00.000Z", 1, { pointKey: "base" }),
      ],
      period,
      "2026-08-12T12:00:00.000Z",
      { pointKey: "summit", versionKey: "v1" },
    );

    expect(result.current.map(({ receipt }) => receipt)).toEqual(["a", "b"]);
    expect(result.previous.map(({ receipt }) => receipt)).toEqual(["previous"]);
    expect(result.excludedAfterCutoffCount).toBe(1);
  });
});

describe("comment evidence classification", () => {
  it("calculates the recurrent threshold independently from each period's eligible comments", () => {
    expect(calculateRecurrentEvidenceThreshold("0")).toBe(10);
    expect(calculateRecurrentEvidenceThreshold("500")).toBe(10);
    expect(calculateRecurrentEvidenceThreshold("501")).toBe(11);
    expect(calculateRecurrentEvidenceThreshold("1001")).toBe(21);
  });

  it("keeps recurrent and minority signals distinct with recurrent precedence", () => {
    const eligibleCommentRefs = Array.from({ length: 1001 }, (_, index) => `e_${index}`);
    const result = classifyEvidenceCategories({
      period: "current",
      eligibleCommentRefs,
      requiredCategoryKeys: ["recurrent", "minority", "overlap", "weak", "missing"],
      categories: [
        { categoryKey: "recurrent", evidenceRefs: eligibleCommentRefs.slice(0, 21) },
        { categoryKey: "minority", evidenceRefs: eligibleCommentRefs.slice(30, 34) },
        { categoryKey: "overlap", evidenceRefs: [...eligibleCommentRefs.slice(40, 61), "e_40"] },
        { categoryKey: "weak", evidenceRefs: eligibleCommentRefs.slice(70, 73) },
      ],
    });

    expect(result).toEqual({
      period: "current",
      eligibleCommentCount: 1001,
      recurrentThreshold: 21,
      minorityThreshold: 4,
      categories: [
        { categoryKey: "recurrent", uniqueCommentCount: 21, status: "supported", signal: "recurrent" },
        { categoryKey: "minority", uniqueCommentCount: 4, status: "supported", signal: "minority" },
        { categoryKey: "overlap", uniqueCommentCount: 21, status: "supported", signal: "recurrent" },
        { categoryKey: "weak", uniqueCommentCount: 3, status: "insufficient_evidence", signal: null },
        { categoryKey: "missing", uniqueCommentCount: 0, status: "insufficient_evidence", signal: null },
      ],
    });
  });

  it("does not combine evidence across periods", () => {
    const current = classifyEvidenceCategories({
      period: "current",
      eligibleCommentRefs: Array.from({ length: 1001 }, (_, index) => `current_${index}`),
      requiredCategoryKeys: ["theme"],
      categories: [{ categoryKey: "theme", evidenceRefs: Array.from({ length: 10 }, (_, index) => `current_${index}`) }],
    });
    const previous = classifyEvidenceCategories({
      period: "previous",
      eligibleCommentRefs: Array.from({ length: 10 }, (_, index) => `previous_${index}`),
      requiredCategoryKeys: ["theme"],
      categories: [{ categoryKey: "theme", evidenceRefs: Array.from({ length: 10 }, (_, index) => `previous_${index}`) }],
    });

    expect(current.categories[0]).toMatchObject({ signal: "minority", uniqueCommentCount: 10 });
    expect(previous.categories[0]).toMatchObject({ signal: "recurrent", uniqueCommentCount: 10 });
  });
});

describe("authoritative metrics", () => {
  const definitions = [
    { aspectKey: "a", sortOrder: 1 },
    { aspectKey: "b", sortOrder: 2 },
    { aspectKey: "c", sortOrder: 3 },
    { aspectKey: "other", sortOrder: 4 },
  ] as const;
  const current = Array.from({ length: 10 }, (_, index) =>
    submission(`c${index}`, index === 0 ? "2026-08-12T02:59:59.999Z" : `2026-08-${String(11 + index).padStart(2, "0")}T12:00:00.000Z`, index < 5 ? 5 : 3, {
      aspects: [
        { aspectKey: "a", label: "A", sortOrder: 1, sentiment: "positive" },
        { aspectKey: "b", label: "B", sortOrder: 2, sentiment: "negative" },
        ...(index < 5
          ? [{ aspectKey: "c", label: "C", sortOrder: 3, sentiment: "positive" as const }]
          : []),
        ...(index === 0
          ? [{ aspectKey: "other", label: "Other", sortOrder: 4, sentiment: "neutral" as const, customText: "Original text" }]
          : []),
      ],
    }),
  );

  it("calculates KPI deltas, classifications, matrix boundaries, and association", () => {
    const result = calculateMetrics(current, [submission("p", "2026-08-01T12:00:00.000Z", 4)], definitions, { from: "2026-08-11", to: "2026-08-20" });

    expect(result.current).toMatchObject({ submissionCount: 10, averageMilliStars: 4000 });
    expect(result.deltas).toMatchObject({ submissionCount: 9, submissionPercentBps: 90000 });
    expect(result.aspects.map(({ aspectKey, selectionCount, hasSufficientEvidence }) => [aspectKey, selectionCount, hasSufficientEvidence])).toEqual([
      ["a", 10, true],
      ["b", 10, true],
      ["c", 5, false],
      ["other", 1, false],
    ]);
    expect(result.classifications).toEqual({ strengths: ["a"], opportunities: ["b"] });
    expect(result.aspects.find(({ aspectKey }) => aspectKey === "c")?.relatedOverallRating).toContainEqual({ sentiment: "positive", submissionCount: 5, averageMilliStars: 5000 });
    const aspectATrend = result.aspects.find(({ aspectKey }) => aspectKey === "a")!.trend;
    expect(["day", "week", "month"].map((unit) => aspectATrend.filter((bucket) => bucket.unit === unit).length)).toEqual([10, 2, 1]);
    expect(aspectATrend).toEqual(expect.arrayContaining([expect.objectContaining({ unit: "day", from: "2026-08-11", selectionCount: 1 }), expect.objectContaining({ unit: "week", from: "2026-08-11", to: "2026-08-16", selectionCount: 6, sentiment: expect.objectContaining({ positive: { count: 6, rateBps: 10000 } }) })]));
    expect(result.matrix.slice(0, 2)).toEqual([
      expect.objectContaining({ aspectKey: "a", medianSelectionCountTimesTwo: 20, medianNegativeRateBpsTimesTwo: 10000, quadrant: "strength" }),
      expect.objectContaining({ aspectKey: "b", quadrant: "priority" }),
    ]);
    expect(result.fiveStarAssociation[0]).toMatchObject({ aspectKey: "c", differenceBps: 10000 });
    expect(result.otherAspects).toEqual([
      expect.objectContaining({ receipt: "c0", text: "Original text", sentiment: "neutral" }),
    ]);
    expect(Object.keys(result)).toEqual(["current", "previous", "deltas", "aspects", "classifications", "matrix", "fiveStarAssociation", "otherAspects"]);
  });

  it("returns unavailable ratios for empty denominators and no matrix references", () => {
    const result = calculateMetrics([], [], definitions, { from: "2026-08-11", to: "2026-08-20" });
    expect(result.current).toMatchObject({ submissionCount: 0, averageMilliStars: null });
    expect(result.deltas.submissionPercentBps).toBeNull();
    expect(result.matrix.map(({ state, quadrant }) => [state, quadrant])).toEqual([["insufficient_evidence", null], ["insufficient_evidence", null], ["insufficient_evidence", null], ["excluded", null]]);
    expect(result.fiveStarAssociation.every(({ differenceBps }) => differenceBps === null)).toBe(true);
  });
});
