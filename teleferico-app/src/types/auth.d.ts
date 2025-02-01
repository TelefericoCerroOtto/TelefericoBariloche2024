import type { UnpopulatedUserResponse } from "@/types/api/api";
import { UserRole } from "@/types/common";

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
  }
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import { JWT } from "next-auth/jwt";

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
  }
}
