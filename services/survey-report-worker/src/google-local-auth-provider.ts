import "server-only";

import { GoogleAuth } from "google-auth-library";

export function createLocalGoogleAccessTokenProvider(
  env: NodeJS.ProcessEnv = process.env,
): () => Promise<string> {
  const assertLocalOAuthContext = () => {
    if (
      env.NODE_ENV !== "development" ||
      env.K_SERVICE ||
      env.K_REVISION ||
      (env.GOOGLE_APPLICATION_CREDENTIALS !== undefined &&
        env.GOOGLE_APPLICATION_CREDENTIALS !== "")
    )
      throw new TypeError("Local Google OAuth context is unavailable");
  };

  assertLocalOAuthContext();
  return async () => {
    assertLocalOAuthContext();
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const result = await client.getAccessToken();
    if (!result.token || /[\u0000-\u0020\u007f]/.test(result.token))
      throw Object.assign(new Error("Local Google OAuth is unavailable"), {
        code: "AUTHENTICATION" as const,
      });
    return result.token;
  };
}
