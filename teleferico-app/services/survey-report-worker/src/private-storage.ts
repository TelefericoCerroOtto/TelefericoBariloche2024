import "server-only";

import { createHash } from "node:crypto";

import {
  MAX_REPORT_PDF_BYTES,
  type PrivateReportDownloadMetadataV1,
} from "./private-report-download-metadata-transport";
import { deterministicReportId } from "./private-report-identity";
import type { WorkerArtifact, WorkerArtifactStore } from "./contracts";
import type { PrivateReportObjectReader } from "../../../src/lib/feedback/report-download";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const REPORT_KEY_PATTERN =
  /^private\/feedback-reports\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/report\.pdf$/;
const PRIVATE_CACHE_CONTROL = "private, no-store";

export type PrivateReportObjectMetadata = {
  readonly size: number;
  readonly contentType: string;
  readonly cacheControl: string | null;
  readonly visibility: "private" | "public" | "unknown";
  readonly customMetadata: Readonly<Record<string, string>>;
};

export type PrivateReportObjectMetadataV1 = {
  readonly contractVersion: "survey-private-report-object.v1";
  readonly reportId: string;
  readonly reportRunId: string;
  readonly sha256: string;
  readonly mimeType: "application/pdf";
};

/**
 * Atomic, bucket-scoped port. Its implementation must enforce a private
 * bucket policy and conditional create/delete; it must not expose ACL or URL APIs.
 */
export interface PrivateReportObjectBucket {
  isPrivate(): Promise<boolean>;
  createIfAbsent(input: {
    readonly objectKey: string;
    readonly bytes: Uint8Array;
    readonly contentType: "application/pdf";
    readonly cacheControl: typeof PRIVATE_CACHE_CONTROL;
    readonly customMetadata: PrivateReportObjectMetadataV1;
  }): Promise<"created" | "exists">;
  getMetadata(objectKey: string): Promise<PrivateReportObjectMetadata | null>;
  readBounded(objectKey: string, maxBytes: number): Promise<Uint8Array>;
  deleteIfMetadataMatches(
    objectKey: string,
    expected: PrivateReportObjectMetadataV1,
  ): Promise<boolean>;
}

function fail(): never {
  throw new Error("Private report storage operation failed");
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isPdf(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 5 &&
    new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-"
  );
}

function metadataFor(
  reportRunId: string,
  reportId: string,
  sha256: string,
): PrivateReportObjectMetadataV1 {
  return {
    contractVersion: "survey-private-report-object.v1",
    reportId,
    reportRunId,
    sha256,
    mimeType: "application/pdf",
  };
}

function matchesMetadata(
  actual: PrivateReportObjectMetadata | null,
  expected: PrivateReportObjectMetadataV1,
  maxBytes: number,
): actual is PrivateReportObjectMetadata {
  const custom = actual?.customMetadata;
  return Boolean(
    actual &&
      actual.visibility === "private" &&
      actual.contentType === "application/pdf" &&
      actual.cacheControl === PRIVATE_CACHE_CONTROL &&
      Number.isSafeInteger(actual.size) &&
      actual.size > 0 &&
      actual.size <= maxBytes &&
      custom?.contractVersion === expected.contractVersion &&
      custom.reportId === expected.reportId &&
      custom.reportRunId === expected.reportRunId &&
      custom.sha256 === expected.sha256 &&
      custom.mimeType === expected.mimeType,
  );
}

function validateBytes(
  bytes: Uint8Array,
  metadata: PrivateReportObjectMetadata,
  expectedSha256: string,
): Uint8Array {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.byteLength !== metadata.size ||
    !isPdf(bytes) ||
    digest(bytes) !== expectedSha256
  )
    return fail();
  return bytes;
}

function keyFor(reportId: string): string {
  return `private/feedback-reports/${reportId}/report.pdf`;
}

function reportIdFromKey(objectKey: string): string | null {
  return REPORT_KEY_PATTERN.exec(objectKey)?.[1] ?? null;
}

export function createPrivateReportObjectStorage(input: {
  readonly bucket: PrivateReportObjectBucket;
}): {
  readonly artifacts: WorkerArtifactStore;
  readonly objectReader: PrivateReportObjectReader;
} {
  if (
    typeof input.bucket?.isPrivate !== "function" ||
    typeof input.bucket?.createIfAbsent !== "function" ||
    typeof input.bucket?.getMetadata !== "function" ||
    typeof input.bucket?.readBounded !== "function" ||
    typeof input.bucket?.deleteIfMetadataMatches !== "function"
  )
    throw new TypeError("A private report bucket port is required");

  async function assertPrivateBucket(): Promise<void> {
    if (!(await input.bucket.isPrivate())) return fail();
  }

  const artifacts: WorkerArtifactStore = Object.freeze({
    async stage(reportRunId: string, artifact: WorkerArtifact) {
      if (
        !UUID_PATTERN.test(reportRunId) ||
        !SHA256_PATTERN.test(artifact.sha256) ||
        !Number.isSafeInteger(artifact.size) ||
        artifact.size < 1 ||
        artifact.size > MAX_REPORT_PDF_BYTES ||
        artifact.size !== artifact.bytes.byteLength ||
        !isPdf(artifact.bytes) ||
        digest(artifact.bytes) !== artifact.sha256
      )
        return fail();

      const reportId = deterministicReportId(reportRunId, artifact.sha256);
      const objectKey = keyFor(reportId);
      if (artifact.objectKey !== objectKey || artifact.mimeType !== "application/pdf")
        return fail();

      await assertPrivateBucket();
      const expected = metadataFor(reportRunId, reportId, artifact.sha256);
      await input.bucket.createIfAbsent({
        objectKey,
        bytes: new Uint8Array(artifact.bytes),
        contentType: "application/pdf",
        cacheControl: PRIVATE_CACHE_CONTROL,
        customMetadata: expected,
      });

      const storedMetadata = await input.bucket.getMetadata(objectKey);
      if (!matchesMetadata(storedMetadata, expected, MAX_REPORT_PDF_BYTES))
        return fail();
      const storedBytes = await input.bucket.readBounded(objectKey, MAX_REPORT_PDF_BYTES);
      validateBytes(storedBytes, storedMetadata, artifact.sha256);
    },

    async readStaged(reportRunId: string, sha256: string): Promise<WorkerArtifact | null> {
      if (!UUID_PATTERN.test(reportRunId) || !SHA256_PATTERN.test(sha256))
        return fail();
      const reportId = deterministicReportId(reportRunId, sha256);
      const objectKey = keyFor(reportId);
      await assertPrivateBucket();
      const expected = metadataFor(reportRunId, reportId, sha256);
      const storedMetadata = await input.bucket.getMetadata(objectKey);
      if (storedMetadata === null) return null;
      if (!matchesMetadata(storedMetadata, expected, MAX_REPORT_PDF_BYTES))
        return fail();
      const bytes = validateBytes(
        await input.bucket.readBounded(objectKey, MAX_REPORT_PDF_BYTES),
        storedMetadata,
        sha256,
      );
      return {
        objectKey,
        bytes,
        sha256,
        size: storedMetadata.size,
        mimeType: "application/pdf",
      };
    },

    async discardStaged(reportRunId: string, sha256: string): Promise<void> {
      if (!UUID_PATTERN.test(reportRunId) || !SHA256_PATTERN.test(sha256))
        return fail();
      const reportId = deterministicReportId(reportRunId, sha256);
      const objectKey = keyFor(reportId);
      await assertPrivateBucket();
      const expected = metadataFor(reportRunId, reportId, sha256);
      const storedMetadata = await input.bucket.getMetadata(objectKey);
      if (storedMetadata === null) return;
      if (!matchesMetadata(storedMetadata, expected, MAX_REPORT_PDF_BYTES))
        return fail();
      if (!(await input.bucket.deleteIfMetadataMatches(objectKey, expected)))
        return fail();
    },
  });

  const objectReader: PrivateReportObjectReader = Object.freeze({
    async read(objectKey, maxBytes) {
      const reportId = reportIdFromKey(objectKey);
      if (
        reportId === null ||
        !Number.isSafeInteger(maxBytes) ||
        maxBytes < 1 ||
        maxBytes > MAX_REPORT_PDF_BYTES
      )
        return fail();
      await assertPrivateBucket();
      const storedMetadata = await input.bucket.getMetadata(objectKey);
      if (storedMetadata === null) return fail();
      const custom = storedMetadata.customMetadata;
      const reportRunId = custom.reportRunId;
      const sha256 = custom.sha256;
      if (
        !UUID_PATTERN.test(reportRunId ?? "") ||
        !SHA256_PATTERN.test(sha256 ?? "") ||
        deterministicReportId(reportRunId, sha256) !== reportId
      )
        return fail();
      const expected = metadataFor(reportRunId, reportId, sha256);
      if (!matchesMetadata(storedMetadata, expected, maxBytes)) return fail();
      return validateBytes(
        await input.bucket.readBounded(objectKey, maxBytes),
        storedMetadata,
        sha256,
      );
    },
  });

  return Object.freeze({ artifacts, objectReader });
}

export function toPrivateReportDownloadMetadata(input: {
  readonly reportId: string;
  readonly reportRunId: string;
  readonly sha256: string;
  readonly size: number;
}): PrivateReportDownloadMetadataV1 {
  if (
    !UUID_PATTERN.test(input.reportId) ||
    !UUID_PATTERN.test(input.reportRunId) ||
    !SHA256_PATTERN.test(input.sha256) ||
    !Number.isSafeInteger(input.size) ||
    input.size < 1 ||
    input.size > MAX_REPORT_PDF_BYTES ||
    deterministicReportId(input.reportRunId, input.sha256) !== input.reportId
  )
    return fail();
  return {
    contractVersion: "survey-report-download-metadata.v1",
    reportId: input.reportId,
    reportRunId: input.reportRunId,
    generationStatus: "succeeded",
    objectKey: keyFor(input.reportId),
    sha256: input.sha256,
    size: input.size,
    mimeType: "application/pdf",
  };
}
