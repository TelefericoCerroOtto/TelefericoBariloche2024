import { ENV_KEYS } from "@/lib/constants/env.const";

// Google OAuth/Gmail constants and env keys
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
] as const;

export type GoogleOAuthRequiredEnvKey =
  | typeof ENV_KEYS.GOOGLE_CLIENT_ID
  | typeof ENV_KEYS.GOOGLE_CLIENT_SECRET
  | typeof ENV_KEYS.OAUTH_REDIRECT_URI
  | typeof ENV_KEYS.CSRF_STATE_SECRET;

export const GOOGLE_OAUTH_REQUIRED_ENV_KEYS: GoogleOAuthRequiredEnvKey[] = [
  ENV_KEYS.GOOGLE_CLIENT_ID,
  ENV_KEYS.GOOGLE_CLIENT_SECRET,
  ENV_KEYS.OAUTH_REDIRECT_URI,
  ENV_KEYS.CSRF_STATE_SECRET,
];
