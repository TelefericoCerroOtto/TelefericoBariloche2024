import { describe, expect, it, vi } from "vitest";
import {
  createFeedbackBrowserGuard,
  type BrowserGuardStore,
} from "./browser-guard";
import {
  acceptSubmission,
  type AcceptanceStore,
  type StoredSubmission,
  type SubmissionAcceptanceInput,
  type SubmissionTransaction,
} from "./submission-acceptance";
import { createFeedbackCmsTransport } from "./cms-transport";

const ACCEPTED_AT = "2026-09-17T12:00:00.000Z";

function input(
  overrides: Partial<SubmissionAcceptanceInput> = {},
): SubmissionAcceptanceInput {
  return {
    contractVersion: "feedback-public.v1",
    sessionToken: "signed-token-a",
    session: {
      v: 1,
      nonce: "a".repeat(64),
      pointKey: "summit",
      publicCodeHash: "b".repeat(64),
      versionKey: "visitor-v1",
      versionRevision: 7,
      capability: "feedback:submit",
      iat: 1_779_102_000,
      exp: 1_779_109_200,
    },
    idempotencyKey: "idem-key-0000001",
    browserTokenHash: "c".repeat(64),
    pointDocumentId: "point-document",
    versionDocumentId: "version-document",
    answers: {
      locale: "en",
      overallRating: 5,
      ratings: [
        {
          aspectKey: "views",
          label: "Views",
          sortOrder: 1,
          rating: "positive",
        },
      ],
      comment: "Wonderful visit",
    },
    ...overrides,
  };
}

function createStore(trace: string[] = []) {
  let rows: StoredSubmission[] = [];
  let queue = Promise.resolve();
  let failInsert = false;

  const store: AcceptanceStore = {
    withTransaction: async (operation) => {
      const run = queue.then(async () => {
        trace.push("transaction:start");
        const draft = [...rows];
        const transaction: SubmissionTransaction = {
          lockAndFindByIdempotency: async (nonceHash, key) => {
            trace.push("durable:lookup");
            return (
              draft.find(
                (row) =>
                  row.sessionNonceHash === nonceHash &&
                  row.idempotencyKey === key,
              ) ?? null
            );
          },
          insert: async (submission) => {
            if (failInsert) throw new Error("database unavailable");
            trace.push("durable:insert");
            draft.push(submission);
          },
        };
        const result = await operation(transaction);
        rows = draft;
        trace.push("transaction:commit");
        return result;
      });
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
  };

  return {
    store,
    rows: () => rows,
    failNextInsert: () => {
      failInsert = true;
    },
  };
}

function dependencies(
  store: AcceptanceStore,
  guard: (_browserTokenHash: string) => Promise<boolean> = vi.fn(
    async () => false,
  ),
  persistGuard: (
    _browserTokenHash: string,
    _guardUntil: string,
  ) => Promise<void> = vi.fn(async () => undefined),
) {
  let receipts = 0;
  return {
    store,
    browserGuard: { isActive: guard, persist: persistGuard },
    now: () => new Date(ACCEPTED_AT),
    createReceipt: () =>
      `00000000-0000-4000-8000-${String(++receipts).padStart(12, "0")}`,
  };
}

describe("submission acceptance", () => {
  it("persists server-authored context and returns the authoritative acceptance", async () => {
    const harness = createStore();
    const result = await acceptSubmission(input(), dependencies(harness.store));

    expect(result).toEqual({
      ok: true,
      status: 201,
      value: {
        submissionReceipt: "00000000-0000-4000-8000-000000000001",
        acceptedAt: ACCEPTED_AT,
        guardUntil: "2026-09-18T12:00:00.000Z",
      },
    });
    expect(harness.rows()).toMatchObject([
      {
        source: "valid_qr",
        locale: "en",
        overallRating: 5,
        pointDocumentId: "point-document",
        versionDocumentId: "version-document",
        ratings: [{ aspectKey: "views", label: "Views", sortOrder: 1 }],
      },
    ]);
  });

  it("replays an identical payload before the guard even when the signed token changes", async () => {
    const harness = createStore();
    const guard = vi.fn(async () => false);
    const deps = dependencies(harness.store, guard);
    const accepted = await acceptSubmission(input(), deps);
    guard.mockResolvedValue(true);

    const replay = await acceptSubmission(
      input({ sessionToken: "renewed-signed-token" }),
      deps,
    );

    expect(replay).toEqual({ ...accepted, status: 200 });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(harness.rows()).toHaveLength(1);
  });

  it("canonicalizes validated claims independently of object insertion order", async () => {
    const harness = createStore();
    const deps = dependencies(harness.store);
    const original = input();
    await acceptSubmission(original, deps);
    const reorderedSession = Object.fromEntries(
      Object.entries(original.session).reverse(),
    ) as unknown as SubmissionAcceptanceInput["session"];

    const replay = await acceptSubmission(
      input({ session: reorderedSession }),
      deps,
    );

    expect(replay.ok && replay.status).toBe(200);
    expect(harness.rows()).toHaveLength(1);
  });

  it("conflicts when the durable pair is reused with a different canonical payload", async () => {
    const harness = createStore();
    const guard = vi.fn(async () => false);
    const deps = dependencies(harness.store, guard);
    await acceptSubmission(input(), deps);

    const conflict = await acceptSubmission(
      input({ answers: { ...input().answers, overallRating: 1 } }),
      deps,
    );

    expect(conflict).toEqual({
      ok: false,
      error: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
    expect(guard).toHaveBeenCalledTimes(1);
    expect(harness.rows()).toHaveLength(1);
  });

  it("binds canonical payload identity to the browser hash but not Strapi document ids", async () => {
    const harness = createStore();
    const deps = dependencies(harness.store);
    await acceptSubmission(input(), deps);

    const documentReplay = await acceptSubmission(
      input({
        pointDocumentId: "replacement-point-document",
        versionDocumentId: "replacement-version-document",
      }),
      deps,
    );
    const browserConflict = await acceptSubmission(
      input({ browserTokenHash: "d".repeat(64) }),
      deps,
    );

    expect(documentReplay.ok && documentReplay.status).toBe(200);
    expect(browserConflict).toEqual({
      ok: false,
      error: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
    expect(harness.rows()).toHaveLength(1);
  });

  it("serializes concurrent identical retries into one submission and one receipt", async () => {
    const harness = createStore();
    const deps = dependencies(harness.store);

    const [first, second] = await Promise.all([
      acceptSubmission(input(), deps),
      acceptSubmission(input(), deps),
    ]);

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok)
      throw new Error("Expected both retries to succeed");
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.value).toEqual(second.value);
    expect(harness.rows()).toHaveLength(1);
  });

  it("returns the authoritative CMS receipt when commit races with an identical submission", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(Response.json(null))
      .mockResolvedValueOnce(
        Response.json({
          submissionReceipt: "authoritative-receipt",
          acceptedAt: ACCEPTED_AT,
        }),
      );
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation,
    });
    const store = transport.acceptanceStore({
      pointDocumentId: "point-document",
      versionDocumentId: "version-document",
      point: { pointKey: "summit", publicCode: "A".repeat(32) },
      survey: { versionKey: "visitor-v1" },
    } as never);
    const persistGuard = vi.fn(async () => undefined);

    const result = await acceptSubmission(
      input(),
      dependencies(store, vi.fn(async () => false), persistGuard),
    );

    expect(result).toEqual({
      ok: true,
      status: 200,
      value: {
        submissionReceipt: "authoritative-receipt",
        acceptedAt: ACCEPTED_AT,
        guardUntil: "2026-09-18T12:00:00.000Z",
      },
    });
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(persistGuard).not.toHaveBeenCalled();
  });

  it("maps a different-payload commit race to the typed idempotency conflict", async () => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi
        .fn()
        .mockResolvedValueOnce(Response.json(null))
        .mockResolvedValueOnce(new Response(null, { status: 409 })),
    });
    const store = transport.acceptanceStore({
      pointDocumentId: "point-document",
      versionDocumentId: "version-document",
      point: { pointKey: "summit", publicCode: "A".repeat(32) },
      survey: { versionKey: "visitor-v1" },
    } as never);

    const result = await acceptSubmission(input(), dependencies(store));

    expect(result).toEqual({
      ok: false,
      error: { status: 409, code: "IDEMPOTENCY_CONFLICT" },
    });
  });

  it("bounds a malformed authoritative replay timestamp as upstream unavailable", async () => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi
        .fn()
        .mockResolvedValueOnce(Response.json(null))
        .mockResolvedValueOnce(Response.json({
          submissionReceipt: "authoritative-receipt",
          acceptedAt: "not-a-date",
        })),
    });
    const store = transport.acceptanceStore({
      pointDocumentId: "point-document",
      versionDocumentId: "version-document",
      point: { pointKey: "summit", publicCode: "A".repeat(32) },
      survey: { versionKey: "visitor-v1" },
    } as never);

    await expect(acceptSubmission(input(), dependencies(store))).resolves.toEqual({
      ok: false,
      error: { status: 503, code: "UPSTREAM_UNAVAILABLE" },
    });
  });

  it("maps a genuine commit-time CMS failure to upstream unavailable", async () => {
    const transport = createFeedbackCmsTransport({
      baseUrl: "http://127.0.0.1:1337",
      token: "synthetic-cms-token",
      fetchImplementation: vi
        .fn()
        .mockResolvedValueOnce(Response.json(null))
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    });
    const store = transport.acceptanceStore({
      pointDocumentId: "point-document",
      versionDocumentId: "version-document",
      point: { pointKey: "summit", publicCode: "A".repeat(32) },
      survey: { versionKey: "visitor-v1" },
    } as never);

    await expect(acceptSubmission(input(), dependencies(store))).resolves.toEqual({
      ok: false,
      error: { status: 503, code: "UPSTREAM_UNAVAILABLE" },
    });
  });

  it("checks the authoritative browser guard only after durable idempotency", async () => {
    const harness = createStore();
    const guard = vi.fn(async () => true);

    const result = await acceptSubmission(
      input(),
      dependencies(harness.store, guard),
    );

    expect(result).toEqual({
      ok: false,
      error: { status: 409, code: "GUARD_ACTIVE" },
    });
    expect(guard).toHaveBeenCalledWith("c".repeat(64));
    expect(harness.rows()).toHaveLength(0);
  });

  it("checks Redis after durable replay lookup and persists the guard only after commit", async () => {
    const trace: string[] = [];
    const harness = createStore(trace);
    const guard = vi.fn(async () => {
      trace.push("redis:lookup");
      return false;
    });
    const persistGuard = vi.fn(async () => {
      trace.push("redis:persist");
    });

    const result = await acceptSubmission(
      input(),
      dependencies(harness.store, guard, persistGuard),
    );

    expect(result.ok && result.status).toBe(201);
    expect(trace).toEqual([
      "transaction:start",
      "durable:lookup",
      "redis:lookup",
      "durable:insert",
      "transaction:commit",
      "redis:persist",
    ]);
    expect(persistGuard).toHaveBeenCalledWith(
      "c".repeat(64),
      "2026-09-18T12:00:00.000Z",
    );
  });

  it("accepts after Redis lookup and persistence failures while emitting bounded degradation", async () => {
    const harness = createStore();
    const store: BrowserGuardStore = {
      isActive: vi.fn(async () => {
        throw new Error("redis lookup leaked detail");
      }),
      persist: vi.fn(async () => {
        throw new Error("redis persist leaked detail");
      }),
    };
    const emit = vi.fn();
    const browserGuard = createFeedbackBrowserGuard({
      emit,
      now: () => new Date(ACCEPTED_AT),
      store,
    });

    const result = await acceptSubmission(input(), {
      ...dependencies(harness.store),
      browserGuard,
    });

    expect(result).toEqual({
      ok: true,
      status: 201,
      value: {
        submissionReceipt: "00000000-0000-4000-8000-000000000001",
        acceptedAt: ACCEPTED_AT,
        guardUntil: "2026-09-18T12:00:00.000Z",
      },
    });
    expect(harness.rows()).toHaveLength(1);
    expect(emit.mock.calls.map(([event]) => event.operation)).toEqual([
      "lookup",
      "persist",
    ]);
    expect(JSON.stringify(emit.mock.calls)).not.toContain(
      "redis lookup leaked detail",
    );
  });

  it("returns an identical replay without reading or extending the Redis guard", async () => {
    const harness = createStore();
    const guard = vi.fn(async () => false);
    const persistGuard = vi.fn(async () => undefined);
    const deps = dependencies(harness.store, guard, persistGuard);
    await acceptSubmission(input(), deps);
    guard.mockClear();
    persistGuard.mockClear();

    const replay = await acceptSubmission(input(), deps);

    expect(replay.ok && replay.status).toBe(200);
    expect(guard).not.toHaveBeenCalled();
    expect(persistGuard).not.toHaveBeenCalled();
  });

  it("rolls back and fails safely when authoritative persistence fails", async () => {
    const harness = createStore();
    harness.failNextInsert();

    const result = await acceptSubmission(input(), dependencies(harness.store));

    expect(result).toEqual({
      ok: false,
      error: { status: 503, code: "UPSTREAM_UNAVAILABLE" },
    });
    expect(harness.rows()).toHaveLength(0);
  });
});
