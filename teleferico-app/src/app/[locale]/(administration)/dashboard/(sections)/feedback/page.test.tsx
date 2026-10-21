// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  featureEnabled: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/lib/feedback/capability-gate", () => ({ isFeedbackCapabilityEnabled: mocks.featureEnabled }));
vi.mock("@/components/administration/feedback/FeedbackDashboard", () => ({ default: () => null }));

import FeedbackPage from "./page";

describe("Feedback dashboard page authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.featureEnabled.mockReturnValue(true);
    mocks.auth.mockResolvedValue({ user: { role: { name: "Digital Experience Operator" }, capabilities: ["feedback.read"] } });
  });

  it("keeps the capability flag ahead of session lookup", async () => {
    mocks.featureEnabled.mockReturnValue(false);
    await expect(Promise.resolve().then(() => FeedbackPage())).rejects.toThrow("NOT_FOUND");
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("denies Administrator even with a stale feedback capability", async () => {
    mocks.auth.mockResolvedValue({ user: { role: { name: "Administrator" }, capabilities: ["feedback.read"] } });
    await expect(Promise.resolve().then(() => FeedbackPage())).rejects.toThrow("NOT_FOUND");
  });

  it("denies sessions without a verified feedback capability", async () => {
    mocks.auth.mockResolvedValue({ user: { role: { name: "Digital Experience Operator" }, capabilities: [] } });
    await expect(Promise.resolve().then(() => FeedbackPage())).rejects.toThrow("NOT_FOUND");
  });

  it("renders only for the authorized operator", async () => {
    expect(await FeedbackPage()).toBeTruthy();
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
