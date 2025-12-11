import { auth } from "@/auth";
import { POSTULATION_STATUSES } from "@/lib/constants/enum-fields.const";
import { requireCsrf } from "@/lib/http/csrf";
import type { PostulationsBulkStatusRequestPayload } from "@/types";
import { getStrapiURL, STRAPI_ENDPOINTS } from "@/utils";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
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

    const body = (await req.json()) as PostulationsBulkStatusRequestPayload;

    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Missing ids" },
        { status: 400 },
      );
    }

    if (!POSTULATION_STATUSES.includes(body.postulationStatus)) {
      return NextResponse.json(
        { ok: false, message: "Invalid status" },
        { status: 400 },
      );
    }

    const { ids, postulationStatus } = body;

    const results = await Promise.allSettled(
      ids.map((id) =>
        fetch(getStrapiURL(`${STRAPI_ENDPOINTS.POSTULATIONS}/${id}`), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.jwt}`,
          },
          body: JSON.stringify({
            data: {
              postulation_status: postulationStatus,
            },
          }),
        }),
      ),
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    const failureCount = ids.length - successCount;

    if (successCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "No se pudo actualizar ninguna postulación",
          successCount,
          failureCount,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message:
          failureCount === 0
            ? "Todas las postulaciones fueron actualizadas correctamente"
            : "Algunas postulaciones no pudieron actualizarse",
        successCount,
        failureCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("bulk-status route error", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
