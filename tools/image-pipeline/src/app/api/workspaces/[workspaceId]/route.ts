import { NextResponse } from "next/server";

import {
  deleteWorkspace,
  getWorkspacePayload,
  updateWorkspace,
  workspaceExists,
} from "@/lib/server/workspace-store";
import { getRegistry } from "@/lib/server/registry-store";
import {
  applyWorkspaceUpdate,
  type WorkspaceUpdateBody,
} from "@/lib/studio/workspace-updates";

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  if (!(await workspaceExists(workspaceId))) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  return NextResponse.json(await getWorkspacePayload(workspaceId));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  if (!(await workspaceExists(workspaceId))) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }
  await deleteWorkspace(workspaceId);
  return NextResponse.json({ ok: true });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const body = (await request.json()) as WorkspaceUpdateBody;
  const registry = await getRegistry();

  const workspace = await updateWorkspace(workspaceId, (manifest) =>
    applyWorkspaceUpdate({ manifest, registry, body }),
  );

  const payload = await getWorkspacePayload(workspaceId);
  return NextResponse.json({ ...payload, workspace });
}
