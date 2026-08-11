import { CACHE_TAGS } from "@/lib/constants/cache-tags.const";
import { SERVICE_STATE_VALUES } from "@/lib/constants/enum-fields.const";
import {
  ensureTrustedBrowserRequest,
  requireCsrfSession,
} from "@/lib/http/guards";
import { updateServiceState } from "@/lib/services";
import type {
  ServiceStateAdminApiResponse,
  ServiceStateAdminRequestPayload,
  UserRole,
} from "@/types";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ROLES: UserRole["name"][] = [
  "Administrator",
  "Operations Supervisor",
];

function jsonResponse(body: ServiceStateAdminApiResponse, status: number) {
  return NextResponse.json(body, { status });
}

export async function PUT(req: NextRequest) {
  try {
    const trusted = ensureTrustedBrowserRequest(req);
    if (!trusted.ok) return trusted.res;

    const csrf = await requireCsrfSession(req);
    if (!csrf.ok) return csrf.res;

    if (!ALLOWED_ROLES.includes(csrf.session.user.role.name)) {
      return jsonResponse({ ok: false, message: "Forbidden" }, 403);
    }

    let body: ServiceStateAdminRequestPayload;
    try {
      body = (await req.json()) as ServiceStateAdminRequestPayload;
    } catch {
      return jsonResponse({ ok: false, message: "Invalid request body" }, 400);
    }

    if (!SERVICE_STATE_VALUES.includes(body?.state)) {
      return jsonResponse({ ok: false, message: "Invalid service state" }, 400);
    }

    const result = await updateServiceState(body.state, csrf.session.jwt);
    if (!result.ok) {
      console.error("[admin/service-state] CMS update failed");
      return jsonResponse(
        { ok: false, message: "Unable to update service state" },
        502,
      );
    }

    revalidateTag(CACHE_TAGS.SERVICE_STATE);
    return jsonResponse(
      {
        ok: true,
        message: "Service state updated",
        data: result.data.data,
      },
      200,
    );
  } catch (error) {
    console.error("[admin/service-state] unexpected error", error);
    return jsonResponse({ ok: false, message: "Internal server error" }, 500);
  }
}
