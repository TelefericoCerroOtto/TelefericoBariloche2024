import { createSurveyHandler } from "@/lib/feedback/public-http";
import { createFeedbackRuntime } from "@/lib/feedback/runtime";

export const dynamic = "force-dynamic";

export async function GET(...args: Parameters<ReturnType<typeof createSurveyHandler>>) {
  return createSurveyHandler(createFeedbackRuntime())(...args);
}
