// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const strapiFetchMock = vi.fn();

vi.mock("@/lib/http/clients/strapi-fetch", () => ({
  strapiFetch: strapiFetchMock,
}));

describe("evaluateFormBusinessRules", () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...envBackup,
      STRAPI_FORMS_TOKEN: "forms-token",
      CONTACT_EMAIL_LIMIT_MAX: "5",
      CONTACT_EMAIL_LIMIT_WINDOW_MS: String(24 * 60 * 60 * 1000),
      POSTULATION_EMAIL_LIMIT_MAX: "2",
      POSTULATION_EMAIL_LIMIT_WINDOW_MS: String(30 * 24 * 60 * 60 * 1000),
    };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("blocks contact email limit after five submissions in 24 hours", async () => {
    strapiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          data: Array.from({ length: 5 }, (_, index) => ({
            id: index + 1,
            documentId: `doc-${index + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            locale: null,
            form: "contact",
            normalizedEmailHash: "hash",
            sectorDocumentId: null,
            positionKey: null,
            decision: "allowed",
            duplicateMarker: false,
            reviewStatus: "clean",
            banned: false,
            notes: null,
            threshold: 5,
            windowMs: 24 * 60 * 60 * 1000,
            submittedAt: new Date().toISOString(),
            metadata: null,
            fingerprint: null,
            signal: null,
          })),
          meta: { pagination: { page: 1, pageCount: 1, pageSize: 10, total: 5 } },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          data: {
            id: 10,
            documentId: "doc-10",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            locale: null,
            form: "contact",
            normalizedEmailHash: "hash",
            sectorDocumentId: null,
            positionKey: null,
            decision: "blocked_email_limit",
            duplicateMarker: false,
            reviewStatus: "clean",
            banned: false,
            notes: null,
            threshold: 5,
            windowMs: 24 * 60 * 60 * 1000,
            submittedAt: new Date().toISOString(),
            metadata: null,
            fingerprint: null,
            signal: null,
          },
          meta: { pagination: { page: 1, pageCount: 1, pageSize: 1, total: 1 } },
        },
      });

    const { buildFormProtectionSignal, evaluateFormBusinessRules } = await import(
      "../form-protection"
    );
    const result = await evaluateFormBusinessRules({
      email: "test@example.com",
      form: "contact",
      signal: buildFormProtectionSignal({
        email: "test@example.com",
        form: "contact",
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("blocks postulation email limit after two submissions in 30 days", async () => {
    strapiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          data: Array.from({ length: 2 }, (_, index) => ({
            id: index + 1,
            documentId: `doc-${index + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            locale: null,
            form: "postulation",
            normalizedEmailHash: "hash",
            sectorDocumentId: `sector-${index + 1}`,
            positionKey: null,
            decision: "allowed",
            duplicateMarker: false,
            reviewStatus: "clean",
            banned: false,
            notes: null,
            threshold: 2,
            windowMs: 30 * 24 * 60 * 60 * 1000,
            submittedAt: new Date().toISOString(),
            metadata: null,
            fingerprint: null,
            signal: null,
          })),
          meta: { pagination: { page: 1, pageCount: 1, pageSize: 10, total: 2 } },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          data: {
            id: 10,
            documentId: "doc-10",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            locale: null,
            form: "postulation",
            normalizedEmailHash: "hash",
            sectorDocumentId: "sector-3",
            positionKey: null,
            decision: "blocked_email_limit",
            duplicateMarker: false,
            reviewStatus: "clean",
            banned: false,
            notes: null,
            threshold: 2,
            windowMs: 30 * 24 * 60 * 60 * 1000,
            submittedAt: new Date().toISOString(),
            metadata: null,
            fingerprint: null,
            signal: null,
          },
          meta: { pagination: { page: 1, pageCount: 1, pageSize: 1, total: 1 } },
        },
      });

    const { buildFormProtectionSignal, evaluateFormBusinessRules } = await import(
      "../form-protection"
    );
    const result = await evaluateFormBusinessRules({
      email: "test@example.com",
      form: "postulation",
      sectorDocumentId: "sector-3",
      signal: buildFormProtectionSignal({
        email: "test@example.com",
        form: "postulation",
        sectorDocumentId: "sector-3",
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      code: "TOO_MANY_REQUESTS",
    });
  });

  it("blocks duplicate postulations for the same email and sectorDocumentId", async () => {
    strapiFetchMock
      .mockResolvedValueOnce({
        ok: true,
        data: {
          data: [
            {
              id: 1,
              documentId: "doc-1",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              publishedAt: new Date().toISOString(),
              locale: null,
              form: "postulation",
              normalizedEmailHash: "hash",
              sectorDocumentId: "sector-id",
              positionKey: null,
              decision: "allowed",
              duplicateMarker: false,
              reviewStatus: "clean",
              banned: false,
              notes: null,
              threshold: 2,
              windowMs: 30 * 24 * 60 * 60 * 1000,
              submittedAt: new Date().toISOString(),
              metadata: null,
              fingerprint: null,
              signal: null,
            },
          ],
          meta: { pagination: { page: 1, pageCount: 1, pageSize: 10, total: 1 } },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          data: {
            id: 2,
            documentId: "doc-2",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            locale: null,
            form: "postulation",
            normalizedEmailHash: "hash",
            sectorDocumentId: "sector-id",
            positionKey: null,
            decision: "blocked_duplicate",
            duplicateMarker: true,
            reviewStatus: "clean",
            banned: false,
            notes: null,
            threshold: 2,
            windowMs: 30 * 24 * 60 * 60 * 1000,
            submittedAt: new Date().toISOString(),
            metadata: null,
            fingerprint: null,
            signal: null,
          },
          meta: { pagination: { page: 1, pageCount: 1, pageSize: 1, total: 1 } },
        },
      });

    const { buildFormProtectionSignal, evaluateFormBusinessRules } = await import(
      "../form-protection"
    );
    const result = await evaluateFormBusinessRules({
      email: "test@example.com",
      form: "postulation",
      sectorDocumentId: "sector-id",
      signal: buildFormProtectionSignal({
        email: "test@example.com",
        form: "postulation",
        sectorDocumentId: "sector-id",
      }),
    });

    expect(result).toMatchObject({
      ok: true,
      allowed: false,
      code: "DUPLICATE_SUBMISSION",
    });
  });

  it("fails closed when the Strapi business layer cannot be queried", async () => {
    strapiFetchMock.mockResolvedValueOnce({ ok: false, data: null });

    const { buildFormProtectionSignal, evaluateFormBusinessRules } = await import(
      "../form-protection"
    );
    const result = await evaluateFormBusinessRules({
      email: "test@example.com",
      form: "contact",
      signal: buildFormProtectionSignal({
        email: "test@example.com",
        form: "contact",
      }),
    });

    expect(result).toMatchObject({
      ok: false,
      allowed: false,
      code: "FORM_PROTECTION_UNAVAILABLE",
    });
  });
});
