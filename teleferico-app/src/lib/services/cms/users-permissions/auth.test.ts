import { beforeEach, describe, expect, it, vi } from "vitest";

const strapiFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/http/clients/strapi-fetch", () => ({
  strapiFetch: strapiFetchMock,
}));

import { verifySession } from "./auth";

const role = (name: string) => ({
  id: 1,
  documentId: "role-document",
  name,
  description: "",
  type: name.toLowerCase().replaceAll(" ", "-"),
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  publishedAt: "2026-09-01T00:00:00.000Z",
  locale: null,
});

describe("verified CMS session role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-reads the current role through the authenticated users/me endpoint", async () => {
    strapiFetchMock.mockResolvedValue({
      ok: true,
      data: { blocked: false, role: role("Digital Experience Operator") },
    });

    await expect(verifySession("synthetic-strapi-jwt")).resolves.toEqual({
      isLogged: true,
      user: { blocked: false, role: role("Digital Experience Operator") },
    });
    expect(strapiFetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ qp: "populate=role" }),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer synthetic-strapi-jwt" },
      }),
    );
  });

  it("revokes the verified session when Strapi reports a blocked user", async () => {
    strapiFetchMock.mockResolvedValue({
      ok: true,
      data: { blocked: true, role: role("Administrator") },
    });

    await expect(verifySession("synthetic-strapi-jwt")).resolves.toEqual({
      isLogged: false,
    });
  });

  it("revokes the verified session when the user role is absent", async () => {
    strapiFetchMock.mockResolvedValue({
      ok: true,
      data: { blocked: false, role: null },
    });

    await expect(verifySession("synthetic-strapi-jwt")).resolves.toEqual({
      isLogged: false,
    });
  });
});
