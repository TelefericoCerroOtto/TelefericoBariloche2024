import { NextRequest, NextResponse } from "next/server";

export function checkContentLength(
  req: NextRequest,
  maxBytes: number,
): NextResponse | null {
  const h = req.headers.get("content-length");
  if (!h) return null;

  const len = Number(h);
  if (!Number.isFinite(len) || len > maxBytes) {
    return NextResponse.json(
      { ok: false, message: "Payload too large" },
      { status: 413 },
    );
  }
  return null;
}
