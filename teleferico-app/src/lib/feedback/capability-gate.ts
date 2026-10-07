import "server-only";

import { NextResponse } from "next/server";

const FEEDBACK_CAPABILITY_FLAG = "FEEDBACK_CAPABILITY_ENABLED";

export function isFeedbackCapabilityEnabled(): boolean {
  return process.env[FEEDBACK_CAPABILITY_FLAG] === "true";
}

export function feedbackCapabilityUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "FEATURE_UNAVAILABLE" } },
    { status: 503 },
  );
}
