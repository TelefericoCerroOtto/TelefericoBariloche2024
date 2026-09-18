import "server-only";

import { type ServerSession } from "@/lib/auth/get-session";
import {
  ensureTrustedBrowserRequest,
  requireCsrfSession,
} from "@/lib/http/guards";
import {
  getFeedbackAdminReader,
  FeedbackAdminReaderError,
} from "./admin-reader";
import {
  parseFeedbackAdminFilters,
  type FeedbackAdminQuery,
} from "./admin-read";
import type {
  FeedbackAdminCapability,
  FeedbackAdminReadRoute,
} from "@/types/api/admin/feedback";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "VALIDATION_FAILED"
    | "UPSTREAM_UNAVAILABLE",
) {
  const status =
    code === "UNAUTHORIZED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : code === "VALIDATION_FAILED"
          ? 400
          : 503;
  const message = {
    UNAUTHORIZED: "Authentication is required",
    FORBIDDEN: "The requested feedback capability is not available",
    VALIDATION_FAILED: "The feedback filters are invalid",
    UPSTREAM_UNAVAILABLE: "Feedback administration is temporarily unavailable",
  }[code];
  return NextResponse.json({ error: { code, message } }, { status });
}

function capabilities(session: ServerSession): readonly string[] {
  const value = (
    session.user as typeof session.user & { capabilities?: unknown }
  ).capabilities;
  return Array.isArray(value) &&
    value.every((item): item is string => typeof item === "string")
    ? value
    : [];
}

async function authenticate(
  req: NextRequest,
  capability: FeedbackAdminCapability,
) {
  const trusted = ensureTrustedBrowserRequest(req);
  if (!trusted.ok) return { ok: false as const, response: trusted.res };
  const csrf = await requireCsrfSession(req);
  if (!csrf.ok)
    return {
      ok: false as const,
      response: errorResponse(
        csrf.res.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
      ),
    };
  if (!capabilities(csrf.session).includes(capability))
    return { ok: false as const, response: errorResponse("FORBIDDEN") };
  return { ok: true as const, session: csrf.session };
}

function query(req: NextRequest): FeedbackAdminQuery {
  const result: Record<string, string | readonly string[]> = {};
  for (const key of new Set([...req.nextUrl.searchParams.keys()])) {
    const values = req.nextUrl.searchParams.getAll(key);
    result[key] = values.length === 1 ? values[0]! : values;
  }
  return result;
}

export async function handleFeedbackAdminRead(
  req: NextRequest,
  route: FeedbackAdminReadRoute | "qr-points",
  capability: FeedbackAdminCapability,
) {
  try {
    const auth = await authenticate(req, capability);
    if (!auth.ok) return auth.response;
    const filters = parseFeedbackAdminFilters(route, query(req));
    if (!filters.ok) return errorResponse(filters.code);
    const result = await getFeedbackAdminReader(auth.session.jwt).read(
      filters.value,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (!(error instanceof FeedbackAdminReaderError))
      console.error("[admin/feedback] read failed", error);
    return errorResponse("UPSTREAM_UNAVAILABLE");
  }
}
