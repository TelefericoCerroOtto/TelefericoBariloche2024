import { auth } from "@/auth";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { ensureTrustedOrigin } from "@/lib/http/guards";
import { buildProxyTargetURL } from "@/lib/http/guards/proxy-target";
import { STRAPI_ENDPOINTS } from "@/utils";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/proxy/[...endpoint]">,
) {
  const result = ensureTrustedOrigin(req);
  if (!result.ok) return result.res;

  // (Opcional) plus con sec-fetch-site, pero suave:
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { endpoint } = await ctx.params;

    assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);
    const strapiBase = process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL] as string;

    const {
      ACTIVITIES,
      BUS_TRIPS,
      COMPONENT_TRANSLATIONS,
      FAQS,
      NEWS,
      POSTULATIONS,
      SERVICE_STATE,
      TICKETS,
      ZONES,
    } = STRAPI_ENDPOINTS;

    const built = buildProxyTargetURL(req, endpoint, strapiBase, {
      allowedPrefixes: [
        ACTIVITIES,
        BUS_TRIPS,
        COMPONENT_TRANSLATIONS,
        FAQS,
        NEWS,
        POSTULATIONS,
        SERVICE_STATE,
        TICKETS,
        ZONES,
      ],
    });
    if (!built.ok) return built.error;

    const session = await auth();

    const headers: HeadersInit = {};
    if (session?.jwt) {
      headers.Authorization = `Bearer ${session.jwt}`;
    }

    const res = await fetch(built.url, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    const status = res.status;

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null); // puede venir json vacio, por eso catch
      return NextResponse.json(data, { status });
    }

    const text = await res.text().catch(() => "");
    return new Response(text, {
      status,
      headers: {
        "Content-Type": contentType || "text/plain; charset=utf-8",
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
