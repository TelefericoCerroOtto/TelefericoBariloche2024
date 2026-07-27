import { describe, expect, it } from "vitest";
import { shouldSkipMiddleware } from "../middleware-matcher";

/**
 * Unit tests for the pure shouldSkipMiddleware() helper.
 *
 * These tests cover the exact blocker scenarios identified in the security and
 * reliability reviews:
 *
 *   Security: dotted admin paths like /es-AR/dashboard/news/foo.js must NOT be
 *   skipped — they need full middleware processing (maintenance, locale
 *   normalization, auth gating).
 *
 *   Reliability: root metadata files /robots.txt and /sitemap.xml must be
 *   skipped so they are never intercepted by locale redirect logic.
 */
describe("shouldSkipMiddleware", () => {
  // ── Root metadata files (reliability) ────────────────────────────────────

  describe("root metadata paths", () => {
    it("skips /robots.txt", () => {
      expect(shouldSkipMiddleware("/robots.txt")).toBe(true);
    });

    it("skips /sitemap.xml", () => {
      expect(shouldSkipMiddleware("/sitemap.xml")).toBe(true);
    });

    // Locale-prefixed versions are NOT the real metadata routes and should
    // pass through so middleware can redirect them to the correct path.
    it("does not skip /es-AR/robots.txt (locale-prefixed, not a root metadata route)", () => {
      expect(shouldSkipMiddleware("/es-AR/robots.txt")).toBe(false);
    });
  });

  // ── Next.js internals ────────────────────────────────────────────────────

  describe("Next.js internals", () => {
    it("skips _next/static assets", () => {
      expect(shouldSkipMiddleware("/_next/static/chunks/main.js")).toBe(true);
    });

    it("skips _next/image", () => {
      expect(shouldSkipMiddleware("/_next/image?url=...")).toBe(true);
    });
  });

  // ── Real static assets (non-admin) ───────────────────────────────────────

  describe("non-admin static asset paths", () => {
    it("skips a root .js file", () => {
      expect(shouldSkipMiddleware("/static/bundle.js")).toBe(true);
    });

    it("skips a root .css file", () => {
      expect(shouldSkipMiddleware("/styles/main.css")).toBe(true);
    });

    it("skips a .png image", () => {
      expect(shouldSkipMiddleware("/images/logo.png")).toBe(true);
    });

    it("skips a .svg file", () => {
      expect(shouldSkipMiddleware("/icons/arrow.svg")).toBe(true);
    });

    it("skips a .woff2 font", () => {
      expect(shouldSkipMiddleware("/fonts/inter.woff2")).toBe(true);
    });
  });

  // ── Admin/dashboard paths with dotted segments (security) ─────────────────

  describe("admin paths with dotted dynamic segments", () => {
    it("does NOT skip /es-AR/dashboard/news/foo.js", () => {
      expect(shouldSkipMiddleware("/es-AR/dashboard/news/foo.js")).toBe(false);
    });

    it("does NOT skip /es-AR/dashboard/news/foo.bar", () => {
      expect(shouldSkipMiddleware("/es-AR/dashboard/news/foo.bar")).toBe(false);
    });

    it("does NOT skip /es-AR/dashboard/news/foo.css", () => {
      expect(shouldSkipMiddleware("/es-AR/dashboard/news/foo.css")).toBe(false);
    });

    it("does NOT skip /dashboard (no locale)", () => {
      expect(shouldSkipMiddleware("/dashboard")).toBe(false);
    });

    it("does NOT skip /es-AR/dashboard", () => {
      expect(shouldSkipMiddleware("/es-AR/dashboard")).toBe(false);
    });

    it("does NOT skip /es-AR/dashboard/recruitment", () => {
      expect(shouldSkipMiddleware("/es-AR/dashboard/recruitment")).toBe(false);
    });

    it("does NOT skip /en/dashboard/prices/access-ticket", () => {
      expect(shouldSkipMiddleware("/en/dashboard/prices/access-ticket")).toBe(false);
    });
  });

  // ── Login and logout paths ────────────────────────────────────────────────

  describe("admin auth paths (login/logout)", () => {
    it("does NOT skip /login", () => {
      expect(shouldSkipMiddleware("/login")).toBe(false);
    });

    it("does NOT skip /es-AR/login", () => {
      expect(shouldSkipMiddleware("/es-AR/login")).toBe(false);
    });

    it("does NOT skip /logout", () => {
      expect(shouldSkipMiddleware("/logout")).toBe(false);
    });

    it("does NOT skip /es-AR/logout", () => {
      expect(shouldSkipMiddleware("/es-AR/logout")).toBe(false);
    });
  });

  // ── Regular public paths ──────────────────────────────────────────────────

  describe("public locale paths", () => {
    it("does NOT skip /es-AR/news", () => {
      expect(shouldSkipMiddleware("/es-AR/news")).toBe(false);
    });

    it("does NOT skip / (root)", () => {
      expect(shouldSkipMiddleware("/")).toBe(false);
    });

    it("does NOT skip /en/activities", () => {
      expect(shouldSkipMiddleware("/en/activities")).toBe(false);
    });
  });
});
