import "server-only";

import { createHash } from "node:crypto";
import {
  MAX_REPORT_PDF_BYTES,
  validateReportDownloadMetadata,
  type PrivateReportDownloadMetadataV1,
} from "../../../services/survey-report-worker/src/private-report-download-metadata-transport";

const REPORT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class FeedbackReportDownloadError extends Error {
  constructor(readonly code: "NOT_FOUND" | "UPSTREAM_UNAVAILABLE") {
    super("The requested report download is unavailable");
    this.name = "FeedbackReportDownloadError";
  }
}

export type PrivateReportObjectReader = {
  read(objectKey: string, maxBytes: number): Promise<Uint8Array>;
};

export function createFeedbackReportDownload(input: {
  readonly metadataReader: {
    read(reportId: string): Promise<PrivateReportDownloadMetadataV1>;
  };
  readonly objectReader: PrivateReportObjectReader;
}) {
  if (
    typeof input.metadataReader?.read !== "function" ||
    typeof input.objectReader?.read !== "function"
  )
    throw new TypeError("Report download readers are required");

  return Object.freeze({
    async read(reportId: string) {
      if (!REPORT_ID_PATTERN.test(reportId))
        throw new FeedbackReportDownloadError("NOT_FOUND");

      let metadata: PrivateReportDownloadMetadataV1;
      try {
        metadata = validateReportDownloadMetadata(
          await input.metadataReader.read(reportId),
          reportId,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "NOT_FOUND"
        )
          throw new FeedbackReportDownloadError("NOT_FOUND");
        throw new FeedbackReportDownloadError("UPSTREAM_UNAVAILABLE");
      }

      try {
        const bytes = await input.objectReader.read(
          metadata.objectKey,
          MAX_REPORT_PDF_BYTES,
        );
        if (
          !(bytes instanceof Uint8Array) ||
          bytes.byteLength !== metadata.size ||
          bytes.byteLength > MAX_REPORT_PDF_BYTES ||
          bytes.byteLength < 5 ||
          new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
          createHash("sha256").update(bytes).digest("hex") !== metadata.sha256
        )
          throw new TypeError("Stored report bytes do not match metadata");
        return { metadata, bytes };
      } catch {
        throw new FeedbackReportDownloadError("UPSTREAM_UNAVAILABLE");
      }
    },
  });
}

export function getFeedbackReportDownload(): ReturnType<
  typeof createFeedbackReportDownload
> {
  throw new FeedbackReportDownloadError("UPSTREAM_UNAVAILABLE");
}
