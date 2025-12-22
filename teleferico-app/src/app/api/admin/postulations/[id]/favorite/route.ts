import { auth } from "@/auth";
import { requireCsrf } from "@/lib/http/guards";
import { updatePostulation } from "@/lib/services";
import type {
  FavPostulationRequestPayload,
  UpdatePostulationRequest,
} from "@/types";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: RouteContext<"/api/admin/postulations/[id]/favorite">,
) {
  try {
    const csrfError = await requireCsrf(req);
    if (csrfError) return csrfError;

    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: documentId } = await ctx.params;

    const body = (await req.json()) as FavPostulationRequestPayload;

    if (typeof body.favorite !== "boolean") {
      return NextResponse.json(
        { ok: false, message: "Invalid payload: favorite must be boolean" },
        { status: 400 },
      );
    }

    const reqBody: UpdatePostulationRequest = {
      data: {
        faved_by:
          body.favorite === true
            ? {
                connect: [session.user.id],
              }
            : {
                disconnect: [session.user.id],
              },
      },
    };

    const res = await updatePostulation({ reqBody, documentId }, session.jwt);

    if (!res.ok) {
      console.error("Strapi favorite toggle error", await res.data);

      return NextResponse.json(
        { ok: false, message: "Failed to toggle favorite" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, data: res.data }, { status: 200 });
  } catch (error) {
    console.error("Toggle favorite route error", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
