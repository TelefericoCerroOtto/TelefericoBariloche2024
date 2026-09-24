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

type NativeBodies = {
  submissions: unknown;
  points: unknown;
  versions: unknown;
  reports: unknown;
};

const nativeBodies: NativeBodies = {
  submissions: { data: [] },
  points: { data: [] },
  versions: { data: [] },
  reports: { data: [] },
};

function nativeResponseFor(
  input: string,
  body: NativeBodies = nativeBodies,
): unknown {
  const path = new URL(input).pathname;
  if (path.endsWith("survey-submissions")) return body.submissions;
  if (path.endsWith("survey-qr-points")) return body.points;
  if (path.endsWith("survey-versions")) return body.versions;
  return body.reports;
}

const filters = {
  route: "summary" as const,
  from: "2026-08-01",
  to: "2026-08-20",
};

describe("feedback administration CMS reader", () => {
  it("rejects malformed native collection responses", async () => {
    const body = { ...nativeBodies, submissions: { malformed: true } };
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async (input) =>
        responseFor(nativeResponseFor(String(input), body)),
      ),
    });

    await expect(reader.read(filters)).rejects.toBeInstanceOf(
      FeedbackAdminReaderError,
    );
  });

  it("builds a bounded native snapshot envelope", async () => {
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async (input) =>
        responseFor(nativeResponseFor(String(input))),
      ),
    });

    await expect(reader.read(filters)).resolves.toMatchObject({
      contractVersion: "feedback-admin.v1",
      data: { snapshot: { contractVersion: "survey-snapshot.v1" } },
      meta: { filters },
    });
  });

  it("maps malformed JSON before native snapshot construction", async () => {
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(async (input) =>
        new URL(String(input)).pathname.endsWith("survey-submissions")
          ? new Response('{"malformed":', { status: 200 })
          : responseFor(nativeResponseFor(String(input))),
      ),
    });

    await expect(reader.read(filters)).rejects.toBeInstanceOf(
      FeedbackAdminReaderError,
    );
  });

  it("rejects non-JSON native responses", async () => {
    const reader = createFeedbackAdminReader({
      baseUrl: "https://cms.example.test",
      token: "synthetic-token",
      fetchImplementation: vi.fn(
        async () => new Response("not-json", { status: 200 }),
      ),
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
