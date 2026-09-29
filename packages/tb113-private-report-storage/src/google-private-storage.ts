import "server-only";

import { Storage, type Bucket, type File } from "@google-cloud/storage";
import type {
  PrivateReportObjectBucket,
  PrivateReportObjectMetadata,
  PrivateReportObjectMetadataV1,
} from "./private-storage";
import { assertKeylessCloudRunEnvironment } from "@teleferico/tb113-runtime-contracts";

const APPROVED_PREFIX = "private/feedback-reports/";
const MAX_PDF_BYTES = 25 * 1024 * 1024;

export type GoogleStoragePort = Pick<Storage, "bucket">;

function validBucketName(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(value);
}

function validKey(value: string): boolean {
  return (
    value.startsWith(APPROVED_PREFIX) &&
    !value.includes("..") &&
    !value.includes("\\")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function metadataFields(
  value: Record<string, unknown>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function isNotFound(error: unknown): boolean {
  return isRecord(error) && (error.code === 404 || error.statusCode === 404);
}

function isPreconditionFailure(error: unknown): boolean {
  return (
    isRecord(error) &&
    (error.code === 412 ||
      error.code === 409 ||
      error.statusCode === 412 ||
      error.statusCode === 409)
  );
}

async function readStream(
  file: Pick<File, "createReadStream">,
  maxBytes: number,
): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of file.createReadStream()) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > maxBytes)
      throw new Error("Private report object is unavailable");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}

function sameExpected(
  actual: PrivateReportObjectMetadataV1,
  expected: PrivateReportObjectMetadataV1,
): boolean {
  return (
    actual.contractVersion === expected.contractVersion &&
    actual.reportId === expected.reportId &&
    actual.reportRunId === expected.reportRunId &&
    actual.sha256 === expected.sha256 &&
    actual.mimeType === expected.mimeType
  );
}

export function createGooglePrivateReportBucket(input: {
  readonly bucketName: string;
  readonly objectPrefix: "private/feedback-reports";
  readonly storage?: GoogleStoragePort;
}): PrivateReportObjectBucket {
  if (
    !validBucketName(input.bucketName) ||
    input.objectPrefix !== "private/feedback-reports"
  )
    throw new TypeError(
      "Approved private report bucket configuration is required",
    );
  if (!input.storage) assertKeylessCloudRunEnvironment();
  const storage = input.storage ?? new Storage();
  const bucket: Bucket = storage.bucket(input.bucketName);

  async function isBucketPrivate(): Promise<boolean> {
    try {
      const [metadata] = await bucket.getMetadata();
      const [policy] = await bucket.iam.getPolicy({
        requestedPolicyVersion: 3,
      });
      const iam = metadata.iamConfiguration;
      const uniform =
        isRecord(iam) &&
        isRecord(iam.uniformBucketLevelAccess) &&
        iam.uniformBucketLevelAccess.enabled === true;
      const prevention =
        isRecord(iam) && iam.publicAccessPrevention === "enforced";
      const bindings = Array.isArray(policy.bindings) ? policy.bindings : [];
      const hasPublicBinding = bindings.some(
        (binding) =>
          isRecord(binding) &&
          Array.isArray(binding.members) &&
          binding.members.some(
            (member) =>
              member === "allUsers" || member === "allAuthenticatedUsers",
          ),
      );
      return uniform && prevention && !hasPublicBinding;
    } catch {
      return false;
    }
  }

  const adapter: PrivateReportObjectBucket = {
    async isPrivate(): Promise<boolean> {
      return isBucketPrivate();
    },
    async createIfAbsent(object) {
      if (
        !validKey(object.objectKey) ||
        object.bytes.byteLength > MAX_PDF_BYTES ||
        object.contentType !== "application/pdf" ||
        object.cacheControl !== "private, no-store"
      )
        throw new Error("Private report storage operation failed");
      if (!(await isBucketPrivate()))
        throw new Error("Private report storage operation failed");
      const file = bucket.file(object.objectKey);
      try {
        await file.save(Buffer.from(object.bytes), {
          resumable: false,
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: {
            contentType: object.contentType,
            cacheControl: object.cacheControl,
            metadata: object.customMetadata,
          },
        });
        return "created";
      } catch (error) {
        if (isPreconditionFailure(error)) return "exists";
        throw new Error("Private report storage operation failed");
      }
    },
    async getMetadata(objectKey): Promise<PrivateReportObjectMetadata | null> {
      if (!validKey(objectKey))
        throw new Error("Private report storage operation failed");
      let raw: Record<string, unknown>;
      try {
        [raw] = (await bucket.file(objectKey).getMetadata()) as unknown as [
          Record<string, unknown>,
        ];
      } catch (error) {
        if (isNotFound(error)) return null;
        throw new Error("Private report storage operation failed");
      }
      const size = Number(raw.size);
      const custom = isRecord(raw.metadata) ? metadataFields(raw.metadata) : {};
      const contentType =
        typeof raw.contentType === "string" ? raw.contentType : "";
      const cacheControl =
        typeof raw.cacheControl === "string" ? raw.cacheControl : null;
      const visibility = (await isBucketPrivate()) ? "private" : "public";
      return {
        size,
        contentType,
        cacheControl,
        visibility,
        customMetadata: custom,
      };
    },
    async readBounded(objectKey, maxBytes) {
      if (
        !validKey(objectKey) ||
        !Number.isSafeInteger(maxBytes) ||
        maxBytes < 1 ||
        maxBytes > MAX_PDF_BYTES
      )
        throw new Error("Private report storage operation failed");
      if (!(await isBucketPrivate()))
        throw new Error("Private report storage operation failed");
      const file = bucket.file(objectKey);
      try {
        const [observed] = await file.getMetadata();
        if (
          typeof observed.generation !== "string" ||
          !/^[1-9]\d*$/.test(observed.generation)
        )
          throw new Error("Private report storage operation failed");
        const pinnedFile = bucket.file(objectKey, {
          generation: observed.generation,
        });
        const [metadata] = await pinnedFile.getMetadata();
        if (
          !Number.isSafeInteger(Number(metadata.size)) ||
          Number(metadata.size) < 1 ||
          Number(metadata.size) > maxBytes
        )
          throw new Error("Private report storage operation failed");
        if (metadata.generation !== observed.generation)
          throw new Error("Private report storage operation failed");
        return await readStream(pinnedFile, maxBytes);
      } catch {
        throw new Error("Private report storage operation failed");
      }
    },
    async deleteIfMetadataMatches(objectKey, expected) {
      if (!validKey(objectKey)) return false;
      if (!(await isBucketPrivate())) return false;
      const file = bucket.file(objectKey);
      try {
        const [raw] = await file.getMetadata();
        const custom = isRecord(raw.metadata) ? raw.metadata : {};
        const actual: PrivateReportObjectMetadataV1 = {
          contractVersion: String(
            custom.contractVersion ?? "",
          ) as PrivateReportObjectMetadataV1["contractVersion"],
          reportId: String(custom.reportId ?? ""),
          reportRunId: String(custom.reportRunId ?? ""),
          sha256: String(custom.sha256 ?? ""),
          mimeType: String(
            custom.mimeType ?? "",
          ) as PrivateReportObjectMetadataV1["mimeType"],
        };
        if (
          !sameExpected(actual, expected) ||
          !/^[1-9]\d*$/.test(String(raw.generation))
        )
          return false;
        await file.delete({ ifGenerationMatch: raw.generation as string });
        return true;
      } catch (error) {
        if (isNotFound(error)) return true;
        if (isPreconditionFailure(error)) return false;
        throw new Error("Private report storage operation failed");
      }
    },
  };
  return Object.freeze(adapter);
}
