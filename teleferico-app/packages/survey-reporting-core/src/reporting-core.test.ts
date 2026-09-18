import { describe, expect, it } from "vitest";

import { canonicalizeJson } from "./canonical-json";
import {
  ADMIN_CONTRACT_VERSION,
  ADMIN_ROUTE_FILTER_KEYS,
  ADMIN_ROUTE_SCOPES,
  SNAPSHOT_CONTRACT_VERSION,
} from "./contracts";
import { buildCalendarBuckets, normalizePeriod } from "./periods";

describe("reporting contracts", () => {
  it("publishes the exact contract identities and route scopes", () => {
    expect(ADMIN_CONTRACT_VERSION).toBe("feedback-admin.v1");
    expect(SNAPSHOT_CONTRACT_VERSION).toBe("survey-snapshot.v1");
    expect(ADMIN_ROUTE_SCOPES).toEqual([
      "summary",
      "aspects",
      "qr-comparison",
      "qr-detail",
      "comments",
      "reports",
      "generations",
    ]);
    expect(ADMIN_ROUTE_FILTER_KEYS.comments).toEqual([
      "from",
      "to",
      "aspectKey",
      "ratings",
      "pointKey",
      "locale",
      "text",
    ]);
    expect(ADMIN_ROUTE_FILTER_KEYS.reports).toEqual(["from", "to"]);
  });
});

describe("tb-json.v1 canonicalization", () => {
  it("sorts object keys by Unicode code point and preserves array order", () => {
    expect(canonicalizeJson({ "\uE000": 2, "😀": 1, nested: [3, null, true] })).toBe(
      '{"nested":[3,null,true],"":2,"😀":1}',
    );
  });

  it.each([
    ["floating point", { value: 1.5 }],
    ["unsafe integer", { value: Number.MAX_SAFE_INTEGER + 1 }],
    ["undefined", { value: undefined }],
    ["BigInt", { value: BigInt(1) }],
    ["unpaired surrogate", { value: "\uD800" }],
  ])("rejects %s values", (_name, value) => {
    expect(() => canonicalizeJson(value)).toThrow(TypeError);
  });
});

describe("Buenos Aires calendar periods", () => {
  it("derives the equal-duration previous range and inclusive UTC boundaries", () => {
    expect(normalizePeriod({ from: "2026-08-11", to: "2026-08-20" })).toEqual({
      timeZone: "America/Argentina/Buenos_Aires",
      current: {
        from: "2026-08-11",
        to: "2026-08-20",
        utcStart: "2026-08-11T03:00:00.000Z",
        utcEnd: "2026-08-21T02:59:59.999Z",
      },
      previous: {
        from: "2026-08-01",
        to: "2026-08-10",
        utcStart: "2026-08-01T03:00:00.000Z",
        utcEnd: "2026-08-11T02:59:59.999Z",
      },
    });
  });

  it("emits one clipped bucket per local calendar day", () => {
    expect(buildCalendarBuckets({ from: "2026-08-11", to: "2026-08-12" }, "day")).toEqual([
      { from: "2026-08-11", to: "2026-08-11" },
      { from: "2026-08-12", to: "2026-08-12" },
    ]);
  });

  it("clips Monday-Sunday weeks to the analyzed range", () => {
    expect(buildCalendarBuckets({ from: "2026-08-11", to: "2026-08-20" }, "week")).toEqual([
      { from: "2026-08-11", to: "2026-08-16" },
      { from: "2026-08-17", to: "2026-08-20" },
    ]);
  });

  it("uses calendar months rather than range-relative chunks", () => {
    expect(buildCalendarBuckets({ from: "2026-01-30", to: "2026-03-02" }, "month")).toEqual([
      { from: "2026-01-30", to: "2026-01-31" },
      { from: "2026-02-01", to: "2026-02-28" },
      { from: "2026-03-01", to: "2026-03-02" },
    ]);
  });
});
