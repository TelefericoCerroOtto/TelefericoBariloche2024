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
  it.each(["Administrator", "Digital Experience Operator"])(
    "grants the approved feedback bundle to %s",
    (roleName) => {
      expect(
        feedbackCapabilitiesForUser({
          blocked: false,
          role: { name: roleName },
        }),
      ).toEqual(EXPECTED_CAPABILITIES);
    },
  );

  it.each([
    ["missing user", undefined],
    ["missing role", { blocked: false, role: null }],
    ["unknown role", { blocked: false, role: { name: "Unknown" } }],
    ["public role", { blocked: false, role: { name: "Public" } }],
    ["authenticated role", { blocked: false, role: { name: "Authenticated" } }],
    ["media manager role", { blocked: false, role: { name: "Media Manager" } }],
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
