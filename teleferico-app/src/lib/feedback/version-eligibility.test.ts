import { describe, expect, it } from "vitest";
import { evaluateVersionEligibility } from "./version-eligibility";

const nowEpochSeconds = 1_800_000_000;
const currentVersionKey = "visitor-2026-10";
const supersededVersionKey = "visitor-2026-09";

function lifecycle(overrides: Record<string, unknown> = {}) {
  return {
    sessionVersionKey: currentVersionKey,
    activeVersionKey: currentVersionKey,
    nowEpochSeconds,
    versions: [
      {
        versionKey: currentVersionKey,
        status: "published",
        lastSupersededAtEpochSeconds: null,
      },
      {
        versionKey: supersededVersionKey,
        status: "published",
        lastSupersededAtEpochSeconds: nowEpochSeconds - 1_000,
      },
    ],
    ...overrides,
  };
}

describe("survey version submission eligibility", () => {
  it("accepts the current published version", () => {
    expect(evaluateVersionEligibility(lifecycle())).toEqual({
      ok: true,
      value: { disposition: "current" },
    });
  });

  it("fails closed when the current version has a future supersession timestamp", () => {
    expect(
      evaluateVersionEligibility(
        lifecycle({
          versions: [
            {
              ...lifecycle().versions[0],
              lastSupersededAtEpochSeconds: nowEpochSeconds + 1,
            },
            lifecycle().versions[1],
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      error: { status: 410, code: "SURVEY_UNAVAILABLE" },
    });
  });

  it("accepts a published superseded version through exactly 1,800 elapsed seconds", () => {
    expect(
      evaluateVersionEligibility(
        lifecycle({
          sessionVersionKey: supersededVersionKey,
          versions: [
            lifecycle().versions[0],
            {
              ...lifecycle().versions[1],
              lastSupersededAtEpochSeconds: nowEpochSeconds - 1_800,
            },
          ],
        }),
      ),
    ).toEqual({
      ok: true,
      value: { disposition: "superseded-grace" },
    });
  });

  it("expires an otherwise valid superseded version after 1,800 elapsed seconds", () => {
    expect(
      evaluateVersionEligibility(
        lifecycle({
          sessionVersionKey: supersededVersionKey,
          versions: [
            lifecycle().versions[0],
            {
              ...lifecycle().versions[1],
              lastSupersededAtEpochSeconds: nowEpochSeconds - 1_801,
            },
          ],
        }),
      ),
    ).toEqual({
      ok: false,
      error: { status: 410, code: "SESSION_EXPIRED" },
    });
  });

  it.each([
    ["missing active pointer", { activeVersionKey: null }],
    ["unknown active version", { activeVersionKey: "visitor-missing" }],
    [
      "draft active version",
      { versions: [{ ...lifecycle().versions[0], status: "draft" }] },
    ],
    ["unknown session version", { sessionVersionKey: "visitor-missing" }],
    [
      "draft session version",
      {
        sessionVersionKey: supersededVersionKey,
        versions: [
          lifecycle().versions[0],
          { ...lifecycle().versions[1], status: "draft" },
        ],
      },
    ],
  ])("reports unavailable context for %s", (_case, overrides) => {
    expect(evaluateVersionEligibility(lifecycle(overrides))).toEqual({
      ok: false,
      error: { status: 410, code: "SURVEY_UNAVAILABLE" },
    });
  });

  it.each([
    ["fractional clock", { nowEpochSeconds: nowEpochSeconds + 0.5 }],
    ["string clock", { nowEpochSeconds: `${nowEpochSeconds}` }],
    ["future supersession", { lastSupersededAtEpochSeconds: nowEpochSeconds + 1 }],
    ["fractional supersession", { lastSupersededAtEpochSeconds: nowEpochSeconds - 0.5 }],
    ["unknown lifecycle", { status: "retired" }],
  ])("fails closed for %s", (_case, malformed) => {
    const changes = "nowEpochSeconds" in malformed
      ? malformed
      : {
          sessionVersionKey: supersededVersionKey,
          versions: [
            lifecycle().versions[0],
            { ...lifecycle().versions[1], ...malformed },
          ],
        };

    expect(evaluateVersionEligibility(lifecycle(changes))).toEqual({
      ok: false,
      error: { status: 410, code: "SURVEY_UNAVAILABLE" },
    });
  });

  it("fails closed for duplicate version identities", () => {
    expect(
      evaluateVersionEligibility(
        lifecycle({
          versions: [lifecycle().versions[0], lifecycle().versions[0]],
        }),
      ),
    ).toEqual({
      ok: false,
      error: { status: 410, code: "SURVEY_UNAVAILABLE" },
    });
  });
});
