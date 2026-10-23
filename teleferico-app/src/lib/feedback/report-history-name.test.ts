// @vitest-environment node
import { describe, expect, it } from "vitest";
import { reportHistoryName } from "./report-history-name";

describe("report history name", () => {
  it("uses the custom display name or the report creation instant, not the generation instant", () => {
    const row = { displayName: null, createdAt: "2026-08-01T00:00:00.000Z", report: { createdAt: "2026-08-06T15:04:05.000Z" } };
    expect(reportHistoryName({ ...row, displayName: "Summit report" })).toBe("Summit report");
    expect(reportHistoryName(row)).toBe("Informe - 06/08/2026 12:04");
    expect(reportHistoryName({ ...row, report: null })).toBe("Informe - 31/07/2026 21:00");
    expect(reportHistoryName({ ...row, report: null, createdAt: "invalid" })).toBe("Informe");
  });
});
