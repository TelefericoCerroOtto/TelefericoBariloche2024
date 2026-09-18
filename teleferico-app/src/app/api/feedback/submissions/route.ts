import { createSubmissionHandler } from "@/lib/feedback/public-http";
import { createFeedbackRuntime } from "@/lib/feedback/runtime";

export const dynamic = "force-dynamic";

export async function POST(...args: Parameters<ReturnType<typeof createSubmissionHandler>>) {
  return createSubmissionHandler(createFeedbackRuntime())(...args);
}
