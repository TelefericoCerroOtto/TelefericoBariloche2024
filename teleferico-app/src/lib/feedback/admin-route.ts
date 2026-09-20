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
  FeedbackAdminCommandError,
  getFeedbackAdminCommandTransport,
  parseGenerateCommand,
  parseRetryCommand,
} from "./admin-command";
import {
  parseFeedbackAdminFilters,
  type FeedbackAdminQuery,
} from "./admin-read";
import type {
  FeedbackAdminCapability,
  FeedbackAdminOverlapDetails,
  FeedbackAdminReadRoute,
} from "@/types/api/admin/feedback";
import { NextRequest, NextResponse } from "next/server";

function errorResponse(
  code:
    | "UNAUTHORIZED"
    | "FORBIDDEN"
    | "VALIDATION_FAILED"
    | "PAYLOAD_TOO_LARGE"
    | "UPSTREAM_UNAVAILABLE"
    | "OVERLAP_REQUIRES_OVERRIDE"
    | "ACTIVE_RANGE_CONFLICT"
    | "INVALID_STATE"
    | "INTERNAL_ERROR",
  statusOverride?: number,
  details?: FeedbackAdminOverlapDetails,
) {
  const status =
    statusOverride ??
    (code === "UNAUTHORIZED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : code === "VALIDATION_FAILED"
          ? 400
          : code === "PAYLOAD_TOO_LARGE"
            ? 413
            : code === "OVERLAP_REQUIRES_OVERRIDE" ||
                code === "ACTIVE_RANGE_CONFLICT" ||
                code === "INVALID_STATE"
              ? 409
              : code === "INTERNAL_ERROR"
                ? 500
                : 503);
  const message = {
    UNAUTHORIZED: "Authentication is required",
    FORBIDDEN: "The requested feedback capability is not available",
    VALIDATION_FAILED: "The feedback filters are invalid",
    PAYLOAD_TOO_LARGE: "The feedback request body is too large",
    UPSTREAM_UNAVAILABLE: "Feedback administration is temporarily unavailable",
    OVERLAP_REQUIRES_OVERRIDE:
      "The requested report range overlaps existing history",
    ACTIVE_RANGE_CONFLICT:
      "A report generation is already active for this range",
    INVALID_STATE: "The report generation is not in a retryable state",
    INTERNAL_ERROR: "Feedback administration failed",
  }[code];
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status },
  );
}

function commandErrorResponse(error: unknown) {
  if (error instanceof FeedbackAdminCommandError)
    return errorResponse(error.code, error.status, error.details);
  return errorResponse("UPSTREAM_UNAVAILABLE");
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

async function readBody(req: NextRequest): Promise<unknown> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await req.arrayBuffer());
  } catch {
    throw new FeedbackAdminCommandError("VALIDATION_FAILED", 400);
  }
  if (bytes.byteLength > 16 * 1024)
    throw new FeedbackAdminCommandError("PAYLOAD_TOO_LARGE", 413);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new FeedbackAdminCommandError("VALIDATION_FAILED", 400);
  }
}

export async function handleFeedbackAdminGenerate(req: NextRequest) {
  try {
    const auth = await authenticate(req, "feedback.reports.generate");
    if (!auth.ok) return auth.response;
    const parsed = parseGenerateCommand(await readBody(req));
    if (!parsed.ok) return errorResponse(parsed.code);
    const result = await getFeedbackAdminCommandTransport(
      auth.session.jwt,
    ).generate(parsed.value);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return commandErrorResponse(error);
  }
}

export async function handleFeedbackAdminRetry(
  req: NextRequest,
  reportRunId: string,
) {
  try {
    const auth = await authenticate(req, "feedback.reports.generate");
    if (!auth.ok) return auth.response;
    const parsed = parseRetryCommand(await readBody(req));
    if (!parsed.ok) return errorResponse(parsed.code);
    const result = await getFeedbackAdminCommandTransport(
      auth.session.jwt,
    ).retry(reportRunId, parsed.value);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return commandErrorResponse(error);
  }
}
