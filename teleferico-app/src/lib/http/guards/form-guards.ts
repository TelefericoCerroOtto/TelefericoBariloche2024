import type { FormGuardDecisionReason, PublicFormName } from "@/types";
import { requireInternalApiKey } from "./internal-api-key"; // do not import from "@/lib/http/guards" to avoid circle dependencies
import { NextRequest, NextResponse } from "next/server";
import { checkContentLength } from "./content-length";
import { emitFormGuardEvent } from "./form-guard-events";
import { resolveClientIp } from "./ip";
import { ensureTrustedOrigin } from "./origin";
import { buildRateLimitKey, isRateLimited, type RateLimitStore } from "./rate-limit";

export type FormGuardOptions = {
  form: PublicFormName;
  maxBodyBytes?: number;
  useInternalApiKey?: boolean;
  extraAllowedOrigins?: Set<string>;
  rateLimited?: {
    namespace: string;
    rateLimitStore: RateLimitStore;
    maxHits: number;
    windowMs: number;
  };
};

type GuardResult = { ok: true } | { ok: false; res: NextResponse };

function inferReasonFromStatus(status: number): FormGuardDecisionReason {
  switch (status) {
    case 401:
      return "invalid_internal_api_key";
    case 403:
      return "untrusted_origin";
    case 411:
      return "missing_content_length";
    case 413:
      return "payload_too_large";
    case 429:
      return "too_many_requests";
    default:
      return "unexpected_error";
  }
}

function emitBlockEvent(
  form: PublicFormName,
  response: NextResponse,
  metadata: {
    identityKey?: string;
    identitySource?: "x-client-ip" | "x-forwarded-for" | "x-real-ip" | "missing";
    maxHits?: number;
    windowMs?: number;
  } = {},
): GuardResult {
  emitFormGuardEvent({
    action: "block",
    form,
    status: response.status,
    reason: inferReasonFromStatus(response.status),
    identityKey: metadata.identityKey,
    identitySource: metadata.identitySource,
    maxHits: metadata.maxHits,
    windowMs: metadata.windowMs,
  });

  return { ok: false, res: response };
}

export async function runFormGuards(
  req: NextRequest,
  options: FormGuardOptions,
): Promise<GuardResult> {
  const { form, useInternalApiKey, extraAllowedOrigins, maxBodyBytes, rateLimited } =
    options;

  if (useInternalApiKey) {
    const authError = requireInternalApiKey(req);
    if (authError) return emitBlockEvent(form, authError);
  }

  const result = ensureTrustedOrigin(req, extraAllowedOrigins);
  if (!result.ok) return emitBlockEvent(form, result.res);

  if (maxBodyBytes) {
    const lenError = checkContentLength(req, maxBodyBytes);
    if (lenError) return emitBlockEvent(form, lenError);
  }

  if (rateLimited) {
    const clientIp = resolveClientIp(req, !!useInternalApiKey);
    const { namespace, rateLimitStore, maxHits, windowMs } = rateLimited;

    if (!clientIp.clientIp) {
      emitFormGuardEvent({
        action: "degraded",
        backend: "redis",
        form,
        layer: "ip",
        status: 202,
        reason: "missing_client_ip",
        identitySource: clientIp.source,
        maxHits,
        windowMs,
      });
    } else {
      const rateLimitResult = await isRateLimited(
        buildRateLimitKey(namespace, form, clientIp.clientIp),
        rateLimitStore,
        maxHits,
        windowMs,
      );

      if (!rateLimitResult.ok) {
        emitFormGuardEvent({
          action: "degraded",
          backend: "redis",
          form,
          layer: "ip",
          status: 503,
          reason: "rate_limit_degraded",
          identityKey: clientIp.clientIp,
          identitySource: clientIp.source,
          maxHits,
          windowMs,
        });

        console.error("Form rate-limit backend unavailable", rateLimitResult.error);
      } else if (rateLimitResult.limited) {
        return emitBlockEvent(
          form,
          NextResponse.json(
            {
              ok: false,
              message: "Too many requests",
              code: "TOO_MANY_REQUESTS",
            },
            { status: 429 },
          ),
          {
            identityKey: clientIp.clientIp,
            identitySource: clientIp.source,
            maxHits,
            windowMs,
          },
        );
      }
    }
  }

  return {
    ok: true,
  };
}

export function withFormGuards(
  options: FormGuardOptions,
  // eslint-disable-next-line no-unused-vars
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return async function (req: NextRequest) {
    try {
      const result = await runFormGuards(req, options);
      if (!result.ok) return result.res;
      return handler(req);
    } catch (error) {
      emitFormGuardEvent({
        action: "error",
        form: options.form,
        status: 500,
        reason: "unexpected_error",
        error,
      });

      throw error;
    }
  };
}
