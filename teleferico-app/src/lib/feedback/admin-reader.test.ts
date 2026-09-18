// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createFeedbackAdminReader,
  FeedbackAdminReaderError,
} from "./admin-reader";

function responseFor(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function malformedResponse(): Response {
  return new Response('{"contractVersion":', {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const filters = {
  route: "summary" as const,
  from: "2026-08-01",
  to: "2026-08-20",
};

const validEnvelope = {
  contractVersion: "feedback-admin.v1",
  data: { current: { submissionCount: 3 } },
  meta: {
    filters,
    population: { currentSubmissionCount: 3, previousSubmissionCount: 2 },
  },
};

const LARGE_VALID_PAYLOAD_SIZE = 32 * 1024;
const OVERSIZED_PAYLOAD_SIZE = 1024 * 1024;

describe("feedback administration CMS reader", () => {
  it.each([
    ["array data", { ...validEnvelope, data: [] }],
    [
      "missing filters",
      { ...validEnvelope, meta: { population: validEnvelope.meta.population } },
    ],
    [
      "negative population",
      {
        ...validEnvelope,
        meta: {
          ...validEnvelope.meta,
          population: {
            currentSubmissionCount: -1,
            previousSubmissionCount: 2,
          },
        },
      },
    ],
    [
      "fractional population",
      {
        ...validEnvelope,
        meta: {
          ...validEnvelope.meta,
          population: {
            currentSubmissionCount: 1.5,
            previousSubmissionCount: 2,
          },
        },
      },
    ],
    [
      "unsafe population",
      {
        ...validEnvelope,
        meta: {
          ...validEnvelope.meta,
          population: {
            currentSubmissionCount: Number.MAX_SAFE_INTEGER + 1,
            previousSubmissionCount: 2,
          },
        },
      },
    ],
  ] as const)(
    "rejects invalid feedback-admin.v1 shape: %s",
    async (_name, body) => {
      const reader = createFeedbackAdminReader({
        baseUrl: "https://cms.example.test",
        token: "synthetic-token",
        fetchImplementation: vi.fn(async () => responseFor(body)),
      });

      await expect(reader.read(filters)).rejects.toBeInstanceOf(
        FeedbackAdminReaderError,
      );
    },
  );

  it("returns a valid object data envelope with bounded population counts", async () => {
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async () => responseFor(validEnvelope)),
    });

    await expect(reader.read(filters)).resolves.toEqual(validEnvelope);
  });

  it("accepts a valid permitted envelope larger than 16 KiB", async () => {
    const largeEnvelope = {
      ...validEnvelope,
      data: { comments: [{ text: "x".repeat(LARGE_VALID_PAYLOAD_SIZE) }] },
    };
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async () => responseFor(largeEnvelope)),
    });

    await expect(reader.read(filters)).resolves.toEqual(largeEnvelope);
  });

  it("accepts a valid JSON response larger than 1 MiB", async () => {
    const oversizedEnvelope = {
      ...validEnvelope,
      data: { comments: [{ text: "x".repeat(OVERSIZED_PAYLOAD_SIZE) }] },
    };
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async () => responseFor(oversizedEnvelope)),
    });

    await expect(reader.read(filters)).resolves.toEqual(oversizedEnvelope);
  });

  it("rejects malformed JSON before envelope validation", async () => {
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async () => malformedResponse()),
    });

    await expect(reader.read(filters)).rejects.toBeInstanceOf(
      FeedbackAdminReaderError,
    );
  });

  it("passes an application deadline signal and maps aborts to upstream unavailability", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    let receivedSignal: AbortSignal | undefined;
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async (_input, init) => {
        receivedSignal = init?.signal;
        throw new DOMException("The operation was aborted", "AbortError");
      }),
    });

    await expect(reader.read(filters)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(timeoutSpy).toHaveBeenCalledWith(10_000);
    timeoutSpy.mockRestore();
  });
});
