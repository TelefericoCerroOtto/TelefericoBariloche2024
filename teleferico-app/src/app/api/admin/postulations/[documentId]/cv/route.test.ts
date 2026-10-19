// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  ensureTrustedBrowserRequest: vi.fn(),
  getPostulationByDocumentId: vi.fn(),
  createCvStorage: vi.fn(),
}));

vi.mock("@/lib/auth/get-session", () => ({
  getServerSession: mocks.getServerSession,
}));
vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
}));
vi.mock("@/lib/services", () => ({
  getPostulationByDocumentId: mocks.getPostulationByDocumentId,
}));
vi.mock("@/lib/services/cv-storage", () => ({
  createCvStorage: mocks.createCvStorage,
}));
vi.mock("@/utils/env", () => ({ assertEnv: vi.fn() }));

async function download() {
  const { GET } = await import("./route");
  return GET(
    new NextRequest(
      "https://telefericobariloche.test/api/admin/postulations/document123/cv",
    ),
    { params: Promise.resolve({ documentId: "document123" }) },
  );
}

describe("GET /api/admin/postulations/[documentId]/cv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({ ok: true });
    mocks.getServerSession.mockResolvedValue({
      jwt: "test-jwt",
      user: { role: { name: "Administrator" } },
    });
    mocks.getPostulationByDocumentId.mockResolvedValue({
      ok: true,
      data: {
        data: {
          cvObjectKey: "cv-key",
          cvOriginalName: "resume.pdf",
          cvMimeType: "application/pdf",
          cvStorageProvider: null,
        },
      },
    });
    mocks.createCvStorage.mockReturnValue({
      getReadableStream: vi.fn().mockResolvedValue(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("test-pdf"));
            controller.close();
          },
        }),
      ),
    });
  });

  it("rejects untrusted requests before checking the session", async () => {
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: false,
      res: new Response("Forbidden", { status: 403 }),
    });

    expect((await download()).status).toBe(403);
    expect(mocks.getServerSession).not.toHaveBeenCalled();
  });

  it("rejects sessions without a bearer", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    expect((await download()).status).toBe(401);
    expect(mocks.getPostulationByDocumentId).not.toHaveBeenCalled();
  });

  it.each(["Digital Experience Operator", "Authenticated", "Retired Role"])(
    "denies CV access to %s",
    async (roleName) => {
      mocks.getServerSession.mockResolvedValue({
        jwt: "test-jwt",
        user: { role: { name: roleName } },
      });

      const response = await download();

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({ message: "Forbidden" });
      expect(mocks.getPostulationByDocumentId).not.toHaveBeenCalled();
      expect(mocks.createCvStorage).not.toHaveBeenCalled();
    },
  );

  it("lets Administrator download a CV after the trusted-request check", async () => {
    const response = await download();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="resume.pdf"',
    );
    expect(mocks.getPostulationByDocumentId).toHaveBeenCalledWith(
      "document123",
      "test-jwt",
    );
    expect(await response.text()).toBe("test-pdf");
  });
});
