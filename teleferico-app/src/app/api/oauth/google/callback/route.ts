/**
 * Gmail OAuth setup (callback):
 * - Verifies the CSRF `state` from the cookie and query string.
 * - Exchanges the authorization code for tokens.
 * - Responds with a minimal JSON instructing how to capture the refresh_token.
 *
 * Security:
 * - Tokens are never logged in full. Redaction is applied if logged.
 * - Only GET is supported. Other methods return 405.
 */
import { createOAuthClient, verifyState } from "@/lib/google/oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get("google_oauth_state")?.value;

  if (!code) {
    return NextResponse.json({ error: "Missing ?code" }, { status: 400 });
  }
  if (!state || !cookieState || state !== cookieState || !verifyState(state)) {
    return NextResponse.json(
      { error: "Invalid or missing state" },
      { status: 400 },
    );
  }

  try {
    const oauthClient = createOAuthClient();
    const { tokens } = await oauthClient.getToken(code);
    const rt = tokens.refresh_token; // may be undefined if already granted
    const at = tokens.access_token;

    // Clear state cookie after use
    const res = NextResponse.json(
      {
        message: rt
          ? "Success. Copy refresh_token and access_toke below and store it in env as OAUTH_REFRESH_TOKEN and OAUTH_ACCESS_TOKEN respectively. Do not commit these values."
          : "No refresh_token returned. Re-run with prompt=consent and ensure the grant wasn't previously approved. You may need to revoke access for this client in your Google Account and try again.",
        refresh_token: rt ?? null,
        access_token: at ?? null,
      },
      { status: 200 },
    );
    res.cookies.delete("google_oauth_state");
    return res;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Token exchange failed",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
