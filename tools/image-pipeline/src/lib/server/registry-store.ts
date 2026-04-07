import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { assertValidOutputs } from "@/core/jobs";
import { createSeedProfiles } from "@/scripts/build-jobs";
import { requireSafeRegistryId } from "./path-safety";
import { createRegistryFromSeedProfiles } from "../studio/registry-mappers";
import type { SlotProfileRegistry } from "../studio/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOL_ROOT = path.resolve(__dirname, "../../..");
const REGISTRY_ROOT = path.join(TOOL_ROOT, ".studio", "registry");
const REGISTRY_PATH = path.join(REGISTRY_ROOT, "slot-profiles.json");

async function ensureRegistryFile() {
  await mkdir(REGISTRY_ROOT, { recursive: true });
  try {
    await readFile(REGISTRY_PATH, "utf8");
  } catch {
    const seedRegistry = createRegistryFromSeedProfiles(createSeedProfiles());
    await writeFile(REGISTRY_PATH, `${JSON.stringify(seedRegistry, null, 2)}\n`, "utf8");
  }
}

function validateRegistry(registry: SlotProfileRegistry) {
  if (!registry || typeof registry !== "object" || !Array.isArray(registry.profiles)) {
    throw new Error("Invalid registry: profiles must be an array");
  }

  const profileIds = new Set<string>();
  const slotIds = new Set<string>();

  registry.profiles.forEach((profile, profileIndex) => {
    const profileId = requireSafeRegistryId(
      profile.id,
      `Invalid registry: profiles[${profileIndex}].id`,
    );
    if (profileIds.has(profileId)) {
      throw new Error(`Invalid registry: profiles[${profileIndex}].id must be unique`);
    }
    profileIds.add(profileId);

    if (!Array.isArray(profile.slots)) {
      throw new Error(`Invalid registry: profiles[${profileIndex}].slots must be an array`);
    }

    profile.slots.forEach((slot, slotIndex) => {
      const slotId = requireSafeRegistryId(
        slot.id,
        `Invalid registry: profiles[${profileIndex}].slots[${slotIndex}].id`,
      );
      if (slotIds.has(slotId)) {
        throw new Error(
          `Invalid registry: profiles[${profileIndex}].slots[${slotIndex}].id must be unique`,
        );
      }
      slotIds.add(slotId);

      assertValidOutputs(
        [slot],
        `registry.profiles[${profileIndex}].slots[${slotIndex}]`,
      );
    });
  });
}

export async function getRegistry() {
  await ensureRegistryFile();
  const raw = await readFile(REGISTRY_PATH, "utf8");
  return JSON.parse(raw) as SlotProfileRegistry;
}

export async function saveRegistry(registry: SlotProfileRegistry) {
  await ensureRegistryFile();
  validateRegistry(registry);
  const nextRegistry = {
    ...registry,
    version: 1 as const,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(REGISTRY_PATH, `${JSON.stringify(nextRegistry, null, 2)}\n`, "utf8");
  return nextRegistry;
}
