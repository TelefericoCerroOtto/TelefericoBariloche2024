/**
 * Gmail OAuth setup (init):
 * - Validates required env vars and an admin init token.
 * - Generates a signed `state` for CSRF protection and sets it as an HttpOnly cookie.
 * - Redirects the admin to Google's consent screen with offline access (refresh_token).
 *
 * Access control: This endpoint requires an admin token to prevent random users
 * from initiating the OAuth flow. Provide it as `Authorization: Bearer <token>`
 * or `?token=<token>`. Configure the token via env INIT_TOKEN.
 *
 * One-time use: This flow is intended for an admin to capture a refresh_token
 * once. Store the refresh token as OAUTH_REFRESH_TOKEN in your environment; do not
 * commit it to source control.
 */
import { ENV_KEYS } from "@/lib/constants/env.const";
import { buildAuthUrl, createOAuthClient } from "@/lib/google/oauth";
import { generateState } from "@/utils/csrf-state";
import { assertEnv } from "@/utils/env";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Validate envs (client, secret, redirect, state secret)
    assertEnv([ENV_KEYS.INIT_TOKEN]);

    // Admin token check (403 if missing/invalid)
    const initToken = process.env[ENV_KEYS.INIT_TOKEN];
    if (!initToken) {
      return NextResponse.json(
        { error: "INIT_TOKEN not configured on server" },
        { status: 500 },
      );
    }
    const authz = req.headers.get("authorization");
    const qpToken = req.nextUrl.searchParams.get("token");
    const provided = authz?.startsWith("Bearer ")
      ? authz.slice(7)
      : (qpToken ?? undefined);
    if (provided !== initToken) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Create OAuth client and URL
    const oauthClient = createOAuthClient();
    const authUrl = buildAuthUrl(oauthClient);

    // CSRF state cookie (signed)
    const state = generateState();
    const url = new URL(authUrl);
    url.searchParams.set("state", state);

    const res = NextResponse.redirect(url.toString());
    res.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/oauth/google/callback",
      maxAge: 10 * 60, // 10 minutes
    });
    return res;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { error: "OAuth init failed", details: error?.message ?? String(error) },
      { status: 500 },
    );
  }
}
