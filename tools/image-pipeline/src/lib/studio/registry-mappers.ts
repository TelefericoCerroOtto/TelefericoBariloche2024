import type { SeedProfile } from "@/scripts/build-jobs";
import type { SlotProfileRegistry, StudioProfile, StudioSlot } from "./types";

export function createRegistryFromSeedProfiles(
  profiles: SeedProfile[],
): SlotProfileRegistry {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    profiles: profiles.map((profile) => ({
      id: profile.id,
      label: profile.label,
      slots: profile.slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        ratio: slot.ratio,
        mp: slot.mp,
        quality: slot.quality,
      })),
    })),
  };
}

export function findProfileById(
  registry: SlotProfileRegistry,
  profileId?: string,
): StudioProfile | undefined {
  return registry.profiles.find((profile) => profile.id === profileId);
}

export function findSlotById(
  registry: SlotProfileRegistry,
  slotId: string,
): StudioSlot | undefined {
  for (const profile of registry.profiles) {
    const slot = profile.slots.find((candidate) => candidate.id === slotId);
    if (slot) {
      return slot;
    }
  }

  return undefined;
}

export function inferProfileIdFromSlotIds(
  registry: SlotProfileRegistry,
  slotIds: string[],
): string | undefined {
  const normalized = [...slotIds].sort().join("|");
  return registry.profiles.find((profile) => {
    const profileSlotIds = [...profile.slots.map((slot) => slot.id)]
      .sort()
      .join("|");

    return profileSlotIds === normalized;
  })?.id;
}
