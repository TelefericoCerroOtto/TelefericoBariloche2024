import { createHash } from "crypto";
import { Socket, connect as connectNet } from "net";
import { connect as connectTls, TLSSocket } from "tls";

type RedisScalar = string | number | null;
export type RedisResponse = RedisScalar | RedisResponse[];

type RateEntry = {
  hits: number;
  resetAt: number;
};

export type RateLimitIncrementResult = {
  count: number;
  resetAt: number;
};

export interface RateLimitStore {
  increment(_key: string, _windowMs: number): Promise<RateLimitIncrementResult>;
}

export type RateLimitResult =
  | {
      ok: true;
      limited: false;
      reset: number;
    }
  | {
      ok: true;
      limited: true;
      reset: number;
    }
  | {
      ok: false;
      limited: false;
      error: Error;
    };

const REDIS_RATE_LIMIT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then",
  "  redis.call('PEXPIRE', KEYS[1], ARGV[1])",
  "end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {count, ttl}",
].join("\n");

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly store = new Map<string, RateEntry>();

  async increment(
    key: string,
    windowMs: number,
  ): Promise<RateLimitIncrementResult> {
    if (this.store.size > 10_000) {
      this.store.clear();
    }

    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      const resetAt = now + windowMs;
      this.store.set(key, { hits: 1, resetAt });
      return { count: 1, resetAt };
    }

    entry.hits += 1;
    return { count: entry.hits, resetAt: entry.resetAt };
  }
}

type RedisStoreOptions = {
  connectTimeoutMs: number;
  url: string;
};

type ConfiguredStoreOptions = RedisStoreOptions & {
  nodeEnv?: string;
};

class RedisRateLimitStore implements RateLimitStore {
  private readonly options: RedisStoreOptions;

  constructor(options: RedisStoreOptions) {
    this.options = options;
  }

  async increment(
    key: string,
    windowMs: number,
  ): Promise<RateLimitIncrementResult> {
    const url = new URL(this.options.url);
    const responses = await runRedisCommands(
      url,
      this.options.connectTimeoutMs,
      [[REDIS_RATE_LIMIT_SCRIPT, "1", key, String(windowMs)]],
    );

    const evalResponse = responses.at(-1);
    if (!Array.isArray(evalResponse)) {
      throw new Error("Unexpected Redis rate-limit response");
    }

    const count = Number(evalResponse[0]);
    const ttlMs = Number(evalResponse[1]);
    if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
      throw new Error("Invalid Redis rate-limit payload");
    }

    return {
      count,
      resetAt: Date.now() + Math.max(ttlMs, 0),
    };
  }
}

type RespResult = {
  bytes: number;
  value: RedisResponse;
};

function encodeRedisCommand(command: string, args: string[]): string {
  const parts = [command, ...args];

  return (
    `*${parts.length}\r\n` +
    parts
      .map((part) => {
        const value = String(part);
        return `$${Buffer.byteLength(value)}\r\n${value}\r\n`;
      })
      .join("")
  );
}

function parseRedisResponse(buffer: Buffer, startAt = 0): RespResult | null {
  const prefix = String.fromCharCode(buffer[startAt] ?? 0);
  const lineEnd = buffer.indexOf("\r\n", startAt);
  if (lineEnd === -1) return null;

  const header = buffer.toString("utf8", startAt + 1, lineEnd);

  switch (prefix) {
    case "+":
      return { bytes: lineEnd + 2 - startAt, value: header };
    case ":":
      return { bytes: lineEnd + 2 - startAt, value: Number(header) };
    case "$": {
      const size = Number(header);
      if (size === -1) {
        return { bytes: lineEnd + 2 - startAt, value: null };
      }

      const valueStart = lineEnd + 2;
      const valueEnd = valueStart + size;
      if (buffer.length < valueEnd + 2) return null;

      return {
        bytes: valueEnd + 2 - startAt,
        value: buffer.toString("utf8", valueStart, valueEnd),
      };
    }
    case "*": {
      const count = Number(header);
      if (count === -1) {
        return { bytes: lineEnd + 2 - startAt, value: [] };
      }

      let cursor = lineEnd + 2;
      const values: RedisResponse[] = [];

      for (let index = 0; index < count; index += 1) {
        const nested = parseRedisResponse(buffer, cursor);
        if (!nested) return null;
        values.push(nested.value);
        cursor += nested.bytes;
      }

      return { bytes: cursor - startAt, value: values };
    }
    case "-":
      throw new Error(`Redis error: ${header}`);
    default:
      throw new Error(`Unsupported Redis RESP prefix: ${prefix}`);
  }
}

function createSocket(url: URL): Promise<Socket | TLSSocket> {
  const isTls = url.protocol === "rediss:";
  const port = Number(url.port || (isTls ? 6380 : 6379));
  const hostname = url.hostname;

  return new Promise((resolve, reject) => {
    const socket = isTls
      ? connectTls({ host: hostname, port, servername: hostname })
      : connectNet({ host: hostname, port });

    socket.once("error", reject);
    socket.once("connect", () => {
      socket.removeListener("error", reject);
      resolve(socket);
    });
  });
}

export async function runRedisCommands(
  url: URL,
  connectTimeoutMs: number,
  commands: Array<[script: string, keysCount: string, ...args: string[]]>,
): Promise<RedisResponse[]> {
  const socket = await createSocket(url);

  return await new Promise<RedisResponse[]>((resolve, reject) => {
    const responses: RedisResponse[] = [];
    let buffer = Buffer.alloc(0);
    let settled = false;

    const safeReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(error instanceof Error ? error : new Error("Redis socket failed"));
    };

    const expectedResponses =
      commands.length +
      (url.username || url.password ? 1 : 0) +
      (url.pathname && url.pathname !== "/" ? 1 : 0);

    socket.setTimeout(connectTimeoutMs, () => {
      safeReject(new Error("Redis connection timed out"));
    });

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);

      try {
        while (responses.length < expectedResponses) {
          const parsed = parseRedisResponse(buffer);
          if (!parsed) return;
          responses.push(parsed.value);
          buffer = buffer.subarray(parsed.bytes);
        }

        if (!settled) {
          settled = true;
          socket.end();
          resolve(responses);
        }
      } catch (error) {
        safeReject(error);
      }
    });

    socket.once("error", safeReject);

    const commandParts: string[] = [];
    if (url.username || url.password) {
      const authArgs = url.username
        ? [decodeURIComponent(url.username), decodeURIComponent(url.password)]
        : [decodeURIComponent(url.password)];
      commandParts.push(encodeRedisCommand("AUTH", authArgs));
    }

    if (url.pathname && url.pathname !== "/") {
      commandParts.push(
        encodeRedisCommand("SELECT", [url.pathname.replace(/^\//, "")]),
      );
    }

    for (const [script, keysCount, ...args] of commands) {
      commandParts.push(
        encodeRedisCommand("EVAL", [script, keysCount, ...args]),
      );
    }

    socket.write(commandParts.join(""));
  });
}

export function createMemoryRateLimitStore(): RateLimitStore {
  return new InMemoryRateLimitStore();
}

export function createRedisRateLimitStore(
  options: RedisStoreOptions,
): RateLimitStore {
  return new RedisRateLimitStore(options);
}

export function createUnavailableRateLimitStore(
  message: string,
): RateLimitStore {
  return {
    async increment() {
      throw new Error(message);
    },
  };
}

export function createConfiguredRateLimitStore(
  options: ConfiguredStoreOptions,
): RateLimitStore {
  if (options.nodeEnv === "test") {
    return createMemoryRateLimitStore();
  }

  if (!options.url) {
    return createUnavailableRateLimitStore(
      "FORM_PROTECTION_REDIS_URL is not configured for shared rate limiting",
    );
  }

  return createRedisRateLimitStore({
    connectTimeoutMs: options.connectTimeoutMs,
    url: options.url,
  });
}

export function buildRateLimitKey(
  namespace: string,
  form: string,
  identity: string,
): string {
  return [
    "public-form",
    namespace,
    form,
    "ip",
    createHash("sha256").update(identity).digest("hex"),
  ].join(":");
}

export async function isRateLimited(
  identityKey: string,
  store: RateLimitStore,
  maxHits: number,
  windowMs: number,
): Promise<RateLimitResult> {
  try {
    const result = await store.increment(identityKey, windowMs);

    if (result.count > maxHits) {
      return { ok: true, limited: true, reset: result.resetAt };
    }

    return { ok: true, limited: false, reset: result.resetAt };
  } catch (error) {
    return {
      ok: false,
      limited: false,
      error:
        error instanceof Error ? error : new Error("RATE_LIMIT_STORE_ERROR"),
    };
  }
}
