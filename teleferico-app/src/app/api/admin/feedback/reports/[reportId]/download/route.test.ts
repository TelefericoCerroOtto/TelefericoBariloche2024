// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  getDownload: vi.fn(),
  read: vi.fn(),
  DownloadError: class extends Error {
    code: string;
    constructor(code: string) {
      super("private storage error must not escape");
      this.code = code;
    }
  },
  CommandError: class extends Error {},
  ReaderError: class extends Error {},
}));

vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));
vi.mock("@/lib/feedback/admin-reader", () => ({
  FeedbackAdminReaderError: mocks.ReaderError,
  getFeedbackAdminReader: vi.fn(),
}));
vi.mock("@/lib/feedback/admin-command", () => ({
  FeedbackAdminCommandError: mocks.CommandError,
  getFeedbackAdminCommandTransport: vi.fn(),
  parseGenerateCommand: vi.fn(),
  parseRetryCommand: vi.fn(),
}));
vi.mock("@/lib/feedback/admin-read", () => ({
  parseFeedbackAdminFilters: vi.fn(),
  projectAspects: vi.fn(),
  projectComments: vi.fn(),
  projectQrPoints: vi.fn(),
  projectReports: vi.fn(),
  projectSummary: vi.fn(),
}));
vi.mock("@/lib/feedback/report-download", () => ({
  FeedbackReportDownloadError: mocks.DownloadError,
  getFeedbackReportDownload: mocks.getDownload,
}));

const REPORT_ID = "00000000-0000-4000-8000-000000000100";
const SHA256 = "a".repeat(64);
const bytes = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const metadata = {
  contractVersion: "survey-report-download-metadata.v1",
  reportId: REPORT_ID,
  reportRunId: "00000000-0000-4000-8000-000000000101",
  generationStatus: "succeeded",
  objectKey: `private/feedback-reports/${REPORT_ID}/report.pdf`,
  sha256: SHA256,
  size: bytes.byteLength,
  mimeType: "application/pdf",
} as const;

function request(path = `/api/admin/feedback/reports/${REPORT_ID}/download`) {
  return new NextRequest(`https://telefericobariloche.com.ar${path}`, {
    method: "GET",
    headers: { "x-csrf-token": "csrf-token" },
  });
}

describe("GET /api/admin/feedback/reports/:reportId/download", () => {
  beforeEach(() => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "true";
    vi.clearAllMocks();
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: true,
      origin: "https://telefericobariloche.com.ar",
    });
    mocks.requireCsrfSession.mockResolvedValue({
      ok: true,
      session: {
        jwt: "application-jwt",
        csrfToken: "csrf-token",
        user: { capabilities: ["feedback.reports.read"] },
      },
    });
    mocks.read.mockResolvedValue({ metadata, bytes });
    mocks.getDownload.mockReturnValue({ read: mocks.read });
  });

  it("disables the feature before origin, session, CMS, or storage access", async () => {
    process.env.FEEDBACK_CAPABILITY_ENABLED = "false";
    const { GET } = await import("./route");
    const response = await GET(request(), { params: Promise.resolve({ reportId: REPORT_ID }) });
    expect(response.status).toBe(503);
    expect(mocks.ensureTrustedBrowserRequest).not.toHaveBeenCalled();
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.getDownload).not.toHaveBeenCalled();
  });

  it("requires trusted origin and the exact read capability before reading private bytes", async () => {
    mocks.ensureTrustedBrowserRequest.mockReturnValue({
      ok: false,
      res: Response.json({}, { status: 403 }),
    });
    const { GET } = await import("./route");
    const denied = await GET(request(), { params: Promise.resolve({ reportId: REPORT_ID }) });
    expect(denied.status).toBe(403);
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.getDownload).not.toHaveBeenCalled();

    mocks.ensureTrustedBrowserRequest.mockReturnValue({ ok: true, origin: "https://telefericobariloche.com.ar" });
    mocks.requireCsrfSession.mockResolvedValue({
      ok: true,
      session: { jwt: "application-jwt", user: { capabilities: ["feedback.reports.generate"] } },
    });
    const wrongCapability = await GET(request(), { params: Promise.resolve({ reportId: REPORT_ID }) });
    expect(wrongCapability.status).toBe(403);
    expect(mocks.getDownload).not.toHaveBeenCalled();
  });

  it("rejects malformed IDs and query parameters without calling the metadata reader", async () => {
    const { GET } = await import("./route");
    const malformed = await GET(request(), { params: Promise.resolve({ reportId: "../private" }) });
    expect(malformed.status).toBe(400);
    const query = await GET(request(`/api/admin/feedback/reports/${REPORT_ID}/download?url=https://example.invalid`), {
      params: Promise.resolve({ reportId: REPORT_ID }),
    });
    expect(query.status).toBe(400);
    expect(mocks.getDownload).not.toHaveBeenCalled();
  });

  it("returns only verified PDF bytes with private no-store attachment headers", async () => {
    const { GET } = await import("./route");
    const response = await GET(request(), { params: Promise.resolve({ reportId: REPORT_ID }) });
    expect(response.status).toBe(200);
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="feedback-report-${REPORT_ID}.pdf"`,
    );
    expect(response.headers.get("etag")).toBe(`"${SHA256}"`);
    expect(response.headers.get("content-length")).toBe(String(bytes.byteLength));
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(mocks.read).toHaveBeenCalledWith(REPORT_ID);
  });

  it("maps missing reports and storage failures to bounded non-sensitive responses", async () => {
    const { GET } = await import("./route");
    mocks.read.mockRejectedValueOnce(new mocks.DownloadError("NOT_FOUND"));
    const missing = await GET(request(), { params: Promise.resolve({ reportId: REPORT_ID }) });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({
      error: { code: "NOT_FOUND", message: "The requested report was not found" },
    });

    mocks.read.mockRejectedValueOnce(new Error("secret object key and token must not escape"));
    const unavailable = await GET(request(), { params: Promise.resolve({ reportId: REPORT_ID }) });
    expect(unavailable.status).toBe(503);
    expect(JSON.stringify(await unavailable.json())).not.toContain("secret object key");
  });
});
