import { auth } from "@/auth";
import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type AuthSession = Session;

export type CsrfSessionResult =
  | { ok: true; session: AuthSession }
  | { ok: false; res: NextResponse };

export function getCsrfTokenFromMeta(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute("content") ?? null;
}

export async function requireCsrf(
  req: NextRequest,
): Promise<NextResponse | null> {
  const result = await requireCsrfSession(req);

  return result.ok ? null : result.res;
}

export async function requireCsrfSession(
  req: NextRequest,
): Promise<CsrfSessionResult> {
  const session = await auth();

  if (!session) {
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const headerToken = req.headers.get("x-csrf-token");
  const sessionToken = session.csrfToken as string | undefined;

  if (!headerToken || !sessionToken || headerToken !== sessionToken) {
    return {
      ok: false,
      res: NextResponse.json(
        { ok: false, message: "Invalid CSRF token" },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    session,
  };
}
