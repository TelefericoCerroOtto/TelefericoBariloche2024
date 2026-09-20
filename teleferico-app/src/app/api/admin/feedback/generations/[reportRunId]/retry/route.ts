import { handleFeedbackAdminRetry } from "@/lib/feedback/admin-route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ reportRunId: string }> },
) {
  return handleFeedbackAdminRetry(req, (await context.params).reportRunId);
}
