import { NextResponse } from "next/server";

import { createWorkspace, listWorkspaces } from "@/lib/server/workspace-store";

export async function GET() {
  return NextResponse.json({ workspaces: await listWorkspaces() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { title?: string };
  const workspace = await createWorkspace(body.title);
  return NextResponse.json({ workspace }, { status: 201 });
}
