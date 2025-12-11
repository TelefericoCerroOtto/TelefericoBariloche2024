import type { UnpopulatedUserResponse, UserRole } from "@/types";

declare module "next-auth" {
  interface User extends UnpopulatedUserResponse {
    role: UserRole;
    jwt: string;
  }

  interface Session {
    user: {
      name: string;
      surname: string;
      username: string;
      email: string;
      blocked: boolean;
      id: string;
      role: UserRole;
    };
    jwt: string;
    csrfToken: string;
  }
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import "next-auth/jwt";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT {
    name: string;
    surname: string;
    username: string;
    jwt: string;
    role: UserRole;
    id: string;
    blocked: boolean;
    authExpiresAt: number;
    csrfToken: string;
  }
}
