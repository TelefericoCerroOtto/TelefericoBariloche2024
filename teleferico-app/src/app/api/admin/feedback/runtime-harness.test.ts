// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

describe("U8-A authenticated synthetic-data runtime harness", () => {
  it("executes every read projection through the shared authenticated route boundary", async () => {
    mocks.read.mockImplementation(async (filters) => ({
      contractVersion: "feedback-admin.v1",
      data: {
        synthetic: true,
        route: filters.route,
        items:
          filters.route === "comments" || filters.route === "reports"
            ? []
            : undefined,
      },
      meta: {
        filters,
        population: { currentSubmissionCount: 2, previousSubmissionCount: 1 },
      },
    }));
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
      await expect(response.json(), path).resolves.toMatchObject({
        contractVersion: "feedback-admin.v1",
        data: { synthetic: true },
      });
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
