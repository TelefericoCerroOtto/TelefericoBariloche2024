import { createSurveyHandler } from "@/lib/feedback/public-http";
import { createFeedbackRuntime } from "@/lib/feedback/runtime";
import {
  feedbackCapabilityUnavailableResponse,
  isFeedbackCapabilityEnabled,
} from "@/lib/feedback/capability-gate";

export const dynamic = "force-dynamic";

export async function GET(...args: Parameters<ReturnType<typeof createSurveyHandler>>) {
  if (!isFeedbackCapabilityEnabled())
    return feedbackCapabilityUnavailableResponse();
  return createSurveyHandler(createFeedbackRuntime())(...args);
}
