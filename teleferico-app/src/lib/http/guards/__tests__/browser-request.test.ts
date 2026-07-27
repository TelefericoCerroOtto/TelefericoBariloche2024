import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ensureTrustedBrowserRequest } from "../browser-request";

/**
 * Tests for ensureTrustedBrowserRequest — the guard applied to admin POST
 * mutation routes (admin postulation favorite and bulk-status endpoints).
 *
 * These cover the "admin API POST routes reject untrusted browser/origin
 * inputs" requirement from the security review.
 */

const SITE_URL = "https://telefericobariloche.com.ar";

function buildRequest(
  headers: Record<string, string>,
  url = `${SITE_URL}/api/admin/postulations/abc123/favorite`,
): NextRequest {
  return new NextRequest(url, { method: "POST", headers });
}

describe("ensureTrustedBrowserRequest", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    process.env = {
      ...envBackup,
      NEXT_PUBLIC_SITE_URL: SITE_URL,
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  // ── Origin validation ──────────────────────────────────────────────────

  it("allows a request from the trusted origin with same-origin Sec-Fetch-Site", () => {
    const result = ensureTrustedBrowserRequest(
      buildRequest({
        origin: SITE_URL,
        "sec-fetch-site": "same-origin",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("allows a request from the trusted origin with same-site Sec-Fetch-Site", () => {
    const result = ensureTrustedBrowserRequest(
      buildRequest({
        origin: SITE_URL,
        "sec-fetch-site": "same-site",
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("allows a request from the trusted origin with no Sec-Fetch-Site header (e.g. curl / non-browser client that is still origin-valid)", () => {
    const result = ensureTrustedBrowserRequest(
      buildRequest({ origin: SITE_URL }),
    );
    expect(result.ok).toBe(true);
  });

  it("blocks a request from an attacker origin with 403", () => {
    const result = ensureTrustedBrowserRequest(
      buildRequest({
        origin: "https://attacker.example.com",
        "sec-fetch-site": "same-origin",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(403);
  });

  it("blocks a request with no origin header and no referer (cannot determine origin)", () => {
    // No origin, no referer, no x-forwarded-proto → extractOrigin returns null
    const result = ensureTrustedBrowserRequest(buildRequest({}));
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(403);
  });

  // ── Sec-Fetch-Site cross-origin block ─────────────────────────────────

  it("blocks a cross-origin Sec-Fetch-Site even from the right origin", () => {
    // An attacker-controlled page can embed an iframe and force a cross-origin
    // fetch to our API. Sec-Fetch-Site would then be 'cross-site'.
    const result = ensureTrustedBrowserRequest(
      buildRequest({
        origin: SITE_URL,
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(403);
  });

  it("blocks a none Sec-Fetch-Site (direct navigation / bookmark) even from the right origin", () => {
    // Sec-Fetch-Site: none means the request was user-initiated navigation, not
    // a fetch from a same-origin page — unexpected for a JSON POST endpoint.
    const result = ensureTrustedBrowserRequest(
      buildRequest({
        origin: SITE_URL,
        "sec-fetch-site": "none",
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(403);
  });
});
