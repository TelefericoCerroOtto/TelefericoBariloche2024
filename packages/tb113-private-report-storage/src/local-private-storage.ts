import { constants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  unlink,
  writeFile,
} from "node:fs/promises";
import { isAbsolute, join, parse, relative, resolve, sep } from "node:path";

const REPORT_KEY_PATTERN =
  /^private\/feedback-reports\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/report\.pdf$/;
const PRIVATE_CACHE_CONTROL = "private, no-store" as const;
const MAX_METADATA_BYTES = 4 * 1024;

type LocalObjectMetadataV1 = {
  readonly contractVersion: "survey-private-report-object.v1";
  readonly reportId: string;
  readonly reportRunId: string;
  readonly sha256: string;
  readonly mimeType: "application/pdf";
};

type LocalMetadataFile = {
  readonly size: number;
  readonly contentType: string;
  readonly cacheControl: string | null;
  readonly visibility: "private" | "public" | "unknown";
  readonly customMetadata: Readonly<Record<string, string>>;
};

type LocalPrivateReportBucket = {
  isPrivate(): Promise<boolean>;
  createIfAbsent(input: {
    readonly objectKey: string;
    readonly bytes: Uint8Array;
    readonly contentType: "application/pdf";
    readonly cacheControl: typeof PRIVATE_CACHE_CONTROL;
    readonly customMetadata: LocalObjectMetadataV1;
  }): Promise<"created" | "exists">;
  getMetadata(objectKey: string): Promise<LocalMetadataFile | null>;
  readBounded(objectKey: string, maxBytes: number): Promise<Uint8Array>;
  deleteIfMetadataMatches(
    objectKey: string,
    expected: LocalObjectMetadataV1,
  ): Promise<boolean>;
};

function isMissing(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function fail(): never {
  throw new Error("Local private report storage operation failed");
}

function validateKey(objectKey: string): string {
  const match = REPORT_KEY_PATTERN.exec(objectKey);
  if (!match) return fail();
  return match[1]!;
}

async function assertSafeDirectory(directory: string, create: boolean): Promise<void> {
  const absolute = resolve(directory);
  const root = parseRoot(absolute);
  const segments = relative(root, absolute).split(sep).filter(Boolean);
  let current = root;
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) return fail();

  for (const segment of segments) {
    current = join(current, segment);
    if (create) await mkdir(current, { mode: 0o700 }).catch((error: unknown) => {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") throw error;
    });
    const info = await lstat(current).catch((error: unknown) => {
      if (isMissing(error)) return null;
      throw error;
    });
    if (!info) return fail();
    if (info.isSymbolicLink() || !info.isDirectory()) return fail();
  }

  const info = await lstat(absolute);
  if ((info.mode & 0o077) !== 0) return fail();
}

function parseRoot(path: string): string {
  const root = parse(path).root;
  if (!isAbsolute(root)) return fail();
  return root;
}

async function readRegularFile(path: string, maxBytes: number): Promise<Uint8Array> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const info = await handle.stat();
    if (!info.isFile() || info.size < 0 || info.size > maxBytes) return fail();
    const bytes = await handle.readFile();
    if (bytes.byteLength !== info.size || bytes.byteLength > maxBytes) return fail();
    return new Uint8Array(bytes);
  } finally {
    await handle.close();
  }
}

async function readMetadata(path: string): Promise<LocalMetadataFile | null> {
  let bytes: Uint8Array;
  try {
    bytes = await readRegularFile(path, MAX_METADATA_BYTES);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return fail();
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  const metadata = value as Partial<LocalMetadataFile>;
  const custom = metadata.customMetadata;
  if (
    !Number.isSafeInteger(metadata.size) ||
    typeof metadata.contentType !== "string" ||
    typeof metadata.cacheControl !== "string" ||
    (metadata.visibility !== "private" && metadata.visibility !== "public" && metadata.visibility !== "unknown") ||
    !custom || typeof custom !== "object"
  )
    return fail();
  return metadata as LocalMetadataFile;
}

export function createLocalPrivateReportBucket(input: {
  readonly rootDirectory: string;
}): LocalPrivateReportBucket {
  if (typeof input.rootDirectory !== "string" || !isAbsolute(input.rootDirectory))
    throw new TypeError("An absolute local private report directory is required");
  const rootDirectory = resolve(input.rootDirectory);

  async function objectPaths(objectKey: string) {
    const reportId = validateKey(objectKey);
    const directory = join(rootDirectory, "private", "feedback-reports", reportId);
    await assertSafeDirectory(directory, true);
    return { directory, bytes: join(directory, "report.pdf"), metadata: join(directory, "metadata.json") };
  }

  return Object.freeze({
    async isPrivate() {
      try {
        await assertSafeDirectory(rootDirectory, true);
        return true;
      } catch {
        return false;
      }
    },

    async createIfAbsent(input) {
      const paths = await objectPaths(input.objectKey);
      const customMetadata = input.customMetadata;
      if (
        input.contentType !== "application/pdf" ||
        input.cacheControl !== PRIVATE_CACHE_CONTROL ||
        !customMetadata ||
        customMetadata.mimeType !== "application/pdf" ||
        customMetadata.reportId !== validateKey(input.objectKey)
      )
        return fail();

      for (const path of [paths.bytes, paths.metadata]) {
        const info = await lstat(path).catch((error: unknown) => {
          if (isMissing(error)) return null;
          throw error;
        });
        if (info) {
          if (info.isSymbolicLink() || !info.isFile()) return fail();
          return "exists";
        }
      }

      const temporaryId = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const bytesTemporary = join(paths.directory, `.report-${temporaryId}.tmp`);
      const metadataTemporary = join(paths.directory, `.metadata-${temporaryId}.tmp`);
      const metadata: LocalMetadataFile = {
        size: input.bytes.byteLength,
        contentType: input.contentType,
        cacheControl: input.cacheControl,
        visibility: "private",
        customMetadata,
      };
      let bytesInstalled = false;
      let metadataInstalled = false;
      try {
        await writeFile(bytesTemporary, input.bytes, { flag: "wx", mode: 0o600 });
        await writeFile(metadataTemporary, JSON.stringify(metadata), { flag: "wx", mode: 0o600 });
        await link(bytesTemporary, paths.bytes);
        bytesInstalled = true;
        await link(metadataTemporary, paths.metadata);
        metadataInstalled = true;
        return "created";
      } catch (error) {
        if (bytesInstalled) await unlink(paths.bytes).catch(() => undefined);
        if (metadataInstalled) await unlink(paths.metadata).catch(() => undefined);
        if (!error || typeof error !== "object" || !("code" in error) || error.code !== "EEXIST") throw error;
        return "exists";
      } finally {
        await unlink(bytesTemporary).catch(() => undefined);
        await unlink(metadataTemporary).catch(() => undefined);
      }
    },

    async getMetadata(objectKey) {
      const paths = await objectPaths(objectKey);
      return readMetadata(paths.metadata);
    },

    async readBounded(objectKey, maxBytes) {
      if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return fail();
      const paths = await objectPaths(objectKey);
      return readRegularFile(paths.bytes, maxBytes);
    },

    async deleteIfMetadataMatches(objectKey, expected) {
      const paths = await objectPaths(objectKey);
      const actual = await readMetadata(paths.metadata);
      if (!actual || JSON.stringify(actual.customMetadata) !== JSON.stringify(expected)) return false;
      const bytes = await readRegularFile(paths.bytes, actual.size);
      if (bytes.byteLength !== actual.size) return fail();
      await unlink(paths.bytes);
      await unlink(paths.metadata);
      return true;
    },
  });
}
