// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  parseCancelCommand: vi.fn(),
  cancelQueued: vi.fn(),
  getTransport: vi.fn(),
  CommandError: class extends Error {
    constructor(readonly code: string, readonly status: number) {
      super("command failed");
    }
  },
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));
vi.mock("@/lib/feedback/admin-command", () => ({
  FeedbackAdminCommandError: mocks.CommandError,
  parseCancelCommand: mocks.parseCancelCommand,
  getFeedbackAdminCommandTransport: mocks.getTransport,
}));

const runId = "00000000-0000-4000-8000-000000000117";
const command = {
  contractVersion: "feedback-admin.v1",
  expectedStateVersion: 3,
};
const session = {
  jwt: "operator-jwt",
  user: { capabilities: ["feedback.reports.generate"] },
};

function request(body: unknown) {
  return new NextRequest(`https://telefericobariloche.com.ar/api/admin/feedback/generations/${runId}/cancel`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/feedback/generations/:reportRunId/cancel", () => {
  beforeEach(() => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "true";
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({ ok: true, origin: "https://telefericobariloche.com.ar" });
    mocks.requireCsrfSession.mockResolvedValue({ ok: true, session });
    mocks.parseCancelCommand.mockReturnValue({ ok: true, value: command });
    mocks.cancelQueued.mockResolvedValue({
      reportRunId: runId,
      stateVersion: 4,
      status: "failed",
      failureCode: "OPERATOR_CANCELLED",
      replayed: false,
    });
    mocks.getTransport.mockReturnValue({ cancelQueued: mocks.cancelQueued });
  });

  it("keeps the feature gate ahead of browser authentication", async () => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "false";
    const { POST } = await import("./route");

    const response = await POST(request(command), { params: Promise.resolve({ reportRunId: runId }) });

    expect(response.status).toBe(503);
    expect(mocks.ensureTrustedBrowserRequest).not.toHaveBeenCalled();
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.getTransport).not.toHaveBeenCalled();
  });

  it("rejects untrusted origin and missing CSRF before reaching CMS", async () => {
    const { POST } = await import("./route");
    mocks.ensureTrustedBrowserRequest.mockReturnValueOnce({ ok: false, res: Response.json({}, { status: 403 }) });

    const untrusted = await POST(request(command), { params: Promise.resolve({ reportRunId: runId }) });

    expect(untrusted.status).toBe(403);
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.getTransport).not.toHaveBeenCalled();

    mocks.ensureTrustedBrowserRequest.mockReturnValue({ ok: true, origin: "https://telefericobariloche.com.ar" });
    mocks.requireCsrfSession.mockResolvedValueOnce({ ok: false, res: { status: 403 } });
    const missingCsrf = await POST(request(command), { params: Promise.resolve({ reportRunId: runId }) });

    expect(missingCsrf.status).toBe(403);
    expect(mocks.getTransport).not.toHaveBeenCalled();
  });

  it("requires the generate capability and forwards the server session JWT", async () => {
    const { POST } = await import("./route");
    const response = await POST(request(command), { params: Promise.resolve({ reportRunId: runId }) });

    expect(response.status).toBe(200);
    expect(mocks.ensureTrustedBrowserRequest).toHaveBeenCalledTimes(1);
    expect(mocks.requireCsrfSession).toHaveBeenCalledTimes(1);
    expect(mocks.getTransport).toHaveBeenCalledWith("operator-jwt");
    expect(mocks.parseCancelCommand).toHaveBeenCalledWith(runId, command);
    expect(mocks.cancelQueued).toHaveBeenCalledWith(runId, command);
    expect(await response.json()).toMatchObject({ failureCode: "OPERATOR_CANCELLED", replayed: false });
  });

  it("denies a session missing feedback.reports.generate before transport creation", async () => {
    mocks.requireCsrfSession.mockResolvedValue({
      ok: true,
      session: { ...session, user: { capabilities: ["feedback.reports.read"] } },
    });
    const { POST } = await import("./route");

    const response = await POST(request(command), { params: Promise.resolve({ reportRunId: runId }) });

    expect(response.status).toBe(403);
    expect(mocks.getTransport).not.toHaveBeenCalled();
    expect(mocks.cancelQueued).not.toHaveBeenCalled();
  });

  it("returns a bounded conflict response without upstream details", async () => {
    mocks.cancelQueued.mockRejectedValue(new mocks.CommandError("INVALID_STATE", 409));
    const { POST } = await import("./route");

    const response = await POST(request(command), { params: Promise.resolve({ reportRunId: runId }) });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_STATE",
        message: "The report generation changed or is no longer in the requested state",
      },
    });
  });
});
