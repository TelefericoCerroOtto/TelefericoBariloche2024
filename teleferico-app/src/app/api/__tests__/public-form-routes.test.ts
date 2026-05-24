// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/google/gmail", () => ({
  ensureGmail: vi.fn(() => ({
    users: { messages: { send: vi.fn() } },
  })),
}));

vi.mock("@/lib/http/guards", async () => {
  const [
    { emitFormGuardEvent },
    {
      getFormProtectionPolicy,
      getFormRateLimitPolicy,
    },
    { handleHoneypot },
    { createConfiguredRateLimitStore },
    { sanitizeInput },
    { validateFormAge },
    { withFormGuards },
  ] =
    await Promise.all([
      import("@/lib/http/guards/form-guard-events"),
      import("@/lib/http/guards/form-protection-policy"),
      import("@/lib/http/guards/honeypot"),
      import("@/lib/http/guards/rate-limit"),
      import("@/lib/http/guards/sanitize"),
      import("@/lib/http/guards/form-age"),
      import("@/lib/http/guards/form-guards"),
    ]);

  return {
    createConfiguredRateLimitStore,
    emitFormGuardEvent,
    getFormProtectionPolicy,
    getFormRateLimitPolicy,
    handleHoneypot,
    sanitizeInput,
    validateFormAge,
    withFormGuards,
  };
});

vi.mock("@/lib/schemas", () => ({
  buildContactSchema: vi.fn(() => ({ validate: vi.fn(async (value) => value) })),
  buildPostulationSchema: vi.fn(() => ({ validate: vi.fn(async (value) => value) })),
}));

vi.mock("@/utils/promise-timeout", () => ({
  withTimeout: vi.fn(async (promise: Promise<unknown>) => promise),
}));

vi.mock("@/lib/adapters", () => ({
  createPostulationAdapter: vi.fn((value) => value),
  postulationFormDataAdapter: vi.fn(() => ({
    email: "test@example.com",
    resume: new File(["resume"], "resume.pdf", { type: "application/pdf" }),
    sector: "sector-id",
  })),
}));

vi.mock("@/lib/services", () => ({
  buildFormProtectionSignal: vi.fn(() => ({
    fingerprintHash: "fingerprint-hash",
    fingerprintVersion: "v1",
  })),
  createPostulation: vi.fn(),
  evaluateFormBusinessRules: vi.fn(async () => ({ ok: true, allowed: true })),
  getSectors: vi.fn(async () => ({
    ok: true,
    data: { data: [{ documentId: "sector-id" }] },
  })),
}));

vi.mock("@/lib/services/cv-storage", () => ({
  createCvStorage: vi.fn(() => ({
    save: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock("@/i18n", () => ({
  i18n: { defaultLocale: "en" },
}));

function createJsonRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): NextRequest {
  const serializedBody = JSON.stringify(body);

  return new NextRequest("https://telefericobariloche.com.ar/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(serializedBody, "utf8")),
      ...headers,
    },
    body: serializedBody,
  });
}

function createMultipartRequest(
  formData: FormData,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest("https://telefericobariloche.com.ar/api/postulation", {
    method: "POST",
    headers: {
      "content-length": "2048",
      ...headers,
    },
    body: formData,
  });
}

describe("public form route guard continuity", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...envBackup,
      INTERNAL_API_KEY: "test-internal-key",
      NEXT_PUBLIC_SITE_URL: "https://telefericobariloche.com.ar",
      CONTACT_RATE_LIMIT_ENABLED: "false",
      POSTULATION_RATE_LIMIT_ENABLED: "false",
      STRAPI_FORMS_TOKEN: "test-strapi-forms-token",
    };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("keeps contact internal-key and honeypot checks active when rate limiting is disabled", async () => {
    const { POST } = await import("../contact/route");

    const unauthorized = await POST(
      createJsonRequest(
        {
          name: "Test",
          email: "test@example.com",
          consultation: "Hello",
          honeypot: "",
          formLoadedAt: Date.now() - 10_000,
        },
        {
          origin: "https://telefericobariloche.com.ar",
        },
      ),
    );

    expect(unauthorized.status).toBe(401);

    const honeypotBlocked = await POST(
      createJsonRequest(
        {
          name: "Test",
          email: "test@example.com",
          consultation: "Hello",
          honeypot: "bot-value",
          formLoadedAt: Date.now() - 10_000,
        },
        {
          origin: "https://telefericobariloche.com.ar",
          "x-internal-api-key": "test-internal-key",
        },
      ),
    );

    expect(honeypotBlocked.status).toBe(200);
  });

  it("keeps postulation origin and form-age checks active when rate limiting is disabled", async () => {
    const { POST } = await import("../postulation/route");

    const invalidOriginFormData = new FormData();
    invalidOriginFormData.set("honeypot", "");
    invalidOriginFormData.set("formLoadedAt", String(Date.now() - 10_000));

    const forbidden = await POST(
      createMultipartRequest(invalidOriginFormData, {
        origin: "https://attacker.example",
        "x-internal-api-key": "test-internal-key",
      }),
    );

    expect(forbidden.status).toBe(403);

    const staleFormData = new FormData();
    staleFormData.set("honeypot", "");
    staleFormData.set("formLoadedAt", String(Date.now() - 16 * 60 * 1000));

    const invalidAge = await POST(
      createMultipartRequest(staleFormData, {
        origin: "https://telefericobariloche.com.ar",
        "x-internal-api-key": "test-internal-key",
      }),
    );

    expect(invalidAge.status).toBe(400);
  });

  it("fails closed when contact business rules are unavailable", async () => {
    const { evaluateFormBusinessRules } = await import("@/lib/services");
    vi.mocked(evaluateFormBusinessRules).mockResolvedValueOnce({
      ok: false,
      allowed: false,
      code: "FORM_PROTECTION_UNAVAILABLE",
      message: "Could not verify your message right now",
    });

    const { POST } = await import("../contact/route");
    const response = await POST(
      createJsonRequest(
        {
          name: "Test",
          email: "test@example.com",
          consultation: "Hello",
          honeypot: "",
          formLoadedAt: Date.now() - 10_000,
        },
        {
          origin: "https://telefericobariloche.com.ar",
          "x-internal-api-key": "test-internal-key",
        },
      ),
    );

    expect(response.status).toBe(503);
  });

  it("blocks duplicate postulations before CV persistence", async () => {
    const services = await import("@/lib/services");
    vi.mocked(services.evaluateFormBusinessRules).mockResolvedValueOnce({
      ok: true,
      allowed: false,
      code: "DUPLICATE_SUBMISSION",
      message: "A submission for this sector already exists",
    });

    const { createCvStorage } = await import("@/lib/services/cv-storage");
    const { POST } = await import("../postulation/route");
    const formData = new FormData();
    formData.set("honeypot", "");
    formData.set("formLoadedAt", String(Date.now() - 10_000));

    const response = await POST(
      createMultipartRequest(formData, {
        origin: "https://telefericobariloche.com.ar",
        "x-internal-api-key": "test-internal-key",
      }),
    );

    expect(response.status).toBe(409);
    expect(createCvStorage).not.toHaveBeenCalled();
  });
});
