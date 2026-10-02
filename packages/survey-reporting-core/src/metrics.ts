import type { CalendarUnit, DateRange, NormalizedDateRange, Rating, Sentiment } from "./contracts";
import { buildCalendarBuckets, normalizePeriod } from "./periods";

type CountInput = bigint | string;

export class MetricError extends Error { readonly code = "metric_overflow" as const; }

export interface MetricAspectSelection {
  readonly aspectKey: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly sentiment: Sentiment;
  readonly customText?: string;
}

export interface MetricSubmission {
  readonly receipt: string;
  readonly acceptedAt: string;
  readonly source: string;
  readonly versionKey: string;
  readonly pointKey: string;
  readonly overallRating: Rating;
  readonly commentText: string | null;
  readonly aspects: readonly MetricAspectSelection[];
}

const SENTIMENTS = ["positive", "neutral", "negative"] as const;
const COUNT_PATTERN = /^(0|[1-9]\d*)$/;
const MINORITY_EVIDENCE_THRESHOLD = 4n;

export interface EvidenceCategoryInput {
  readonly categoryKey: string;
  readonly evidenceRefs: readonly string[];
}

export interface EvidenceClassificationInput {
  readonly period: "current" | "previous";
  readonly eligibleCommentRefs: readonly string[];
  readonly requiredCategoryKeys: readonly string[];
  readonly categories: readonly EvidenceCategoryInput[];
}

function count(value: CountInput): bigint {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "bigint") throw new MetricError("Count must be nonnegative");
  if (!COUNT_PATTERN.test(value)) throw new MetricError("Count must be a base-10 integer");
  return BigInt(value);
}

function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new MetricError("Denominator must be positive");
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  return sign * (absolute / denominator + (2n * (absolute % denominator) >= denominator ? 1n : 0n));
}

function jsonInteger(value: bigint, minimum?: bigint, maximum?: bigint): number {
  if (
    value < BigInt(Number.MIN_SAFE_INTEGER) ||
    value > BigInt(Number.MAX_SAFE_INTEGER) ||
    (minimum !== undefined && value < minimum) ||
    (maximum !== undefined && value > maximum)
  ) {
    throw new MetricError("Final metric is outside its semantic or safe-integer range");
  }
  return Number(value);
}

export function calculateRateBps(selected: CountInput, eligible: CountInput): number | null {
  const numerator = count(selected);
  const denominator = count(eligible);
  if (denominator === 0n) return null;
  return jsonInteger(roundHalfUp(numerator * 10000n, denominator), 0n, 10000n);
}

export function calculateRelativeChangeBps(current: CountInput, previous: CountInput): number | null {
  const currentCount = count(current);
  const previousCount = count(previous);
  if (previousCount === 0n) return null;
  return jsonInteger(roundHalfUp((currentCount - previousCount) * 10000n, previousCount));
}

export function calculateRecurrentEvidenceThreshold(eligibleComments: CountInput): number {
  const eligible = count(eligibleComments);
  const twoPercentCeiling = (eligible * 2n + 99n) / 100n;
  return jsonInteger(twoPercentCeiling > 10n ? twoPercentCeiling : 10n, 0n);
}

function classifyEvidenceSignal(uniqueCommentCount: number, recurrentThreshold: number) {
  if (uniqueCommentCount >= recurrentThreshold) return "recurrent" as const;
  if (BigInt(uniqueCommentCount) >= MINORITY_EVIDENCE_THRESHOLD) return "minority" as const;
  return null;
}

export function classifyEvidenceCategories(input: EvidenceClassificationInput) {
  const eligibleRefs = new Set(input.eligibleCommentRefs);
  const recurrentThreshold = calculateRecurrentEvidenceThreshold(BigInt(eligibleRefs.size));
  const refsByCategory = new Map<string, Set<string>>();

  for (const category of input.categories) {
    const refs = refsByCategory.get(category.categoryKey) ?? new Set<string>();
    for (const reference of category.evidenceRefs) {
      if (eligibleRefs.has(reference)) refs.add(reference);
    }
    refsByCategory.set(category.categoryKey, refs);
  }

  return {
    period: input.period,
    eligibleCommentCount: eligibleRefs.size,
    recurrentThreshold,
    minorityThreshold: Number(MINORITY_EVIDENCE_THRESHOLD),
    categories: input.requiredCategoryKeys.map((categoryKey) => {
      const uniqueCommentCount = refsByCategory.get(categoryKey)?.size ?? 0;
      const signal = classifyEvidenceSignal(uniqueCommentCount, recurrentThreshold);
      return {
        categoryKey,
        uniqueCommentCount,
        status: signal === null ? "insufficient_evidence" as const : "supported" as const,
        signal,
      };
    }),
  };
}

function isoEpoch(value: string): number {
  const epoch = Date.parse(value);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString() !== value) throw new RangeError(`Invalid instant: ${value}`);
  return epoch;
}

function inRange(acceptedAt: number, range: NormalizedDateRange): boolean { return acceptedAt >= isoEpoch(range.utcStart) && acceptedAt <= isoEpoch(range.utcEnd); }

export function buildEligiblePopulations(
  submissions: readonly MetricSubmission[],
  period: { readonly current: NormalizedDateRange; readonly previous: NormalizedDateRange },
  dataCutoffAt: string,
  filters: { readonly pointKey: string | null; readonly versionKey: string | null },
) {
  const cutoff = isoEpoch(dataCutoffAt);
  const current: MetricSubmission[] = [];
  const previous: MetricSubmission[] = [];
  let excludedAfterCutoffCount = 0n;
  for (const item of submissions) {
    if (
      item.source !== "valid_qr" ||
      (filters.pointKey !== null && item.pointKey !== filters.pointKey) ||
      (filters.versionKey !== null && item.versionKey !== filters.versionKey)
    ) continue;
    const acceptedAt = isoEpoch(item.acceptedAt);
    const target = inRange(acceptedAt, period.current)
      ? current
      : inRange(acceptedAt, period.previous)
        ? previous
        : null;
    if (target === null) continue;
    if (acceptedAt > cutoff) excludedAfterCutoffCount += 1n;
    else target.push(item);
  }
  const order = (left: MetricSubmission, right: MetricSubmission) =>
    left.acceptedAt.localeCompare(right.acceptedAt) || left.receipt.localeCompare(right.receipt);
  return { current: current.sort(order), previous: previous.sort(order), excludedAfterCutoffCount: jsonInteger(excludedAfterCutoffCount, 0n) };
}

function metricCount(items: readonly unknown[]): bigint { return items.reduce<bigint>((result) => result + 1n, 0n); }

function category(total: bigint, categoryCount: bigint) { return { count: jsonInteger(categoryCount, 0n), rateBps: calculateRateBps(categoryCount, total) }; }

function periodMetrics(submissions: readonly MetricSubmission[]) {
  const total = metricCount(submissions);
  const stars = [1n, 2n, 3n, 4n, 5n].map(() => 0n);
  let sum = 0n;
  let comments = 0n;
  for (const item of submissions) {
    stars[item.overallRating - 1]! += 1n;
    sum += BigInt(item.overallRating);
    if (item.commentText?.trim()) comments += 1n;
  }
  const average = total === 0n ? null : jsonInteger(roundHalfUp(sum * 1000n, total), 1000n, 5000n);
  return {
    submissionCount: jsonInteger(total, 0n),
    commentCount: jsonInteger(comments, 0n),
    averageMilliStars: average,
    starDistribution: stars.map((value, index) => ({ star: (index + 1) as Rating, ...category(total, value) })),
    satisfied: category(total, stars[3]! + stars[4]!),
    neutral: category(total, stars[2]!),
    unfavorable: category(total, stars[0]! + stars[1]!),
  };
}

function signedDelta(current: number | null, previous: number | null): number | null { return current === null || previous === null ? null : jsonInteger(BigInt(current) - BigInt(previous)); }

function sentimentMetrics(submissions: readonly MetricSubmission[], aspectKey: string) {
  const values = SENTIMENTS.map((sentiment) => {
    let value = 0n;
    for (const item of submissions) {
      if (item.aspects.some((aspect) => aspect.aspectKey === aspectKey && aspect.sentiment === sentiment)) value += 1n;
    }
    return value;
  });
  const total = values.reduce((sum, value) => sum + value, 0n);
  return {
    total: jsonInteger(total, 0n),
    positive: category(total, values[0]!),
    neutral: category(total, values[1]!),
    negative: category(total, values[2]!),
  };
}

function medianTimesTwo(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const ordered = values.map(BigInt).sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const middle = Math.floor(ordered.length / 2);
  const result = ordered.length % 2 === 1 ? 2n * ordered[middle]! : ordered[middle - 1]! + ordered[middle]!;
  return jsonInteger(result, 0n);
}

export function calculateMetrics(
  currentSubmissions: readonly MetricSubmission[],
  previousSubmissions: readonly MetricSubmission[],
  definitions: readonly { readonly aspectKey: string; readonly sortOrder: number }[],
  trendRange: DateRange,
) {
  const current = periodMetrics(currentSubmissions);
  const previous = periodMetrics(previousSubmissions);
  const threshold = jsonInteger([10n, (metricCount(currentSubmissions) * 5n + 99n) / 100n]
    .reduce((left, right) => left > right ? left : right), 0n);
  const aspects = definitions.map(({ aspectKey, sortOrder }) => {
    const currentSentiment = sentimentMetrics(currentSubmissions, aspectKey);
    const previousSentiment = sentimentMetrics(previousSubmissions, aspectKey);
    const labels = new Map<string, bigint>();
    for (const item of [...currentSubmissions, ...previousSubmissions]) {
      for (const aspect of item.aspects) if (aspect.aspectKey === aspectKey) labels.set(aspect.label, (labels.get(aspect.label) ?? 0n) + 1n);
    }
    return {
      aspectKey,
      sortOrder,
      labelVariants: [...labels].map(([label, value]) => ({ label, count: jsonInteger(value, 0n) }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
      selectionCount: currentSentiment.total,
      selectionRateBps: calculateRateBps(BigInt(currentSentiment.total), metricCount(currentSubmissions)),
      evidenceThreshold: threshold,
      hasSufficientEvidence: aspectKey !== "other" && currentSentiment.total >= threshold,
      current: currentSentiment,
      previous: previousSentiment,
      relatedOverallRating: SENTIMENTS.map((sentiment) => {
        const cohort = currentSubmissions.filter((item) => item.aspects.some((aspect) => aspect.aspectKey === aspectKey && aspect.sentiment === sentiment));
        return { sentiment, submissionCount: jsonInteger(metricCount(cohort), 0n), averageMilliStars: periodMetrics(cohort).averageMilliStars };
      }),
      trend: (["day", "week", "month"] as const satisfies readonly CalendarUnit[]).flatMap((unit) =>
        buildCalendarBuckets(trendRange, unit).map((bucket) => {
          const range = normalizePeriod(bucket).current;
          const cohort = currentSubmissions.filter(({ acceptedAt }) => inRange(isoEpoch(acceptedAt), range));
          const sentiment = sentimentMetrics(cohort, aspectKey);
          return { unit, ...bucket, selectionCount: sentiment.total, sentiment };
        }),
      ),
    };
  }).sort((left, right) => right.selectionCount - left.selectionCount || left.sortOrder - right.sortOrder || left.aspectKey.localeCompare(right.aspectKey));

  const dominant = (sentiment: "positive" | "negative") => aspects
    .filter((aspect) => aspect.hasSufficientEvidence && aspect.current[sentiment].count > 0 && SENTIMENTS.every((other) => other === sentiment || aspect.current[sentiment].count > aspect.current[other].count))
    .sort((left, right) => right.current[sentiment].count - left.current[sentiment].count || right.selectionCount - left.selectionCount || left.aspectKey.localeCompare(right.aspectKey))
    .slice(0, 3).map(({ aspectKey }) => aspectKey);

  const qualifying = aspects.filter((aspect) => aspect.hasSufficientEvidence);
  const medianSelection = medianTimesTwo(qualifying.map(({ selectionCount }) => selectionCount));
  const medianNegative = medianTimesTwo(qualifying.map(({ current: value }) => value.negative.rateBps!));
  const matrix = aspects.map((aspect) => {
    let quadrant: "strength" | "priority" | "specific" | "secondary" | null = null;
    if (aspect.hasSufficientEvidence && medianSelection !== null && medianNegative !== null) {
      const highX = 2n * BigInt(aspect.selectionCount) >= BigInt(medianSelection);
      const highY = 2n * BigInt(aspect.current.negative.rateBps!) > BigInt(medianNegative);
      quadrant = highX ? (highY ? "priority" : "strength") : highY ? "specific" : "secondary";
    }
    const state = aspect.aspectKey === "other" ? "excluded" : aspect.hasSufficientEvidence ? "classified" : "insufficient_evidence";
    return { aspectKey: aspect.aspectKey, xSelectionCount: aspect.selectionCount, yNegativeRateBps: aspect.current.negative.rateBps, medianSelectionCountTimesTwo: medianSelection, medianNegativeRateBpsTimesTwo: medianNegative, state, quadrant };
  });

  const fiveStar = currentSubmissions.filter(({ overallRating }) => overallRating === 5);
  const oneToFour = currentSubmissions.filter(({ overallRating }) => overallRating < 5);
  const fiveStarAssociation = definitions.filter(({ aspectKey }) => aspectKey !== "other").map(({ aspectKey }) => {
    const positiveCount = (cohort: readonly MetricSubmission[]) => metricCount(cohort.filter((item) => item.aspects.some((aspect) => aspect.aspectKey === aspectKey && aspect.sentiment === "positive")));
    const fiveStarPositiveRateBps = calculateRateBps(positiveCount(fiveStar), metricCount(fiveStar));
    const oneToFourPositiveRateBps = calculateRateBps(positiveCount(oneToFour), metricCount(oneToFour));
    return { aspectKey, fiveStarPositiveRateBps, oneToFourPositiveRateBps, differenceBps: signedDelta(fiveStarPositiveRateBps, oneToFourPositiveRateBps) };
  }).sort((left, right) => (right.differenceBps ?? Number.MIN_SAFE_INTEGER) - (left.differenceBps ?? Number.MIN_SAFE_INTEGER) || left.aspectKey.localeCompare(right.aspectKey));

  const otherAspects = currentSubmissions.flatMap((item) => item.aspects.filter(({ aspectKey }) => aspectKey === "other").map((aspect) => ({
    receipt: item.receipt,
    text: aspect.customText ?? "",
    sentiment: aspect.sentiment,
    overallRating: item.overallRating,
    acceptedAt: item.acceptedAt,
    pointKey: item.pointKey,
  })));
  return {
    current,
    previous,
    deltas: {
      submissionCount: signedDelta(current.submissionCount, previous.submissionCount),
      submissionPercentBps: calculateRelativeChangeBps(BigInt(current.submissionCount), BigInt(previous.submissionCount)),
      commentCount: signedDelta(current.commentCount, previous.commentCount),
      averageMilliStars: signedDelta(current.averageMilliStars, previous.averageMilliStars),
      satisfiedRateBps: signedDelta(current.satisfied.rateBps, previous.satisfied.rateBps),
      neutralRateBps: signedDelta(current.neutral.rateBps, previous.neutral.rateBps),
      unfavorableRateBps: signedDelta(current.unfavorable.rateBps, previous.unfavorable.rateBps),
    },
    aspects,
    classifications: { strengths: dominant("positive"), opportunities: dominant("negative") },
    matrix,
    fiveStarAssociation,
    otherAspects,
  };
}
