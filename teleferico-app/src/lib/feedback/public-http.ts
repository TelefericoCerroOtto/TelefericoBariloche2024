import { createHash, createHmac, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { FeedbackSurveyContext } from "@/types/api/feedback";
import { acceptSubmission, type AcceptanceStore } from "./submission-acceptance";
import type { FeedbackBrowserGuard } from "./browser-guard";
import { validatePublicCode } from "./intake-boundary";
import { issueQrSessionToken, verifyQrSessionAuthenticity, type QrSessionContext } from "./qr-session";
import { completeSubmissionPreflight, runSubmissionIngress } from "./submission-preflight";

export type { FeedbackSurveyContext } from "@/types/api/feedback";

const BROWSER_COOKIE = "tb113_feedback_browser";
const CONTEXT_COOKIE = "tb113_feedback_context";
const BROWSER_COOKIE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

type SharedDependencies = {
  readonly resolveSurvey: (_publicCode: string) => Promise<FeedbackSurveyContext | null>;
  readonly signingKey: string | Uint8Array;
  readonly now: () => Date;
  readonly extraAllowedOrigins?: Set<string>;
};

function errorResponse(error: object) {
  const candidate = error as { status?: unknown; code?: unknown; field?: unknown; fields?: unknown };
  const status = typeof candidate.status === "number" ? candidate.status : 503;
  const code = typeof candidate.code === "string" ? candidate.code : "UPSTREAM_UNAVAILABLE";
  const fields = Array.isArray(candidate.fields)
    ? candidate.fields
    : typeof candidate.field === "string" ? [candidate.field] : undefined;
  return NextResponse.json({ error: { code, ...(fields ? { fields } : {}) } }, { status });
}

function signedContext(publicCode: string, signingKey: string | Uint8Array): string {
  const encoded = Buffer.from(publicCode, "utf8").toString("base64url");
  const signature = createHmac("sha256", signingKey).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function readContext(value: string | undefined, signingKey: string | Uint8Array): string | null {
  if (!value) return null;
  const separator = value.lastIndexOf(".");
  if (separator < 1) return null;
  const encoded = value.slice(0, separator);
  const expected = signedContext(Buffer.from(encoded, "base64url").toString("utf8"), signingKey);
  return expected === value ? Buffer.from(encoded, "base64url").toString("utf8") : null;
}

function sessionContext(context: FeedbackSurveyContext): QrSessionContext {
  return {
    pointKey: context.point.pointKey,
    publicCode: context.point.publicCode,
    versionKey: context.survey.versionKey,
    versionRevision: context.survey.versionRevision,
  };
}

export function createSurveyHandler(
  dependencies: SharedDependencies & { readonly randomBytes?: (_size: number) => Buffer },
) {
  return async (request: NextRequest, route: { params: Promise<{ publicCode: string }> }) => {
    const { publicCode } = await route.params;
    const path = validatePublicCode(publicCode);
    if (!path.ok) return errorResponse({ ...path.error, code: "VALIDATION_FAILED" });
    if (request.nextUrl.search) return errorResponse({ status: 400, code: "VALIDATION_FAILED", fields: ["query"] });

    try {
      const context = await dependencies.resolveSurvey(publicCode);
      if (!context) return errorResponse({ status: 410, code: "SURVEY_UNAVAILABLE" });
      const now = dependencies.now();
      const bytes = dependencies.randomBytes ?? randomBytes;
      const response = NextResponse.json({
        contractVersion: "feedback-public.v1",
        point: { pointKey: context.point.pointKey, displayName: context.point.displayName },
        survey: {
          versionKey: context.survey.versionKey,
          translations: context.survey.translations,
          aspects: context.survey.aspects,
        },
        sessionToken: issueQrSessionToken(sessionContext(context), {
          signingKey: dependencies.signingKey,
          now: Math.floor(now.getTime() / 1_000),
          nonce: bytes(32).toString("hex"),
        }),
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1_000).toISOString(),
      });
      response.headers.set("cache-control", "private, no-store");
      if (!BROWSER_COOKIE_PATTERN.test(request.cookies.get(BROWSER_COOKIE)?.value ?? "")) {
        response.cookies.set(BROWSER_COOKIE, bytes(32).toString("base64url"), { ...COOKIE_OPTIONS, maxAge: 86_400 });
      }
      response.cookies.set(CONTEXT_COOKIE, signedContext(publicCode, dependencies.signingKey), { ...COOKIE_OPTIONS, maxAge: 7_200 });
      return response;
    } catch {
      return errorResponse({ status: 503, code: "UPSTREAM_UNAVAILABLE" });
    }
  };
}

export function createSubmissionHandler(
  dependencies: SharedDependencies & {
    readonly verifyCaptcha: (_token: string) => Promise<unknown>;
    readonly store: AcceptanceStore | ((_context: FeedbackSurveyContext) => AcceptanceStore);
    readonly browserGuard: FeedbackBrowserGuard;
    readonly createReceipt: () => string;
  },
  ) {
  return async (request: NextRequest) => {
    const now = dependencies.now();
    const ingress = await runSubmissionIngress({
      request,
      nowEpochSeconds: Math.floor(now.getTime() / 1_000),
      extraAllowedOrigins: dependencies.extraAllowedOrigins,
      verifyCaptcha: dependencies.verifyCaptcha,
    });
    if (!ingress.ok) return errorResponse(ingress.error);
    const authenticatedSession = verifyQrSessionAuthenticity(ingress.value.envelope.sessionToken as string, {
      signingKey: dependencies.signingKey,
      now: Math.floor(now.getTime() / 1_000),
    });
    if (!authenticatedSession.ok) return errorResponse(authenticatedSession.error);

    const publicCode = readContext(request.cookies.get(CONTEXT_COOKIE)?.value, dependencies.signingKey);
    const browserToken = request.cookies.get(BROWSER_COOKIE)?.value;
    if (!publicCode || !browserToken) return errorResponse({ status: 401, code: "INVALID_SESSION" });

    let context: FeedbackSurveyContext | null;
    try {
      context = await dependencies.resolveSurvey(publicCode);
    } catch {
      return errorResponse({ status: 503, code: "UPSTREAM_UNAVAILABLE" });
    }
    if (!context) return errorResponse({ status: 410, code: "SURVEY_UNAVAILABLE" });

    const preflight = completeSubmissionPreflight(ingress.value, {
      definitions: context.survey.aspects,
      nowEpochSeconds: Math.floor(now.getTime() / 1_000),
      signingKey: dependencies.signingKey,
      expectedSession: sessionContext(context),
      activeVersionKey: context.activeVersionKey,
      versions: context.versions,
    }, authenticatedSession.value);
    if (!preflight.ok) return errorResponse(preflight.error);

    const accepted = await acceptSubmission({
      contractVersion: "feedback-public.v1",
      sessionToken: preflight.value.envelope.sessionToken as string,
      session: preflight.value.session,
      idempotencyKey: preflight.value.idempotencyKey,
      browserTokenHash: createHash("sha256").update(browserToken).digest("hex"),
      pointDocumentId: context.pointDocumentId,
      versionDocumentId: context.versionDocumentId,
      answers: preflight.value.answers,
    }, {
      store: typeof dependencies.store === "function" ? dependencies.store(context) : dependencies.store,
      browserGuard: dependencies.browserGuard,
      now: dependencies.now,
      createReceipt: dependencies.createReceipt,
    });
    return accepted.ok
      ? NextResponse.json(accepted.value, { status: accepted.status })
      : errorResponse(accepted.error);
  };
}
