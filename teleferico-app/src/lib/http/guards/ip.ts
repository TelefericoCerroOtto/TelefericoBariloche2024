import type { NextRequest } from "next/server";
import type { FormGuardIdentitySource } from "@/types";

// Normaliza IPv4-mapped IPv6 → "192.168.100.12"
function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

// Esta firma sirve tanto para NextRequest.headers como para headers() de next/headers
type HeaderLike = {
  // eslint-disable-next-line no-unused-vars
  get(name: string): string | null;
};

export type ClientIpResolution = {
  clientIp: string | null;
  source: FormGuardIdentitySource;
};

function getLastForwardedIp(forwarded: string): string | null {
  const parts = forwarded.split(",");
  const raw = parts[parts.length - 1]?.trim();

  return normalizeIp(raw);
}

export function resolveClientIpFromHeaders(
  headers: HeaderLike,
  isInternal: boolean = false,
): ClientIpResolution {
  // 1) Si viene enriquecida desde una Server Action y es una request interna, usar esa primero
  if (isInternal) {
    const explicit = headers.get("x-client-ip");
    const explicitNorm = normalizeIp(explicit);
    if (explicitNorm) {
      return { clientIp: explicitNorm, source: "x-client-ip" };
    }
  }

  // 2) Proxy / infraestructura (client real en x-forwarded-for)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Cloud Run appends the real client IP to the END of the list.
    // If we take the first one, it can be spoofed by the user sending this header.
    const norm = getLastForwardedIp(forwarded);
    if (norm) {
      return { clientIp: norm, source: "x-forwarded-for" };
    }
  }

  // 3) Fallback: x-real-ip
  const realIp = headers.get("x-real-ip");
  const normReal = normalizeIp(realIp);
  if (normReal) {
    return { clientIp: normReal, source: "x-real-ip" };
  }

  // 4) Último recurso
  return { clientIp: null, source: "missing" };
}

export function getClientIpFromHeaders(
  headers: HeaderLike,
  isInternal: boolean = false,
): string {
  return resolveClientIpFromHeaders(headers, isInternal).clientIp ?? "unknown";
}

// Versión para Route Handlers (compat con lo que ya usabas)
export function resolveClientIp(
  req: NextRequest,
  isInternal: boolean = false,
): ClientIpResolution {
  return resolveClientIpFromHeaders(req.headers, isInternal);
}

export function getClientIp(req: NextRequest, isInternal: boolean = false): string {
  return getClientIpFromHeaders(req.headers, isInternal);
}
