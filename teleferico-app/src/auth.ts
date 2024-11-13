import { login } from "@/lib/services/login";
import NextAuth, { AuthError } from "next-auth";
import Credentials from "next-auth/providers/credentials";

type InvalidLoginErrorCodes = "invalid_credentials" | "unhandled_error";

export class InvalidLoginError extends AuthError {
  code = "invalid_credentials";
  constructor(message?: InvalidLoginErrorCodes) {
    super(message);
    this.code = message ?? this.code;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
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
          user = { ...loginRes.data.user };
          return user;
        }

        if (loginRes.data !== null) {
          throw new InvalidLoginError();
        }

        throw new InvalidLoginError("unhandled_error");
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Cuando pasa una request por el middleware de auth, invoca a la siguiente
    // funcion que tiene como parametro al objeto auth. Si devuelve false, hara un redirect
    // a la pagina de login. Con true, sigue la request normalmente
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
    signIn(values) {
      return true;
      return (values.credentials?.identifier as string).includes(
        "@telefericobariloche.com.ar",
      );
    },
  },
});
