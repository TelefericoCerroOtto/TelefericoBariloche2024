import { getUserRole, login } from "@/lib/services";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

class InvalidCredentials extends CredentialsSignin {
  constructor(message: string) {
    super(message);
    this.message = message;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  logger: {
    error(code, ...message) {
      if (code.name === "InvalidCredentials") return;
      console.error(code, message);
    },
  },
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
          const role = await getUserRole(loginRes.data.jwt);
          if (role.ok) {
            const { name, type, description } = role.data;
            const { user: userData, jwt } = loginRes.data;
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
    // Cuando pasa una request por el middleware de auth, invoca a la siguiente
    // funcion que tiene como parametro al objeto auth. Si devuelve false, hara un redirect
    // a la pagina de login. Con true, sigue la request normalmente
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
      session.user.name = token.name;
      session.user.surname = token.surname;
      session.user.jwt = token.jwt;
      session.user.role = token.role;
      session.user.id = token.id;
      session.user.blocked = token.blocked;

      return session;
    },
    // signIn(values) {
    //   console.log("signIn values", values);
    //   return false;
    //   return (values.credentials?.identifier as string).includes(
    //     "@telefericobariloche.com.ar",
    //   );
    // },
  },
});
