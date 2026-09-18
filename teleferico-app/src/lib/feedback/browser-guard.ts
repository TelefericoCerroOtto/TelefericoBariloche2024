import { createHash } from "node:crypto";
import { runRedisCommands } from "@/lib/http/guards/rate-limit";

const REDIS_LOOKUP_SCRIPT = [
  "local value = redis.call('GET', KEYS[1])",
  "return value and 1 or 0",
].join("\n");

const REDIS_PERSIST_SCRIPT = [
  "redis.call('SET', KEYS[1], '1', 'PX', ARGV[1])",
  "return 1",
].join("\n");

export type BrowserGuardStore = {
  readonly isActive: (browserTokenHash: string) => Promise<boolean>;
  readonly persist: (
    browserTokenHash: string,
    ttlMilliseconds: number,
  ) => Promise<void>;
};

export type FeedbackBrowserGuard = {
  readonly isActive: (browserTokenHash: string) => Promise<boolean>;
  readonly persist: (
    browserTokenHash: string,
    guardUntil: string,
  ) => Promise<void>;
};

type BrowserGuardDegradationEvent = {
  readonly event: "feedback_browser_guard";
  readonly action: "degraded";
  readonly backend: "redis";
  readonly operation: "lookup" | "persist";
  readonly reason: "redis_unavailable";
  readonly identityHash: string;
};

type FeedbackBrowserGuardOptions = {
  readonly store: BrowserGuardStore;
  readonly now?: () => Date;
  readonly emit?: (event: BrowserGuardDegradationEvent) => void;
};

type RedisBrowserGuardStoreOptions = {
  readonly connectTimeoutMs: number;
  readonly namespace: string;
  readonly url: string;
};

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function buildGuardKey(namespace: string, browserTokenHash: string): string {
  return `tb113:${namespace}:browser-guard:v1:${sha256(browserTokenHash)}`;
}

function emitBrowserGuardDegradation(
  event: BrowserGuardDegradationEvent,
): void {
  console.error(JSON.stringify(event));
}

export function createRedisBrowserGuardStore(
  options: RedisBrowserGuardStoreOptions,
): BrowserGuardStore {
  const url = new URL(options.url);

  return {
    async isActive(browserTokenHash) {
      const responses = await runRedisCommands(url, options.connectTimeoutMs, [
        [
          REDIS_LOOKUP_SCRIPT,
          "1",
          buildGuardKey(options.namespace, browserTokenHash),
        ],
      ]);
      const result = responses.at(-1);
      if (result !== 0 && result !== 1) {
        throw new Error("Invalid Redis browser-guard lookup response");
      }
      return result === 1;
    },

    async persist(browserTokenHash, ttlMilliseconds) {
      const responses = await runRedisCommands(url, options.connectTimeoutMs, [
        [
          REDIS_PERSIST_SCRIPT,
          "1",
          buildGuardKey(options.namespace, browserTokenHash),
          String(ttlMilliseconds),
        ],
      ]);
      if (responses.at(-1) !== 1) {
        throw new Error("Invalid Redis browser-guard persistence response");
      }
    },
  };
}

export function createFeedbackBrowserGuard(
  options: FeedbackBrowserGuardOptions,
) {
  const now = options.now ?? (() => new Date());
  const emit = options.emit ?? emitBrowserGuardDegradation;

  const emitDegradation = (
    operation: BrowserGuardDegradationEvent["operation"],
    browserTokenHash: string,
  ) => {
    try {
      emit({
        event: "feedback_browser_guard",
        action: "degraded",
        backend: "redis",
        operation,
        reason: "redis_unavailable",
        identityHash: sha256(browserTokenHash),
      });
    } catch {
      // Telemetry must never turn a fail-open guard into an intake failure.
    }
  };

  return {
    async isActive(browserTokenHash: string): Promise<boolean> {
      try {
        return await options.store.isActive(browserTokenHash);
      } catch {
        emitDegradation("lookup", browserTokenHash);
        return false;
      }
    },

    async persist(browserTokenHash: string, guardUntil: string): Promise<void> {
      const ttlMilliseconds = new Date(guardUntil).getTime() - now().getTime();
      if (!Number.isSafeInteger(ttlMilliseconds) || ttlMilliseconds <= 0)
        return;

      try {
        await options.store.persist(browserTokenHash, ttlMilliseconds);
      } catch {
        emitDegradation("persist", browserTokenHash);
      }
    },
  } satisfies FeedbackBrowserGuard;
}
