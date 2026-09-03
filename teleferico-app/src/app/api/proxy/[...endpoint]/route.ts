import { getServerSession } from "@/lib/auth/get-session";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { STRAPI_ENDPOINTS } from "@/lib/constants/routes.const";
import { ensureTrustedBrowserRequest } from "@/lib/http/guards";
import { buildProxyTargetURL } from "@/lib/http/guards/proxy-target";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

function matchesEndpointPrefix(path: string, prefixes: readonly string[]) {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/proxy/[...endpoint]">,
) {
  const trustedRequest = ensureTrustedBrowserRequest(req);
  if (!trustedRequest.ok) return trustedRequest.res;

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

    const publicContentReadPrefixes = [
      ACTIVITIES,
      BUS_TRIPS,
      COMPONENT_TRANSLATIONS,
      FAQS,
      NEWS,
      SERVICE_STATE,
      TICKETS,
      ZONES,
    ] as const;
    const authenticatedReadPrefixes = [POSTULATIONS] as const;
    const allowedPrefixes = [
      ...publicContentReadPrefixes,
      ...authenticatedReadPrefixes,
    ] as const;
    const endpointPath = `/${endpoint.join("/")}`;

    const built = buildProxyTargetURL(req, endpoint, strapiBase, {
      allowedPrefixes: [...allowedPrefixes],
    });
    if (!built.ok) return built.error;

    const session = await getServerSession(req);

    const headers: HeadersInit = {};

    if (matchesEndpointPrefix(endpointPath, authenticatedReadPrefixes)) {
      if (!session?.jwt) {
        return NextResponse.json(
          { ok: false, message: "Unauthorized" },
          { status: 401 },
        );
      }

      headers.Authorization = `Bearer ${session.jwt}`;
    } else if (matchesEndpointPrefix(endpointPath, publicContentReadPrefixes)) {
      assertEnv([ENV_KEYS.BUILD_STRAPI_CONTENT_TOKEN]);
      headers.Authorization = `Bearer ${process.env[ENV_KEYS.BUILD_STRAPI_CONTENT_TOKEN]}`;
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
