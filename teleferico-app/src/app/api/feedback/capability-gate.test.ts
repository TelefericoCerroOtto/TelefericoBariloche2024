// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createFeedbackRuntime: vi.fn(() => ({})),
  createSurveyHandler: vi.fn(() => vi.fn(async () => Response.json({ ok: true }))),
  createSubmissionHandler: vi.fn(() => vi.fn(async () => Response.json({ ok: true }))),
  ensureTrustedBrowserRequest: vi.fn(),
  requireCsrfSession: vi.fn(),
  getFeedbackAdminReader: vi.fn(),
  getFeedbackAdminCommandTransport: vi.fn(),
  read: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feedback/runtime", () => ({
  createFeedbackRuntime: mocks.createFeedbackRuntime,
}));
vi.mock("@/lib/feedback/public-http", () => ({
  createSurveyHandler: mocks.createSurveyHandler,
  createSubmissionHandler: mocks.createSubmissionHandler,
}));
vi.mock("@/lib/http/guards", () => ({
  ensureTrustedBrowserRequest: mocks.ensureTrustedBrowserRequest,
  requireCsrfSession: mocks.requireCsrfSession,
}));
vi.mock("@/lib/feedback/admin-reader", () => ({
  FeedbackAdminReaderError: class FeedbackAdminReaderError extends Error {},
  getFeedbackAdminReader: mocks.getFeedbackAdminReader,
}));
vi.mock("@/lib/feedback/admin-command", () => ({
  FeedbackAdminCommandError: class FeedbackAdminCommandError extends Error {},
  getFeedbackAdminCommandTransport: mocks.getFeedbackAdminCommandTransport,
  parseGenerateCommand: vi.fn(),
  parseRetryCommand: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));

function request(path: string, method = "GET") {
  return new NextRequest(`https://example.test${path}`, { method });
}

describe("feedback capability route boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "false");
    vi.stubEnv("DEPLOYMENT_ENV", "");
    vi.stubEnv("APP_ENV", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns unavailable for public GET and POST before creating runtime dependencies", async () => {
    const { GET } = await import("./surveys/[publicCode]/route");
    const surveyResponse = await GET(
      request(`/api/feedback/surveys/${"A".repeat(32)}`),
      { params: Promise.resolve({ publicCode: "A".repeat(32) }) },
    );
    const { POST } = await import("./submissions/route");
    const submissionResponse = await POST(
      request("/api/feedback/submissions", "POST"),
    );

    expect(surveyResponse.status).toBe(503);
    expect(submissionResponse.status).toBe(503);
    expect(mocks.createFeedbackRuntime).not.toHaveBeenCalled();
    expect(mocks.createSurveyHandler).not.toHaveBeenCalled();
    expect(mocks.createSubmissionHandler).not.toHaveBeenCalled();
  });

  it("returns unavailable for every administrative read and command before auth or CMS access", async () => {
    const reads = [
      ["summary", () => import("../admin/feedback/summary/route")],
      ["aspects", () => import("../admin/feedback/aspects/route")],
      ["qr-points", () => import("../admin/feedback/qr-points/route")],
      ["comments", () => import("../admin/feedback/comments/route")],
      ["reports", () => import("../admin/feedback/reports/route")],
    ] as const;

    for (const [path, loadRoute] of reads) {
      const { GET } = await loadRoute();
      const response = await GET(
        request(`/api/admin/feedback/${path}?from=2026-01-01&to=2026-01-02`),
      );
      expect(response.status, path).toBe(503);
    }

    const { POST: generate } = await import("../admin/feedback/generations/route");
    const generateResponse = await generate(
      request("/api/admin/feedback/generations", "POST"),
    );
    const { POST: retry } = await import(
      "../admin/feedback/generations/[reportRunId]/retry/route"
    );
    const retryResponse = await retry(
      request("/api/admin/feedback/generations/run/retry", "POST"),
      { params: Promise.resolve({ reportRunId: "run" }) },
    );

    expect(generateResponse.status).toBe(503);
    expect(retryResponse.status).toBe(503);
    expect(mocks.ensureTrustedBrowserRequest).not.toHaveBeenCalled();
    expect(mocks.requireCsrfSession).not.toHaveBeenCalled();
    expect(mocks.getFeedbackAdminReader).not.toHaveBeenCalled();
    expect(mocks.getFeedbackAdminCommandTransport).not.toHaveBeenCalled();
  });

  it("returns generic not-found pages for both direct feedback pages", async () => {
    const { default: adminPage } = await import(
      "../../[locale]/(administration)/dashboard/(sections)/feedback/page"
    );
    expect(() => adminPage()).toThrow("NOT_FOUND");

    const { default: publicPage } = await import("../../qr/feedback/[publicCode]/page");
    await expect(
      publicPage({ params: Promise.resolve({ publicCode: "A".repeat(32) }) }),
    ).rejects.toThrow("NOT_FOUND");
    expect(mocks.notFound).toHaveBeenCalledTimes(2);
  });

  it.each(["production", "staging"])(
    "allows the explicit server flag in %s regardless of runtime labels",
    async (environment) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DEPLOYMENT_ENV", environment);
      vi.stubEnv("APP_ENV", "production");
      vi.stubEnv("VERCEL_ENV", "production");
      vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");
      const { GET } = await import("./surveys/[publicCode]/route");

      const response = await GET(
        request(`/api/feedback/surveys/${"A".repeat(32)}`),
        { params: Promise.resolve({ publicCode: "A".repeat(32) }) },
      );

      expect(response.status).toBe(200);
      expect(mocks.createFeedbackRuntime).toHaveBeenCalledOnce();
    },
  );

  it.each([undefined, "false", "TRUE", "1", " true"])(
    "keeps the public API closed when the flag is %s",
    async (value) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("DEPLOYMENT_ENV", "staging");
      if (value === undefined) delete process.env.FEEDBACK_CAPABILITY_ENABLED;
      else vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", value);
      const { GET } = await import("./surveys/[publicCode]/route");

      const response = await GET(
        request(`/api/feedback/surveys/${"A".repeat(32)}`),
        { params: Promise.resolve({ publicCode: "A".repeat(32) }) },
      );

      expect(response.status).toBe(503);
      expect(mocks.createFeedbackRuntime).not.toHaveBeenCalled();
    },
  );

  it("keeps the environment switch server-only", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("../../../lib/feedback/capability-gate.ts", import.meta.url), "utf8"),
    );

    expect(source).toMatch(/^import "server-only";/);
    expect(source).not.toMatch(/NEXT_PUBLIC_[A-Z0-9_]*FEEDBACK/);
  });

  it("does not access runtime dependencies when the flag is absent", async () => {
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "");
    const { GET } = await import("./surveys/[publicCode]/route");

    const response = await GET(
      request(`/api/feedback/surveys/${"A".repeat(32)}`),
      { params: Promise.resolve({ publicCode: "A".repeat(32) }) },
    );

    expect(response.status).toBe(503);
    expect(mocks.createFeedbackRuntime).not.toHaveBeenCalled();
  });

  it("allows a fixture server process to opt in when the flag is exactly true", async () => {
    vi.stubEnv("FEEDBACK_CAPABILITY_ENABLED", "true");
    const { GET } = await import("./surveys/[publicCode]/route");

    const response = await GET(
      request(`/api/feedback/surveys/${"A".repeat(32)}`),
      { params: Promise.resolve({ publicCode: "A".repeat(32) }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.createFeedbackRuntime).toHaveBeenCalledOnce();
    expect(mocks.createSurveyHandler).toHaveBeenCalledOnce();
  });
});
