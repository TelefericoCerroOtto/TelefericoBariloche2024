import { handleFeedbackAdminRead } from "@/lib/feedback/admin-route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  return handleFeedbackAdminRead(req, "aspects", "feedback.read");
}
