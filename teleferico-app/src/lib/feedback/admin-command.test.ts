// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createFeedbackAdminCommandTransport,
  parseGenerateCommand,
  parseRetryCommand,
} from "./admin-command";

const validGenerate = {
  contractVersion: "feedback-admin.v1",
  period: { from: "2026-08-01", to: "2026-08-20" },
  override: { accepted: false, overlapDigest: null },
} as const;

const validResult = {
  reportRunId: "00000000-0000-4000-8000-000000000001",
  status: "queued",
} as const;
const validCoreRow = {
  documentId: "generation-document-1",
  ...validResult,
  periodStart: validGenerate.period.from,
  periodEnd: validGenerate.period.to,
} as const;

describe("feedback administration command contracts", () => {
  it("accepts only the independent bounded generation range", () => {
    expect(parseGenerateCommand(validGenerate)).toEqual({
      ok: true,
      value: validGenerate,
    });
    expect(
      parseGenerateCommand({ ...validGenerate, commentFilters: { text: "x" } }),
    ).toEqual({ ok: false, code: "VALIDATION_FAILED" });
    expect(
      parseGenerateCommand({
        ...validGenerate,
        period: { from: "2026-01-01", to: "2027-01-02" },
      }),
    ).toEqual({ ok: false, code: "VALIDATION_FAILED" });
    expect(
      parseGenerateCommand({
        ...validGenerate,
        period: { from: "2026-02-31", to: "2026-03-05" },
      }),
    ).toEqual({ ok: false, code: "VALIDATION_FAILED" });
  });

  it("requires an exact retry command and rejects malformed run identifiers", () => {
    expect(parseRetryCommand({ contractVersion: "feedback-admin.v1" })).toEqual(
      {
        ok: true,
        value: { contractVersion: "feedback-admin.v1" },
      },
    );
    expect(parseRetryCommand({ contractVersion: "feedback-admin.v0" })).toEqual(
      {
        ok: false,
        code: "VALIDATION_FAILED",
      },
    );
  });

  it("maps bounded CMS command responses and status failures without leaking details", async () => {
    const fetchImplementation = vi.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        expect(String(input)).toContain("/api/survey-report-generations");
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer synthetic-admin-jwt",
        );
        if (init?.method === "POST")
          return Response.json({ data: validCoreRow }, { status: 201 });
        return Response.json({ data: [] }, { status: 200 });
      },
    );
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      fetchImplementation,
    });

    await expect(transport.generate(validGenerate)).resolves.toEqual(
      validResult,
    );
  });

  it("maps native core conflicts without leaking upstream details", async () => {
    let call = 0;
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      fetchImplementation: vi.fn(async (_input, _init) => {
        call += 1;
        return call === 1
          ? Response.json({ data: [] }, { status: 200 })
          : Response.json(
              { error: { message: "private database detail" } },
              { status: 409 },
            );
      }),
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "ACTIVE_RANGE_CONFLICT",
      status: 409,
    });
  });

  it("preserves complete overlap disclosure and adjustment guidance", async () => {
    const details = {
      overlaps: [
        {
          reportRunId: "00000000-0000-4000-8000-000000000003",
          period: { from: "2026-07-20", to: "2026-08-05" },
          intersection: { from: "2026-08-01", to: "2026-08-05" },
        },
      ],
      overlapDigest: "a".repeat(64),
      adjustment: "Choose a range that excludes every listed intersection.",
    };
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      fetchImplementation: vi.fn(async () =>
        Response.json(
          {
            data: [
              {
                documentId: "generation-document-1",
                reportRunId: details.overlaps[0]!.reportRunId,
                periodStart: details.overlaps[0]!.period.from,
                periodEnd: details.overlaps[0]!.period.to,
                status: "succeeded",
              },
            ],
          },
          { status: 200 },
        ),
      ),
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "OVERLAP_REQUIRES_OVERRIDE",
      details: {
        overlaps: details.overlaps,
        adjustment: details.adjustment,
      },
    });
  });

  it("retries a failed core generation through native create", async () => {
    const fetchImplementation = vi.fn(async (_input, init) =>
      init?.method === "POST"
        ? Response.json(
            {
              data: {
                ...validCoreRow,
                reportRunId: "00000000-0000-4000-8000-000000000004",
                status: "queued",
              },
            },
            { status: 201 },
          )
        : Response.json(
            {
              data: [
                {
                  ...validCoreRow,
                  status: "failed",
                },
              ],
            },
            { status: 200 },
          ),
    );
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      fetchImplementation,
    });

    await expect(
      transport.retry(validResult.reportRunId, {
        contractVersion: "feedback-admin.v1",
      }),
    ).resolves.toMatchObject({
      reportRunId: "00000000-0000-4000-8000-000000000004",
      status: "queued",
    });
    const [, init] = fetchImplementation.mock.calls[1]!;
    expect(JSON.parse(String(init?.body))).toMatchObject({
      data: {
        retryOfGeneration: { connect: [validCoreRow.documentId] },
      },
    });
  });
});
