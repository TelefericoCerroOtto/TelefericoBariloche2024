import { requireInternalApiKey } from "@/lib/http/internal-api-key";
import { NextRequest, NextResponse } from "next/server";
import { checkContentLength } from "./content-length";
import { extractOrigin } from "./extract-origin";
import { isRateLimited, type LimitStore } from "./rate-limit";
import { getClientIp } from "./get-client-ip";

export type FormGuardOptions = {
  maxBodyBytes?: number;
  useInternalApiKey?: boolean;
  extraAllowedOrigins?: Set<string>;
  rateLimited?: {
    rateLimitStore: LimitStore;
    maxHits: number;
    windowMs: number;
  };
};

type GuardResult = { ok: true } | { ok: false; res: NextResponse };

function buildAllowedOrigins(extraAllowedOrigins?: Set<string>): Set<string> {
  const merged = new Set<string>();

  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (base) {
    merged.add(base.replace(/\/$/, ""));
  }

  if (extraAllowedOrigins) {
    for (const origin of extraAllowedOrigins) {
      merged.add(origin.replace(/\/$/, ""));
    }
  }

  return merged;
}

export async function runFormGuards(
  req: NextRequest,
  options: FormGuardOptions,
): Promise<GuardResult> {
  const { useInternalApiKey, extraAllowedOrigins, maxBodyBytes, rateLimited } =
    options;

  if (useInternalApiKey) {
    const authError = requireInternalApiKey(req);
    if (authError) return { ok: false, res: authError };
  }

  const origin = extractOrigin(req);
  const allowedOrigins = buildAllowedOrigins(extraAllowedOrigins);

  console.log("origin: ", origin);
  console.log("allowedOrigins: ", allowedOrigins);

  if (
    allowedOrigins &&
    allowedOrigins.size > 0 &&
    (!origin || !allowedOrigins.has(origin))
  ) {
    return {
      ok: false,
      res: NextResponse.json(
        {
          ok: false,
          message: "Forbidden",
        },
        { status: 403 },
      ),
    };
  }

  if (maxBodyBytes) {
    const lenError = checkContentLength(req, maxBodyBytes);
    if (lenError) return { ok: false, res: lenError };
  }

  const ip = getClientIp(req);
  if (rateLimited) {
    const { rateLimitStore, maxHits, windowMs } = rateLimited;
    if (isRateLimited(ip, rateLimitStore, maxHits, windowMs)) {
      return {
        ok: false,
        res: NextResponse.json(
          {
            ok: false,
            message: "Too many requests",
          },
          { status: 429 },
        ),
      };
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
    const result = await runFormGuards(req, options);
    if (!result.ok) return result.res;
    return handler(req);
  };
}
