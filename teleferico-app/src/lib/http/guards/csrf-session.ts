import "server-only";

import {
  getServerSession,
  type ServerSession,
} from "@/lib/auth/get-session";
import { NextRequest, NextResponse } from "next/server";

export type CsrfSessionResult =
  | { ok: true; session: ServerSession }
  | { ok: false; res: NextResponse };

export async function requireCsrf(
  req: NextRequest,
): Promise<NextResponse | null> {
  const result = await requireCsrfSession(req);

  return result.ok ? null : result.res;
}

export async function requireCsrfSession(
  req: NextRequest,
): Promise<CsrfSessionResult> {
  const session = await getServerSession(req);

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
