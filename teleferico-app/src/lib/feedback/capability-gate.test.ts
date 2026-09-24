import { afterEach, describe, expect, it, vi } from "vitest";
import { isFeedbackCapabilityEnabled } from "./capability-gate";

vi.mock("server-only", () => ({}));

describe("feedback capability gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("stays closed in production even when its opt-in flag is present", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");

    expect(isFeedbackCapabilityEnabled()).toBe(false);
  });

  it("stays closed in staging even if Node runs in development mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEPLOYMENT_ENV", "staging");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");

    expect(isFeedbackCapabilityEnabled()).toBe(false);
  });

  it("opens only for an explicit non-production fixture opt-in", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");

    expect(isFeedbackCapabilityEnabled()).toBe(true);
  });

  it("stays closed in development when the fixture opt-in is absent", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "false");

    expect(isFeedbackCapabilityEnabled()).toBe(false);
  });
});
