import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ strapiFetch: vi.fn() }));

vi.mock("@/lib/http/clients/strapi-fetch", () => ({
  strapiFetch: mocks.strapiFetch,
}));

import { getRoles } from "./user";

describe("getRoles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("offers only the current assignable operational role", async () => {
    const cmsResponse = {
      ok: true,
      data: {
        roles: [
          { name: "Public" },
          { name: "Authenticated" },
          { name: "Administrator" },
          { name: "Digital Experience Operator" },
          { name: "Retired Role" },
        ],
      },
    };
    mocks.strapiFetch.mockResolvedValue(cmsResponse);

    const result = await getRoles("test-jwt");

    expect(result).toEqual({
      ok: true,
      data: [{ name: "Digital Experience Operator" }],
    });
    expect(cmsResponse.data.roles).toHaveLength(5);
  });

  it("preserves CMS failures", async () => {
    const failure = { ok: false, data: { error: { message: "Unavailable" } } };
    mocks.strapiFetch.mockResolvedValue(failure);

    expect(await getRoles("test-jwt")).toEqual(failure);
  });
});
