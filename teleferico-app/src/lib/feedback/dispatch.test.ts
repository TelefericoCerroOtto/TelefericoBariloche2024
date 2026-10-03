import { describe, expect, it, vi } from "vitest";

import {
  createCoordinatedFeedbackDispatcher,
  createFeedbackTaskName,
  FeedbackTaskCreateError,
  type FeedbackCloudTaskClient,
  type FeedbackDispatchStatePort,
} from "./dispatch";

describe("feedback report task identity", () => {
  it("creates the stable queue name for a valid report run UUID", () => {
    expect(
      createFeedbackTaskName("00000000-0000-4000-8000-000000000001"),
    ).toBe("tb113-report-00000000000040008000000000000001");
  });

  it.each([
    "",
    "not-a-uuid",
    "00000000-0000-0000-8000-000000000001",
    "00000000-0000-4000-7000-000000000001",
    "00000000-0000-4000-8000-00000000000A",
  ])("rejects malformed report run identifiers: %s", (reportRunId) => {
    expect(createFeedbackTaskName(reportRunId)).toBeNull();
  });
});

const reportRunId = "00000000-0000-4000-8000-000000000001";
const taskName = "tb113-report-00000000000040008000000000000001";

function fakeDispatchState() {
  let stateVersion = 4;
  let dispatchState: "reserved" | "created" | "unknown" | "unreserved" = "unreserved";
  let dispatchAttemptCount = 0;
  const reserve = vi.fn(async (input: {
    reportRunId: string;
    expectedStateVersion: number;
    taskName: string;
  }) => {
    if (input.reportRunId !== reportRunId || input.taskName !== taskName)
      throw new Error("identity conflict");
    if (dispatchState === "unreserved") {
      if (input.expectedStateVersion !== stateVersion)
        throw new Error("state version conflict");
      dispatchState = "reserved";
      stateVersion += 1;
      return {
        reportRunId,
        taskName,
        stateVersion,
        dispatchState: "reserved" as const,
        dispatchAttemptCount,
        replayed: false,
      };
    }
    if (dispatchState !== "reserved") throw new Error("task already recorded");
    return {
      reportRunId,
      taskName,
      stateVersion,
      dispatchState: "reserved" as const,
      dispatchAttemptCount,
      replayed: true,
    };
  });
  const record = vi.fn(async (input: {
    reportRunId: string;
    expectedStateVersion: number;
    taskName: string;
    outcome: "created" | "unknown";
    dispatchAttemptCount: 1 | 2 | 3;
  }) => {
    if (
      dispatchState === input.outcome &&
      dispatchAttemptCount === input.dispatchAttemptCount
    )
      return {
        reportRunId,
        taskName,
        stateVersion,
        dispatchState: input.outcome,
        dispatchAttemptCount,
        replayed: true,
      };
    if (
      input.reportRunId !== reportRunId ||
      input.taskName !== taskName ||
      input.expectedStateVersion !== stateVersion ||
      dispatchState !== "reserved"
    )
      throw new Error("state CAS or identity conflict");
    dispatchState = input.outcome;
    dispatchAttemptCount = input.dispatchAttemptCount;
    stateVersion += 1;
    return {
      reportRunId,
      taskName,
      stateVersion,
      dispatchState: input.outcome,
      dispatchAttemptCount,
      replayed: false,
    };
  });
  return {
    port: { trust: "verified" as const, reserve, record } satisfies FeedbackDispatchStatePort,
    reserve,
    record,
    getState: () => ({ dispatchState, dispatchAttemptCount, stateVersion }),
  };
}

function fakeTaskClient(
  createTask: FeedbackCloudTaskClient["createTask"],
  verifyExistingTask: FeedbackCloudTaskClient["verifyExistingTask"] = async () => null,
) {
  return { trust: "verified" as const, createTask, verifyExistingTask };
}

describe("coordinated feedback task dispatch", () => {
  it("reserves before enqueue and records a verified create", async () => {
    const cms = fakeDispatchState();
    const order: string[] = [];
    const taskClient = fakeTaskClient(async (input) => {
      order.push(`create:${input.taskName}`);
      return { taskName: input.taskName, reportRunId: input.reportRunId };
    });
    const originalReserve = cms.reserve.getMockImplementation()!;
    cms.reserve.mockImplementation(async (...args) => {
      order.push("reserve");
      return originalReserve(...args);
    });
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient,
      dispatchState: cms.port,
      now: () => "2026-09-26T12:00:00.000Z",
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName,
      expectedStateVersion: 4,
    })).resolves.toEqual({
      contractVersion: "survey-dispatch-command.v1",
      status: "dispatched",
      taskName,
      dispatchAttemptCount: 1,
    });
    expect(order).toEqual(["reserve", `create:${taskName}`]);
    expect(cms.record).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "created",
      expectedStateVersion: 5,
      evidence: expect.objectContaining({
        outcome: "created",
        verifiedAt: "2026-09-26T12:00:00.000Z",
      }),
    }));
    expect(cms.getState()).toMatchObject({ dispatchState: "created" });
  });

  it("records an ambiguous timeout as unknown and never retries or compensates", async () => {
    const cms = fakeDispatchState();
    const createTask = vi.fn(async () => {
      throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
    });
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient: fakeTaskClient(createTask),
      dispatchState: cms.port,
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName,
      expectedStateVersion: 4,
    })).resolves.toMatchObject({
      status: "queued",
      disposition: "dispatcher-unavailable",
      dispatchAttemptCount: 1,
      failureCode: "DISPATCH_UNAVAILABLE",
    });
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(cms.record).toHaveBeenCalledWith(expect.objectContaining({
      outcome: "unknown",
      evidence: expect.objectContaining({ reasonCode: "AMBIGUOUS_RESPONSE" }),
    }));
    expect(cms.getState()).toMatchObject({ dispatchState: "unknown" });
  });

  it("retries only when the client proves an attempt was never sent", async () => {
    const cms = fakeDispatchState();
    const createTask = vi.fn()
      .mockRejectedValueOnce(new FeedbackTaskCreateError("not-sent-transient"))
      .mockResolvedValueOnce({ taskName, reportRunId });
    const sleep = vi.fn(async () => undefined);
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient: fakeTaskClient(createTask),
      dispatchState: cms.port,
      sleep,
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName,
      expectedStateVersion: 4,
    })).resolves.toMatchObject({ status: "dispatched", dispatchAttemptCount: 2 });
    expect(createTask).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("fails validation before reservation or task creation", async () => {
    const cms = fakeDispatchState();
    const createTask = vi.fn();
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient: fakeTaskClient(createTask),
      dispatchState: cms.port,
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName: "tb113-report-wrong-run",
      expectedStateVersion: 4,
    })).resolves.toMatchObject({ status: "queued", dispatchAttemptCount: 0 });
    expect(cms.reserve).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("returns the in-process replay result without another reservation or enqueue", async () => {
    const cms = fakeDispatchState();
    const createTask = vi.fn(async () => ({ taskName, reportRunId }));
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient: fakeTaskClient(createTask),
      dispatchState: cms.port,
    });
    const request = { reportRunId, taskName, expectedStateVersion: 4 };

    const first = await dispatcher.dispatch(request);
    const replay = await dispatcher.dispatch(request);

    expect(replay).toEqual(first);
    expect(cms.reserve).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledTimes(1);
  });

  it("replays an identical CMS create record after a lost response", async () => {
    const cms = fakeDispatchState();
    const recordImplementation = cms.record.getMockImplementation()!;
    cms.record.mockImplementationOnce(async (input) => {
      await recordImplementation(input);
      throw new Error("synthetic lost response");
    });
    const createTask = vi.fn(async () => ({ taskName, reportRunId }));
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient: fakeTaskClient(createTask),
      dispatchState: cms.port,
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName,
      expectedStateVersion: 4,
    })).resolves.toMatchObject({ status: "dispatched", dispatchAttemptCount: 1 });
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(cms.record).toHaveBeenCalledTimes(2);
    expect(cms.getState()).toMatchObject({ dispatchState: "created" });
  });

  it("accepts AlreadyExists only after exact independently verified identity", async () => {
    const cms = fakeDispatchState();
    const taskClient = fakeTaskClient(
      async () => { throw new FeedbackTaskCreateError("already-exists"); },
      async () => ({ status: "verified", taskName, reportRunId, state: "created" }),
    );
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient,
      dispatchState: cms.port,
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName,
      expectedStateVersion: 4,
    })).resolves.toMatchObject({ status: "dispatched" });
    expect(cms.getState()).toMatchObject({ dispatchState: "created" });
  });

  it("does not treat a differently bound existing task as success", async () => {
    const cms = fakeDispatchState();
    const taskClient = fakeTaskClient(
      async () => { throw new FeedbackTaskCreateError("already-exists"); },
      async () => ({
        status: "verified",
        taskName: "tb113-report-other",
        reportRunId,
        state: "created",
      }),
    );
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient,
      dispatchState: cms.port,
    });

    await expect(dispatcher.dispatch({
      reportRunId,
      taskName,
      expectedStateVersion: 4,
    })).resolves.toMatchObject({ status: "queued", dispatchAttemptCount: 1 });
    expect(cms.getState()).toMatchObject({ dispatchState: "unknown" });
  });

  it("does not retry terminal authorization/configuration rejection", async () => {
    const cms = fakeDispatchState();
    const createTask = vi.fn(async () => {
      throw new FeedbackTaskCreateError("terminal", "UNCLASSIFIED");
    });
    const dispatcher = createCoordinatedFeedbackDispatcher({
      taskClient: fakeTaskClient(createTask),
      dispatchState: cms.port,
    });

    await dispatcher.dispatch({ reportRunId, taskName, expectedStateVersion: 4 });
    expect(createTask).toHaveBeenCalledTimes(1);
    expect(cms.getState()).toMatchObject({ dispatchState: "unknown" });
  });
});
