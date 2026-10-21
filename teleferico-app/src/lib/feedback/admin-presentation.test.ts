// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createFeedbackAdminPresentationTransport,
  parsePresentationCommand,
} from "./admin-presentation";

const reportRunId = "00000000-0000-4000-8000-000000000117";
const baseUrl = "https://cms.example.com";

describe("report history presentation command", () => {
  it("accepts a bounded rename or explicit hide and rejects all other input", () => {
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "rename", displayName: "  Importante  " }))
      .toEqual({ action: "rename", displayName: "Importante" });
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "hide" }))
      .toEqual({ action: "hide" });
    expect(parsePresentationCommand("invalid", { contractVersion: "feedback-admin.v1", action: "hide" })).toBeNull();
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "hide", displayName: "Extra" })).toBeNull();
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "rename", displayName: "X".repeat(81) })).toBeNull();
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "rename", displayName: "\u200B" })).toBeNull();
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "rename", displayName: "\u2800" })).toBeNull();
    expect(parsePresentationCommand(reportRunId, { contractVersion: "feedback-admin.v1", action: "rename", displayName: "\u3164" })).toBeNull();
  });

  it("uses only the session JWT and rejects untrusted responses", async () => {
    const fetchImplementation = vi.fn(async () => Response.json({
      contractVersion: "feedback-admin.v1", reportRunId, displayName: "Importante", historyHidden: false,
    }));
    const transport = createFeedbackAdminPresentationTransport({
      baseUrl, allowedOrigins: [baseUrl], token: "operator-session-jwt", fetchImplementation,
    });
    await expect(transport.update(reportRunId, { action: "rename", displayName: "Importante" }))
      .resolves.toMatchObject({ displayName: "Importante" });
    expect(fetchImplementation).toHaveBeenCalledWith(
      `${baseUrl}/api/tb113/admin/generations/${reportRunId}/presentation`,
      expect.objectContaining({
        method: "POST",
        redirect: "error",
        headers: expect.objectContaining({ authorization: "Bearer operator-session-jwt" }),
      }),
    );

    fetchImplementation.mockImplementationOnce(async () => Response.json({
      contractVersion: "feedback-admin.v1", reportRunId: "other-run", displayName: "Importante", historyHidden: false,
    }));
    await expect(transport.update(reportRunId, { action: "rename", displayName: "Importante" }))
      .rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });
});
