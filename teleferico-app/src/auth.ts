import { getUserRole, login } from "@/lib/services";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

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
  session: { maxAge: 60 * 45 },
  providers: [
    Credentials({
      credentials: {
        identifier: {},
        password: {},
      },
      authorize: async (credentials) => {
        let user = null;

        const loginRes = await login({
          identifier: (credentials?.identifier as string) ?? "",
          password: (credentials?.password as string) ?? "",
        });

        if (loginRes.ok) {
          const { user: userData, jwt } = loginRes.data;
          const role = await getUserRole(userData.id, jwt);

          if (role.ok) {
            const { name, type, description } = role.data;
            user = {
              ...userData,
              role: { name, type, description },
              jwt,
            };
            return user;
          } else if (role.data !== null) {
            throw new InvalidCredentials("Invalid Credentials");
          }
        } else if (loginRes.data !== null) {
          throw new InvalidCredentials("Invalid Credentials");
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
        token.id = user.id as string;
        token.name = user.name as string;
        token.surname = user.surname;
        token.jwt = user.jwt;
        token.role = user.role;
        token.blocked = user.blocked;
      }
      return token;
    },
    session: async ({ token, session }) => {
      session.jwt = token.jwt;
      session.user.name = token.name;
      session.user.surname = token.surname;
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.blocked = token.blocked;

      return session;
    },
  },
});
