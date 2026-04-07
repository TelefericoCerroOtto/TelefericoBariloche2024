import { NextResponse } from "next/server";
import sharp from "sharp";

import { getRegistry } from "@/lib/server/registry-store";
import {
  readWorkspaceManifest,
  resolveWorkspaceItemInputPath,
} from "@/lib/server/workspace-store";
import { findSlotById } from "@/lib/studio/registry-mappers";
import { STUDIO_JOB_DEFAULTS } from "@/lib/studio/jobs-mappers";
import { mergeDefaults } from "@/core/jobs";
import { cropAndFitToMP } from "@/cropAndFitToMP";
import { orientedSize } from "@/sharpUtils";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const body = (await request.json()) as { itemId?: string; slotId?: string };

  if (!body.itemId) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  const [workspace, registry] = await Promise.all([
    readWorkspaceManifest(workspaceId),
    getRegistry(),
  ]);

  const item = workspace.items.find((candidate) => candidate.id === body.itemId);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  try {
    const inputPath = await resolveWorkspaceItemInputPath(
      workspaceId,
      item.sourcePath,
    );

    const meta = await sharp(inputPath, { failOn: "none" }).metadata();
    const base = orientedSize(meta);
    const headers: Record<string, string> = {
      "content-type": "image/webp",
      "x-base-width": String(base.w),
      "x-base-height": String(base.h),
    };

    if (body.slotId) {
      const slot = findSlotById(registry, body.slotId);
      if (slot) {
        const defaults = mergeDefaults(STUDIO_JOB_DEFAULTS);
        const cropFit = cropAndFitToMP(slot.ratio, slot.mp, base, item.focalPoint, {
          alignTo: defaults.alignTo,
          capToBase: defaults.capToBase,
        });

        headers["x-crop-left"] = String(cropFit.crop.x);
        headers["x-crop-top"] = String(cropFit.crop.y);
        headers["x-crop-width"] = String(cropFit.crop.w);
        headers["x-crop-height"] = String(cropFit.crop.h);
        headers["x-out-width"] = String(cropFit.out.w);
        headers["x-out-height"] = String(cropFit.out.h);
      }
    }

    const buffer = await sharp(inputPath, { failOn: "none" })
      .rotate()
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Preview failed: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 422 },
    );
  }
}
