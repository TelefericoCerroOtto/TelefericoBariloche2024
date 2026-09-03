import type { User as StrapiUser } from "@/types";

/**
 * [Type augmentation rationale]
 *
 * Auth.js defines `User.id?: string` (DefaultUser). Strapi returns `id: number`.
 * To keep application consistency, we expose `Session.user.id` as `number`.
 *
 * The Credentials `authorize()` must return `User.id` as `string` to match Auth.js,
 * then we convert it to `number` in the `jwt` callback and propagate that numeric id
 * into the `session` callback.
 *
 * This file encodes that contract:
 * - `next-auth.User.id` remains `string` (Auth.js boundary)
 * - `next-auth.Session.user.id` is `number` (application domain)
 * - `next-auth/jwt.JWT.id` is `number` (application domain)
 */

declare module "next-auth" {
  interface User extends Omit<StrapiUser, "faved_postulations" | "id"> {
    id: string; // Boundary type: Auth.js expects a string id in `User`
    jwt: string;
  }

  interface Session {
    user: {
      id: number; // Application domain type: Strapi IDs are numeric
      documentId: User["documentId"];
      name: User["name"];
      surname: User["surname"];
      username: User["username"];
      email: User["email"];
      blocked: User["blocked"];
      role: User["role"];
    };
    csrfToken: string;
  }
}

// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
import "next-auth/jwt";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `auth`, when using JWT sessions */
  interface JWT extends Omit<StrapiUser, "faved_postulations"> {
    jwt: string;
    authExpiresAt: number;
    csrfToken: string;
  }
}
