import { describe, expect, it, vi } from "vitest";
import {
  createPrivateReportDownloadMetadataTransport,
  REPORT_DOWNLOAD_METADATA_ACTION,
  ReportDownloadMetadataTransportError,
} from "../../../services/survey-report-worker/src/private-report-download-metadata-transport";

const REPORT_ID = "00000000-0000-4000-8000-000000000100";
const BASE_URL = "https://cms.example.com";
const TOKEN = "synthetic-report-metadata-token";
const METADATA = {
  contractVersion: "survey-report-download-metadata.v1",
  reportId: REPORT_ID,
  reportRunId: "00000000-0000-4000-8000-000000000101",
  generationStatus: "succeeded",
  objectKey: `private/feedback-reports/${REPORT_ID}/report.pdf`,
  sha256: "a".repeat(64),
  size: 1024,
  mimeType: "application/pdf",
};

function response(body: unknown, status = 200, headers?: HeadersInit) {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("content-type"))
    responseHeaders.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

describe("private report download metadata transport", () => {
  it("uses the exact action token, canonical path, and no-store GET", async () => {
    const tokenProvider = vi.fn(async (action: string) => ({ action, value: TOKEN }));
    const fetchImplementation = vi.fn<typeof fetch>(async () => response(METADATA));
    const transport = createPrivateReportDownloadMetadataTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider,
      fetchImplementation,
    });

    await expect(transport.read(REPORT_ID)).resolves.toEqual(METADATA);
    expect(tokenProvider).toHaveBeenCalledWith(
      REPORT_DOWNLOAD_METADATA_ACTION,
      expect.any(AbortSignal),
    );
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toBe(
      `${BASE_URL}/api/tb113/worker/reports/${REPORT_ID}/download-metadata`,
    );
    expect(fetchImplementation.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
    });
    expect(new Headers(fetchImplementation.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(
      `Bearer ${TOKEN}`,
    );
  });

  it("fails closed for a token scoped to a different CMS action", async () => {
    const fetchImplementation = vi.fn();
    const transport = createPrivateReportDownloadMetadataTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async () => ({ action: "workerSourceRead", value: TOKEN }),
      fetchImplementation,
    });
    await expect(transport.read(REPORT_ID)).rejects.toMatchObject({
      code: "INVALID_CONFIGURATION",
    });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it.each([
    ["untrusted origin", "https://cms.example.com.evil.invalid", [BASE_URL]],
    ["empty allowlist", BASE_URL, []],
  ])("rejects %s before token acquisition", async (_case, baseUrl, allowedOrigins) => {
    const tokenProvider = vi.fn();
    expect(() =>
      createPrivateReportDownloadMetadataTransport({
        baseUrl,
        allowedOrigins,
        tokenProvider,
      }),
    ).toThrow(ReportDownloadMetadataTransportError);
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it("rejects invalid metadata envelopes and bounds response bytes", async () => {
    const wrongGeneration = createPrivateReportDownloadMetadataTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async (action) => ({ action, value: TOKEN }),
      fetchImplementation: async () => response({ ...METADATA, generationStatus: "running" }),
    });
    await expect(wrongGeneration.read(REPORT_ID)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });

    const oversized = createPrivateReportDownloadMetadataTransport({
      baseUrl: BASE_URL,
      allowedOrigins: [BASE_URL],
      tokenProvider: async (action) => ({ action, value: TOKEN }),
      fetchImplementation: async () => response(METADATA, 200, { "content-length": "5000" }),
    });
    await expect(oversized.read(REPORT_ID)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
