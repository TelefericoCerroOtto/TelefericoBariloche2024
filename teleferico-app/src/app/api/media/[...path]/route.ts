import { ENV_KEYS } from "@/lib/constants/env.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { buildProxyTargetURL } from "@/lib/http/guards/proxy-target";
import { normalizeCmsBucketPathPrefix } from "@/lib/adapters";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    assertEnv([
      ENV_KEYS.BUILD_STRAPI_BASE_URL,
      ENV_KEYS.BUILD_STRAPI_BUCKET_HOSTNAME,
      ENV_KEYS.BUILD_STRAPI_BUCKET_PATHNAME,
    ]);

    const { path } = await params;
    const strapiBase = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];
    const bucketHostname = process.env[ENV_KEYS.BUILD_STRAPI_BUCKET_HOSTNAME];
    const bucketPathname = process.env[ENV_KEYS.BUILD_STRAPI_BUCKET_PATHNAME];

    if (!bucketHostname || !bucketPathname) {
      return NextResponse.json(
        { message: "Image bucket is not configured" },
        { status: 500 },
      );
    }

    const useStrapiUploads = path[0] === STRAPI_ENDPOINTS.UPLOAD_ASSETS.slice(1);

    const built = buildProxyTargetURL(
      req,
      path,
      useStrapiUploads ? strapiBase : `https://${bucketHostname}`,
      {
        allowedPrefixes: [
          useStrapiUploads
            ? STRAPI_ENDPOINTS.UPLOAD_ASSETS
            : normalizeCmsBucketPathPrefix(bucketPathname),
        ],
      },
    );

    if (!built.ok) return built.error;

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
