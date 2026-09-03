import "server-only";

import { ENV_KEYS } from "@/lib/constants/env.const";
import { getToken, type JWT } from "next-auth/jwt";

export type RequestWithHeaders =
  | Request
  | { headers: Headers | Record<string, string> };

export type ServerToken = JWT & { jwt: string };

function isSecureAuthCookie(req: RequestWithHeaders): boolean {
  const configuredUrl =
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (req instanceof Request ? req.url : undefined) ||
    process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL];

  return configuredUrl?.startsWith("https://") ?? false;
}

function hasStrapiJwt(token: JWT | null): token is ServerToken {
  return typeof token?.jwt === "string" && token.jwt.length > 0;
}

/**
 * Decodes the encrypted Auth.js cookie for trusted server code. The returned
 * token never crosses a React Server Component or HTTP response boundary.
 */
export async function getServerToken(
  req: RequestWithHeaders,
): Promise<ServerToken | null> {
  const secret = process.env[ENV_KEYS.AUTH_SECRET];
  if (!secret) return null;

  const token = await getToken({
    req,
    secret,
    secureCookie: isSecureAuthCookie(req),
  });

  return hasStrapiJwt(token) ? token : null;
}
