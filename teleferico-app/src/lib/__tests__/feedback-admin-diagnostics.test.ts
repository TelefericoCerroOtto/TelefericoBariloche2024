import { describe, expect, it } from "vitest";
import { createFeedbackAdminDiagnostics } from "../../../tests/e2e/feedback-admin-diagnostics";

describe("feedback admin failure diagnostics", () => {
  it("keeps only allowlisted method, pathname, status, and bounded failure category", () => {
    const diagnostics = createFeedbackAdminDiagnostics();
    diagnostics.request(
      "GET",
      "https://example.invalid/api/admin/feedback/aspects?text=private&token=secret",
    );
    diagnostics.response(
      "GET",
      "https://example.invalid/api/admin/feedback/aspects?text=private&token=secret",
      503,
    );
    diagnostics.requestFailed(
      "GET",
      "https://example.invalid/api/admin/feedback/summary?csrf=secret",
      "net::ERR_CONNECTION_RESET https://private.invalid/?token=secret",
    );
    diagnostics.request(
      "POST",
      "https://example.invalid/api/auth/callback/credentials?password=secret",
    );
    diagnostics.navigation(
      "https://example.invalid/es-AR/dashboard/feedback?session=secret",
    );
    diagnostics.request("GET", "https://example.invalid/api/private?token=secret");

    const output = diagnostics.format();
    expect(output).toContain('"path":"/api/admin/feedback/aspects"');
    expect(output).toContain('"status":503');
    expect(output).toContain('"category":"connection_reset"');
    expect(output).toContain('"path":"/api/auth/callback/credentials"');
    expect(output).toContain('"event":"navigation"');
    expect(output).not.toContain("example.invalid");
    expect(output).not.toContain("private.invalid");
    expect(output).not.toContain("token");
    expect(output).not.toContain("password");
    expect(output).not.toContain("text=private");
    expect(output).not.toContain("api/private");
  });

  it("caps record count and serialized output deterministically", () => {
    const diagnostics = createFeedbackAdminDiagnostics();
    for (let index = 0; index < 40; index += 1) {
      diagnostics.request("GET", "https://example.invalid/api/admin/feedback/summary");
    }

    const output = diagnostics.format();
    expect(JSON.parse(output).records).toHaveLength(24);
    expect(JSON.parse(output).truncated).toBe(true);
    expect(output.length).toBeLessThanOrEqual(3_072);
  });

  it("bounds oversized serialized data while preserving the truncation marker", () => {
    const diagnostics = createFeedbackAdminDiagnostics();
    for (let index = 0; index < 24; index += 1) {
      diagnostics.response(
        "GET",
        "https://example.invalid/api/admin/feedback/summary",
        599,
      );
    }
    for (let index = 0; index < 24; index += 1) {
      diagnostics.requestFailed(
        "GET",
        "https://example.invalid/api/admin/feedback/summary",
        "x".repeat(10_000),
      );
    }

    const output = diagnostics.format();
    expect(output.length).toBeLessThanOrEqual(3_072);
    expect(JSON.parse(output).truncated).toBe(true);
  });
});
