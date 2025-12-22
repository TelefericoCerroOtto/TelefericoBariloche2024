import { getPersonalData, login, verifySession } from "@/lib/services";
import NextAuth, { CredentialsSignin, type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";

function generateCsrfTokenHex(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const SESSION_MAX_AGE_SECONDS = 60 * 45; // 45 minutes

// This custom class was created to avoid the general catch logger error of Auth.js.
// This is done via logger configuration
class InvalidCredentials extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.message = message;
  }
}

/**
 * There are 2 types of session:
 * Strapi: A 1-hour duration JWT obtained when credentials are sent to the server.
 * Auth.js: An Encrypted JWT saved in a httpOnly cookie which contains the data returned by the session callback.
 *
 * Identified issues:
 *  - Auth.js renews the session expiration time through Next.js middleware, but the updateAge option to configure this behavior doesn’t seem to work.
 *  - No way was found to automatically renew the expiration time of the JWT issued by Strapi.
 * Solution:
 *  - The Auth.js session duration was shortened to 45 minutes to allow a 15-minute buffer.
 *  - The middleware validates the Strapi token. If it’s invalid, it automatically redirects to the logout page.
 * Purpose:
 *  - This ensures the Auth.js session stays synchronized with the Strapi JWT expiration.
 * */

export const { handlers, signIn, signOut, auth } = NextAuth({
  logger: {
    error(code, ...message) {
      if (code.name === "InvalidCredentials") return;
      console.error(code, message);
    },
  },
  // The session's lifespan is set shorter than the JWT's lifespan returned by the
  // backend to ensure that the session does not remain active if the JWT has already expired.
  session: { maxAge: SESSION_MAX_AGE_SECONDS },
  providers: [
    Credentials({
      credentials: {
        identifier: {},
        password: {},
      },

      /**
       * [Strapi ID vs Auth.js ID - Why this conversion exists]
       *
       * Auth.js (NextAuth) models `User.id` as `string | undefined` (via DefaultUser),
       * while Strapi returns `id` as a number. In this codebase we keep Strapi IDs as
       * `number` for consistency across services, ACL checks, and database relations.
       *
       * However, the Credentials Provider `authorize()` is part of Auth.js boundary.
       * Returning a `User` with `id: string` aligns with Auth.js expectations and avoids
       * type friction with the core types and adapter-related typings.
       *
       * Strategy:
       * 1) In `authorize()`: convert Strapi numeric id -> string (Auth.js boundary).
       * 2) In `jwt` callback on `signIn`: convert id back to number and store it in the JWT token.
       * 3) In `session` callback: expose `session.user.id` as number to the rest of the app.
       *
       * Result:
       * - Compatibility with Auth.js core typing
       * - Numeric IDs preserved inside the application domain
       * - Reduced risk of accidental string/number mismatches in business logic
       */

      authorize: async (credentials) => {
        let user = null;

        const loginRes = await login({
          identifier: (credentials?.identifier as string) ?? "",
          password: (credentials?.password as string) ?? "",
        });

        if (loginRes.ok) {
          const { jwt } = loginRes.data;
          const res = await getPersonalData(jwt);
          if (res.ok) {
            // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
            const { role, id, ...userData } = res.data;
            user = {
              id: id.toString(), // Auth.js core types assume User.id is a string. We bridge here.
              ...userData,
              role,
              jwt,
            };
            return user;
          } else if (res.data !== null) {
            throw new InvalidCredentials(
              "No se pudieron obtener los datos personales",
            );
          }
        } else if (loginRes.data !== null) {
          throw new InvalidCredentials("Credenciales invalidas");
        }
        throw new Error("login service error, check the console.");
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // When a request goes through the auth middleware, it invokes the authorized function,
    // passing the auth object as a parameter.
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
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
          Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;

        // [CSRF] Generar el CSRF token en el momento del signIn
        if (!token.csrfToken) {
          token.csrfToken = generateCsrfTokenHex(32);
        }
      }

      // [CSRF] Fallback: si por algún motivo el trigger no fue "signIn" pero aún no hay csrfToken,
      // aseguramos que exista uno (por ejemplo en futuros triggers "update").
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
       * We build a fresh `Session` object instead of mutating `session` in-place because
       * callback typing may include AdapterUser/AdapterSession intersections (id as string).
       * Our app contract is `session.user.id: number`, aligned with Strapi numeric IDs.
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
        jwt: token.jwt,
        csrfToken: token.csrfToken,
        expires: session.expires,
      };

      return nextSession;
    },
  },
});
