// @vitest-environment node

import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const gcsMocks = vi.hoisted(() => {
  const createReadStream = vi.fn();
  const getMetadata = vi.fn();
  const file = vi.fn(() => ({ createReadStream, getMetadata }));
  const bucket = vi.fn(() => ({ file }));
  const Storage = vi.fn(function StorageMock() {
    return { bucket };
  });

  return { Storage, bucket, createReadStream, file, getMetadata };
});

vi.mock("@google-cloud/storage", () => ({
  Storage: gcsMocks.Storage,
}));

const BUCKET_NAME = "cms_test_bucket";
const MEDIA_PATH = [BUCKET_NAME, "public", "cms", "logo.svg"];

function createMediaRequest() {
  return new NextRequest(
    `https://telefericobariloche.com.ar/api/media/${MEDIA_PATH.join("/")}`,
  );
}

async function getMediaResponse(path = MEDIA_PATH) {
  const { GET } = await import("./route");

  return GET(createMediaRequest(), {
    params: Promise.resolve({ path }),
  });
}

describe("CMS media proxy", () => {
  const envBackup = { ...process.env };
  let consoleLogSpy: ReturnType<typeof vi.spyOn> | null = null;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      BUILD_STRAPI_BASE_URL: "https://cms.example.com",
      BUILD_STRAPI_BUCKET_HOSTNAME: "storage.googleapis.com",
      BUILD_STRAPI_BUCKET_PATHNAME: `/${BUCKET_NAME}/public/cms/**`,
      GCS_BUCKET_NAME: BUCKET_NAME,
    };
  });

  afterEach(() => {
    consoleLogSpy?.mockRestore();
    consoleLogSpy = null;
    process.env = { ...envBackup };
  });

  it("streams the complete decompressed body without the compressed content length", async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>';
    gcsMocks.getMetadata.mockResolvedValue([
      {
        cacheControl: "public, max-age=3600",
        contentDisposition: 'inline; filename="logo.svg"',
        contentEncoding: "gzip",
        contentType: "image/svg+xml",
        size: "24",
      },
    ]);
    gcsMocks.createReadStream.mockReturnValue(
      Readable.from([Buffer.from(svg)]),
    );

    const response = await getMediaResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBeNull();
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="logo.svg"',
    );
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=3600",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.text()).toBe(svg);
  });

  it("keeps the stored content length for uncompressed media", async () => {
    const body = Buffer.from("uncompressed-image");
    gcsMocks.getMetadata.mockResolvedValue([
      {
        contentType: "image/png",
        size: String(body.byteLength),
      },
    ]);
    gcsMocks.createReadStream.mockReturnValue(Readable.from([body]));

    const response = await getMediaResponse();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe(
      String(body.byteLength),
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(body);
  });

  it("rejects unsafe paths before accessing GCS", async () => {
    const response = await getMediaResponse(["..", "secret.svg"]);

    expect(response.status).toBe(403);
    expect(gcsMocks.bucket).not.toHaveBeenCalled();
  });

  it("returns a controlled error when GCS metadata cannot be read", async () => {
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    gcsMocks.getMetadata.mockRejectedValue(new Error("metadata failed"));

    const response = await getMediaResponse();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "Failed to load media",
    });
  });
});
