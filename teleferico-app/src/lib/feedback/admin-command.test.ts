// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createFeedbackAdminCommandTransport,
  parseGenerateCommand,
  parseRetryCommand,
  type GenerationInputsPort,
} from "./admin-command";
import type {
  GenerationSourcePageQueryV1,
  GenerationSourceResourceV1,
} from "../../../services/survey-report-worker/src/authoritative-generation-source";

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

function generationInputsSource(): GenerationInputsPort & {
  readPage: ReturnType<typeof vi.fn>;
  getApprovedConfiguration: ReturnType<typeof vi.fn>;
} {
  const rows: Record<GenerationSourceResourceV1, readonly unknown[]> = {
    submissions: [],
    versions: [
      {
        id: "version-row-1",
        versionKey: "survey-v1",
        aspects: [{ aspectKey: "views", sortOrder: 0 }],
      },
    ],
    points: [
      {
        id: "point-row-1",
        pointKey: "summit",
        displayName: "Summit",
        sortOrder: 0,
      },
    ],
  } as const;
  const readPage = vi.fn(async ({ resource, cursor }: GenerationSourcePageQueryV1) => ({
      cursor,
      nextCursor: null,
      total: rows[resource].length,
      items: rows[resource],
    }));
  const getApprovedConfiguration = vi.fn(async () => ({
      sourceRevision: "source-revision-42",
      modelConfig: {
        version: "survey-model-config.v1",
        evidenceKeyId: "evidence-key-2026-01",
        provider: "vertex-ai",
        vertexProjectId: "teleferico-bariloche-2024",
        vertexLocation: "us",
        vertexApiEndpoint: "aiplatform.us.rep.googleapis.com",
        model: "gemini-3.8-flash",
        temperature: 0,
        reasoning: "LOW",
        grounding: false,
        promptVersion: "prompt-v1",
        mapSchemaVersion: "survey-map.v1",
        analysisSchemaVersion: "survey-analysis.v1",
        redactionVersion: "redaction-v1",
        validatorVersion: "validator-v1",
        chunkVersion: "chunk-v1",
        verifiedInputTokenLimit: 10000,
        map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
        directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
        safetyHeadroomTokens: 2048,
        sourceRevision: "source-revision-42",
      },
      pricingSnapshot: {
        version: "pricing-2026-01",
        currency: "USD",
        units: [
          {
            sku: "model-input",
            inputMicrosPerMillion: 100,
            outputMicrosPerMillion: 200,
          },
        ],
      },
      evidenceKeyId: "evidence-key-2026-01",
    } as const));
  return { readPage, getApprovedConfiguration };
}

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
    const generationInputs = generationInputsSource();
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
      generationInputs,
    });

    await expect(transport.generate(validGenerate)).resolves.toEqual(
      validResult,
    );
  });

  it("persists the complete materialized snapshot and closed worker inputs before dispatch", async () => {
    const generationInputs = generationInputsSource();
    let createBody: Record<string, unknown> | undefined;
    const dispatcher = {
      dispatch: vi.fn(async ({ taskName }: { taskName: string }) => ({
        contractVersion: "survey-dispatch-command.v1" as const,
        status: "dispatched" as const,
        taskName,
        dispatchAttemptCount: 1,
      })),
    };
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      generationInputs,
      dispatcher,
      fetchImplementation: vi.fn(async (_input, init) => {
        if (init?.method === "POST") {
          createBody = JSON.parse(String(init.body)).data;
          return Response.json({ data: validCoreRow }, { status: 201 });
        }
        return Response.json({ data: [] }, { status: 200 });
      }),
    });

    await transport.generate(validGenerate);

    expect(createBody).toMatchObject({
      snapshotDigest: expect.stringMatching(/^(?!0{64}$)[a-f0-9]{64}$/),
      sourceRevision: "source-revision-42",
      snapshotJson: {
        contractVersion: "survey-snapshot.v1",
        sourceRevision: "source-revision-42",
        population: { dataCutoffAt: expect.any(String) },
      },
      checkpointsJson: {
        version: "survey-checkpoints.v1",
        snapshotDigest: createBody?.snapshotDigest,
        route: "undecided",
        chunkCount: null,
        entries: [],
      },
      modelConfigJson: {
        version: "survey-model-config.v1",
        evidenceKeyId: "evidence-key-2026-01",
        sourceRevision: "source-revision-42",
      },
      pricingSnapshotJson: {
        version: "pricing-2026-01",
        currency: "USD",
        units: [
          {
            sku: "model-input",
            inputMicrosPerMillion: 100,
            outputMicrosPerMillion: 200,
          },
        ],
      },
    });
    expect(createBody?.snapshotDigest).toBe(
      (createBody?.checkpointsJson as { snapshotDigest: string }).snapshotDigest,
    );
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
  });

  it("passes a deterministic task name through the dispatcher seam", async () => {
    const generationInputs = generationInputsSource();
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
      generationInputs,
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
      generationInputs: generationInputsSource(),
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
    const generationInputs = generationInputsSource();
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
      generationInputs,
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
    const generationInputs = generationInputsSource();
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
      generationInputs,
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
    const generationInputs = generationInputsSource();
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
      generationInputs,
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
      generationInputs: generationInputsSource(),
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
      generationInputs: generationInputsSource(),
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
      generationInputs: generationInputsSource(),
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
    const generationInputs = generationInputsSource();
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
      generationInputs,
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
        snapshotDigest: expect.stringMatching(/^(?!0{64}$)[a-f0-9]{64}$/),
        sourceRevision: "source-revision-42",
        snapshotJson: {
          contractVersion: "survey-snapshot.v1",
          population: { dataCutoffAt: expect.any(String) },
        },
        checkpointsJson: {
          version: "survey-checkpoints.v1",
          route: "undecided",
          entries: [],
        },
        modelConfigJson: { evidenceKeyId: "evidence-key-2026-01" },
        pricingSnapshotJson: { version: "pricing-2026-01" },
      },
    });
  });

  it("fails closed before create or dispatch when source/config injection is absent", async () => {
    const dispatch = vi.fn();
    const fetchImplementation = vi.fn(async (_input, init) =>
      init?.method === "POST"
        ? Response.json({ data: validCoreRow }, { status: 201 })
        : Response.json({ data: [] }, { status: 200 }),
    );
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      dispatcher: { dispatch },
      fetchImplementation,
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      status: 503,
    });
    expect(fetchImplementation.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each(["missing configuration", "empty pricing", "revision mismatch"] as const)(
    "fails closed before create or dispatch for %s",
    async (failure) => {
    const source = generationInputsSource();
    const approved = await source.getApprovedConfiguration();
    const invalidConfiguration =
      failure === "missing configuration"
        ? undefined
        : failure === "empty pricing"
          ? {
              ...approved,
              pricingSnapshot: {
                version: "pricing.v1",
                currency: "USD",
                units: [],
              },
            }
          : {
              ...approved,
              modelConfig: {
                ...approved.modelConfig,
                sourceRevision: "unapproved-revision",
              },
            };
    source.getApprovedConfiguration.mockResolvedValue(invalidConfiguration as never);
    const dispatch = vi.fn();
    const fetchImplementation = vi.fn(async (_input, init) =>
      init?.method === "POST"
        ? Response.json({ data: validCoreRow }, { status: 201 })
        : Response.json({ data: [] }, { status: 200 }),
    );
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      generationInputs: source,
      dispatcher: { dispatch },
      fetchImplementation,
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "UPSTREAM_UNAVAILABLE",
      status: 503,
    });
    expect(fetchImplementation.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    },
  );

  it("does not read source inputs or dispatch when overlap preflight is stale", async () => {
    const generationInputs = generationInputsSource();
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({ data: [{ ...validCoreRow, status: "succeeded" }] }),
    );
    const dispatch = vi.fn();
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      generationInputs,
      dispatcher: { dispatch },
      fetchImplementation,
    });

    await expect(transport.generate(validGenerate)).rejects.toMatchObject({
      code: "OVERLAP_REQUIRES_OVERRIDE",
      status: 409,
    });
    expect(generationInputs.readPage).not.toHaveBeenCalled();
    expect(generationInputs.getApprovedConfiguration).not.toHaveBeenCalled();
    expect(fetchImplementation.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it.each(["generate", "retry"] as const)(
    "does not create or dispatch when %s encounters an incomplete source continuation",
    async (operation) => {
      const generationInputs = generationInputsSource();
      generationInputs.readPage.mockImplementation(
        async ({ resource, cursor }: GenerationSourcePageQueryV1) => {
          if (resource === "submissions")
            return cursor === null
              ? {
                  cursor: null,
                  nextCursor: "continuation",
                  total: 2,
                  items: [{ id: "submission-row-1" }],
                }
              : { cursor, nextCursor: null, total: 2, items: [] };

          const items =
            resource === "versions"
              ? [
                  {
                    id: "version-row-1",
                    versionKey: "survey-v1",
                    aspects: [{ aspectKey: "views", sortOrder: 0 }],
                  },
                ]
              : [
                  {
                    id: "point-row-1",
                    pointKey: "summit",
                    displayName: "Summit",
                    sortOrder: 0,
                  },
                ];
          return { cursor, nextCursor: null, total: items.length, items };
        },
      );
      const createAttempts: string[] = [];
      const dispatcher = {
        dispatch: vi.fn(async ({ taskName }: { taskName: string }) => ({
          contractVersion: "survey-dispatch-command.v1" as const,
          status: "dispatched" as const,
          taskName,
          dispatchAttemptCount: 1,
        })),
      };
      const fetchImplementation = vi.fn(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(input);
          if (init?.method !== "POST" && url.includes("reportRunId"))
            return Response.json({
              data: [{ ...validCoreRow, status: "failed" }],
            });
          if (init?.method === "POST") {
            createAttempts.push(url);
            return Response.json({ data: validCoreRow }, { status: 201 });
          }
          return Response.json({ data: [] });
        },
      );
      const transport = createFeedbackAdminCommandTransport({
        baseUrl: "https://cms.example.test",
        token: "synthetic-admin-jwt",
        generationInputs,
        dispatcher,
        fetchImplementation,
      });

      const result =
        operation === "generate"
          ? transport.generate(validGenerate)
          : transport.retry(validResult.reportRunId, {
              contractVersion: "feedback-admin.v1",
            });
      await expect(result).rejects.toMatchObject({
        code: "UPSTREAM_UNAVAILABLE",
        status: 503,
      });
      expect(generationInputs.readPage).toHaveBeenCalledWith(
        expect.objectContaining({
          resource: "submissions",
          cursor: "continuation",
        }),
      );
      expect(createAttempts).toEqual([]);
      expect(dispatcher.dispatch).not.toHaveBeenCalled();
    },
  );

  it("takes an independent frozen source cutoff for each retry attempt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T15:04:05.000Z"));
    const generationInputs = generationInputsSource();
    const created: Record<string, unknown>[] = [];
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        const data = JSON.parse(String(init.body)).data;
        created.push(data);
        return Response.json(
          { data: { ...validCoreRow, reportRunId: data.reportRunId, stateVersion: 1 } },
          { status: 201 },
        );
      }
      return Response.json({ data: [{ ...validCoreRow, status: "failed" }] });
    });
    const transport = createFeedbackAdminCommandTransport({
      baseUrl: "https://cms.example.test",
      token: "synthetic-admin-jwt",
      generationInputs,
      fetchImplementation,
    });

    try {
      await transport.retry(validResult.reportRunId, { contractVersion: "feedback-admin.v1" });
      vi.setSystemTime(new Date("2026-09-22T16:04:05.000Z"));
      await transport.retry(validResult.reportRunId, { contractVersion: "feedback-admin.v1" });
      expect(created).toHaveLength(2);
      expect(generationInputs.readPage).toHaveBeenCalledTimes(6);
      expect(created.map(({ dataCutoffAt }) => dataCutoffAt)).toEqual([
        "2026-09-22T15:04:05.000Z",
        "2026-09-22T16:04:05.000Z",
      ]);
      expect(created[0]?.snapshotDigest).not.toBe(created[1]?.snapshotDigest);
      expect(created[0]?.retryOfGeneration).toEqual({ connect: [validCoreRow.documentId] });
      expect(created[1]?.retryOfGeneration).toEqual({ connect: [validCoreRow.documentId] });
    } finally {
      vi.useRealTimers();
    }
  });
});
