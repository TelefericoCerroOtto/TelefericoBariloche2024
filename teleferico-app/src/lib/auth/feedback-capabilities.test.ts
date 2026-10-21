import { describe, expect, it } from "vitest";
import {
  FEEDBACK_ADMIN_CAPABILITIES,
  feedbackCapabilitiesForUser,
} from "./feedback-capabilities";

const EXPECTED_CAPABILITIES = [
  "feedback.read",
  "feedback.comments.read",
  "feedback.reports.read",
  "feedback.reports.generate",
];

describe("feedback capabilities from verified CMS users", () => {
  it("grants the approved feedback bundle only to Digital Experience Operator", () => {
      expect(
        feedbackCapabilitiesForUser({
          blocked: false,
          role: { name: "Digital Experience Operator" },
        }),
      ).toEqual(EXPECTED_CAPABILITIES);
  });

  it.each([
    ["missing user", undefined],
    ["missing role", { blocked: false, role: null }],
    ["unknown role", { blocked: false, role: { name: "Unknown" } }],
    ["public role", { blocked: false, role: { name: "Public" } }],
    ["authenticated role", { blocked: false, role: { name: "Authenticated" } }],
    ["administrator", { blocked: false, role: { name: "Administrator" } }],
    ["blocked administrator", { blocked: true, role: { name: "Administrator" } }],
    ["blocked operator", { blocked: true, role: { name: "Digital Experience Operator" } }],
  ])("denies %s", (_label, user) => {
    expect(feedbackCapabilitiesForUser(user)).toEqual([]);
  });

  it("contains exactly four app capabilities and no worker action", () => {
    expect(FEEDBACK_ADMIN_CAPABILITIES).toEqual(EXPECTED_CAPABILITIES);
    expect(FEEDBACK_ADMIN_CAPABILITIES.some((capability) => capability.includes("worker"))).toBe(false);
  });
});
