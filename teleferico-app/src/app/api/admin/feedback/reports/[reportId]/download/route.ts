import { handleFeedbackAdminReportDownload } from "@/lib/feedback/admin-route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ reportId: string }> },
) {
  return handleFeedbackAdminReportDownload(
    req,
    (await context.params).reportId,
  );
}
