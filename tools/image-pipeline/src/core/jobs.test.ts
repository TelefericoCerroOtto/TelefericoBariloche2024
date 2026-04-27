import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  normalizeOutputName,
  resolveCollision,
  resolveOutputBase,
  serializeSlotOutput,
  validateJobsRoot,
} from "./jobs";

test("serializeSlotOutput keeps slot id in outputs[].name", () => {
  const serialized = serializeSlotOutput({
    id: "hero-21x9-1",
    label: "Hero 21:9",
    ratio: "21:9",
    mp: 2.8,
    quality: 86,
  });

  assert.deepEqual(serialized, {
    name: "hero-21x9-1",
    ratio: "21:9",
    mp: 2.8,
    quality: 86,
    format: undefined,
  });
});

test("normalizeOutputName strips known extensions and keeps the base", () => {
  const warnings: string[] = [];
  const normalized = normalizeOutputName(
    "hero-21x9.webp",
    "images[file=\"hero.jpg\"].outputs[0]",
    (line) => warnings.push(line),
  );

  assert.equal(normalized, "hero-21x9");
  assert.equal(warnings.length, 1);
});

test("resolveCollision adds suffix when target already exists", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "image-pipeline-jobs-"));
  const outPath = path.join(tempDir, "hero.webp");
  await writeFile(outPath, "occupied", "utf8");

  const resolved = await resolveCollision({
    outPath,
    policy: "suffix",
  });

  assert.equal(resolved, path.join(tempDir, "hero-2.webp"));
});

for (const unsafeJobName of ["../../escape", "nested/job"]) {
  test(`resolveOutputBase rejects unsafe job names (${unsafeJobName})`, () => {
    assert.throws(
      () =>
        resolveOutputBase({
          jobsDir: "/tmp/workspace",
          job: {
            name: unsafeJobName,
            inputDir: "./imports",
            outputDir: "./processed",
            jobSubdir: true,
            images: [],
          },
        }),
      /unsafe|output root/i,
    );
  });
}

for (const unsafeOutputName of [
  "../../escape.webp",
  "nested/slot.webp",
  "nested/slot.custom",
]) {
  test(`validateJobsRoot rejects unsafe effective output names (${unsafeOutputName})`, () => {
    assert.throws(
      () =>
        validateJobsRoot({
          jobs: [
            {
              name: "safe-job",
              inputDir: "./imports",
              outputDir: "./processed",
              jobSubdir: false,
              images: [
                {
                  file: "gallery/source.png",
                  outputs: [{ name: unsafeOutputName, ratio: "1:1", mp: 1 }],
                },
              ],
            },
          ],
        }),
      /unsafe/i,
    );
  });
}
