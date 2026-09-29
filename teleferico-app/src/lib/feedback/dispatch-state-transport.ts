import "server-only";

import { validateTrustedCmsOrigin } from "@teleferico/tb113-runtime-contracts";
import type { FeedbackDispatchStatePort } from "./dispatch";

const PATH_ROOT = "/api/tb113/admin/generations";
const CONTRACT = "survey-dispatch-state.v1";
const MAX_RESPONSE_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const RUN_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(): never {
  throw new Error("Feedback dispatch state is unavailable");
}

async function readJson(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES)) return fail();
  if (!response.body) return fail();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined);
        return fail();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return fail(); }
}

function validateResult(input: {
  value: unknown;
  reportRunId: string;
  taskName: string;
  state: "reserved" | "created" | "unknown";
  stateVersion: number;
  dispatchAttemptCount: number;
}): { stateVersion: number; replayed: boolean } {
  const { value } = input;
  const keys = ["contractVersion", "reportRunId", "taskName", "stateVersion", "status", "dispatchState", "dispatchAttemptCount", "failureCode", "replayed"];
  if (!isRecord(value) || Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key)) ||
      value.contractVersion !== CONTRACT || value.reportRunId !== input.reportRunId || value.taskName !== input.taskName ||
      value.status !== "queued" || value.dispatchState !== input.state || value.failureCode !== null ||
      value.stateVersion !== input.stateVersion || value.dispatchAttemptCount !== input.dispatchAttemptCount ||
      typeof value.replayed !== "boolean") return fail();
  return { stateVersion: value.stateVersion as number, replayed: value.replayed };
}

export function createFeedbackDispatchStateTransport(input: {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly string[];
  readonly sessionJwt: string;
  readonly fetchImplementation?: typeof fetch;
}): FeedbackDispatchStatePort {
  let origin: URL;
  try { origin = validateTrustedCmsOrigin(input.baseUrl, input.allowedOrigins); }
  catch { return fail(); }
  if (!input.sessionJwt || input.sessionJwt.length > 8192 || /[\u0000-\u0020\u007f]/.test(input.sessionJwt)) return fail();
  const fetchImplementation = input.fetchImplementation ?? fetch;

  async function post(reportRunId: string, command: JsonRecord, expected: {
    taskName: string; state: "reserved" | "created" | "unknown"; stateVersion: number; dispatchAttemptCount: number;
  }) {
    if (!RUN_ID_PATTERN.test(reportRunId)) return fail();
    const url = new URL(`${PATH_ROOT}/${reportRunId}/dispatch-state`, origin);
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImplementation(url, {
        method: "POST",
        headers: { authorization: `Bearer ${input.sessionJwt}`, accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(command),
        cache: "no-store",
        redirect: "error",
        signal,
      });
    } catch { return fail(); }
    if (response.redirected || (response.url !== "" && new URL(response.url).origin !== origin.origin) || !response.ok ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get("content-type") ?? "")) return fail();
    const result = await readJson(response);
    return validateResult({ value: result, reportRunId, ...expected });
  }

  return Object.freeze({
    trust: "verified" as const,
    async reserve(command) {
      const expectedStateVersion = command.expectedStateVersion + 1;
      const result = await post(command.reportRunId, {
        contractVersion: CONTRACT,
        action: "reserve",
        expectedStateVersion: command.expectedStateVersion,
        taskName: command.taskName,
      }, { taskName: command.taskName, state: "reserved", stateVersion: expectedStateVersion, dispatchAttemptCount: 0 });
      return {
        reportRunId: command.reportRunId,
        taskName: command.taskName,
        stateVersion: result.stateVersion,
        dispatchState: "reserved" as const,
        dispatchAttemptCount: 0,
        replayed: result.replayed,
      };
    },
    async record(command) {
      const stateVersion = command.expectedStateVersion + 1;
      const result = await post(command.reportRunId, {
        contractVersion: CONTRACT,
        action: "record",
        expectedStateVersion: command.expectedStateVersion,
        taskName: command.taskName,
        outcome: command.outcome,
        dispatchAttemptCount: command.dispatchAttemptCount,
        evidence: command.evidence,
      }, {
        taskName: command.taskName,
        state: command.outcome,
        stateVersion,
        dispatchAttemptCount: command.dispatchAttemptCount,
      });
      return {
        reportRunId: command.reportRunId,
        taskName: command.taskName,
        stateVersion: result.stateVersion,
        dispatchState: command.outcome,
        dispatchAttemptCount: command.dispatchAttemptCount,
        replayed: result.replayed,
      };
    },
  });
}
