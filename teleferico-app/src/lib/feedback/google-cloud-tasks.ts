import "server-only";

import { GoogleAuth } from "google-auth-library";
import { assertKeylessCloudRunEnvironment } from "@teleferico/tb113-runtime-contracts";
import { createFeedbackTaskName, FeedbackTaskCreateError, type FeedbackCloudTaskClient } from "./dispatch";

const API_ROOT = "https://cloudtasks.googleapis.com/v2";
const PROJECT_ID = "teleferico-bariloche-2024";
const LOCATION = "southamerica-east1";
const EXECUTE_PATH = "/internal/v1/report-runs:execute";
const MAX_TASK_BYTES = 100 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;

type AccessTokenProvider = () => Promise<string>;

type TaskIdentity = {
  readonly taskName: string;
  readonly reportRunId: string;
  readonly commandVersion?: "survey-report-command.v1";
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTaskConfig(input: {
  readonly projectId: string;
  readonly location: string;
  readonly queue: string;
  readonly workerUrl: string;
  readonly audience: string;
  readonly invokerServiceAccount: string;
}): URL {
  let workerUrl: URL;
  try {
    workerUrl = new URL(input.workerUrl);
  } catch {
    throw new TypeError("Cloud Tasks runtime configuration is invalid");
  }
  if (
    input.projectId !== PROJECT_ID || input.location !== LOCATION ||
    !/^[a-z][a-z0-9-]{0,62}$/.test(input.queue) ||
    workerUrl.protocol !== "https:" || workerUrl.username || workerUrl.password ||
    !workerUrl.hostname.endsWith(".a.run.app") ||
    workerUrl.pathname !== EXECUTE_PATH || workerUrl.search || workerUrl.hash ||
    input.audience !== workerUrl.origin ||
    !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(input.invokerServiceAccount)
  ) throw new TypeError("Cloud Tasks runtime configuration is invalid");
  return workerUrl;
}

async function readJson(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > 16 * 1024))
    throw new Error("invalid-response");
  if (!response.body) throw new Error("invalid-response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024) {
        await reader.cancel().catch(() => undefined);
        throw new Error("invalid-response");
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
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

function exactIdentity(input: unknown, taskName: string, reportRunId: string): boolean {
  if (!isRecord(input) || !isRecord(input.httpRequest)) return false;
  const request = input.httpRequest;
  if (request.httpMethod !== "POST" || typeof request.body !== "string" || typeof request.url !== "string" ||
      !isRecord(request.headers) || !isRecord(request.oidcToken)) return false;
  const contentType = Object.entries(request.headers).find(([name]) => name.toLowerCase() === "content-type")?.[1];
  let body: unknown;
  try {
    body = JSON.parse(Buffer.from(request.body, "base64").toString("utf8"));
  } catch {
    return false;
  }
  const token = request.oidcToken;
  return input.name === taskName && isRecord(body) && Object.keys(body).length === 2 &&
      body.commandVersion === "survey-report-command.v1" && body.reportRunId === reportRunId &&
      contentType === "application/json" &&
      typeof token.serviceAccountEmail === "string" && typeof token.audience === "string";
}

export function createGoogleFeedbackTaskClient(input: {
  readonly projectId: string;
  readonly location: string;
  readonly queue: string;
  readonly workerUrl: string;
  readonly audience: string;
  readonly invokerServiceAccount: string;
  readonly fetchImplementation?: typeof fetch;
  readonly accessTokenProvider?: AccessTokenProvider;
}): FeedbackCloudTaskClient {
  const workerUrl = validTaskConfig(input);
  const queueName = `projects/${input.projectId}/locations/${input.location}/queues/${input.queue}`;
  const fetchImplementation = input.fetchImplementation ?? fetch;
  const accessTokenProvider = input.accessTokenProvider ?? (async () => {
    assertKeylessCloudRunEnvironment();
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const result = await client.getAccessToken();
    if (!result.token) throw new Error("application-default-credentials-unavailable");
    return result.token;
  });

  async function send(url: string, init: RequestInit): Promise<Response> {
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let accessToken: string;
    try {
      accessToken = await new Promise<string>((resolve, reject) => {
        const abort = () => reject(new Error("application-default-credentials-timeout"));
        signal.addEventListener("abort", abort, { once: true });
        Promise.resolve(accessTokenProvider()).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
        if (signal.aborted) abort();
      });
    } catch {
      throw new FeedbackTaskCreateError("terminal", "PROVIDER_UNAVAILABLE");
    }
    if (!accessToken || /[\u0000-\u0020\u007f]/.test(accessToken))
      throw new FeedbackTaskCreateError("terminal", "PROVIDER_UNAVAILABLE");
    if (signal.aborted) throw new FeedbackTaskCreateError("terminal", "PROVIDER_UNAVAILABLE");
    try {
      const response = await fetchImplementation(url, {
        ...init,
        headers: { ...init.headers, authorization: `Bearer ${accessToken}` },
        redirect: "error",
        signal,
      });
      if (response.redirected) throw new Error("ambiguous-response");
      return response;
    } catch {
      throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
    }
  }

  return Object.freeze({
    trust: "verified" as const,
    async createTask(task: TaskIdentity) {
      const expectedName = createFeedbackTaskName(task.reportRunId);
      if (!expectedName || task.taskName !== expectedName || task.commandVersion !== "survey-report-command.v1")
        throw new FeedbackTaskCreateError("terminal");
      const fullName = `${queueName}/tasks/${task.taskName}`;
      const command = JSON.stringify({ commandVersion: "survey-report-command.v1", reportRunId: task.reportRunId });
      if (Buffer.byteLength(command, "utf8") > MAX_TASK_BYTES)
        throw new FeedbackTaskCreateError("terminal");
      const requestBody = JSON.stringify({ task: {
        name: fullName,
        httpRequest: {
          httpMethod: "POST",
          url: workerUrl.toString(),
          headers: { "Content-Type": "application/json" },
          body: Buffer.from(command, "utf8").toString("base64"),
          oidcToken: { serviceAccountEmail: input.invokerServiceAccount, audience: input.audience },
        },
      } });
      let response: Response;
      try {
        response = await send(`${API_ROOT}/${queueName}/tasks`, {
          method: "POST", headers: { "content-type": "application/json" }, body: requestBody,
        });
      } catch (error) {
        if (error instanceof FeedbackTaskCreateError) throw error;
        throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
      }
      if (response.status === 409) {
        let result: unknown;
        try { result = await readJson(response); } catch {
          throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
        }
        if (isRecord(result) && isRecord(result.error) && result.error.status === "ALREADY_EXISTS")
          throw new FeedbackTaskCreateError("already-exists");
        throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
      }
      if (response.status === 429)
        throw new FeedbackTaskCreateError("not-sent-transient", "PROVIDER_UNAVAILABLE");
      if (!response.ok) throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
      let result: unknown;
      try { result = await readJson(response); } catch {
        throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
      }
      if (!isRecord(result) || result.name !== fullName)
        throw new FeedbackTaskCreateError("unknown", "AMBIGUOUS_RESPONSE");
      return { taskName: task.taskName, reportRunId: task.reportRunId };
    },
    async verifyExistingTask(task: TaskIdentity) {
      const expectedName = createFeedbackTaskName(task.reportRunId);
      if (!expectedName || task.taskName !== expectedName) return null;
      const fullName = `${queueName}/tasks/${task.taskName}`;
      let response: Response;
      try {
        response = await send(`${API_ROOT}/${fullName}?responseView=FULL`, { method: "GET" });
      } catch { return null; }
      if (response.status === 404) return null;
      if (!response.ok) return null;
      let result: unknown;
      try { result = await readJson(response); } catch { return null; }
      if (
        !isRecord(result) || result.name !== fullName || !exactIdentity(result, fullName, task.reportRunId) ||
        !isRecord(result.httpRequest) || result.httpRequest.url !== workerUrl.toString() ||
        !isRecord(result.httpRequest.oidcToken) ||
        result.httpRequest.oidcToken.serviceAccountEmail !== input.invokerServiceAccount ||
        result.httpRequest.oidcToken.audience !== input.audience
      ) return null;
      return { status: "verified" as const, taskName: task.taskName, reportRunId: task.reportRunId, state: "created" as const };
    },
  });
}
