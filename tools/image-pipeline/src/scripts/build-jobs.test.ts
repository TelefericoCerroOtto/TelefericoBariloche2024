import { expect, test } from "vitest";

import { createSeedProfiles } from "./build-jobs";

const IMAGE_TEXT_PROFILE_QUALITIES = {
  card: [88, 86],
  poster: [90, 88],
  panoramic: [90, 88],
  single: [88, 88],
  spotlight: [88, 86],
  horizontal: [86, 85],
  ladder: [86, 85],
  masonrys0: [86],
  masonrys1: [84],
  miniaturess0: [88],
  miniaturess1: [84],
  cascades0: [86],
  cascades1: [85],
  double: [86],
} as const;

test("ImageTextBlock seed profiles retain master delivery quality", () => {
  const profiles = createSeedProfiles();

  for (const [profileId, qualities] of Object.entries(
    IMAGE_TEXT_PROFILE_QUALITIES,
  )) {
    const profile = profiles.find((candidate) => candidate.id === profileId);
    expect(profile?.slots.map((slot) => slot.quality)).toEqual(qualities);
  }
});
