import type {
  PrivateReportObjectBucket,
  PrivateReportObjectMetadata,
} from "@teleferico/tb113-private-report-storage";

export function createFakePrivateReportBucket() {
  const objects = new Map<
    string,
    { bytes: Uint8Array; metadata: PrivateReportObjectMetadata }
  >();
  const calls = { create: 0, read: 0, delete: 0 };
  let isPrivate = true;
  let refuseDelete = false;
  const bucket: PrivateReportObjectBucket = {
    async isPrivate() {
      return isPrivate;
    },
    async createIfAbsent(input) {
      calls.create += 1;
      if (objects.has(input.objectKey)) return "exists";
      objects.set(input.objectKey, {
        bytes: new Uint8Array(input.bytes),
        metadata: {
          size: input.bytes.byteLength,
          contentType: input.contentType,
          cacheControl: input.cacheControl,
          visibility: "private",
          customMetadata: input.customMetadata,
        },
      });
      return "created";
    },
    async getMetadata(objectKey) {
      return objects.get(objectKey)?.metadata ?? null;
    },
    async readBounded(objectKey, maxBytes) {
      calls.read += 1;
      const object = objects.get(objectKey);
      if (!object || object.bytes.byteLength > maxBytes)
        throw new Error("Synthetic bounded read rejected");
      return new Uint8Array(object.bytes);
    },
    async deleteIfMetadataMatches(objectKey, expected) {
      calls.delete += 1;
      if (refuseDelete) return false;
      const object = objects.get(objectKey);
      if (!object) return true;
      const custom = object.metadata.customMetadata;
      if (
        custom.contractVersion !== expected.contractVersion ||
        custom.reportId !== expected.reportId ||
        custom.reportRunId !== expected.reportRunId ||
        custom.sha256 !== expected.sha256
      )
        return false;
      objects.delete(objectKey);
      return true;
    },
  };

  return {
    bucket,
    objects,
    calls,
    setPrivate(value: boolean) {
      isPrivate = value;
    },
    refuseDelete() {
      refuseDelete = true;
    },
    tamper(
      objectKey: string,
      update: (_metadata: PrivateReportObjectMetadata) => PrivateReportObjectMetadata,
    ) {
      const object = objects.get(objectKey);
      if (object) object.metadata = update(object.metadata);
    },
    replaceBytes(objectKey: string, bytes: Uint8Array) {
      const object = objects.get(objectKey);
      if (object) object.bytes = new Uint8Array(bytes);
    },
  };
}
