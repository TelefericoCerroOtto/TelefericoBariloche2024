// Google OAuth/Gmail constants and env keys
export const SCOPES = ["https://www.googleapis.com/auth/gmail.send"] as const;

export const ENV_KEYS = {
  GOOGLE_CLIENT_ID: "GOOGLE_CLIENT_ID",
  GOOGLE_CLIENT_SECRET: "GOOGLE_CLIENT_SECRET",
  OAUTH_REDIRECT_URI: "OAUTH_REDIRECT_URI",
  CSRF_STATE_SECRET: "CSRF_STATE_SECRET",
  INIT_TOKEN: "INIT_TOKEN", // admin-only short-lived token for init endpoint
  OAUTH_REFRESH_TOKEN: "OAUTH_REFRESH_TOKEN",
  GMAIL_SENDER: "GMAIL_SENDER",
} as const;

export type RequiredEnvKey =
  | typeof ENV_KEYS.GOOGLE_CLIENT_ID
  | typeof ENV_KEYS.GOOGLE_CLIENT_SECRET
  | typeof ENV_KEYS.OAUTH_REDIRECT_URI
  | typeof ENV_KEYS.CSRF_STATE_SECRET;

export const REQUIRED_ENV_KEYS: RequiredEnvKey[] = [
  ENV_KEYS.GOOGLE_CLIENT_ID,
  ENV_KEYS.GOOGLE_CLIENT_SECRET,
  ENV_KEYS.OAUTH_REDIRECT_URI,
  ENV_KEYS.CSRF_STATE_SECRET,
];
