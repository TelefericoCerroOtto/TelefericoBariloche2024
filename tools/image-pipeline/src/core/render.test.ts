import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

import { mergeDefaults } from "./jobs";
import { planOutputRender, renderPreview, writePlanToFile } from "./render";

test("preview and file render share the same output dimensions", async () => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "image-pipeline-render-preview-"),
  );
  const inputPath = path.join(tempDir, "source.png");
  const outputPath = path.join(tempDir, "preview.webp");

  await sharp({
    create: {
      width: 1600,
      height: 1200,
      channels: 3,
      background: "#336699",
    },
  })
    .png()
    .toFile(inputPath);

  const defaults = mergeDefaults({ format: "webp", quality: 80 });
  const outJob = { ratio: "4:5", mp: 1.2, quality: 80 };
  const preview = await renderPreview({
    inputPath,
    relFile: "source.png",
    outJob,
    defaults,
    context: "preview",
  });

  const plan = await planOutputRender({
    inputPath,
    relFile: "source.png",
    outJob,
    defaults,
    outputBase: tempDir,
    context: "process",
  });

  await writePlanToFile(plan, outputPath);

  const [previewMeta, fileMeta] = await Promise.all([
    sharp(preview.buffer).metadata(),
    sharp(await readFile(outputPath)).metadata(),
  ]);

  assert.equal(previewMeta.width, fileMeta.width);
  assert.equal(previewMeta.height, fileMeta.height);
  assert.equal(preview.plan.cropFit.out.w, fileMeta.width);
  assert.equal(preview.plan.cropFit.out.h, fileMeta.height);
});
