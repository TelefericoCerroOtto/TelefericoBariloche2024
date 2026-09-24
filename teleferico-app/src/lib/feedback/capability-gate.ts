import "server-only";

import { NextResponse } from "next/server";

const FEEDBACK_CAPABILITY_FLAG = "FEEDBACK_CAPABILITY_ENABLED";

export function isFeedbackCapabilityEnabled(): boolean {
  const runtime = process.env.NODE_ENV;
  const isNonProductionRuntime = runtime === "development" || runtime === "test";
  const isDeployedEnvironment = [
    process.env.DEPLOYMENT_ENV,
    process.env.APP_ENV,
    process.env.VERCEL_ENV,
  ].some((environment) => {
    const normalized = environment?.toLowerCase();
    return normalized === "production" || normalized === "staging";
  });

  return (
    isNonProductionRuntime &&
    !isDeployedEnvironment &&
    process.env[FEEDBACK_CAPABILITY_FLAG] === "true"
  );
}

export function feedbackCapabilityUnavailableResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "FEATURE_UNAVAILABLE" } },
    { status: 503 },
  );
}
