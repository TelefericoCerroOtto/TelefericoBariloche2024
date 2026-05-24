import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { runFormGuards } from "../form-guards";
import {
  createMemoryRateLimitStore,
  createUnavailableRateLimitStore,
  type RateLimitStore,
} from "../rate-limit";

function createRequest(
  headers: Record<string, string> = {},
  url: string = "https://telefericobariloche.com.ar/api/contact",
): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers,
  });
}

describe("runFormGuards", () => {
  const envBackup = { ...process.env };
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = {
      ...envBackup,
      INTERNAL_API_KEY: "test-internal-key",
      NEXT_PUBLIC_SITE_URL: "https://telefericobariloche.com.ar",
    };
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("blocks missing internal API keys with 401", async () => {
    const result = await runFormGuards(
      createRequest({
        origin: "https://telefericobariloche.com.ar",
        "content-length": "12",
      }),
      {
        form: "contact",
        maxBodyBytes: 100,
        useInternalApiKey: true,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(401);
  });

  it("blocks untrusted origins with 403", async () => {
    const result = await runFormGuards(
      createRequest({
        origin: "https://attacker.example",
        "content-length": "12",
        "x-internal-api-key": "test-internal-key",
      }),
      {
        form: "contact",
        maxBodyBytes: 100,
        useInternalApiKey: true,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(403);
  });

  it("blocks oversized payloads with 413", async () => {
    const result = await runFormGuards(
      createRequest({
        origin: "https://telefericobariloche.com.ar",
        "content-length": "1024",
        "x-internal-api-key": "test-internal-key",
      }),
      {
        form: "contact",
        maxBodyBytes: 100,
        useInternalApiKey: true,
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected guard block");
    expect(result.res.status).toBe(413);
  });

  it("blocks when the rate limit threshold is exceeded", async () => {
    const store = createMemoryRateLimitStore();
    const options = {
      form: "contact" as const,
      maxBodyBytes: 100,
      useInternalApiKey: true,
      rateLimited: {
        namespace: "test",
        rateLimitStore: store,
        maxHits: 1,
        windowMs: 60_000,
      },
    };
    const request = createRequest({
      origin: "https://telefericobariloche.com.ar",
      "content-length": "12",
      "x-client-ip": "203.0.113.9",
      "x-internal-api-key": "test-internal-key",
    });

    const firstPass = await runFormGuards(request, options);
    const secondPass = await runFormGuards(request, options);

    expect(firstPass.ok).toBe(true);
    expect(secondPass.ok).toBe(false);
    if (secondPass.ok) throw new Error("Expected rate limit block");
    expect(secondPass.res.status).toBe(429);

    const event = JSON.parse(String(warnSpy.mock.calls.at(-1)?.[0]));
    expect(event).toMatchObject({
      action: "block",
      form: "contact",
      reason: "too_many_requests",
      status: 429,
      identitySource: "x-client-ip",
      maxHits: 1,
      windowMs: 60_000,
    });
    expect(event.identityHash).toBeTypeOf("string");
    expect(event.identityHash).not.toBe("203.0.113.9");
  });

  it("fails open and logs degraded mode when client IP is missing", async () => {
    const result = await runFormGuards(
      createRequest({
        origin: "https://telefericobariloche.com.ar",
        "content-length": "12",
        "x-internal-api-key": "test-internal-key",
      }),
      {
        form: "contact",
        maxBodyBytes: 100,
        useInternalApiKey: true,
        rateLimited: {
          namespace: "test",
          rateLimitStore: createMemoryRateLimitStore(),
          maxHits: 2,
          windowMs: 60_000,
        },
      },
    );

    expect(result.ok).toBe(true);

    const event = JSON.parse(String(errorSpy.mock.calls.at(-1)?.[0]));
    expect(event).toMatchObject({
      action: "degraded",
      backend: "redis",
      form: "contact",
      layer: "ip",
      reason: "missing_client_ip",
      status: 202,
      identitySource: "missing",
      maxHits: 2,
      windowMs: 60_000,
    });
  });

  it("fails open and logs degraded mode when the limiter backend throws", async () => {
    const brokenStore: RateLimitStore = createUnavailableRateLimitStore(
      "store unavailable",
    );

    const result = await runFormGuards(
      createRequest({
        origin: "https://telefericobariloche.com.ar",
        "content-length": "12",
        "x-client-ip": "203.0.113.11",
        "x-internal-api-key": "test-internal-key",
      }),
      {
        form: "postulation",
        maxBodyBytes: 100,
        useInternalApiKey: true,
        rateLimited: {
          namespace: "test",
          rateLimitStore: brokenStore,
          maxHits: 3,
          windowMs: 120_000,
        },
      },
    );

    expect(result.ok).toBe(true);
    expect(errorSpy).toHaveBeenCalledTimes(2);

    const event = JSON.parse(String(errorSpy.mock.calls[0]?.[0]));
    expect(event).toMatchObject({
      action: "degraded",
      backend: "redis",
      form: "postulation",
      layer: "ip",
      reason: "rate_limit_degraded",
      status: 503,
      identitySource: "x-client-ip",
      maxHits: 3,
      windowMs: 120_000,
    });
    expect(event.identityHash).toBeTypeOf("string");

    expect(String(errorSpy.mock.calls[1]?.[0])).toContain(
      "Form rate-limit backend unavailable",
    );
  });
});
