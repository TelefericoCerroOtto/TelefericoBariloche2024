import { expect, test } from "vitest";

import { createSeedProfiles } from "@/scripts/build-jobs";
import { createRegistryFromSeedProfiles } from "@/lib/studio/registry-mappers";
import { PUT } from "./route";

test("registry route rejects duplicate profile and slot ids", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  const [firstProfile, secondProfile] = registry.profiles;
  const duplicated = {
    ...registry,
    profiles: [
      {
        ...firstProfile!,
        id: "duplicate-profile",
        slots: [{ ...firstProfile!.slots[0]!, id: "duplicate-slot" }],
      },
      {
        ...secondProfile!,
        id: "duplicate-profile",
        slots: [{ ...secondProfile!.slots[0]!, id: "duplicate-slot" }],
      },
    ],
  };

  const response = await PUT(
    new Request("http://localhost/api/registry/profiles", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registry: duplicated }),
    }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringMatching(/must be unique/i),
  });
});

test("registry route rejects invalid slot output fields", async () => {
  const registry = createRegistryFromSeedProfiles(createSeedProfiles());
  const invalid = {
    ...registry,
    profiles: [
      {
        ...registry.profiles[0]!,
        slots: [
          {
            ...registry.profiles[0]!.slots[0]!,
            id: "valid-slot",
            format: "png" as never,
          },
        ],
      },
    ],
  };

  const response = await PUT(
    new Request("http://localhost/api/registry/profiles", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ registry: invalid }),
    }),
  );

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.stringMatching(/format/i),
  });
});

test.each(["../escape", "nested/profile"])(
  "registry route rejects unsafe profile ids (%s)",
  async (unsafeProfileId) => {
    const registry = createRegistryFromSeedProfiles(createSeedProfiles());
    const invalid = {
      ...registry,
      profiles: [{ ...registry.profiles[0]!, id: unsafeProfileId }],
    };

    const response = await PUT(
      new Request("http://localhost/api/registry/profiles", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registry: invalid }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/unsafe/i),
    });
  },
);

test.each(["../escape", "nested/slot"])(
  "registry route rejects unsafe slot ids (%s)",
  async (unsafeSlotId) => {
    const registry = createRegistryFromSeedProfiles(createSeedProfiles());
    const invalid = {
      ...registry,
      profiles: [
        {
          ...registry.profiles[0]!,
          slots: [{ ...registry.profiles[0]!.slots[0]!, id: unsafeSlotId }],
        },
      ],
    };

    const response = await PUT(
      new Request("http://localhost/api/registry/profiles", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ registry: invalid }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/unsafe/i),
    });
  },
);
