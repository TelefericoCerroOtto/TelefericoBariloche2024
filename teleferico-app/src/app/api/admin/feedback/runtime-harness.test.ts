// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSnapshot } from "../../../../../packages/survey-reporting-core/src";
import type {
  FeedbackAdminDateRange,
  FeedbackAdminFilters,
  FeedbackAdminQrData,
  FeedbackAdminReadEnvelope,
  FeedbackAdminSource,
} from "@/types/api/admin/feedback";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(() => ({
    ok: true,
    origin: "https://telefericobariloche.com.ar",
  })),
  requireCsrfSession: vi.fn(() =>
    Promise.resolve({
      ok: true,
      session: {
        jwt: "synthetic-admin-jwt",
        csrfToken: "synthetic-csrf-token",
        user: {
          capabilities: [
            "feedback.read",
            "feedback.comments.read",
            "feedback.reports.read",
          ],
        },
      },
    }),
  ),
  getFeedbackAdminReader: vi.fn(),
  read: vi.fn(),
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));

vi.mock("@/lib/feedback/admin-reader", () => ({
  FeedbackAdminReaderError: class FeedbackAdminReaderError extends Error {},
  getFeedbackAdminReader: mocks.getFeedbackAdminReader,
}));

function request(path: string, query: string) {
  return new NextRequest(
    `https://telefericobariloche.com.ar/api/admin/feedback/${path}?${query}`,
    {
      method: "GET",
      headers: { "x-csrf-token": "synthetic-csrf-token" },
    },
  );
}

function analyticsSource(pointKey: string | null, range: FeedbackAdminDateRange): FeedbackAdminSource {
  const snapshot = createSnapshot({
    sourceRevision: "runtime-u8-c",
    createdAt: "2026-08-20T23:00:00.000Z",
    dataCutoffAt: "2026-08-20T23:00:00.000Z",
    range,
    filters: { pointKey, versionKey: null },
    definitions: [{ aspectKey: "views", sortOrder: 1 }],
    points: [
      { pointKey: "base", displayName: "Base", sortOrder: 1 },
      { pointKey: "summit", displayName: "Summit", sortOrder: 2 },
    ],
    submissions: ["base", "summit"].map((key, index) => ({
      recordId: key, receipt: key, acceptedAt: `2026-08-${15 + index}T12:00:00.000Z`, source: "valid_qr" as const,
      versionKey: "v1", pointKey: key, overallRating: 5 as const, locale: "es" as const,
      commentText: null, payloadDigest: key,
      aspects: [{ aspectKey: "views", label: "Views", sortOrder: 1, sentiment: "positive" as const }],
    })),
  }).payload;
  return { snapshot, comments: [], reports: [] };
}

describe("U8-A authenticated synthetic-data runtime harness", () => {
  beforeEach(() => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "true";
  });

  it("executes every read projection through the shared authenticated route boundary", async () => {
    mocks.read.mockImplementation(async (filters: FeedbackAdminFilters) => {
      const analytics = ["summary", "aspects", "qr-comparison", "qr-detail"].includes(filters.route);
      const source = analyticsSource(filters.route === "qr-detail" ? filters.pointKey : null, filters);
      return {
        contractVersion: "feedback-admin.v1",
        data: analytics ? source : { synthetic: true, route: filters.route, items: [] },
        meta: { filters, population: source.snapshot.population },
      };
    });
    mocks.getFeedbackAdminReader.mockReturnValue({ read: mocks.read });

    const scenarios = [
      ["summary", "from=2026-08-01&to=2026-08-20", "./summary/route"],
      ["aspects", "from=2026-08-01&to=2026-08-20", "./aspects/route"],
      [
        "qr-points",
        "from=2026-08-01&to=2026-08-20&view=comparison&pointKeys=base,summit",
        "./qr-points/route",
      ],
      [
        "qr-points",
        "from=2026-08-11&to=2026-08-20&view=detail&pointKey=base",
        "./qr-points/route",
      ],
      [
        "comments",
        "from=2026-08-01&to=2026-08-20&page=1&pageSize=25",
        "./comments/route",
      ],
      [
        "reports",
        "from=2026-08-01&to=2026-08-20&page=1&pageSize=25",
        "./reports/route",
      ],
    ] as const;

    for (const [path, query, modulePath] of scenarios) {
      const { GET } = await import(modulePath);
      const response = await GET(request(path, query));
      expect(response.status, path).toBe(200);
      const body = await response.json();
      expect(body.contractVersion, path).toBe("feedback-admin.v1");
      if (path === "summary") expect(body.data.availablePoints).toHaveLength(2);
      if (query.includes("view=comparison")) expect(body.data).toMatchObject({ view: "comparison", calendar: [], aspects: [] });
      if (query.includes("view=detail")) {
        const detail = body as FeedbackAdminReadEnvelope<FeedbackAdminQrData>;
        expect(detail.data.calendar.filter((item) => item.period === "current" && item.unit === "day").reduce((total, item) => total + item.submissionCount, 0)).toBe(1);
        expect(detail.data.aspects[0]?.selectionCount).toBe(1);
      }
    }

    expect(mocks.getFeedbackAdminReader).toHaveBeenCalledTimes(
      scenarios.length,
    );
    expect(mocks.getFeedbackAdminReader).toHaveBeenCalledWith(
      "synthetic-admin-jwt",
    );
    expect(mocks.read).toHaveBeenCalledTimes(scenarios.length);
  });
});
