import { auth } from "@/auth";
import { POSTULATION_STATUSES } from "@/lib/constants/enum-fields.const";
import { requireCsrf } from "@/lib/http/guards";
import { updatePostulation } from "@/lib/services";
import type {
  PostulationsBulkStatusRequestPayload,
  UpdatePostulationRequest,
} from "@/types";
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

    if (!Array.isArray(body.documentIds) || body.documentIds.length === 0) {
      return NextResponse.json(
        { ok: false, message: "Missing documentIds" },
        { status: 400 },
      );
    }

    if (!POSTULATION_STATUSES.includes(body.postulationStatus)) {
      return NextResponse.json(
        { ok: false, message: "Invalid status" },
        { status: 400 },
      );
    }

    const { documentIds, postulationStatus } = body;

    const reqBody: UpdatePostulationRequest = {
      data: {
        postulation_status: postulationStatus,
      },
    };

    const results = await Promise.allSettled(
      documentIds.map((documentId) =>
        updatePostulation({ reqBody, documentId }, session.jwt),
      ),
    );

    for (const [i, r] of results.entries()) {
      const documentId = documentIds[i];

      if (r.status === "rejected") {
        console.error("[postulations/bulk-status] rejected", {
          documentId,
          reason: r.reason,
        });
        continue;
      }

      if (!r.value.ok) {
        console.error("[postulations/bulk-status] failed", {
          documentId,
          // strapiFetch devuelve ErrorResponse o null
          error: r.value.data,
        });
      }
    }

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.ok,
    ).length;
    const failureCount = documentIds.length - successCount;

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
