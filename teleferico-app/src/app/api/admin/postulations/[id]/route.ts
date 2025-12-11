import { auth } from "@/auth";
import type { FavPostulationRequestPayload } from "@/types";
import { STRAPI_ENDPOINTS, getStrapiURL } from "@/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/admin/postulations/[id]/favorite">,
) {
  try {
    const session = await auth();
    if (!session?.jwt || !session.user?.id) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { params } = await ctx;
    const { id } = await params;

    const body = (await req.json()) as FavPostulationRequestPayload;

    if (typeof body.favorite !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "Invalid payload: favorite must be boolean" },
        { status: 400 },
      );
    }

    const reqBody = {
      data:
        body.favorite === true
          ? {
              faved_by: {
                connect: [session.user.id],
              },
            }
          : {
              faved_by: {
                disconnect: [session.user.id],
              },
            },
    };

    const res = await fetch(
      getStrapiURL(`${STRAPI_ENDPOINTS.POSTULATIONS}/${id}`),
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.jwt}`,
        },
        body: JSON.stringify(reqBody),
      },
    );

    if (!res.ok) {
      console.error("Strapi favorite toggle error", await res.text());
      return NextResponse.json(
        { ok: false, message: "Failed to toggle favorite" },
        { status: 500 },
      );
    }

    const json = await res.json();

    return NextResponse.json({ ok: true, data: json }, { status: 200 });
  } catch (error) {
    console.error("Toggle favorite route error", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
