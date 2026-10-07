export const MAX_REPORT_PDF_BYTES = 25 * 1024 * 1024;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type PrivateReportDownloadMetadataV1 = {
  readonly contractVersion: "survey-report-download-metadata.v1";
  readonly reportId: string;
  readonly reportRunId: string;
  readonly generationStatus: "succeeded";
  readonly objectKey: string;
  readonly sha256: string;
  readonly size: number;
  readonly mimeType: "application/pdf";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateReportDownloadMetadata(
  value: unknown,
  expectedReportId: string,
): PrivateReportDownloadMetadataV1 {
  if (!UUID_PATTERN.test(expectedReportId) || !isRecord(value))
    throw new TypeError("Private report metadata is invalid");

  const keys = [
    "contractVersion",
    "reportId",
    "reportRunId",
    "generationStatus",
    "objectKey",
    "sha256",
    "size",
    "mimeType",
  ];
  if (
    Object.keys(value).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(value, key)) ||
    value.contractVersion !== "survey-report-download-metadata.v1" ||
    value.reportId !== expectedReportId ||
    typeof value.reportRunId !== "string" ||
    !UUID_PATTERN.test(value.reportRunId) ||
    value.generationStatus !== "succeeded" ||
    value.objectKey !==
      `private/feedback-reports/${expectedReportId}/report.pdf` ||
    typeof value.sha256 !== "string" ||
    !SHA256_PATTERN.test(value.sha256) ||
    !Number.isSafeInteger(value.size) ||
    (value.size as number) < 1 ||
    (value.size as number) > MAX_REPORT_PDF_BYTES ||
    value.mimeType !== "application/pdf"
  )
    throw new TypeError("Private report metadata is invalid");

  return value as PrivateReportDownloadMetadataV1;
}
