import { NextRequest } from "next/server";

export function extractOrigin(req: NextRequest) {
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
