import type { NextRequest } from "next/server";

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

export function getClientIpFromHeaders(headers: HeaderLike, isInternal: boolean = false): string {
  // 1) Si viene enriquecida desde una Server Action y es una request interna, usar esa primero
  if (isInternal) {
    const explicit = headers.get("x-client-ip");
    const explicitNorm = normalizeIp(explicit);
    if (explicitNorm) return explicitNorm;
  }

  // 2) Proxy / infraestructura (client real en x-forwarded-for)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Cloud Run appends the real client IP to the END of the list.
    // If we take the first one, it can be spoofed by the user sending this header.
    const parts = forwarded.split(",");
    const raw = parts[parts.length - 1]!.trim();
    const norm = normalizeIp(raw);
    if (norm) return norm;
  }

  // 3) Fallback: x-real-ip
  const realIp = headers.get("x-real-ip");
  const normReal = normalizeIp(realIp);
  if (normReal) return normReal;

  // 4) Último recurso
  return "unknown";
}

// Versión para Route Handlers (compat con lo que ya usabas)
export function getClientIp(req: NextRequest, isInternal: boolean = false): string {
  return getClientIpFromHeaders(req.headers, isInternal);
}
