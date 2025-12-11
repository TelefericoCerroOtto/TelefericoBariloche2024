import { auth } from "@/auth";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { ensureTrustedOrigin } from "@/lib/http/origin";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> },
) {
  const result = ensureTrustedOrigin(req);
  if (!result.ok) return result.res;

  // (Opcional) igual que en el proxy original
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { endpoint } = await params;
    assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);
    const strapiBase = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL];
    const endpointPath = endpoint.join("/");

    if (!strapiBase) {
      return new Response("Strapi URL not configured", { status: 500 });
    }

    const targetURL = new URL(endpointPath, strapiBase);
    req.nextUrl.searchParams.forEach((value, key) => {
      targetURL.searchParams.set(key, value);
    });

    const session = await auth();

    const headers: HeadersInit = {};
    if (session?.jwt) {
      headers.Authorization = `Bearer ${session.jwt}`;
    }

    const res = await fetch(targetURL.href, { headers });

    if (!res.ok) {
      // Propagamos código de error si Strapi devuelve 4xx/5xx
      return new NextResponse(null, { status: res.status });
    }

    // Leemos el body como ArrayBuffer (podría ser stream si lo necesitás)
    const buffer = await res.arrayBuffer();

    const contentType =
      res.headers.get("content-type") ?? "application/octet-stream";

    // Si Strapi no manda Content-Disposition, definimos uno
    const contentDisposition =
      res.headers.get("content-disposition") ?? 'inline; filename="resume"';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        // Podés copiar más headers según necesites
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
