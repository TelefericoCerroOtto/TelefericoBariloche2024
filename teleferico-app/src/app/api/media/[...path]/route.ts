import { ENV_KEYS } from "@/lib/constants/env.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { buildProxyTargetURL } from "@/lib/http/guards/proxy-target";
import { normalizeCmsBucketPathPrefix } from "@/lib/adapters";
import { assertEnv } from "@/utils/env";
import { Storage } from "@google-cloud/storage";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GCS_CLIENT = new Storage();

function toWebStream(stream: NodeJS.ReadableStream): BodyInit {
  return Readable.toWeb(stream as Readable) as unknown as BodyInit;
}

function isUnsafePath(path: string[]) {
  return path.some((segment) => segment === ".." || segment === ".");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    assertEnv([
      ENV_KEYS.BUILD_STRAPI_BASE_URL,
      ENV_KEYS.BUILD_STRAPI_BUCKET_HOSTNAME,
      ENV_KEYS.BUILD_STRAPI_BUCKET_PATHNAME,
      ENV_KEYS.GCS_BUCKET_NAME,
    ]);

    const { path } = await params;
    if (!path.length || isUnsafePath(path)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const strapiBase = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];
    const bucketHostname = process.env[ENV_KEYS.BUILD_STRAPI_BUCKET_HOSTNAME];
    const bucketPathname = process.env[ENV_KEYS.BUILD_STRAPI_BUCKET_PATHNAME];
    const bucketName = process.env[ENV_KEYS.GCS_BUCKET_NAME];

    if (!strapiBase || !bucketHostname || !bucketPathname || !bucketName) {
      return NextResponse.json(
        { message: "Image bucket is not configured" },
        { status: 500 },
      );
    }

    const useStrapiUploads = path[0] === STRAPI_ENDPOINTS.UPLOAD_ASSETS.slice(1);
    const bucketAllowedPrefix = normalizeCmsBucketPathPrefix(
      bucketPathname,
    ).replace(/\/$/, "");

    const built = buildProxyTargetURL(
      req,
      path,
      useStrapiUploads ? strapiBase : `https://${bucketHostname}`,
      {
        allowedPrefixes: [
          useStrapiUploads
            ? STRAPI_ENDPOINTS.UPLOAD_ASSETS
            : bucketAllowedPrefix,
        ],
      },
    );

    if (!built.ok) return built.error;

    if (!useStrapiUploads && path[0] === bucketName) {
      const objectKey = path.slice(1).join("/");
      const normalizedBucketPathname = normalizeCmsBucketPathPrefix(bucketPathname);
      const bucketPathPrefix = normalizedBucketPathname.startsWith(
        `/${bucketName}/`,
      )
        ? normalizedBucketPathname.slice(bucketName.length + 2)
        : normalizedBucketPathname.replace(/^\//, "");

      if (!objectKey.startsWith(bucketPathPrefix)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }

      const gcsFile = GCS_CLIENT.bucket(bucketName).file(objectKey);
      const [metadata] = await gcsFile.getMetadata();

      const headers = new Headers({
        "Content-Type": metadata.contentType ?? "application/octet-stream",
        "Cache-Control":
          metadata.cacheControl ?? "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      });

      if (metadata.contentDisposition) {
        headers.set("Content-Disposition", metadata.contentDisposition);
      }

      if (metadata.size) {
        headers.set("Content-Length", String(metadata.size));
      }

      return new Response(toWebStream(gcsFile.createReadStream()), {
        status: 200,
        headers,
      });
    }

    const upstream = await fetch(built.url, { cache: "no-store" });

    const headers = new Headers({
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": upstream.ok
        ? upstream.headers.get("cache-control") ??
          "public, max-age=31536000, immutable"
        : "no-store",
      "X-Content-Type-Options": "nosniff",
    });

    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.log("media route handler error: ", error);

    return NextResponse.json(
      { message: "Failed to load media" },
      { status: 500 },
    );
  }
}
