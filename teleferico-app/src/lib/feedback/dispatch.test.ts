import { describe, expect, it } from "vitest";

import { createFeedbackTaskName } from "./dispatch";

describe("feedback report task identity", () => {
  it("creates the stable queue name for a valid report run UUID", () => {
    expect(
      createFeedbackTaskName("00000000-0000-4000-8000-000000000001"),
    ).toBe("tb113-report-00000000000040008000000000000001");
  });

  it.each([
    "",
    "not-a-uuid",
    "00000000-0000-0000-8000-000000000001",
    "00000000-0000-4000-7000-000000000001",
    "00000000-0000-4000-8000-00000000000A",
  ])("rejects malformed report run identifiers: %s", (reportRunId) => {
    expect(createFeedbackTaskName(reportRunId)).toBeNull();
  });
});
