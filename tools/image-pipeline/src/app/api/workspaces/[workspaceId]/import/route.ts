import path from "node:path";

import { NextResponse } from "next/server";

import { getWorkspacePayload, importWorkspaceFiles } from "@/lib/server/workspace-store";

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);

function isImageUpload(file: File) {
  if (file.type.toLowerCase().startsWith("image/")) {
    return true;
  }

  return IMAGE_EXTENSIONS.has(path.extname(file.name).toLowerCase());
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);

  const invalidFiles = files.filter((file) => !isImageUpload(file));
  if (invalidFiles.length > 0) {
    return NextResponse.json(
      {
        error: `Import only supports image files. Rejected: ${invalidFiles
          .map((file) => file.name)
          .join(", ")}`,
      },
      { status: 400 },
    );
  }

  const imported = await Promise.all(
    files.map(async (file) => ({
      relativePath: file.name,
      buffer: Buffer.from(await file.arrayBuffer()),
    })),
  );

  await importWorkspaceFiles(workspaceId, imported);
  return NextResponse.json(await getWorkspacePayload(workspaceId));
}
