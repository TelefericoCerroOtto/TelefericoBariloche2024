// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  read: vi.fn(),
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));

vi.mock("@/lib/feedback/admin-reader", () => ({
  FeedbackAdminReaderError: class FeedbackAdminReaderError extends Error {},
  getFeedbackAdminReader: vi.fn(() => ({ read: mocks.read })),
}));

const session = {
  jwt: "operator-jwt",
  csrfToken: "csrf-token",
  user: { capabilities: ["feedback.read"] },
};

function createRequest(
  query = "from=2026-08-01&to=2026-08-20",
  headers: HeadersInit = {},
) {
  return new NextRequest(
    `https://telefericobariloche.com.ar/api/admin/feedback/summary?${query}`,
    {
      method: "GET",
      headers,
    },
  );
}

describe("GET /api/admin/feedback/summary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: true,
      origin: "https://telefericobariloche.com.ar",
    });
    mocks.requireCsrfSession.mockResolvedValue({ ok: true, session });
    mocks.read.mockResolvedValue({
      contractVersion: "feedback-admin.v1",
      data: { current: { submissionCount: 3 } },
      meta: {
        filters: { route: "summary", from: "2026-08-01", to: "2026-08-20" },
      },
    });
  });

  it("rejects an untrusted browser request before CSRF/session work", async () => {
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: false,
      res: new Response("Forbidden", { status: 403 }),
    });
    const { GET } = await import("./route");

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("requires the CSRF-bound session and feedback capability", async () => {
    mocks.requireCsrfSession.mockResolvedValue({
      ok: false,
      res: Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 }),
    });
    const { GET } = await import("./route");

    const response = await GET(createRequest());

    expect(response.status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("forwards the bounded period and returns the versioned projection", async () => {
    const { GET } = await import("./route");

    const response = await GET(createRequest());

    expect(response.status).toBe(200);
    expect(mocks.read).toHaveBeenCalledWith({
      route: "summary",
      from: "2026-08-01",
      to: "2026-08-20",
    });
    await expect(response.json()).resolves.toMatchObject({
      contractVersion: "feedback-admin.v1",
    });
  });

  it("does not expose upstream details", async () => {
    mocks.read.mockRejectedValue(new Error("database password leaked"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { GET } = await import("./route");

    const response = await GET(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UPSTREAM_UNAVAILABLE" },
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
