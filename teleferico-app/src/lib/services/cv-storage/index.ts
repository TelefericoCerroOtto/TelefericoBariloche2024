import "server-only";

import { ENV_KEYS } from "@/lib/constants/env.const";
import type { CvStorage, CvStorageDriver, StoredCvFile } from "@/types";
import { assertEnv } from "@/utils/env";
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PRIVATE_BASE_PATH = "private/job-applications";
const DEFAULT_LOCAL_STORAGE_DIR = ".private/job-applications";
const DEFAULT_SIGNED_URL_TTL_SECONDS = 300;
const GCS_CLIENT = new Storage();

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
};

function normalizeBasePath(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function sanitizeFilename(value: string) {
  return value.replace(/["\r\n]/g, "_");
}

function resolveRuntimeDriver(
  preferred?: CvStorageDriver | string | null,
): CvStorageDriver {
  if (preferred === "local" || preferred === "gcs") return preferred;

  const envDriver = process.env[ENV_KEYS.CV_STORAGE_DRIVER];
  if (envDriver === "local" || envDriver === "gcs") return envDriver;

  throw new Error("CV_STORAGE_DRIVER is not configured");
}

function resolveExtension(file: File) {
  const fromName = path.extname(file.name).replace(/^\./, "").toLowerCase();
  if (fromName && ALLOWED_EXTENSIONS.has(fromName)) return fromName;

  const fromMime = MIME_TO_EXTENSION[file.type];
  if (fromMime) return fromMime;

  return "pdf";
}

function buildObjectKey(basePath: string, file: File) {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const ext = resolveExtension(file);

  return `${normalizeBasePath(basePath)}/${year}/${month}/${randomUUID()}.${ext}`;
}

function toStoredFile(
  objectKey: string,
  file: File,
  storageProvider: CvStorageDriver,
  bucket?: string,
): StoredCvFile {
  return {
    objectKey,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    storageProvider,
    ...(bucket ? { bucket } : {}),
  };
}

function resolveLocalPath(rootDir: string, objectKey: string, basePath: string) {
  const normalizedBasePath = normalizeBasePath(basePath);

  if (
    !objectKey.startsWith(normalizedBasePath) ||
    objectKey.length <= normalizedBasePath.length
  ) {
    throw new Error(`Invalid object key for local storage: ${objectKey}`);
  }

  const relativePath = objectKey.slice(normalizedBasePath.length + 1);
  return path.resolve(rootDir, relativePath);
}

async function bufferFromFile(file: File) {
  return Buffer.from(await file.arrayBuffer());
}

function getSignedUrlTtlSeconds() {
  const raw = process.env[ENV_KEYS.GCS_SIGNED_URL_TTL_SECONDS];
  const parsed = raw ? Number(raw) : DEFAULT_SIGNED_URL_TTL_SECONDS;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_SIGNED_URL_TTL_SECONDS;
}

function createLocalStorage(): CvStorage {
  assertEnv([ENV_KEYS.CV_LOCAL_STORAGE_DIR]);

  const rootDir = path.resolve(
    process.cwd(),
    process.env[ENV_KEYS.CV_LOCAL_STORAGE_DIR] ?? DEFAULT_LOCAL_STORAGE_DIR,
  );
  const basePath =
    process.env[ENV_KEYS.GCS_PRIVATE_BASE_PATH] ?? DEFAULT_PRIVATE_BASE_PATH;

  return {
    driver: "local",
    async save(file) {
      const objectKey = buildObjectKey(basePath, file);
      const filePath = resolveLocalPath(rootDir, objectKey, basePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, await bufferFromFile(file));

      return toStoredFile(objectKey, file, "local");
    },
    async getReadableStream(objectKey) {
      const filePath = resolveLocalPath(rootDir, objectKey, basePath);
      return createReadStream(filePath);
    },
    async delete(objectKey) {
      const filePath = resolveLocalPath(rootDir, objectKey, basePath);
      await rm(filePath, { force: true });
    },
  };
}

function createGcsStorage(): CvStorage {
  assertEnv([ENV_KEYS.GCS_BUCKET_NAME, ENV_KEYS.GCS_PRIVATE_BASE_PATH]);

  const bucketName = process.env[ENV_KEYS.GCS_BUCKET_NAME] as string;
  const basePath =
    process.env[ENV_KEYS.GCS_PRIVATE_BASE_PATH] ?? DEFAULT_PRIVATE_BASE_PATH;
  const bucket = GCS_CLIENT.bucket(bucketName);

  return {
    driver: "gcs",
    bucket: bucketName,
    async save(file) {
      const objectKey = buildObjectKey(basePath, file);
      const gcsFile = bucket.file(objectKey);

      await gcsFile.save(await bufferFromFile(file), {
        resumable: false,
        contentType: file.type || "application/octet-stream",
        metadata: {
          contentDisposition: `attachment; filename="${sanitizeFilename(file.name)}"`,
          cacheControl: "private, no-store, max-age=0",
        },
      });

      return toStoredFile(objectKey, file, "gcs", bucketName);
    },
    async getReadableStream(objectKey) {
      return bucket.file(objectKey).createReadStream();
    },
    async delete(objectKey) {
      await bucket.file(objectKey).delete({ ignoreNotFound: true });
    },
    async getDownloadUrl(objectKey) {
      const [url] = await bucket.file(objectKey).getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + getSignedUrlTtlSeconds() * 1000,
      });

      return url;
    },
  };
}

export function createCvStorage(driver?: CvStorageDriver | string | null): CvStorage {
  const resolvedDriver = resolveRuntimeDriver(driver);

  if (resolvedDriver === "gcs") {
    return createGcsStorage();
  }

  return createLocalStorage();
}
