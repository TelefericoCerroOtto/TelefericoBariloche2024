import "server-only";

import {
  getServerToken,
  type RequestWithHeaders,
} from "@/lib/auth/auth-token";
import { getAdminLoginUrl } from "@/lib/constants/routes.const";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export type ServerSession = Session & { jwt: string };

/**
 * Combines the browser-safe Auth.js session with the server-only Strapi bearer.
 * Route Handlers pass their request; Server Components use their request headers.
 */
export async function getServerSession(
  req?: RequestWithHeaders,
): Promise<ServerSession | null> {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session) return null;

  const token = await getServerToken(req ?? { headers: await headers() });
  if (!token) return null;

  return { ...session, jwt: token.jwt };
}

// Do not call this function from the /login route.
export async function getSession() {
  const { signOut } = await import("@/auth");
  const session = await getServerSession();

  if (!session) {
    await signOut({ redirect: false });
    redirect(getAdminLoginUrl());
  }
  return session;
}
