import {
  handleFeedbackAdminGenerate,
  handleFeedbackAdminGenerations,
} from "@/lib/feedback/admin-route";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: NextRequest) {
  return handleFeedbackAdminGenerate(req);
}

export function GET(req: NextRequest) {
  return handleFeedbackAdminGenerations(req);
}
