// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  update: vi.fn(),
  getTransport: vi.fn(),
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));
vi.mock("@/lib/feedback/admin-presentation", async (original) => ({
  ...await original<typeof import("@/lib/feedback/admin-presentation")>(),
  getFeedbackAdminPresentationTransport: mocks.getTransport,
}));

const runId = "00000000-0000-4000-8000-000000000117";
const session = { jwt: "operator-jwt", user: { role: { name: "Digital Experience Operator" }, capabilities: ["feedback.reports.generate"] } };

function request(body: unknown) {
  return new NextRequest(`https://telefericobariloche.com.ar/api/admin/feedback/generations/${runId}/presentation`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

describe("POST /api/admin/feedback/generations/:reportRunId/presentation", () => {
  beforeEach(() => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "true";
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({ ok: true });
    mocks.requireCsrfSession.mockResolvedValue({ ok: true, session });
    mocks.getTransport.mockReturnValue({ update: mocks.update });
    mocks.update.mockResolvedValue({ reportRunId: runId, displayName: "Informe importante", historyHidden: false });
  });

  it("keeps the feature gate ahead of authentication", async () => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "false";
    const { POST } = await import("./route");
    expect((await POST(request({ action: "hide" }), { params: Promise.resolve({ reportRunId: runId }) })).status).toBe(503);
    expect(mocks.ensureTrustedBrowserRequest).not.toHaveBeenCalled();
    expect(mocks.getTransport).not.toHaveBeenCalled();
  });

  it("denies untrusted origin, missing CSRF, and missing capability before CMS", async () => {
    const { POST } = await import("./route");
    mocks.ensureTrustedBrowserRequest.mockReturnValueOnce({ ok: false, res: Response.json({}, { status: 403 }) });
    expect((await POST(request({ action: "hide" }), { params: Promise.resolve({ reportRunId: runId }) })).status).toBe(403);
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();

    mocks.requireCsrfSession.mockResolvedValueOnce({ ok: false, res: { status: 403 } });
    expect((await POST(request({ action: "hide" }), { params: Promise.resolve({ reportRunId: runId }) })).status).toBe(403);
    mocks.requireCsrfSession.mockResolvedValueOnce({ ok: true, session: { ...session, user: { role: { name: "Digital Experience Operator" }, capabilities: ["feedback.reports.read"] } } });
    expect((await POST(request({ action: "hide" }), { params: Promise.resolve({ reportRunId: runId }) })).status).toBe(403);
    expect(mocks.getTransport).not.toHaveBeenCalled();
  });

  it("denies Administrator even if a stale session carries the generate claim", async () => {
    mocks.requireCsrfSession.mockResolvedValue({
      ok: true,
      session: { ...session, user: { role: { name: "Administrator" }, capabilities: ["feedback.reports.generate"] } },
    });
    const { POST } = await import("./route");
    const response = await POST(request({ contractVersion: "feedback-admin.v1", action: "hide" }), { params: Promise.resolve({ reportRunId: runId }) });
    expect(response.status).toBe(403);
    expect(mocks.getTransport).not.toHaveBeenCalled();
  });

  it("forwards only a validated name via the session JWT", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ contractVersion: "feedback-admin.v1", action: "rename", displayName: "  Informe importante  " }), { params: Promise.resolve({ reportRunId: runId }) });
    expect(response.status).toBe(200);
    expect(mocks.getTransport).toHaveBeenCalledWith("operator-jwt");
    expect(mocks.update).toHaveBeenCalledWith(runId, { action: "rename", displayName: "Informe importante" });
    expect(await response.json()).toMatchObject({ displayName: "Informe importante" });
  });

  it("rejects invalid payloads before contacting CMS", async () => {
    const { POST } = await import("./route");
    const response = await POST(request({ contractVersion: "feedback-admin.v1", action: "hide", extra: true }), { params: Promise.resolve({ reportRunId: runId }) });
    expect(response.status).toBe(400);
    expect(mocks.getTransport).not.toHaveBeenCalled();
  });
});
