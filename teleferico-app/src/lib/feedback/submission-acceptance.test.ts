import { describe, expect, it, vi } from "vitest";
import {
  acceptSubmission,
  type AcceptanceStore,
  type StoredSubmission,
  type SubmissionAcceptanceInput,
  type SubmissionTransaction,
} from "./submission-acceptance";

const ACCEPTED_AT = "2026-09-17T12:00:00.000Z";

function input(overrides: Partial<SubmissionAcceptanceInput> = {}): SubmissionAcceptanceInput {
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
        { aspectKey: "views", label: "Views", sortOrder: 1, rating: "positive" },
      ],
      comment: "Wonderful visit",
    },
    ...overrides,
  };
}

function createStore() {
  let rows: StoredSubmission[] = [];
  let queue = Promise.resolve();
  let failInsert = false;

  const store: AcceptanceStore = {
    withTransaction: async (operation) => {
      const run = queue.then(async () => {
        const draft = [...rows];
        const transaction: SubmissionTransaction = {
          lockAndFindByIdempotency: async (nonceHash, key) =>
            draft.find(
              (row) => row.sessionNonceHash === nonceHash && row.idempotencyKey === key,
            ) ?? null,
          insert: async (submission) => {
            if (failInsert) throw new Error("database unavailable");
            draft.push(submission);
          },
        };
        const result = await operation(transaction);
        rows = draft;
        return result;
      });
      queue = run.then(() => undefined, () => undefined);
      return run;
    },
  };

  return {
    store,
    rows: () => rows,
    failNextInsert: () => { failInsert = true; },
  };
}

function dependencies(store: AcceptanceStore, guard = vi.fn(async () => false)) {
  let receipts = 0;
  return {
    store,
    isBrowserGuardActive: guard,
    now: () => new Date(ACCEPTED_AT),
    createReceipt: () => `00000000-0000-4000-8000-${String(++receipts).padStart(12, "0")}`,
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

    const replay = await acceptSubmission(input({ sessionToken: "renewed-signed-token" }), deps);

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

    const replay = await acceptSubmission(input({ session: reorderedSession }), deps);

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

    const documentReplay = await acceptSubmission(input({
      pointDocumentId: "replacement-point-document",
      versionDocumentId: "replacement-version-document",
    }), deps);
    const browserConflict = await acceptSubmission(input({ browserTokenHash: "d".repeat(64) }), deps);

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
    if (!first.ok || !second.ok) throw new Error("Expected both retries to succeed");
    expect([first.status, second.status].sort()).toEqual([200, 201]);
    expect(first.value).toEqual(second.value);
    expect(harness.rows()).toHaveLength(1);
  });

  it("checks the authoritative browser guard only after durable idempotency", async () => {
    const harness = createStore();
    const guard = vi.fn(async () => true);

    const result = await acceptSubmission(input(), dependencies(harness.store, guard));

    expect(result).toEqual({ ok: false, error: { status: 409, code: "GUARD_ACTIVE" } });
    expect(guard).toHaveBeenCalledWith("c".repeat(64));
    expect(harness.rows()).toHaveLength(0);
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
