import { NextRequest } from "next/server";

export function extractOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== "null") {
    return origin.replace(/\/$/, "");
  }
  const referer = req.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin.replace(/\/$/, "");
  } catch {
    return null;
  }
}
