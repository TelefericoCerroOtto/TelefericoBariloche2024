import { NextResponse } from "next/server";

import { getRegistry } from "@/lib/server/registry-store";
import {
  assertWorkspaceJobsPathConfinement,
  getWorkspacePayload,
  readWorkspaceManifest,
  saveWorkspaceManifest,
  writeWorkspaceJobsText,
} from "@/lib/server/workspace-store";
import {
  buildJobsDocument,
  rehydrateWorkspaceFromJobs,
  validateJobsDocument,
} from "@/lib/studio/jobs-mappers";

type JobsAction =
  | { action: "generate" }
  | { action: "validate"; text: string }
  | { action: "rehydrate"; text: string };

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  return NextResponse.json(await getWorkspacePayload(workspaceId));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  try {
    const body = (await request.json()) as JobsAction;
    const [workspace, registry] = await Promise.all([
      readWorkspaceManifest(workspaceId),
      getRegistry(),
    ]);

    if (body.action === "generate") {
      const document = buildJobsDocument({ workspace, registry });
      await writeWorkspaceJobsText(workspaceId, document.text);
      return NextResponse.json({ jobsText: document.text, root: document.root });
    }

    if (body.action === "validate") {
      const document = validateJobsDocument(body.text, registry);
      assertWorkspaceJobsPathConfinement(workspaceId, document.root);
      return NextResponse.json({ jobsText: document.text, root: document.root });
    }

    const document = validateJobsDocument(body.text, registry);
    assertWorkspaceJobsPathConfinement(workspaceId, document.root);
    await writeWorkspaceJobsText(workspaceId, document.text);
    const nextWorkspace = rehydrateWorkspaceFromJobs({
      workspaceId,
      workspace,
      registry,
      jobsText: document.text,
    });
    await saveWorkspaceManifest(nextWorkspace);

    return NextResponse.json({
      jobsText: document.text,
      root: document.root,
      workspace: nextWorkspace,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
