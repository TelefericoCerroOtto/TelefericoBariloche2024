import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFeedbackBrowserGuard,
  createRedisBrowserGuardStore,
  type BrowserGuardStore,
} from "./browser-guard";

const BROWSER_TOKEN_HASH = "a".repeat(64);
const NOW = new Date("2026-09-17T12:00:00.000Z");
const GUARD_UNTIL = "2026-09-18T12:00:00.000Z";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve());
        }),
    ),
  );
});

async function startRedisFixture(responses: string[]) {
  const commands: string[] = [];
  const server = createServer((socket) => {
    socket.on("data", (chunk) => {
      commands.push(chunk.toString("utf8"));
      socket.write(responses.shift() ?? "-ERR unexpected command\r\n");
    });
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Fixture did not bind TCP");
  return { commands, url: `redis://127.0.0.1:${address.port}` };
}

describe("feedback browser guard", () => {
  it("reads and persists one cross-point guard through the Redis protocol", async () => {
    const fixture = await startRedisFixture([":0\r\n", ":1\r\n", ":1\r\n"]);
    const guard = createFeedbackBrowserGuard({
      now: () => NOW,
      store: createRedisBrowserGuardStore({
        connectTimeoutMs: 1_000,
        namespace: "test",
        url: fixture.url,
      }),
    });

    expect(await guard.isActive(BROWSER_TOKEN_HASH)).toBe(false);
    await guard.persist(BROWSER_TOKEN_HASH, GUARD_UNTIL);
    expect(await guard.isActive(BROWSER_TOKEN_HASH)).toBe(true);

    expect(fixture.commands).toHaveLength(3);
    expect(fixture.commands[0]).toContain("tb113:test:browser-guard:v1:");
    expect(fixture.commands[1]).toContain("86400000");
    expect(fixture.commands.join("\n")).not.toContain(BROWSER_TOKEN_HASH);
  });

  it("fails open and emits safe telemetry for lookup and persistence failures", async () => {
    const store: BrowserGuardStore = {
      isActive: vi.fn(async () => {
        throw new Error("secret lookup detail");
      }),
      persist: vi.fn(async () => {
        throw new Error("secret persistence detail");
      }),
    };
    const emit = vi.fn();
    const guard = createFeedbackBrowserGuard({ store, emit, now: () => NOW });

    expect(await guard.isActive(BROWSER_TOKEN_HASH)).toBe(false);
    await expect(
      guard.persist(BROWSER_TOKEN_HASH, GUARD_UNTIL),
    ).resolves.toBeUndefined();

    expect(emit.mock.calls).toEqual([
      [
        {
          event: "feedback_browser_guard",
          action: "degraded",
          backend: "redis",
          operation: "lookup",
          reason: "redis_unavailable",
          identityHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      ],
      [
        {
          event: "feedback_browser_guard",
          action: "degraded",
          backend: "redis",
          operation: "persist",
          reason: "redis_unavailable",
          identityHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        },
      ],
    ]);
    expect(JSON.stringify(emit.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(emit.mock.calls)).not.toContain(BROWSER_TOKEN_HASH);
  });

  it("degrades safely when the Redis runtime returns protocol errors", async () => {
    const fixture = await startRedisFixture([
      "-ERR lookup unavailable\r\n",
      "-ERR persistence unavailable\r\n",
    ]);
    const emit = vi.fn();
    const guard = createFeedbackBrowserGuard({
      emit,
      now: () => NOW,
      store: createRedisBrowserGuardStore({
        connectTimeoutMs: 1_000,
        namespace: "test",
        url: fixture.url,
      }),
    });

    expect(await guard.isActive(BROWSER_TOKEN_HASH)).toBe(false);
    await expect(
      guard.persist(BROWSER_TOKEN_HASH, GUARD_UNTIL),
    ).resolves.toBeUndefined();

    expect(emit.mock.calls.map(([event]) => event.operation)).toEqual([
      "lookup",
      "persist",
    ]);
    expect(fixture.commands).toHaveLength(2);
  });

  it("keeps intake fail-open when telemetry itself is unavailable", async () => {
    const store: BrowserGuardStore = {
      isActive: vi.fn(async () => {
        throw new Error("lookup unavailable");
      }),
      persist: vi.fn(async () => {
        throw new Error("persist unavailable");
      }),
    };
    const guard = createFeedbackBrowserGuard({
      emit: () => {
        throw new Error("telemetry unavailable");
      },
      now: () => NOW,
      store,
    });

    expect(await guard.isActive(BROWSER_TOKEN_HASH)).toBe(false);
    await expect(
      guard.persist(BROWSER_TOKEN_HASH, GUARD_UNTIL),
    ).resolves.toBeUndefined();
  });

  it("does not recreate an already expired guard", async () => {
    const store: BrowserGuardStore = {
      isActive: vi.fn(async () => false),
      persist: vi.fn(async () => undefined),
    };
    const guard = createFeedbackBrowserGuard({ store, now: () => NOW });

    await guard.persist(BROWSER_TOKEN_HASH, "2026-09-17T11:59:59.999Z");

    expect(store.persist).not.toHaveBeenCalled();
  });
});
