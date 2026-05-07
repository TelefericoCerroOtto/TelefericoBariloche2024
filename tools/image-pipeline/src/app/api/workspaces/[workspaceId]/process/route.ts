import { NextResponse } from "next/server";

import { executeJobs } from "@/lib/server/pipeline-core";
import { getRegistry } from "@/lib/server/registry-store";
import {
  assertWorkspaceJobsPathConfinement,
  getWorkspacePaths,
  readWorkspaceJobsText,
} from "@/lib/server/workspace-store";
import { validateJobsDocument } from "@/lib/studio/jobs-mappers";

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { dryRun?: boolean };
  const jobsText = await readWorkspaceJobsText(workspaceId);

  if (!jobsText.trim()) {
    return NextResponse.json(
      { error: "Generate or save jobs.json before processing." },
      { status: 400 },
    );
  }

  try {
    const registry = await getRegistry();
    const document = validateJobsDocument(jobsText, registry);
    assertWorkspaceJobsPathConfinement(workspaceId, document.root);

    const paths = getWorkspacePaths(workspaceId);
    const result = await executeJobs({
      jobsPath: paths.jobsPath,
      dryRun: body.dryRun,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    );
  }
}
