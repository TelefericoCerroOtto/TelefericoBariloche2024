import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export function getCsrfTokenFromMeta(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute("content") ?? null;
}

export async function requireCsrf(
  req: NextRequest,
): Promise<NextResponse | null> {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const headerToken = req.headers.get("x-csrf-token");
  const sessionToken = session.csrfToken as string | undefined;

  if (!headerToken || !sessionToken || headerToken !== sessionToken) {
    return NextResponse.json(
      { ok: false, message: "Invalid CSRF token" },
      { status: 403 },
    );
  }

  return null;
}
