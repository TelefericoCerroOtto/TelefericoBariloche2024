import { canonicalizeJson } from "./canonical-json";
import {
  CANONICALIZATION_VERSION,
  REPORTING_TIME_ZONE,
  SNAPSHOT_CONTRACT_VERSION,
  type CalendarUnit,
  type DateRange,
  type Locale,
} from "./contracts";
import { buildEligiblePopulations, calculateMetrics, type MetricSubmission } from "./metrics";
import { buildCalendarBuckets, normalizePeriod } from "./periods";

export interface SnapshotSubmission extends MetricSubmission {
  readonly recordId: string;
  readonly locale: Locale;
  readonly payloadDigest: string;
}

interface SnapshotInput {
  readonly sourceRevision: string;
  readonly createdAt: string;
  readonly dataCutoffAt: string;
  readonly range: DateRange;
  readonly filters: { readonly pointKey: string | null; readonly versionKey: string | null };
  readonly submissions: readonly SnapshotSubmission[];
  readonly definitions: readonly { readonly aspectKey: string; readonly sortOrder: number }[];
  readonly points: readonly { readonly pointKey: string; readonly displayName: string; readonly sortOrder: number }[];
}

type SnapshotMetrics = ReturnType<typeof calculateMetrics> & {
  readonly calendar: readonly CalendarMetric[];
  readonly qrPoints: readonly PointMetric[];
};
type PeriodMetric = ReturnType<typeof calculateMetrics>["current"];
type CalendarMetric = {
  readonly period: "current" | "previous";
  readonly unit: CalendarUnit;
  readonly from: string;
  readonly to: string;
  readonly submissionCount: number;
  readonly satisfactionRateBps: number | null;
};
type PointMetric = {
  readonly pointKey: string;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly current: PeriodMetric;
  readonly previous: PeriodMetric;
};

export interface SnapshotV1 {
  readonly contractVersion: typeof SNAPSHOT_CONTRACT_VERSION;
  readonly sourceRevision: string;
  readonly createdAt: string;
  readonly population: ReturnType<typeof populationMeta>;
  readonly metrics: SnapshotMetrics;
  readonly comments: readonly ReturnType<typeof commentRecord>[];
}

export interface SnapshotEnvelopeV1 {
  readonly canonicalization: typeof CANONICALIZATION_VERSION;
  readonly algorithm: "sha256";
  readonly digestHex: string;
  readonly payload: SnapshotV1;
}

function sha256(value: string): string {
  const constants = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
  const bytes: number[] = [];
  for (const character of value) {
    const point = character.codePointAt(0)!;
    if (point < 0x80) bytes.push(point);
    else if (point < 0x800) bytes.push(0xc0 | point >> 6, 0x80 | point & 63);
    else if (point < 0x10000) bytes.push(0xe0 | point >> 12, 0x80 | point >> 6 & 63, 0x80 | point & 63);
    else bytes.push(0xf0 | point >> 18, 0x80 | point >> 12 & 63, 0x80 | point >> 6 & 63, 0x80 | point & 63);
  }
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const lengthWords = [Math.floor(bitLength / 0x100000000), bitLength >>> 0];
  for (const word of lengthWords) for (let index = 3; index >= 0; index -= 1) bytes.push(word >>> index * 8 & 255);
  const hash = [1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225];
  const rotate = (number: number, bits: number) => number >>> bits | number << 32 - bits;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const words = Array<number>(64);
    for (let index = 0; index < 16; index += 1) words[index] = bytes.slice(offset + index * 4, offset + index * 4 + 4).reduce((result, byte) => result << 8 | byte, 0);
    for (let index = 16; index < 64; index += 1) {
      const left = words[index - 15]!; const right = words[index - 2]!;
      words[index] = (words[index - 16]! + (rotate(left, 7) ^ rotate(left, 18) ^ left >>> 3) + words[index - 7]! + (rotate(right, 17) ^ rotate(right, 19) ^ right >>> 10)) | 0;
    }
    let [a,b,c,d,e,f,g,h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const upper = rotate(e!, 6) ^ rotate(e!, 11) ^ rotate(e!, 25);
      const first = (h! + upper + (e! & f! ^ ~e! & g!) + constants[index]! + words[index]!) | 0;
      const lower = rotate(a!, 2) ^ rotate(a!, 13) ^ rotate(a!, 22);
      const second = (lower + (a! & b! ^ a! & c! ^ b! & c!)) | 0;
      [a,b,c,d,e,f,g,h] = [(first + second) | 0,a,b,c,(d! + first) | 0,e,f,g];
    }
    [a,b,c,d,e,f,g,h].forEach((number, index) => { hash[index] = (hash[index]! + number!) | 0; });
  }
  return hash.map((number) => (number >>> 0).toString(16).padStart(8, "0")).join("");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

function commentRecord(item: SnapshotSubmission, period: "current" | "previous") {
  return { recordId: item.recordId, receipt: item.receipt, period, acceptedAt: item.acceptedAt, locale: item.locale, versionKey: item.versionKey, pointKey: item.pointKey, overallRating: item.overallRating, aspectRatings: item.aspects.map(({ aspectKey, label, sortOrder, sentiment }) => ({ aspectKey, label, sortOrder, rating: sentiment })), text: item.commentText! };
}

function populationMeta(input: SnapshotInput, populations: ReturnType<typeof buildEligiblePopulations>) {
  const normalized = normalizePeriod(input.range);
  const digestRows = (["current", "previous"] as const).flatMap((period) => populations[period]
    .map((item) => [period, item.receipt, item.acceptedAt, item.versionKey, item.pointKey, (item as SnapshotSubmission).payloadDigest]));
  return { source: "valid_qr" as const, timeZone: REPORTING_TIME_ZONE, current: normalized.current, previous: normalized.previous, dataCutoffAt: input.dataCutoffAt, filters: input.filters, currentSubmissionCount: populations.current.length, previousSubmissionCount: populations.previous.length, currentCommentCount: populations.current.filter(({ commentText }) => commentText?.trim()).length, previousCommentCount: populations.previous.filter(({ commentText }) => commentText?.trim()).length, excludedAfterCutoffCount: populations.excludedAfterCutoffCount, populationDigest: sha256(canonicalizeJson({ rows: digestRows, filters: input.filters, cutoff: input.dataCutoffAt })) };
}

function periodMetric(items: readonly MetricSubmission[], range: DateRange): PeriodMetric {
  return calculateMetrics(items, [], [], range).current;
}

export function createSnapshot(input: SnapshotInput): SnapshotEnvelopeV1 {
  const normalized = normalizePeriod(input.range);
  const populations = buildEligiblePopulations(input.submissions, normalized, input.dataCutoffAt, input.filters);
  const metrics = calculateMetrics(populations.current, populations.previous, input.definitions, input.range);
  const calendar = (["current", "previous"] as const).flatMap((period) => (["day", "week", "month"] as const).flatMap((unit) =>
    buildCalendarBuckets(normalized[period], unit).map((bucket) => {
      const cohort = populations[period].filter(({ acceptedAt }) => acceptedAt >= normalizePeriod(bucket).current.utcStart && acceptedAt <= normalizePeriod(bucket).current.utcEnd);
      const value = periodMetric(cohort, bucket);
      return { period, unit, ...bucket, submissionCount: value.submissionCount, satisfactionRateBps: value.satisfied.rateBps };
    }),
  ));
  const qrPoints = [...input.points]
    .sort((left, right) => left.sortOrder - right.sortOrder || (left.pointKey < right.pointKey ? -1 : left.pointKey > right.pointKey ? 1 : 0))
    .map((point) => ({
      ...point,
      current: periodMetric(populations.current.filter(({ pointKey }) => pointKey === point.pointKey), input.range),
      previous: periodMetric(populations.previous.filter(({ pointKey }) => pointKey === point.pointKey), input.range),
    }));
  const comments = [
    ...populations.current.filter(({ commentText }) => commentText?.trim()).map((item) => commentRecord(item as SnapshotSubmission, "current")),
    ...populations.previous.filter(({ commentText }) => commentText?.trim()).map((item) => commentRecord(item as SnapshotSubmission, "previous")),
  ].sort((left, right) =>
    left.period < right.period ? -1 : left.period > right.period ? 1 :
      left.acceptedAt < right.acceptedAt ? -1 : left.acceptedAt > right.acceptedAt ? 1 :
        left.recordId < right.recordId ? -1 : left.recordId > right.recordId ? 1 : 0,
  );
  const payload: SnapshotV1 = {
    contractVersion: SNAPSHOT_CONTRACT_VERSION,
    sourceRevision: input.sourceRevision,
    createdAt: input.createdAt,
    population: populationMeta(input, populations),
    metrics: { ...metrics, calendar, qrPoints },
    comments,
  };
  const digestHex = sha256(canonicalizeJson(payload));
  return deepFreeze({ canonicalization: CANONICALIZATION_VERSION, algorithm: "sha256", digestHex, payload });
}

export function validateSnapshotEnvelope(envelope: SnapshotEnvelopeV1): SnapshotV1 {
  if (envelope.canonicalization !== CANONICALIZATION_VERSION || envelope.algorithm !== "sha256" || envelope.payload.contractVersion !== SNAPSHOT_CONTRACT_VERSION) throw new TypeError("Unknown snapshot contract");
  if (sha256(canonicalizeJson(envelope.payload)) !== envelope.digestHex) throw new TypeError("Snapshot digest mismatch");
  if (envelope.payload.metrics.current.submissionCount !== envelope.payload.population.currentSubmissionCount || envelope.payload.metrics.previous.submissionCount !== envelope.payload.population.previousSubmissionCount) throw new TypeError("Snapshot population mismatch");
  return envelope.payload;
}

type Cell = string | number | null;
export interface ChartViewModelV1 {
  readonly version: "chart-view-model.v1";
  readonly id: string;
  readonly kind: "bar" | "line" | "comparison" | "scatter";
  readonly title: string;
  readonly description: string;
  readonly unit: "count" | "percent";
  readonly categories: readonly string[];
  readonly series: readonly {
    readonly name: string;
    readonly values: readonly (number | null)[];
    readonly color: "positive" | "neutral" | "negative";
  }[];
  readonly legend: readonly string[];
  readonly annotations: readonly string[];
  readonly emptyState: string;
  readonly table: {
    readonly caption: string;
    readonly headers: readonly string[];
    readonly rows: readonly (readonly Cell[])[];
  };
}

const EMPTY_STATE = "No hay datos disponibles para el período seleccionado.";
const UNAVAILABLE = "No disponible";
export const formatCount = (value: number): string => String(value);
const decimal = (value: number, scale: number) => { const tenths = Math.floor((Math.abs(value) + scale / 20) / (scale / 10)); return `${value < 0 ? "-" : ""}${Math.floor(tenths / 10)}.${tenths % 10}`; };
export const formatMilliStars = (value: number | null): string => value === null ? UNAVAILABLE : decimal(value, 1000);
export const formatPercent = (value: number | null): string => value === null ? UNAVAILABLE : `${decimal(value, 100)}%`;

export function buildReportCharts(snapshot: SnapshotV1): readonly ChartViewModelV1[] {
  const empty = snapshot.metrics.current.submissionCount === 0;
  const chart = (
    id: string,
    kind: ChartViewModelV1["kind"],
    title: string,
    unit: "count" | "percent",
    categories: string[],
    series: ChartViewModelV1["series"],
  ): ChartViewModelV1 => ({
    version: "chart-view-model.v1", id, kind, title, description: title, unit,
    categories: empty ? [] : categories,
    series: series.map((item) => ({ ...item, values: empty ? [] : item.values })),
    legend: series.map(({ name }) => name),
    annotations: [],
    emptyState: EMPTY_STATE,
    table: {
      caption: title,
      headers: ["Categoría", ...series.map(({ name }) => name)],
      rows: empty ? [] : categories.map((category, index) => [category, ...series.map(({ values }) => values[index] ?? null)]),
    },
  });
  const days = snapshot.metrics.calendar.filter(({ period, unit }) => period === "current" && unit === "day");
  const aspects = snapshot.metrics.aspects.filter(({ aspectKey }) => aspectKey !== "other");
  return [
    chart("star-distribution", "bar", "Distribución de estrellas", "count", snapshot.metrics.current.starDistribution.map(({ star }) => String(star)), [{ name: "Respuestas", values: snapshot.metrics.current.starDistribution.map(({ count }) => count), color: "neutral" }]),
    chart("satisfaction-evolution", "line", "Evolución de satisfacción", "percent", days.map(({ from }) => from), [{ name: "Satisfacción", values: days.map(({ satisfactionRateBps }) => satisfactionRateBps), color: "positive" }]),
    chart("response-volume-evolution", "line", "Evolución del volumen", "count", days.map(({ from }) => from), [{ name: "Respuestas", values: days.map(({ submissionCount }) => submissionCount), color: "neutral" }]),
    chart("aspect-comparison", "comparison", "Comparación de aspectos", "count", aspects.map(({ labelVariants, aspectKey }) => labelVariants[0]?.label ?? aspectKey), [{ name: "Selecciones", values: aspects.map(({ selectionCount }) => selectionCount), color: "positive" }]),
    chart("qr-point-comparison", "comparison", "Comparación de puntos QR", "count", snapshot.metrics.qrPoints.map(({ displayName }) => displayName), [{ name: "Respuestas", values: snapshot.metrics.qrPoints.map(({ current }) => current.submissionCount), color: "neutral" }]),
  ];
}
