import "server-only";

import { ENV_KEYS } from "@/lib/constants/env.const";
import type { CvStorage, CvStorageDriver, StoredCvFile } from "@/types";
import { assertEnv } from "@/utils/env";
import { GoogleAuth } from "google-auth-library";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_PRIVATE_BASE_PATH = "private/job-applications";
const DEFAULT_LOCAL_STORAGE_DIR = ".private/job-applications";
const GCS_UPLOAD_BASE_URL = "https://storage.googleapis.com/upload/storage/v1";
const GCS_OBJECTS_BASE_URL = "https://storage.googleapis.com/storage/v1";
const GCS_SCOPE = ["https://www.googleapis.com/auth/devstorage.read_write"];

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx", "txt"]);
const MIME_TO_EXTENSION: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
};

type GoogleClient = Awaited<ReturnType<GoogleAuth["getClient"]>>;

let googleClientPromise: Promise<GoogleClient> | null = null;

function normalizeBasePath(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
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

async function getGoogleClient(): Promise<GoogleClient> {
  if (!googleClientPromise) {
    const auth = new GoogleAuth({ scopes: GCS_SCOPE });
    googleClientPromise = auth.getClient();
  }

  return googleClientPromise!;
}

async function getGoogleAccessToken() {
  const client = await getGoogleClient();
  const tokenRes = await client.getAccessToken();
  const token = typeof tokenRes === "string" ? tokenRes : tokenRes?.token;

  if (!token) {
    throw new Error("Unable to resolve Google access token for CV storage");
  }

  return token;
}

async function bufferFromFile(file: File) {
  return Buffer.from(await file.arrayBuffer());
}

function createLocalStorage(): CvStorage {
  assertEnv([ENV_KEYS.CV_LOCAL_STORAGE_DIR, ENV_KEYS.GCS_PRIVATE_BASE_PATH]);

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
      const dir = path.dirname(filePath);
      await mkdir(dir, { recursive: true });
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

  const bucket = process.env[ENV_KEYS.GCS_BUCKET_NAME] as string;
  const basePath =
    process.env[ENV_KEYS.GCS_PRIVATE_BASE_PATH] ?? DEFAULT_PRIVATE_BASE_PATH;

  return {
    driver: "gcs",
    bucket,
    async save(file) {
      const objectKey = buildObjectKey(basePath, file);
      const uploadUrl = new URL(
        `${GCS_UPLOAD_BASE_URL}/b/${encodeURIComponent(bucket)}/o`,
      );
      uploadUrl.searchParams.set("uploadType", "media");
      uploadUrl.searchParams.set("name", objectKey);

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await getGoogleAccessToken()}`,
          "Content-Type": file.type || "application/octet-stream",
        },
        body: await bufferFromFile(file),
      });

      if (!response.ok) {
        throw new Error(
          `GCS upload failed with status ${response.status}: ${await response.text()}`,
        );
      }

      return toStoredFile(objectKey, file, "gcs", bucket);
    },
    async getReadableStream(objectKey) {
      const downloadUrl = `${GCS_OBJECTS_BASE_URL}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectKey)}?alt=media`;
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${await getGoogleAccessToken()}`,
        },
        cache: "no-store",
      });

      if (!response.ok || !response.body) {
        throw new Error(
          `GCS download failed with status ${response.status}: ${await response.text()}`,
        );
      }

      return response.body;
    },
    async delete(objectKey) {
      const deleteUrl = `${GCS_OBJECTS_BASE_URL}/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectKey)}`;
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await getGoogleAccessToken()}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(
          `GCS delete failed with status ${response.status}: ${await response.text()}`,
        );
      }
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
