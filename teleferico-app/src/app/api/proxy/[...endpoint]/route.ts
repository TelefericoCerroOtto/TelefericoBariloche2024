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

  // (Opcional) plus con sec-fetch-site, pero suave:
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

    const headers: HeadersInit | undefined = session?.jwt
      ? { Authorization: `Bearer ${session.jwt}` }
      : undefined;

    const res = await fetch(targetURL.href, { headers });
    const status = res.status;
    const data = await res.json();

    return NextResponse.json(data, {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.log("proxy route handler error: ", error);
    return NextResponse.json(
      { message: "GET proxy failed: Internal Server Error" },
      { status: 500 },
    );
  }
}
