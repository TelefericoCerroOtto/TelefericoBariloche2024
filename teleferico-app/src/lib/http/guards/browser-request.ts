import { NextRequest } from "next/server";
import { ensureTrustedOrigin } from "./origin";

type TrustedBrowserRequestResult =
  | { ok: true; origin: string }
  | { ok: false; res: Response };

export function ensureTrustedBrowserRequest(
  req: NextRequest,
  extraAllowedOrigins?: Set<string>,
): TrustedBrowserRequestResult {
  const result = ensureTrustedOrigin(req, extraAllowedOrigins);
  if (!result.ok) return result;

  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "same-site") {
    return {
      ok: false,
      res: new Response("Forbidden", { status: 403 }),
    };
  }

  return result;
}
