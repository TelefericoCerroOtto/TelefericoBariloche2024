// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  revalidateTag: vi.fn(),
  updateServiceState: vi.fn(),
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));

vi.mock("@/lib/services", () => ({
  updateServiceState: mocks.updateServiceState,
}));

vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}));

const session = {
  jwt: "operator-jwt",
  user: { role: { name: "Operations Supervisor" } },
};

function createRequest(body = JSON.stringify({ state: "conditional" })) {
  return new NextRequest(
    "https://telefericobariloche.com.ar/api/admin/service-state",
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body,
    },
  );
}

async function update(body?: string) {
  const { PUT } = await import("./route");
  return PUT(createRequest(body));
}

describe("PUT /api/admin/service-state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: true,
      origin: "https://telefericobariloche.com.ar",
    });
    mocks.requireCsrfSession.mockResolvedValue({ ok: true, session });
    mocks.updateServiceState.mockResolvedValue({
      ok: true,
      data: { data: { state: "conditional" }, meta: {} },
    });
  });

  it("rejects untrusted browser requests before authentication", async () => {
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: false,
      res: new Response("Forbidden", { status: 403 }),
    });

    const response = await update();

    expect(response.status).toBe(403);
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
  });

  it("requires a CSRF-bound authenticated session", async () => {
    mocks.requireCsrfSession.mockResolvedValue({
      ok: false,
      res: Response.json({ ok: false }, { status: 401 }),
    });

    const response = await update();

    expect(response.status).toBe(401);
    expect(mocks.updateServiceState).not.toHaveBeenCalled();
  });

  it("rejects roles outside service operations", async () => {
    mocks.requireCsrfSession.mockResolvedValue({
      ok: true,
      session: { ...session, user: { role: { name: "Media Manager" } } },
    });

    const response = await update();

    expect(response.status).toBe(403);
    expect(mocks.updateServiceState).not.toHaveBeenCalled();
  });

  it("rejects malformed and unsupported service states", async () => {
    const malformed = await update("{");
    const unsupported = await update(JSON.stringify({ state: "unknown" }));

    expect(malformed.status).toBe(400);
    expect(unsupported.status).toBe(400);
    expect(mocks.updateServiceState).not.toHaveBeenCalled();
  });

  it("returns a bounded error when the CMS update fails", async () => {
    mocks.updateServiceState.mockResolvedValue({
      ok: false,
      data: { error: { message: "sensitive upstream detail" } },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const response = await update();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "Unable to update service state",
    });
    consoleError.mockRestore();
  });

  it("updates with the operator JWT and revalidates the public state", async () => {
    const response = await update();

    expect(response.status).toBe(200);
    expect(mocks.updateServiceState).toHaveBeenCalledWith(
      "conditional",
      "operator-jwt",
    );
    expect(mocks.revalidateTag).toHaveBeenCalledWith("service-state");
  });
});
