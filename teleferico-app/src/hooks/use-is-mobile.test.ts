import { describe, expect, it } from "vitest";

import { isMobileViewport, MOBILE_BREAKPOINT } from "./use-is-mobile";

describe("administration mobile breakpoint", () => {
  it.each([
    [767, true],
    [768, true],
    [819, true],
    [820, false],
  ])("classifies %ipx as mobile=%s", (width, expected) => {
    expect(isMobileViewport(width)).toBe(expected);
  });

  it("matches the repository Tailwind md boundary", () => {
    expect(MOBILE_BREAKPOINT).toBe(820);
  });
});
