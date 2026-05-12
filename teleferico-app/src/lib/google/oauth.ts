import { assertEnv } from "@/utils/env";
import { google } from "googleapis";
import { ENV_KEYS } from "@/lib/constants/env.const";
import {
  GOOGLE_OAUTH_RUNTIME_REQUIRED_ENV_KEYS,
  GOOGLE_OAUTH_SETUP_REQUIRED_ENV_KEYS,
  GOOGLE_OAUTH_SCOPES,
} from "./constants";

export function createOAuthSetupClient() {
  assertEnv(GOOGLE_OAUTH_SETUP_REQUIRED_ENV_KEYS);
  const clientId = process.env[ENV_KEYS.GOOGLE_CLIENT_ID] as string;
  const clientSecret = process.env[ENV_KEYS.GOOGLE_CLIENT_SECRET] as string;
  const redirectUri = process.env[ENV_KEYS.OAUTH_REDIRECT_URI] as string;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function createOAuthRuntimeClient() {
  assertEnv(GOOGLE_OAUTH_RUNTIME_REQUIRED_ENV_KEYS);
  const clientId = process.env[ENV_KEYS.GOOGLE_CLIENT_ID] as string;
  const clientSecret = process.env[ENV_KEYS.GOOGLE_CLIENT_SECRET] as string;
  return new google.auth.OAuth2(clientId, clientSecret);
}

export function buildAuthUrl(oauthClient = createOAuthSetupClient()) {
  return oauthClient.generateAuthUrl({
    access_type: "offline",
    scope: Array.from(GOOGLE_OAUTH_SCOPES),
    prompt: "consent",
  });
}
