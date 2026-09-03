// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { encode } from "next-auth/jwt";
import type { User as AuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@/types";

const mocks = vi.hoisted(() => ({
  verifySession: vi.fn(),
}));

vi.mock("@/lib/services/cms/users-permissions/auth", () => ({
  verifySession: mocks.verifySession,
}));

import { createAuthSessionCallbacks } from "./lib/auth/auth-callbacks";
import { getServerToken } from "./lib/auth/auth-token";

const strapiJwt = "strapi-bearer-token";
const authSecret = "test-auth-secret";
const createdAt = "2026-09-03T12:00:00.000Z";
const role: UserRole = {
  id: 1,
  documentId: "role-1",
  name: "Administrator",
  description: "",
  type: "administrator",
  createdAt,
  updatedAt: createdAt,
  publishedAt: createdAt,
  locale: null,
};
const authToken: JWT = {
  id: 42,
  documentId: "user-42",
  username: "ada",
  email: "ada@example.com",
  provider: "local",
  confirmed: true,
  blocked: false,
  name: "Ada",
  surname: "Lovelace",
  createdAt,
  updatedAt: createdAt,
  publishedAt: createdAt,
  role,
  jwt: strapiJwt,
  authExpiresAt: Math.floor(Date.now() / 1000) + 60 * 45,
  csrfToken: "csrf-token",
};
const authUser: AuthUser = { ...authToken, id: "42" };

async function createRequestWithAuthCookie(isSecure: boolean) {
  const cookieName = isSecure
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
  const token = await encode({
    token: { jwt: strapiJwt },
    secret: authSecret,
    salt: cookieName,
  });

  return new Request(
    `${isSecure ? "https" : "http"}://telefericobariloche.test/api/auth`,
    { headers: { cookie: `${cookieName}=${token}` } },
  );
}

describe("Auth.js callbacks", () => {
  const authCallbacks = createAuthSessionCallbacks(60 * 45);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("AUTH_SECRET", authSecret);
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    mocks.verifySession.mockResolvedValue({ isLogged: true });
  });

  it("does not serialize the Strapi JWT into the browser-visible session", async () => {
    const callbackInput = {
      session: {
        user: { ...authToken, emailVerified: null },
        csrfToken: "existing-csrf-token",
        expires: new Date() as Date & string,
      },
      token: authToken,
    } as unknown as Parameters<typeof authCallbacks.session>[0];
    const session = await authCallbacks.session(callbackInput);

    expect(session).not.toHaveProperty("jwt");
    expect(JSON.stringify(session)).not.toContain(strapiJwt);
  });

  it("keeps the Strapi JWT in the server-side Auth.js token and verifies it", async () => {
    const token = await authCallbacks.jwt({
      token: authToken,
      trigger: "signIn",
      user: authUser,
    });

    expect(token).toMatchObject({ id: 42, jwt: strapiJwt });
    expect(mocks.verifySession).toHaveBeenCalledWith(strapiJwt);
  });

  it("retrieves the Strapi JWT from the encrypted development cookie for trusted server code", async () => {
    const token = await getServerToken(await createRequestWithAuthCookie(false));

    expect(token).toMatchObject({ jwt: strapiJwt });
  });

  it("retrieves the Strapi JWT from the encrypted secure production cookie", async () => {
    const token = await getServerToken(await createRequestWithAuthCookie(true));

    expect(token).toMatchObject({ jwt: strapiJwt });
  });

  it("fails closed when the Auth.js JWT does not contain a Strapi bearer", async () => {
    const token = await getServerToken(
      new Request("http://telefericobariloche.test/api/auth"),
    );

    expect(token).toBeNull();
  });
});
