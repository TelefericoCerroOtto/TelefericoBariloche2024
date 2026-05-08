import { requireInternalApiKey } from "./internal-api-key"; // do not import from "@/lib/http/guards" to avoid circle dependencies
import { NextRequest, NextResponse } from "next/server";
import { checkContentLength } from "./content-length";
import { getClientIp } from "./ip";
import { ensureTrustedOrigin } from "./origin";
import { isRateLimited, type LimitStore } from "./rate-limit";

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

  const result = ensureTrustedOrigin(req, extraAllowedOrigins);
  if (!result.ok) return result;

  if (maxBodyBytes) {
    const lenError = checkContentLength(req, maxBodyBytes);
    if (lenError) return { ok: false, res: lenError };

  }

  if (rateLimited) {
    const ip = getClientIp(req, !!useInternalApiKey);
    const { rateLimitStore, maxHits, windowMs } = rateLimited;

    if (isRateLimited(ip, rateLimitStore, maxHits, windowMs)) {
      return {
        ok: false,
        res: NextResponse.json(
          {
            ok: false,
            message: "Too many requests",
            code: "TOO_MANY_REQUESTS",
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
