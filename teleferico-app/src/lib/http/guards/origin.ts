import { NextRequest, NextResponse } from "next/server";

function extractOrigin(req: NextRequest) {
  // 1) Intentar con Origin (típico request de browser)
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    return origin.replace(/\/$/, "");
  }

  // 2) Intentar con Referer
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin.replace(/\/$/, "");
    } catch {
      // ignore y probamos fallback
    }
  }

  // 3) Fallback: reconstruir origin desde x-forwarded-* o host
  const proto = req.headers.get("x-forwarded-proto");
  if (!proto) return null;

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) return null;

  return `${proto}://${host}`.replace(/\/$/, "");
}

const buildAllowedOrigins = (
  extraAllowedOrigins?: Set<string>,
): Set<string> => {
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
};

function isOriginAllowed(
  origin: string | null,
  allowedOrigins: Set<string>,
): boolean {
  if (!origin) return false;
  return allowedOrigins.has(origin);
}

function isPrivateHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;

  // IP v4 básica
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;

  const [aStr, bStr] = parts;
  const a = Number(aStr);
  const b = Number(bStr);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

  // Rangos privados comunes
  // 10.0.0.0    – 10.255.255.255
  if (a === 10) return true;
  // 172.16.0.0  – 172.31.255.255
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0 – 192.168.255.255
  if (a === 192 && b === 168) return true;

  return false;
}

function isDevPrivateOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return isPrivateHostname(url.hostname);
  } catch {
    return false;
  }
}

export function ensureTrustedOrigin(
  req: NextRequest,
  allowedOrigins: Set<string> | undefined = buildAllowedOrigins(),
):
  | { ok: true; origin: string }
  | { ok: false; res: NextResponse<{ ok: false; message: string }> } {
  const origin = extractOrigin(req);

  // 1) Intentar validación estricta con allowedOrigins
  if (isOriginAllowed(origin, allowedOrigins)) {
    return { ok: true, origin: origin! };
  }

  // 2) En desarrollo: aceptar orígenes de red privada (LAN)
  if (process.env.NODE_ENV !== "production" && isDevPrivateOrigin(origin)) {
    return { ok: true, origin: origin! };
  }

  // 3) Si no pasó ninguna regla, bloqueamos
  return {
    ok: false,
    res: NextResponse.json(
      { ok: false, message: "Forbidden" },
      { status: 403 },
    ),
  };
}
