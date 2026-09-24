// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  generate: vi.fn(),
  retry: vi.fn(),
  getTransport: vi.fn(),
  CommandError: class extends Error {
    code: string;
    status: number;
    details?: unknown;

    constructor(code: string, status: number, details?: unknown) {
      super("command failed");
      this.code = code;
      this.status = status;
      this.details = details;
    }
  },
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));
vi.mock("@/lib/feedback/admin-command", () => ({
  FeedbackAdminCommandError: mocks.CommandError,
  parseGenerateCommand: (value: unknown) => ({ ok: true, value }),
  parseRetryCommand: (value: unknown) => ({ ok: true, value }),
  getFeedbackAdminCommandTransport: mocks.getTransport,
}));

const session = {
  jwt: "operator-jwt",
  csrfToken: "csrf-token",
  user: { capabilities: ["feedback.reports.generate"] },
};

function request(body: unknown) {
  return new NextRequest(
    "https://telefericobariloche.com.ar/api/admin/feedback/generations",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function requestFor(
  path: string,
  init: ConstructorParameters<typeof NextRequest>[1] = {},
) {
  return new NextRequest(`https://telefericobariloche.com.ar${path}`, init);
}

describe("POST /api/admin/feedback/generations", () => {
  beforeEach(() => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "true";
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: true,
      origin: "https://telefericobariloche.com.ar",
    });
    mocks.requireCsrfSession.mockResolvedValue({ ok: true, session });
    mocks.generate.mockResolvedValue({
      reportRunId: "00000000-0000-4000-8000-000000000001",
      status: "queued",
    });
    mocks.retry.mockResolvedValue({
      reportRunId: "00000000-0000-4000-8000-000000000002",
      status: "queued",
    });
    mocks.getTransport.mockReturnValue({
      generate: mocks.generate,
      retry: mocks.retry,
    });
  });

  it("enforces origin, session, and capability before CMS access", async () => {
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: false,
      res: Response.json({}, { status: 403 }),
    });
    const { POST } = await import("./route");
    const response = await POST(request({}));
    expect(response.status).toBe(403);
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("sends only the independent generation command", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      request({
        contractVersion: "feedback-admin.v1",
        period: { from: "2026-08-01", to: "2026-08-20" },
        override: { accepted: false, overlapDigest: null },
      }),
    );
    expect(response.status).toBe(202);
    expect(mocks.generate).toHaveBeenCalledWith({
      contractVersion: "feedback-admin.v1",
      period: { from: "2026-08-01", to: "2026-08-20" },
      override: { accepted: false, overlapDigest: null },
    });
  });

  it("rejects an actual request body larger than 16 KiB", async () => {
    const { POST } = await import("./route");
    const body = JSON.stringify({ padding: "x".repeat(17 * 1024) });
    const response = await POST(
      requestFor("/api/admin/feedback/generations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": "1",
        },
        body,
      }),
    );

    expect(response.status).toBe(413);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("returns overlap details instead of collapsing the actionable conflict", async () => {
    const details = {
      overlaps: [
        {
          reportRunId: "00000000-0000-4000-8000-000000000003",
          period: { from: "2026-07-20", to: "2026-08-05" },
          intersection: { from: "2026-08-01", to: "2026-08-05" },
        },
      ],
      overlapDigest: "a".repeat(64),
      adjustment: "Choose a range that excludes every listed intersection.",
    };
    mocks.generate.mockRejectedValue(
      new mocks.CommandError("OVERLAP_REQUIRES_OVERRIDE", 409, details),
    );
    const { POST } = await import("./route");
    const response = await POST(request(validGenerate()));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "OVERLAP_REQUIRES_OVERRIDE",
        message: "The requested report range overlaps existing history",
        details,
      },
    });
  });

  it("requires the retry capability before reaching CMS", async () => {
    const { handleFeedbackAdminRetry } =
      await import("@/lib/feedback/admin-route");
    mocks.requireCsrfSession.mockResolvedValue({
      ok: true,
      session: {
        ...session,
        user: { capabilities: ["feedback.reports.read"] },
      },
    });

    const response = await handleFeedbackAdminRetry(
      requestFor("/api/admin/feedback/generations/retry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractVersion: "feedback-admin.v1" }),
      }),
      "00000000-0000-4000-8000-000000000001",
    );

    expect(response.status).toBe(403);
    expect(mocks.retry).not.toHaveBeenCalled();
  });

  it("allows retry only after the generate capability passes", async () => {
    const { handleFeedbackAdminRetry } =
      await import("@/lib/feedback/admin-route");
    const response = await handleFeedbackAdminRetry(
      requestFor("/api/admin/feedback/generations/retry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contractVersion: "feedback-admin.v1" }),
      }),
      "00000000-0000-4000-8000-000000000001",
    );

    expect(response.status).toBe(202);
    expect(mocks.retry).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      { contractVersion: "feedback-admin.v1" },
    );
  });
});

function validGenerate() {
  return {
    contractVersion: "feedback-admin.v1",
    period: { from: "2026-08-01", to: "2026-08-20" },
    override: { accepted: false, overlapDigest: null },
  };
}
