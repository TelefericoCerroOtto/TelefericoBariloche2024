import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

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

    const session = await auth();
    const headers = new Headers();

    if (session?.jwt) {
      headers.set("Authorization", `Bearer ${session.jwt}`);
    }

    const res = await fetch(targetURL.href, {
      headers: headers.size > 0 ? headers : undefined,
    });
    const data = await res.json();

    return NextResponse.json(data, {
      status: res.status,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ endpoint: string[] }> },
) {
  if (req.headers.get("sec-fetch-site") !== "same-origin") {
    return NextResponse.json("Forbidden", { status: 403 });
  }

  try {
    const { endpoint } = await params;
    const strapiBase = process.env.BUILD_STRAPI_BASE_URL ?? "";
    const endpointPath = endpoint.join("/");
    const session = await auth();

    if (!strapiBase) {
      return new Response("Strapi URL not configured", { status: 500 });
    }
    if (!session) {
      return new Response("Session", { status: 401 });
    }

    const targetURL = new URL(endpointPath, strapiBase);
    req.nextUrl.searchParams.forEach((value, key) => {
      targetURL.searchParams.set(key, value);
    });

    const res = await fetch(targetURL, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.jwt}`,
      },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: res.status });
    }

    try {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return new NextResponse(null, { status: res.status });
    }
  } catch (error) {
    console.log("proxy route handler error: ", error);
    return new Response(
      JSON.stringify({
        message: "DELETE proxy failed: Internal Server Error",
      }),
      { status: 500 },
    );
  }
}
