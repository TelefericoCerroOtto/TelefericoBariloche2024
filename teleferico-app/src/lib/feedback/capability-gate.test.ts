import { afterEach, describe, expect, it, vi } from "vitest";
import { isFeedbackCapabilityEnabled } from "./capability-gate";

vi.mock("server-only", () => ({}));

describe("feedback capability gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("honors the explicit server-side flag in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");

    expect(isFeedbackCapabilityEnabled()).toBe(true);
  });

  it("honors the explicit server-side flag in staging independently of Node mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEPLOYMENT_ENV", "staging");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");

    expect(isFeedbackCapabilityEnabled()).toBe(true);
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
