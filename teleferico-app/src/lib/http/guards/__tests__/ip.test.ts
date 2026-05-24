import { describe, expect, it } from "vitest";

import { getClientIpFromHeaders, resolveClientIpFromHeaders } from "../ip";

describe("resolveClientIpFromHeaders", () => {
  it("prefers x-client-ip for trusted internal calls", () => {
    const headers = new Headers({
      "x-client-ip": "::ffff:203.0.113.9",
      "x-forwarded-for": "198.51.100.5, 203.0.113.7",
    });

    expect(resolveClientIpFromHeaders(headers, true)).toEqual({
      clientIp: "203.0.113.9",
      source: "x-client-ip",
    });
  });

  it("falls back to the last trusted x-forwarded-for IP", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.5, ::ffff:203.0.113.7",
    });

    expect(resolveClientIpFromHeaders(headers)).toEqual({
      clientIp: "203.0.113.7",
      source: "x-forwarded-for",
    });
  });

  it("uses x-real-ip when forwarded headers are unavailable", () => {
    const headers = new Headers({
      "x-real-ip": "::ffff:203.0.113.21",
    });

    expect(resolveClientIpFromHeaders(headers)).toEqual({
      clientIp: "203.0.113.21",
      source: "x-real-ip",
    });
  });

  it("returns missing metadata when no trusted IP source exists", () => {
    const headers = new Headers();

    expect(resolveClientIpFromHeaders(headers)).toEqual({
      clientIp: null,
      source: "missing",
    });
    expect(getClientIpFromHeaders(headers)).toBe("unknown");
  });
});
