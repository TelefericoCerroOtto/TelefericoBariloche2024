import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createFeedbackReportDownload,
  FeedbackReportDownloadError,
} from "./report-download";

const REPORT_ID = "00000000-0000-4000-8000-000000000100";
const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000101";
const PDF = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const SHA256 = createHash("sha256").update(PDF).digest("hex");
const METADATA = {
  contractVersion: "survey-report-download-metadata.v1" as const,
  reportId: REPORT_ID,
  reportRunId: REPORT_RUN_ID,
  generationStatus: "succeeded" as const,
  objectKey: `private/feedback-reports/${REPORT_ID}/report.pdf`,
  sha256: SHA256,
  size: PDF.byteLength,
  mimeType: "application/pdf" as const,
};

describe("private report download service", () => {
  it("reads the private object only after exact succeeded metadata validation", async () => {
    const readObject = vi.fn(async () => PDF);
    const download = createFeedbackReportDownload({
      metadataReader: { read: async () => METADATA },
      objectReader: { read: readObject },
    });

    await expect(download.read(REPORT_ID)).resolves.toEqual({
      metadata: METADATA,
      bytes: PDF,
    });
    expect(readObject).toHaveBeenCalledWith(METADATA.objectKey, 25 * 1024 * 1024);
  });

  it.each([
    ["wrong report identity", { ...METADATA, reportId: REPORT_RUN_ID }],
    ["non-succeeded generation", { ...METADATA, generationStatus: "running" }],
    ["unexpected object key", { ...METADATA, objectKey: "https://storage.example/report.pdf" }],
    ["invalid digest", { ...METADATA, sha256: "not-a-digest" }],
    ["oversized metadata", { ...METADATA, size: 26 * 1024 * 1024 }],
  ])("fails closed for %s before reading storage", async (_case, metadata) => {
    const readObject = vi.fn();
    const download = createFeedbackReportDownload({
      metadataReader: { read: async () => metadata as typeof METADATA },
      objectReader: { read: readObject },
    });
    await expect(download.read(REPORT_ID)).rejects.toBeInstanceOf(
      FeedbackReportDownloadError,
    );
    expect(readObject).not.toHaveBeenCalled();
  });

  it.each([
    ["digest mismatch", new Uint8Array([37, 80, 68, 70, 45, 50])],
    ["size mismatch", new Uint8Array([37, 80, 68, 70, 45])],
    ["non-PDF bytes", new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])],
  ])("rejects %s bytes without returning the object", async (_case, bytes) => {
    const download = createFeedbackReportDownload({
      metadataReader: { read: async () => METADATA },
      objectReader: { read: async () => bytes },
    });
    await expect(download.read(REPORT_ID)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
  });
});
