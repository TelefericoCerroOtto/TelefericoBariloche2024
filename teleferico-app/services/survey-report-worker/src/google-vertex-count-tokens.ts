import "server-only";

import { GoogleAuth } from "google-auth-library";
import { canonicalizeJson } from "../../../packages/survey-reporting-core/src";
import { DIRECT_INSTRUCTIONS, DIRECT_SCHEMA } from "./direct-execution-plan";
import {
  MAP_INSTRUCTIONS,
  MAP_SCHEMA,
  REDUCE_INSTRUCTIONS,
  REDUCE_SCHEMA,
} from "./map-reduce-execution-plan";
import type {
  CountTokensProvider,
  CountTokensRequestV1,
  DirectAnalysisV1,
  DirectModelRequestV1,
  MapAnalysisV1,
  MapAnalysisProvider,
  MapModelRequestV1,
  ModelConfigV1,
  ProviderResultV1,
  PublishedAnalysisV1,
  ReduceAnalysisV1,
  ReduceAnalysisProvider,
  ReduceModelRequestV1,
  ValidatedAnalysisProvider,
} from "./contracts";
import { assertKeylessCloudRunEnvironment } from "./google-auth-runtime";

const APPROVED_MODEL = "gemini-3.8-flash";
const APPROVED_PROJECT = "teleferico-bariloche-2024";
const APPROVED_LOCATION = "us";
const APPROVED_ENDPOINT = "aiplatform.us.rep.googleapis.com";
const MAX_RESPONSE_BYTES = 16 * 1024;
const MAX_GENERATION_RESPONSE_BYTES = 128 * 1024;
const MAX_GENERATION_TEXT_BYTES = 96 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const SEGMENTS = ["instructions", "schema", "metrics", "comments"] as const;

type AccessTokenProvider = () => Promise<string>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(code: "AUTHENTICATION" | "CONFIGURATION" | "INVALID_OUTPUT" | "PROVIDER_RATE_LIMIT" | "PROVIDER_TIMEOUT" | "PROVIDER_TRANSIENT"): never {
  throw Object.assign(new Error("Vertex request failed"), { code });
}

function assertApprovedConfig(value: ModelConfigV1): void {
  if (
    value?.version !== "survey-model-config.v1" || value.provider !== "vertex-ai" ||
    value.vertexProjectId !== APPROVED_PROJECT || value.vertexLocation !== APPROVED_LOCATION ||
    value.vertexApiEndpoint !== APPROVED_ENDPOINT || value.model !== APPROVED_MODEL ||
    value.temperature !== 0 || value.reasoning !== "LOW" || value.grounding !== false
  ) throw Object.assign(new TypeError("Vertex model configuration is not approved"), { code: "CONFIGURATION" as const });
}

async function readJson(response: Response, maxBytes = MAX_RESPONSE_BYTES): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes))
    throw new Error("invalid-provider-response");
  if (!response.body) throw new Error("invalid-provider-response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error("invalid-provider-response");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

type GenerationStage = "direct" | "map" | "reduce";

function expectedPrompt(stage: GenerationStage) {
  return stage === "direct"
    ? { instructions: DIRECT_INSTRUCTIONS, schema: DIRECT_SCHEMA }
    : stage === "map"
      ? { instructions: MAP_INSTRUCTIONS, schema: MAP_SCHEMA }
      : { instructions: REDUCE_INSTRUCTIONS, schema: REDUCE_SCHEMA };
}

function generationInputIsBound(
  stage: GenerationStage,
  request: DirectModelRequestV1 | MapModelRequestV1 | ReduceModelRequestV1,
  countRequest: CountTokensRequestV1,
): boolean {
  const requestKeys = stage === "direct"
    ? ["contractVersion", "metrics", "comments"]
    : stage === "map"
      ? ["contractVersion", "chunkId", "chunkIndex", "chunkCount", "metrics", "comments"]
      : ["contractVersion", "metrics", "maps"];
  const expectedVersion = stage === "direct"
    ? "survey-model-input.v1"
    : stage === "map" ? "survey-map-input.v1" : "survey-reduce-input.v1";
  if (!isRecord(request) || request.contractVersion !== expectedVersion ||
      Object.keys(request).length !== requestKeys.length || requestKeys.some((key) => !Object.hasOwn(request, key)))
    return false;
  const segmentKeys = ["instructions", "schema", "metrics", "comments"];
  if (!isRecord(countRequest) || countRequest.contractVersion !== "survey-count-request.v1" ||
      !isRecord(countRequest.segments) || Object.keys(countRequest.segments).length !== segmentKeys.length ||
      !segmentKeys.every((key) => typeof countRequest.segments[key as keyof typeof countRequest.segments] === "string"))
    return false;
  const prompt = expectedPrompt(stage);
  const expectedComments = stage === "direct"
    ? (request as DirectModelRequestV1).comments.length === 0
      ? canonicalizeJson([])
      : canonicalizeJson({
          contractVersion: request.contractVersion,
          comments: (request as DirectModelRequestV1).comments,
        })
    : canonicalizeJson(request);
  return countRequest.segments.instructions === prompt.instructions &&
    countRequest.segments.schema === prompt.schema &&
    countRequest.segments.metrics === canonicalizeJson(request.metrics) &&
    countRequest.segments.comments === expectedComments;
}

function generationBody(stage: GenerationStage, countRequest: CountTokensRequestV1): string {
  const maxOutputTokens = stage === "map"
    ? countRequest.modelConfig.map.hardMax
    : countRequest.modelConfig.directReduce.hardMax;
  return JSON.stringify({
    contents: [{
      role: "user",
      parts: [
        { text: countRequest.segments.instructions },
        { text: countRequest.segments.schema },
        { text: countRequest.segments.metrics },
        { text: countRequest.segments.comments },
      ],
    }],
    generationConfig: {
      temperature: 0,
      maxOutputTokens,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "LOW" },
    },
  });
}

export function createGoogleVertexCountTokensProvider(input: {
  readonly fetchImplementation?: typeof fetch;
  readonly accessTokenProvider?: AccessTokenProvider;
  readonly timeoutMs?: number;
} = {}): CountTokensProvider {
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const timeoutMs = input.timeoutMs ?? REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
    throw new TypeError("Vertex request timeout is invalid");
  const accessTokenProvider = input.accessTokenProvider ?? (async () => {
    assertKeylessCloudRunEnvironment();
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const result = await client.getAccessToken();
    if (!result.token) throw new Error("application-default-credentials-unavailable");
    return result.token;
  });

  return async (request: CountTokensRequestV1) => {
    assertApprovedConfig(request.modelConfig);
    if (
      request.contractVersion !== "survey-count-request.v1" || !isRecord(request.segments) ||
      Object.keys(request.segments).length !== SEGMENTS.length ||
      SEGMENTS.some((key) => typeof request.segments[key] !== "string")
    ) throw Object.assign(new TypeError("Vertex CountTokens request is invalid"), { code: "CONFIGURATION" as const });

    const counts = {} as Record<(typeof SEGMENTS)[number], number>;
    const endpoint = `https://${APPROVED_ENDPOINT}/v1/projects/${APPROVED_PROJECT}/locations/${APPROVED_LOCATION}/publishers/google/models/${APPROVED_MODEL}:countTokens`;
    for (const segment of SEGMENTS) {
      const signal = AbortSignal.timeout(timeoutMs);
      let accessToken: string;
      try {
        accessToken = await new Promise<string>((resolve, reject) => {
          const abort = () => reject(new Error("application-default-credentials-timeout"));
          signal.addEventListener("abort", abort, { once: true });
          Promise.resolve(accessTokenProvider()).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
          if (signal.aborted) abort();
        });
      } catch {
        throw Object.assign(new Error("Vertex authentication is unavailable"), { code: "AUTHENTICATION" as const });
      }
      if (!accessToken || /[\u0000-\u0020\u007f]/.test(accessToken))
        throw Object.assign(new Error("Vertex authentication is unavailable"), { code: "AUTHENTICATION" as const });
      if (signal.aborted)
        throw Object.assign(new Error("Vertex CountTokens request timed out"), { code: "PROVIDER_TIMEOUT" as const });

      let response: Response;
      try {
        response = await fetchImplementation(endpoint, {
          method: "POST",
          headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: request.segments[segment] }] }] }),
          cache: "no-store",
          redirect: "error",
          signal,
        });
      } catch {
        throw Object.assign(new Error("Vertex CountTokens request failed"), { code: signal.aborted ? "PROVIDER_TIMEOUT" : "PROVIDER_TRANSIENT" });
      }
      if (response.redirected || !response.ok)
        throw Object.assign(new Error("Vertex CountTokens request failed"), {
          code: response.status === 429 ? "PROVIDER_RATE_LIMIT" : response.status >= 500 ? "PROVIDER_TRANSIENT" : "CONFIGURATION",
        });
      let result: unknown;
      try { result = await readJson(response); } catch {
        throw Object.assign(new Error("Vertex CountTokens response is invalid"), { code: "CONFIGURATION" as const });
      }
      const totalTokens = isRecord(result) ? result.totalTokens : undefined;
      if (!Number.isSafeInteger(totalTokens) || Number(totalTokens) < 0)
        throw Object.assign(new Error("Vertex CountTokens response is invalid"), { code: "CONFIGURATION" as const });
      counts[segment] = Number(totalTokens);
    }
    return counts;
  };
}

export function createGoogleVertexModelProviders(input: {
  readonly fetchImplementation?: typeof fetch;
  readonly accessTokenProvider?: AccessTokenProvider;
  readonly timeoutMs?: number;
} = {}): {
  readonly analysisProvider: ValidatedAnalysisProvider;
  readonly mapProvider: MapAnalysisProvider;
  readonly reduceProvider: ReduceAnalysisProvider;
} {
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const timeoutMs = input.timeoutMs ?? REQUEST_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
    throw new TypeError("Vertex request timeout is invalid");
  const accessTokenProvider = input.accessTokenProvider ?? (async () => {
    assertKeylessCloudRunEnvironment();
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const result = await client.getAccessToken();
    if (!result.token) throw new Error("application-default-credentials-unavailable");
    return result.token;
  });
  const endpoint = `https://${APPROVED_ENDPOINT}/v1/projects/${APPROVED_PROJECT}/locations/${APPROVED_LOCATION}/publishers/google/models/${APPROVED_MODEL}:generateContent`;

  async function generate<T>(input: {
    readonly stage: GenerationStage;
    readonly request: DirectModelRequestV1 | MapModelRequestV1 | ReduceModelRequestV1;
    readonly countRequest: CountTokensRequestV1;
  }): Promise<ProviderResultV1<T>> {
    const countRequest = input.countRequest;
    assertApprovedConfig(countRequest.modelConfig);
    if (!generationInputIsBound(input.stage, input.request, countRequest))
      return fail("CONFIGURATION");

    const signal = AbortSignal.timeout(timeoutMs);
    let accessToken: string;
    try {
      accessToken = await new Promise<string>((resolve, reject) => {
        const abort = () => reject(new Error("application-default-credentials-timeout"));
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve(accessTokenProvider()).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
        if (signal.aborted) abort();
      });
    } catch {
      return fail("AUTHENTICATION");
    }
    if (!accessToken || /[\u0000-\u0020\u007f]/.test(accessToken)) return fail("AUTHENTICATION");
    if (signal.aborted) return fail("PROVIDER_TIMEOUT");

    let response: Response;
    try {
      response = await fetchImplementation(endpoint, {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: generationBody(input.stage, countRequest),
        cache: "no-store",
        redirect: "error",
        signal,
      });
    } catch {
      return fail(signal.aborted ? "PROVIDER_TIMEOUT" : "PROVIDER_TRANSIENT");
    }
    if (response.redirected) return fail("CONFIGURATION");
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return fail("AUTHENTICATION");
      if (response.status === 429) return fail("PROVIDER_RATE_LIMIT");
      return fail(response.status >= 500 ? "PROVIDER_TRANSIENT" : "CONFIGURATION");
    }
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? ""))
      return fail("CONFIGURATION");

    let result: unknown;
    try {
      result = await readJson(response, MAX_GENERATION_RESPONSE_BYTES);
    } catch {
      return fail("CONFIGURATION");
    }
    if (!isRecord(result) || !Array.isArray(result.candidates) || result.candidates.length !== 1 ||
        typeof result.modelVersion !== "string" || result.modelVersion.length === 0 || result.modelVersion.length > 128 ||
        !isRecord(result.usageMetadata))
      return fail("INVALID_OUTPUT");
    const candidate = result.candidates[0];
    if (!isRecord(candidate) || candidate.finishReason !== "STOP" || !isRecord(candidate.content) ||
        !Array.isArray(candidate.content.parts) || candidate.content.parts.length !== 1 ||
        !isRecord(candidate.content.parts[0]) || typeof candidate.content.parts[0].text !== "string" ||
        candidate.content.parts[0].thought === true)
      return fail("INVALID_OUTPUT");
    const text = candidate.content.parts[0].text;
    if (Buffer.byteLength(text, "utf8") > MAX_GENERATION_TEXT_BYTES) return fail("INVALID_OUTPUT");
    let output: unknown;
    try {
      output = JSON.parse(text);
    } catch {
      return fail("INVALID_OUTPUT");
    }
    const usageMetadata = result.usageMetadata;
    if (!Number.isSafeInteger(usageMetadata.promptTokenCount) || Number(usageMetadata.promptTokenCount) < 0 ||
        Number(usageMetadata.promptTokenCount) > countRequest.modelConfig.verifiedInputTokenLimit ||
        !Number.isSafeInteger(usageMetadata.candidatesTokenCount) || Number(usageMetadata.candidatesTokenCount) < 0)
      return fail("INVALID_OUTPUT");
    return {
      output: output as T,
      usage: {
        model: countRequest.modelConfig.model,
        modelRevision: result.modelVersion,
        sku: countRequest.modelConfig.model,
        usageMetadata: {
          promptTokenCount: Number(usageMetadata.promptTokenCount),
          candidatesTokenCount: Number(usageMetadata.candidatesTokenCount),
        },
      },
    };
  }

  return Object.freeze({
    analysisProvider: (request: DirectModelRequestV1, countRequest: CountTokensRequestV1) =>
      generate<DirectAnalysisV1 | PublishedAnalysisV1>({ stage: "direct", request, countRequest }),
    mapProvider: (request: MapModelRequestV1, countRequest: CountTokensRequestV1) =>
      generate<MapAnalysisV1>({ stage: "map", request, countRequest }),
    reduceProvider: (request: ReduceModelRequestV1, countRequest: CountTokensRequestV1) =>
      generate<ReduceAnalysisV1>({ stage: "reduce", request, countRequest }),
  });
}
