import { describe, expect, it } from "vitest";

import {
  parseFeedbackAdminFilters,
  projectComments,
  projectReports,
  type FeedbackAdminSource,
} from "./admin-read";

const source: FeedbackAdminSource = {
  snapshot: {
    population: {
      currentSubmissionCount: 3,
      previousSubmissionCount: 2,
    },
    metrics: {
      current: { submissionCount: 3 },
      previous: { submissionCount: 2 },
      deltas: { submissionCount: 1, submissionPercentBps: 5000 },
      calendar: [],
      aspects: [],
      classifications: { strengths: [], opportunities: [] },
      matrix: [],
      fiveStarAssociation: [],
      otherAspects: [],
      qrPoints: [],
    },
    comments: [],
  },
  comments: [
    {
      recordId: "comment-1",
      receipt: "receipt-a",
      acceptedAt: "2026-08-20T12:00:00.000Z",
      locale: "es",
      pointKey: "summit",
      overallRating: 5,
      aspectRatings: [{ aspectKey: "views", rating: "positive" }],
      text: "Excelente vista",
    },
    {
      recordId: "comment-2",
      receipt: "receipt-b",
      acceptedAt: "2026-08-20T12:00:00.000Z",
      locale: "en",
      pointKey: "base",
      overallRating: 2,
      aspectRatings: [{ aspectKey: "staff", rating: "negative" }],
      text: "Long wait",
    },
  ],
  reports: [
    {
      reportId: "report-1",
      reportRunId: "run-1",
      name: "August report",
      period: { from: "2026-08-01", to: "2026-08-20" },
      status: "succeeded",
      analyzedResponseCount: 3,
      analyzedCommentCount: 2,
      dataCutoffAt: "2026-08-21T00:00:00.000Z",
      createdAt: "2026-08-21T01:00:00.000Z",
      requestedBy: null,
      generatedBy: null,
      canDownload: true,
      artifactSize: 100,
      artifactSha256: "a".repeat(64),
    },
  ],
};

describe("feedback administration read projections", () => {
  it("normalizes a bounded summary period and rejects unknown filters", () => {
    expect(
      parseFeedbackAdminFilters("summary", {
        from: "2026-08-01",
        to: "2026-08-20",
      }),
    ).toEqual({
      ok: true,
      value: { route: "summary", from: "2026-08-01", to: "2026-08-20" },
    });

    expect(
      parseFeedbackAdminFilters("summary", {
        from: "2026-08-01",
        to: "2026-08-20",
        text: "must-not-be-accepted",
      }),
    ).toEqual({ ok: false, code: "VALIDATION_FAILED" });
  });

  it.each([
    ["aspects", { pointKey: ["base", "summit"] }],
    ["comments", { locale: ["es", "en"] }],
    ["reports", { page: ["1", "2"] }],
  ] as const)(
    "rejects repeated single-valued parameters for %s",
    (route, duplicate) => {
      const query = {
        from: "2026-08-01",
        to: "2026-08-20",
        ...(route === "comments" ? { page: "1", pageSize: "25" } : {}),
        ...duplicate,
      };

      expect(parseFeedbackAdminFilters(route, query)).toEqual({
        ok: false,
        code: "VALIDATION_FAILED",
      });
    },
  );

  it("preserves intentionally repeatable ratings and QR comparison point keys", () => {
    expect(
      parseFeedbackAdminFilters("comments", {
        from: "2026-08-01",
        to: "2026-08-20",
        rating: ["1", "5"],
      }),
    ).toMatchObject({
      ok: true,
      value: { route: "comments", ratings: [1, 5] },
    });

    expect(
      parseFeedbackAdminFilters("qr-points", {
        from: "2026-08-01",
        to: "2026-08-20",
        view: "comparison",
        pointKeys: ["base", "summit"],
      }),
    ).toEqual({
      ok: true,
      value: {
        route: "qr-comparison",
        from: "2026-08-01",
        to: "2026-08-20",
        pointKeys: ["base", "summit"],
      },
    });
  });

  it("keeps comment filtering, ordering, and pagination on one population", () => {
    const filters = parseFeedbackAdminFilters("comments", {
      from: "2026-08-20",
      to: "2026-08-20",
      locale: "es",
      pointKey: "summit",
      text: "vista",
      page: "1",
      pageSize: "25",
    });

    expect(filters.ok).toBe(true);
    if (!filters.ok || filters.value.route !== "comments") return;

    expect(projectComments(source, filters.value)).toEqual({
      items: [source.comments[0]],
      total: 1,
      page: 1,
      pageSize: 25,
    });
  });

  it("orders reports by persisted success timestamps and identifiers", () => {
    const filters = parseFeedbackAdminFilters("reports", {
      from: "2026-08-01",
      to: "2026-08-31",
    });

    expect(filters.ok).toBe(true);
    if (!filters.ok || filters.value.route !== "reports") return;

    expect(projectReports(source, filters.value).items).toEqual(source.reports);
  });
});
