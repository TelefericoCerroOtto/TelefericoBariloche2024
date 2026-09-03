import { verifySession } from "@/lib/services/cms/users-permissions/auth";
import type { NextAuthConfig, Session } from "next-auth";

type AuthSessionCallbacks = Required<
  Pick<NonNullable<NextAuthConfig["callbacks"]>, "jwt" | "session">
>;

function generateCsrfTokenHex(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function createAuthSessionCallbacks(
  sessionMaxAgeSeconds: number,
): AuthSessionCallbacks {
  return {
    jwt: async ({ user, trigger, token }) => {
      if (trigger === "signIn") {
        token.id = Number(user.id);
        token.name = user.name;
        token.surname = user.surname;
        token.jwt = user.jwt;
        token.role = user.role;
        token.blocked = user.blocked;
        token.username = user.username;
        token.authExpiresAt =
          Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds;

        if (!token.csrfToken) {
          token.csrfToken = generateCsrfTokenHex(32);
        }
      }

      if (!token.csrfToken) {
        token.csrfToken = generateCsrfTokenHex(32);
      }

      const authExpiresAt =
        typeof token.authExpiresAt === "number" ? token.authExpiresAt : null;

      if (authExpiresAt !== null) {
        const nowInSeconds = Math.floor(Date.now() / 1000);
        if (nowInSeconds >= authExpiresAt) {
          console.log("jwt callback - session expired by maxAge");
          return null;
        }
      }

      if (typeof token.jwt === "string") {
        const { isLogged } = await verifySession(token.jwt);
        if (!isLogged) {
          console.log("jwt callback - session invalidated by backend");
          return null;
        }
      }

      return token;
    },
    session: async ({ token, session }) => {
      /**
       * Construct the client-visible session explicitly so the Strapi JWT remains
       * in the encrypted Auth.js token and is never serialized to the browser.
       */
      const nextSession: Session = {
        user: {
          name: token.name,
          surname: token.surname,
          username: token.username,
          email: token.email,
          blocked: token.blocked,
          id: token.id,
          role: token.role,
          documentId: token.documentId,
        },
        csrfToken: token.csrfToken,
        expires: session.expires,
      };

      return nextSession;
    },
  };
}
