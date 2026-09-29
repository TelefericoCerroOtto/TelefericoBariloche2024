import { describe, expect, it } from "vitest";

import {
  buildReportCharts,
  createSnapshot,
  formatCount,
  formatMilliStars,
  formatPercent,
  validateSnapshotEnvelope,
  type SnapshotSubmission,
} from "./snapshot";

const response = (
  receipt: string,
  acceptedAt: string,
  rating: 1 | 2 | 3 | 4 | 5,
  overrides: Partial<SnapshotSubmission> = {},
): SnapshotSubmission => ({
  recordId: `record-${receipt}`,
  receipt,
  acceptedAt,
  source: "valid_qr",
  versionKey: "v1",
  pointKey: "summit",
  overallRating: rating,
  locale: "es",
  commentText: null,
  payloadDigest: `digest-${receipt}`,
  aspects: [],
  ...overrides,
});

const input = {
  sourceRevision: "revision-1",
  createdAt: "2026-08-21T12:00:00.000Z",
  dataCutoffAt: "2026-08-21T12:00:00.000Z",
  range: { from: "2026-08-11", to: "2026-08-20" },
  filters: { pointKey: null, versionKey: null },
  definitions: [
    { aspectKey: "views", sortOrder: 1 },
    { aspectKey: "other", sortOrder: 2 },
  ],
  points: [
    { pointKey: "base", displayName: "Base", sortOrder: 1 },
    { pointKey: "summit", displayName: "Cumbre", sortOrder: 2 },
  ],
} as const;

describe("immutable survey snapshots", () => {
  it("captures complete metrics, populations, comments, point rows, and canonical digests", () => {
    const envelope = createSnapshot({
      ...input,
      submissions: [
        response("previous", "2026-08-05T12:00:00.000Z", 3),
        response("current", "2026-08-12T12:00:00.000Z", 5, {
          commentText: "Paisaje inolvidable",
          aspects: [{ aspectKey: "views", label: "Vistas", sortOrder: 1, sentiment: "positive" }],
        }),
      ],
    });

    expect(envelope).toMatchObject({
      canonicalization: "tb-json.v1",
      algorithm: "sha256",
      payload: {
        contractVersion: "survey-snapshot.v1",
        population: { currentSubmissionCount: 1, previousSubmissionCount: 1 },
        metrics: { current: { submissionCount: 1 }, previous: { submissionCount: 1 } },
        comments: [{ recordId: "record-current", text: "Paisaje inolvidable" }],
      },
    });
    expect(envelope.digestHex).toBe("55a504a5340aeba3f23a037b94a81364c22bbdc2d670c56b373486a102acf5e0");
    expect(envelope.payload.population.populationDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(envelope.payload.metrics.qrPoints.map(({ pointKey }) => pointKey)).toEqual(["base", "summit"]);
    expect(envelope.payload.metrics.calendar.some(({ period, unit }) => period === "previous" && unit === "month")).toBe(true);
    expect(Object.isFrozen(envelope.payload.metrics)).toBe(true);
    expect(validateSnapshotEnvelope(envelope)).toBe(envelope.payload);
    expect(() => validateSnapshotEnvelope({ ...envelope, digestHex: "0".repeat(64) })).toThrow(/digest/);
  });
});

describe("renderer-neutral chart and display projections", () => {
  it("builds the five ordered charts with semantic tables from official snapshot values", () => {
    const snapshot = createSnapshot({
      ...input,
      submissions: [response("current", "2026-08-12T12:00:00.000Z", 5, {
        aspects: [{ aspectKey: "views", label: "Vistas", sortOrder: 1, sentiment: "positive" }],
      })],
    }).payload;
    const charts = buildReportCharts(snapshot);

    expect(charts.map(({ id }) => id)).toEqual([
      "star-distribution", "satisfaction-evolution", "response-volume-evolution",
      "aspect-comparison", "qr-point-comparison",
    ]);
    expect(charts[0]).toMatchObject({
      unit: "count",
      categories: ["1", "2", "3", "4", "5"],
      series: [{ values: [0, 0, 0, 0, 1], color: "neutral" }],
      table: { rows: [["1", 0], ["2", 0], ["3", 0], ["4", 0], ["5", 1]] },
    });
    expect(charts.every(({ table, categories }) => table.rows.length === categories.length)).toBe(true);
    expect(formatCount(12)).toBe("12");
    expect(formatMilliStars(4567)).toBe("4.6");
    expect(formatPercent(-6667)).toBe("-66.7%");
  });

  it("uses explicit unavailable formatting and chart empty states for an empty population", () => {
    const snapshot = createSnapshot({ ...input, submissions: [] }).payload;
    const charts = buildReportCharts(snapshot);

    expect(charts).toHaveLength(5);
    expect(charts.every(({ categories, series, table, emptyState }) =>
      categories.length === 0 && series.every(({ values }) => values.length === 0) &&
      table.rows.length === 0 && emptyState === "No hay datos disponibles para el período seleccionado.",
    )).toBe(true);
    expect(formatMilliStars(null)).toBe("No disponible");
    expect(formatPercent(null)).toBe("No disponible");
  });
});
