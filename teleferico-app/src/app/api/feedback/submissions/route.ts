import { createSubmissionHandler } from "@/lib/feedback/public-http";
import { createFeedbackRuntime } from "@/lib/feedback/runtime";
import {
  feedbackCapabilityUnavailableResponse,
  isFeedbackCapabilityEnabled,
} from "@/lib/feedback/capability-gate";

export const dynamic = "force-dynamic";

export async function POST(...args: Parameters<ReturnType<typeof createSubmissionHandler>>) {
  if (!isFeedbackCapabilityEnabled())
    return feedbackCapabilityUnavailableResponse();
  return createSubmissionHandler(createFeedbackRuntime())(...args);
}
