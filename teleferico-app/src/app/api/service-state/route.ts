import { getStrapiURL } from "@/utils/get-strapi-url";
import { STRAPI_ENDPOINTS } from "@/utils/routes.const";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  if (req.headers.get("sec-fetch-site") !== "same-origin") {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const res = await fetch(getStrapiURL(STRAPI_ENDPOINTS.SERVICE_STATE));
    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.log("service state route handler error: ", error);
    return new Response(
      JSON.stringify({
        message: "GET service-state failed: Internal Server Error",
      }),
      { status: 500 },
    );
  }
}
