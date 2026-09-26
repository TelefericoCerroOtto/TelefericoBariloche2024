// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createPrivateFeedbackAdminReadTransport,
  FEEDBACK_ADMIN_READ_ACTION,
} from "./private-admin-read-transport";

const query = {
  resource: "submissions" as const,
  acceptedAtGte: "2026-08-01T03:00:00.000Z",
  acceptedAtLte: "2026-08-21T02:59:59.999Z",
  dataCutoffAt: "2026-08-21T12:00:00.000Z",
  cursor: null,
};

function response(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("private feedback administration transport", () => {
  it("sends one exact scoped token to the allowlisted fixed route", async () => {
    const fetchImplementation = vi.fn(async () => response({
      contractVersion: "feedback-admin-source.v1",
      resource: query.resource,
      cursor: null,
      nextCursor: null,
      total: 0,
      items: [],
    }));
    const tokenProvider = vi.fn(async () => ({
      action: FEEDBACK_ADMIN_READ_ACTION,
      value: "synthetic-action-token",
    }));
    const transport = createPrivateFeedbackAdminReadTransport({
      baseUrl: "https://cms.example.com",
      allowedOrigins: ["https://cms.example.com"],
      tokenProvider,
      fetchImplementation,
    });

    await expect(transport.readPage(query)).resolves.toMatchObject({
      resource: "submissions",
      total: 0,
      items: [],
    });
    expect(tokenProvider).toHaveBeenCalledWith(
      FEEDBACK_ADMIN_READ_ACTION,
      expect.any(AbortSignal),
    );
    expect(fetchImplementation).toHaveBeenCalledWith(
      new URL("https://cms.example.com/api/tb113/admin/feedback/read"),
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: expect.objectContaining({
          authorization: "Bearer synthetic-action-token",
        }),
      }),
    );
  });

  it("rejects an unapproved origin before asking for a token", async () => {
    const tokenProvider = vi.fn(async () => ({
      action: FEEDBACK_ADMIN_READ_ACTION,
      value: "synthetic-action-token",
    }));
    expect(() => createPrivateFeedbackAdminReadTransport({
      baseUrl: "https://cms.example.com",
      allowedOrigins: [],
      tokenProvider,
      fetchImplementation: vi.fn(),
    })).toThrow("Private feedback administration source is unavailable");
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it("rejects action substitution and malformed page envelopes", async () => {
    const wrongAction = createPrivateFeedbackAdminReadTransport({
      baseUrl: "https://cms.example.com",
      allowedOrigins: ["https://cms.example.com"],
      tokenProvider: async () => ({ action: "workerSourceRead", value: "token" }),
      fetchImplementation: vi.fn(),
    });
    await expect(wrongAction.readPage(query)).rejects.toMatchObject({
      code: "INVALID_CONFIGURATION",
    });

    const malformed = createPrivateFeedbackAdminReadTransport({
      baseUrl: "https://cms.example.com",
      allowedOrigins: ["https://cms.example.com"],
      tokenProvider: async () => ({ action: FEEDBACK_ADMIN_READ_ACTION, value: "token" }),
      fetchImplementation: vi.fn(async () => response({
        contractVersion: "feedback-admin-source.v1",
        resource: "reports",
        cursor: null,
        nextCursor: null,
        total: 0,
        items: [],
      })),
    });
    await expect(malformed.readPage(query)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});
