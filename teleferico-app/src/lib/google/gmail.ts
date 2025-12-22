import { assertEnv } from "@/utils/env";
import { type Credentials } from "google-auth-library";
import { google } from "googleapis";
import { ENV_KEYS } from "../constants/env.const";
import { GOOGLE_OAUTH_SCOPES } from "./constants";
import { createOAuthClient } from "./oauth";

let gmailClient: ReturnType<typeof google.gmail> | null = null;

export function ensureGmail() {
  if (gmailClient) return gmailClient;

  assertEnv([
    ENV_KEYS.GOOGLE_CLIENT_ID,
    ENV_KEYS.GOOGLE_CLIENT_SECRET,
    ENV_KEYS.OAUTH_REFRESH_TOKEN,
    ENV_KEYS.OAUTH_ACCESS_TOKEN,
    ENV_KEYS.GMAIL_SENDER,
    ENV_KEYS.GMAIL_RECEIVER,
    ENV_KEYS.OAUTH_TOKEN_EXPIRY_DATE,
  ]);

  const credentials: Credentials = {
    refresh_token: process.env.OAUTH_REFRESH_TOKEN,
    access_token: process.env.OAUTH_ACCESS_TOKEN,
    scope: GOOGLE_OAUTH_SCOPES[0],
    token_type: "Bearer",
    expiry_date: process.env.OAUTH_TOKEN_EXPIRY_DATE as unknown as number,
  };

  const oAuth2Client = createOAuthClient();

  const accessToken = process.env.OAUTH_ACCESS_TOKEN;
  const expiry = Number(process.env.OAUTH_TOKEN_EXPIRY_DATE ?? 0);
  if (accessToken) {
    credentials.access_token = accessToken;
    credentials.token_type = "Bearer";
    if (Number.isFinite(expiry) && expiry > 0) {
      credentials.expiry_date = expiry;
    }
  }

  oAuth2Client.setCredentials(credentials);
  gmailClient = google.gmail({ version: "v1", auth: oAuth2Client });
  return gmailClient;
}
