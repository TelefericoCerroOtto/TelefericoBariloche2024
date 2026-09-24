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
  dispatch: {
    contractVersion: "survey-dispatch-command.v1",
    status: "queued",
    disposition: "dispatcher-unavailable",
    taskName: "tb113-report-00000000000040008000000000000001",
    dispatchAttemptCount: 0,
    failureCode: "DISPATCH_UNAVAILABLE",
  },
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

  it("passes a deterministic task name through the dispatcher seam", async () => {
    const dispatch = vi.fn(async ({ taskName }: { taskName: string }) => ({
      contractVersion: "survey-dispatch-command.v1" as const,
      status: "dispatched" as const,
      taskName,
      dispatchAttemptCount: 1,
    }));
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher: { dispatch },
      fetchImplementation: vi.fn(async (_input, init) =>
        init?.method === "POST"
          ? Response.json({ data: validCoreRow }, { status: 201 })
          : Response.json({ data: [] }, { status: 200 }),
      ),
    });

    await expect(transport.generate(validGenerate)).resolves.toMatchObject({
      dispatch: {
        status: "dispatched",
        taskName: "tb113-report-00000000000040008000000000000001",
      },
    });
    expect(dispatch).toHaveBeenCalledWith({
      reportRunId: validResult.reportRunId,
      taskName: "tb113-report-00000000000040008000000000000001",
    });
  });

  it("rejects a malformed CMS run identifier before dispatch", async () => {
    const dispatch = vi.fn();
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher: { dispatch },
      fetchImplementation: vi.fn(async (_input, init) =>
        init?.method === "POST"
          ? Response.json(
              { data: { ...validCoreRow, reportRunId: "invalid-run-id" } },
              { status: 201 },
            )
          : Response.json({ data: [] }, { status: 200 }),
      ),
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      status: 503,
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("compensates verified exhaustion after generation when no reports overlap", async () => {
    const exhaustion = (taskName: string) => ({
      contractVersion: "survey-dispatch-command.v1" as const,
      status: "exhausted" as const,
      noTaskCreated: true as const,
      taskName,
      dispatchAttemptCount: 3 as const,
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED" as const,
    });
    const fetchImplementation = vi.fn(async (_input, init) => {
      const url = String(_input);
      if (url.includes("dispatch-failure"))
        return Response.json({
          contractVersion: "survey-dispatch-command.v1",
          reportRunId: url.split("/").at(-2),
          stateVersion: 2,
          status: "failed",
          failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
          replayed: false,
        });
      if (init?.method === "POST")
        return Response.json({ data: { ...validCoreRow, reportRunId: JSON.parse(String(init.body)).data.reportRunId, stateVersion: 1 } }, { status: 201 });
      return Response.json({ data: [] });
    });
    const dispatcher = { dispatch: vi.fn(async ({ taskName }: { taskName: string }) => exhaustion(taskName)) };
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher,
      fetchImplementation,
    });

    await expect(transport.generate(validGenerate)).resolves.toMatchObject({
      status: "failed",
      dispatch: { status: "failed", failureCode: "QUEUE_ENQUEUE_EXHAUSTED" },
    });
    expect(fetchImplementation.mock.calls.filter(([url]) =>
      String(url).includes("dispatch-failure"),
    )).toHaveLength(1);
  });

  it("compensates verified exhaustion after retrying a failed source", async () => {
    const fetchImplementation = vi.fn(async (_input, init) => {
      const url = String(_input);
      if (url.includes("dispatch-failure"))
        return Response.json({
          contractVersion: "survey-dispatch-command.v1",
          reportRunId: url.split("/").at(-2),
          stateVersion: 2,
          status: "failed",
          failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
          replayed: false,
        });
      if (init?.method === "POST")
        return Response.json({ data: { ...validCoreRow, reportRunId: JSON.parse(String(init.body)).data.reportRunId, stateVersion: 1 } }, { status: 201 });
      return Response.json({ data: [{ ...validCoreRow, status: "failed" }] });
    });
    const dispatcher = {
      dispatch: vi.fn(async ({ taskName }: { taskName: string }) => ({
        contractVersion: "survey-dispatch-command.v1" as const,
        status: "exhausted" as const,
        noTaskCreated: true as const,
        taskName,
        dispatchAttemptCount: 3 as const,
        failureCode: "QUEUE_ENQUEUE_EXHAUSTED" as const,
      })),
    };
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher,
      fetchImplementation,
    });

    await expect(transport.retry(validResult.reportRunId, {
      contractVersion: "feedback-admin.v1",
    })).resolves.toMatchObject({
      status: "failed",
      dispatch: { status: "failed", failureCode: "QUEUE_ENQUEUE_EXHAUSTED" },
    });
    expect(fetchImplementation.mock.calls.filter(([url]) =>
      String(url).includes("dispatch-failure"),
    )).toHaveLength(1);
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["contract version", { contractVersion: "survey-dispatch-command.v0" }],
    ["failure code", { failureCode: "DISPATCH_UNAVAILABLE" }],
    ["attempt count", { dispatchAttemptCount: 2 }],
    ["task name", { taskName: "tb113-report-another-run" }],
  ])("does not compensate an exhaustion result with an invalid %s", async (_case, override) => {
    const fetchImplementation = vi.fn(async (_input, init) =>
      init?.method === "POST"
        ? Response.json({ data: { ...validCoreRow, stateVersion: 1 } }, { status: 201 })
        : Response.json({ data: [] }, { status: 200 }),
    );
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher: {
        dispatch: async ({ taskName }) => ({
          contractVersion: "survey-dispatch-command.v1",
          status: "exhausted",
          noTaskCreated: true,
          taskName,
          dispatchAttemptCount: 3,
          failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
          ...override,
        } as never),
      },
      fetchImplementation,
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      status: 503,
    });
    expect(fetchImplementation.mock.calls.some(([url]) =>
      String(url).includes("dispatch-failure"),
    )).toBe(false);
  });

  it("leaves the queued generation untouched when dispatch is unavailable or throws", async () => {
    const unavailable = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      fetchImplementation: vi.fn(async (_input, init) =>
        init?.method === "POST"
          ? Response.json({ data: { ...validCoreRow, stateVersion: 1 } }, { status: 201 })
          : Response.json({ data: [] }),
      ),
    });
    await expect(unavailable.generate(validGenerate)).resolves.toMatchObject({
      status: "queued",
      dispatch: { failureCode: "DISPATCH_UNAVAILABLE" },
    });

    const fetchImplementation = vi.fn(async (_input, init) =>
      init?.method === "POST"
        ? Response.json({ data: { ...validCoreRow, stateVersion: 1 } }, { status: 201 })
        : Response.json({ data: [] }),
    );
    const failing = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher: { dispatch: async () => { throw new Error("ambiguous outcome"); } },
      fetchImplementation,
    });
    await expect(failing.generate(validGenerate)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
    });
    expect(fetchImplementation.mock.calls.some(([url]) =>
      String(url).includes("dispatch-failure"),
    )).toBe(false);
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
