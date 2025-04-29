import { NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> },
) {
  if (req.headers.get("sec-fetch-site") !== "same-origin") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const { endpoint } = await params;
    const strapiBase = process.env.BUILD_STRAPI_BASE_URL ?? "";
    const endpointPath = endpoint.join("/");

    if (!strapiBase) {
      return new Response("Strapi URL not configured", { status: 500 });
    }

    const targetURL = new URL(endpointPath, strapiBase);
    req.nextUrl.searchParams.forEach((value, key) => {
      targetURL.searchParams.set(key, value);
    });

    const res = await fetch(targetURL.href);
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.log("proxy route handler error: ", error);
    return new Response(
      JSON.stringify({
        message: "GET proxy failed: Internal Server Error",
      }),
      { status: 500 },
    );
  }
}
