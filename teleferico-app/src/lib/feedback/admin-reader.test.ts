// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createFeedbackAdminReader,
  FeedbackAdminReaderError,
} from "./admin-reader";
import type {
  FeedbackAdminSourcePage,
  FeedbackAdminSourcePageQuery,
  FeedbackAdminSourceResource,
} from "./private-admin-read-transport";
import type { FeedbackAdminSource } from "@/types/api/admin/feedback";

const filters = {
  route: "summary" as const,
  from: "2026-08-01",
  to: "2026-08-20",
};

function page(
  query: FeedbackAdminSourcePageQuery,
  total: number,
  items: readonly Record<string, unknown>[],
  nextCursor: string | null = null,
): FeedbackAdminSourcePage & { readonly contractVersion: string } {
  return {
    contractVersion: "feedback-admin-source.v1",
    resource: query.resource,
    cursor: query.cursor,
    nextCursor,
    total,
    items,
  };
}

function submissions(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    documentId: `submission-${index + 1}`,
    receipt: `receipt-${String(index + 1).padStart(4, "0")}`,
    acceptedAt: "2026-08-15T12:00:00.000Z",
    source: "valid_qr",
    locale: "es",
    overallRating: 5,
    comment: null,
    payloadDigest: "a".repeat(64),
    qrPoint: {
      id: "1",
      documentId: "point-doc",
      pointKey: "base",
    },
    surveyVersion: {
      id: "2",
      documentId: "version-doc",
      versionKey: "v1",
    },
    ratings: [
      {
        id: `rating-${index + 1}`,
        aspectKey: "views",
        label: "Views",
        sortOrder: 1,
        rating: "positive",
      },
    ],
  }));
}

function reports(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    documentId: `report-doc-${index + 1}`,
    reportId: `report-${index + 1}`,
    generationRunId: `run-${index + 1}`,
    periodStart: "2026-08-01T00:00:00.000Z",
    periodEnd: "2026-08-20T23:59:59.999Z",
    createdAt: `2026-08-${String((index % 20) + 1).padStart(2, "0")}T12:00:00.000Z`,
    dataCutoffAt: "2026-08-20T12:00:00.000Z",
    analyzedResponseCount: 1,
    analyzedCommentCount: 0,
    artifactSize: 100,
    artifactSha256: "b".repeat(64),
    objectKey: "private/feedback-reports/private/report.pdf",
    status: "succeeded",
    requestedBy: null,
    generatedBy: null,
  }));
}

describe("feedback administration private CMS reader", () => {
  it("fails closed when a page is incomplete or has an unstable total", async () => {
    const readPage = vi.fn(async (query: FeedbackAdminSourcePageQuery) => {
      if (query.resource === "submissions")
        return page(query, 26, submissions(25), "cursor-25");
      if (query.resource === "reports") return page(query, 0, []);
      return page(query, 0, []);
    });
    const reader = createFeedbackAdminReader({ readPage });

    await expect(reader.read(filters)).rejects.toBeInstanceOf(
      FeedbackAdminReaderError,
    );
  });

  it("reads more than 25 submissions and 100 reports across stable cursor pages", async () => {
    const source = {
      submissions: submissions(28),
      reports: reports(105),
      points: [{ id: "1", documentId: "point-doc", pointKey: "base", displayName: "Base", sortOrder: 1 }],
      versions: [{
        id: "2",
        documentId: "version-doc",
        versionKey: "v1",
        aspects: [{ id: "1", aspectKey: "views", sortOrder: 1 }],
      }],
    } satisfies Record<FeedbackAdminSourceResource, readonly Record<string, unknown>[]>;
    const readPage = vi.fn(async (query: FeedbackAdminSourcePageQuery) => {
      const rows = source[query.resource];
      const start = query.cursor === null ? 0 : Number(query.cursor.slice("after-".length));
      const items = rows.slice(start, start + 25);
      const end = start + items.length;
      return page(query, rows.length, items, end < rows.length ? `after-${end}` : null);
    });
    const reader = createFeedbackAdminReader({ readPage });

    const result = await reader.read(filters);

    const data = result.data as FeedbackAdminSource;
    expect(data.snapshot.population.currentSubmissionCount).toBe(28);
    expect(
      data.snapshot.metrics.calendar
        .filter((bucket) => bucket.period === "current" && bucket.unit === "day")
        .reduce((count, bucket) => count + bucket.submissionCount, 0),
    ).toBe(28);
    expect(data.snapshot.metrics.qrPoints[0]?.current.submissionCount).toBe(28);
    expect(data.reports).toHaveLength(105);
    expect(data.reports.every((report) => report.canDownload === false)).toBe(
      true,
    );
    expect(readPage.mock.calls.filter(([query]) => query.resource === "submissions")).toHaveLength(2);
    expect(readPage.mock.calls.filter(([query]) => query.resource === "reports")).toHaveLength(5);
    const cutoffs = new Set(readPage.mock.calls.map(([query]) => query.dataCutoffAt));
    expect(cutoffs.size).toBe(1);
  });

  it("rejects missing nullable comments and payload digests without fallbacks", async () => {
    const incomplete = submissions(1).map(({ comment: _comment, payloadDigest: _digest, ...row }) => row);
    const readPage = vi.fn(async (query: FeedbackAdminSourcePageQuery) => {
      const rows = query.resource === "submissions" ? incomplete : [];
      return page(query, rows.length, rows);
    });
    const reader = createFeedbackAdminReader({ readPage });

    await expect(reader.read(filters)).rejects.toBeInstanceOf(
      FeedbackAdminReaderError,
    );
  });
});
