import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "vitest";
import sharp from "sharp";

import { mergeDefaults } from "../core/jobs";
import { planOutputRender } from "../core/render";
import { createSeedProfiles, parseComponent } from "./build-jobs";

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

test("news detail image seed has descriptive mobile and desktop slots", () => {
  const profile = createSeedProfiles().find(
    (candidate) => candidate.id === "news-detail-image",
  );

  expect(profile).toEqual({
    id: "news-detail-image",
    label: "News Detail Image",
    slots: [
      {
        id: "news-detail-image-2x3",
        label: "Mobile 2:3",
        ratio: "2:3",
        mp: 1.8,
        quality: 88,
      },
      {
        id: "news-detail-image-21x9",
        label: "Desktop 21:9",
        ratio: "21:9",
        mp: 2.8,
        quality: 90,
      },
    ],
  });
});

test("news detail planned filenames include each ratio suffix", async () => {
  const profile = createSeedProfiles().find(
    (candidate) => candidate.id === "news-detail-image",
  );
  expect(profile).toBeDefined();

  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "image-pipeline-news-detail-names-"),
  );
  const inputPath = path.join(tempDir, "source.png");

  try {
    await sharp({
      create: {
        width: 2100,
        height: 900,
        channels: 3,
        background: "#336699",
      },
    })
      .png()
      .toFile(inputPath);

    const defaults = mergeDefaults({ format: "webp", quality: 82 });
    const plans = await Promise.all(
      profile!.slots.map((slot) =>
        planOutputRender({
          inputPath,
          relFile: "GONDOLAS 3.jpg",
          outJob: {
            name: slot.id,
            ratio: slot.ratio,
            mp: slot.mp,
            quality: slot.quality,
          },
          defaults,
          outputBase: tempDir,
          context: `news-detail-image.${slot.id}`,
        }),
      ),
    );

    expect(plans.map((plan) => path.basename(plan.outPath!))).toEqual([
      "GONDOLAS 3-news-detail-image-2x3.webp",
      "GONDOLAS 3-news-detail-image-21x9.webp",
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("filename parser selects the full profile suffix and retains old suffixes", () => {
  expect(parseComponent("portada-noticia-news-detail-image.png")).toBe(
    "news-detail-image",
  );
  expect(parseComponent("portada-noticia-card.png")).toBe("card");
  expect(parseComponent("portada-noticia-unknown.png")).toBeNull();
});

test("existing seed profile outputs remain unchanged", () => {
  const profiles = createSeedProfiles();

  expect(profiles.map(({ id }) => id)).toEqual([
    "hero",
    "carrousel",
    "card",
    "poster",
    "panoramic",
    "single",
    "spotlight",
    "horizontal",
    "ladder",
    "masonrys0",
    "masonrys1",
    "miniaturess0",
    "miniaturess1",
    "cascades0",
    "cascades1",
    "double",
    "news-detail-image",
  ]);
  expect(profiles.find(({ id }) => id === "panoramic")?.slots).toEqual([
    {
      id: "panoramic-21x9",
      label: "Panoramic 21:9",
      ratio: "21:9",
      mp: 2.8,
      quality: 90,
    },
    {
      id: "panoramic-2x3",
      label: "Panoramic 2:3",
      ratio: "2:3",
      mp: 1.8,
      quality: 88,
    },
  ]);
});
