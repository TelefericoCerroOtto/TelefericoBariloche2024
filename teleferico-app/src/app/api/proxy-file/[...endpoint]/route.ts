import { getServerSession } from "@/lib/auth/get-session";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { ensureTrustedBrowserRequest } from "@/lib/http/guards";
import { buildProxyTargetURL } from "@/lib/http/guards/proxy-target";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> },
) {
  const trustedRequest = ensureTrustedBrowserRequest(req);
  if (!trustedRequest.ok) return trustedRequest.res;

  try {
    const { endpoint } = await params;

    assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);
    const strapiBase = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];

    if (!strapiBase) {
      return new Response("Strapi URL not configured", { status: 500 });
    }

    const built = buildProxyTargetURL(req, endpoint, strapiBase, {
      allowedPrefixes: [STRAPI_ENDPOINTS.UPLOAD_ASSETS],
    });
    if (!built.ok) return built.error;

    const session = await getServerSession(req);

    const headers: HeadersInit = {};
    if (session?.jwt) {
      headers.Authorization = `Bearer ${session.jwt}`;
    }

    const res = await fetch(built.url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    // Si falla, no asumimos JSON: propagamos texto si se puede
    if (!res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      const status = res.status;

      // Si viene JSON (a veces Strapi devuelve JSON en errores), lo devolvemos como JSON
      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => null);
        return NextResponse.json(data ?? { message: "Upstream error" }, {
          status,
        });
      }

      // Caso general: texto
      const text = await res.text().catch(() => "");
      return new Response(text || "Upstream error", { status });
    }

    // OK: devolvemos binario
    const buffer = await res.arrayBuffer();

    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";

    const contentDisposition =
      res.headers.get("content-disposition") ?? 'inline; filename="file"';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
      },
    });
  } catch (error) {
    console.log("proxy-file route handler error: ", error);
    return NextResponse.json(
      { message: "GET proxy-file failed: Internal Server Error" },
      { status: 500 },
    );
  }
}
