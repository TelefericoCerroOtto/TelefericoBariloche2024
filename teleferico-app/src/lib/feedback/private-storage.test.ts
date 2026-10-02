import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { MAX_REPORT_PDF_BYTES, deterministicReportId } from "@teleferico/tb113-private-report-storage";
import {
  createPrivateReportObjectStorage,
  toPrivateReportDownloadMetadata,
} from "@teleferico/tb113-private-report-storage";
import { createFeedbackReportDownload } from "./report-download";
import { createFakePrivateReportBucket } from "./private-storage.test-fixtures";

const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000101";
const PDF = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const SHA256 = createHash("sha256").update(PDF).digest("hex");
const REPORT_ID = deterministicReportId(REPORT_RUN_ID, SHA256);
const OBJECT_KEY = `private/feedback-reports/${REPORT_ID}/report.pdf`;

function artifact(overrides: Partial<{
  objectKey: string;
  bytes: Uint8Array;
  sha256: string;
  size: number;
  mimeType: "application/pdf";
}> = {}) {
  return {
    objectKey: OBJECT_KEY,
    bytes: PDF,
    sha256: SHA256,
    size: PDF.byteLength,
    mimeType: "application/pdf" as const,
    ...overrides,
  };
}

describe("private report object storage adapter", () => {
  it("stages privately and replays an identical digest without replacing bytes", async () => {
    const fake = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: fake.bucket });

    await storage.artifacts.stage(REPORT_RUN_ID, artifact());
    await storage.artifacts.stage(REPORT_RUN_ID, artifact());

    expect(fake.calls.create).toBe(2);
    expect(fake.objects.size).toBe(1);
    await expect(storage.artifacts.readStaged(REPORT_RUN_ID, SHA256)).resolves.toEqual(
      artifact(),
    );
    expect(fake.objects.get(OBJECT_KEY)?.metadata).toMatchObject({
      visibility: "private",
      contentType: "application/pdf",
      cacheControl: "private, no-store",
      customMetadata: {
        reportRunId: REPORT_RUN_ID,
        reportId: REPORT_ID,
        sha256: SHA256,
      },
    });
  });

  it.each([
    ["wrong deterministic key", artifact({ objectKey: "private/feedback-reports/other/report.pdf" })],
    ["wrong MIME type", artifact({ mimeType: "application/pdf" as const, size: PDF.byteLength + 1 })],
    ["invalid bytes digest", artifact({ sha256: "a".repeat(64) })],
    ["oversized object", artifact({ size: MAX_REPORT_PDF_BYTES + 1 })],
  ])("rejects %s before object creation", async (_case, candidate) => {
    const fake = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: fake.bucket });
    await expect(storage.artifacts.stage(REPORT_RUN_ID, candidate)).rejects.toThrow(
      "Private report storage operation failed",
    );
    expect(fake.objects.size).toBe(0);
  });

  it("rejects non-private bucket state and tampered metadata or bytes", async () => {
    const fake = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: fake.bucket });
    fake.setPrivate(false);
    await expect(storage.artifacts.stage(REPORT_RUN_ID, artifact())).rejects.toThrow();
    fake.setPrivate(true);
    await storage.artifacts.stage(REPORT_RUN_ID, artifact());

    fake.tamper(OBJECT_KEY, (metadata) => ({ ...metadata, visibility: "public" }));
    await expect(storage.artifacts.readStaged(REPORT_RUN_ID, SHA256)).rejects.toThrow();
    fake.tamper(OBJECT_KEY, (metadata) => ({ ...metadata, visibility: "private" }));
    fake.replaceBytes(OBJECT_KEY, new Uint8Array([37, 80, 68, 70, 45, 50]));
    await expect(storage.artifacts.readStaged(REPORT_RUN_ID, SHA256)).rejects.toThrow();
  });

  it("derives cleanup identity from run and digest and refuses failed conditional deletion", async () => {
    const fake = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: fake.bucket });
    await storage.artifacts.stage(REPORT_RUN_ID, artifact());

    await storage.artifacts.discardStaged(
      "00000000-0000-4000-8000-000000000102",
      SHA256,
    );
    expect(fake.objects.has(OBJECT_KEY)).toBe(true);

    fake.refuseDelete();
    await expect(storage.artifacts.discardStaged(REPORT_RUN_ID, SHA256)).rejects.toThrow();
    expect(fake.objects.has(OBJECT_KEY)).toBe(true);
  });

  it("returns download bytes only for exact private metadata and matching digest", async () => {
    const fake = createFakePrivateReportBucket();
    const storage = createPrivateReportObjectStorage({ bucket: fake.bucket });
    await storage.artifacts.stage(REPORT_RUN_ID, artifact());
    const metadata = toPrivateReportDownloadMetadata({
      reportId: REPORT_ID,
      reportRunId: REPORT_RUN_ID,
      sha256: SHA256,
      size: PDF.byteLength,
    });
    const download = createFeedbackReportDownload({
      metadataReader: { read: async () => metadata },
      objectReader: storage.objectReader,
    });

    await expect(download.read(REPORT_ID)).resolves.toEqual({ metadata, bytes: PDF });
    expect(fake.calls.read).toBe(2);

    fake.tamper(OBJECT_KEY, (stored) => ({ ...stored, contentType: "text/plain" }));
    await expect(download.read(REPORT_ID)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
    expect(fake.calls.read).toBe(2);
  });

  it("fails closed when metadata conflicts with the deterministic run/report binding", async () => {
    expect(() =>
      toPrivateReportDownloadMetadata({
        reportId: REPORT_ID,
        reportRunId: "00000000-0000-4000-8000-000000000102",
        sha256: SHA256,
        size: PDF.byteLength,
      }),
    ).toThrow();
  });
});
