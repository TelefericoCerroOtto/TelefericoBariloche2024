import { createServer } from "node:http";

const API_PREFIX = "/_local-tasks/v2";
const API_TOKEN = "tb113-local-task-api-v1";
const MAX_REQUEST_BYTES = 100 * 1024;
const TASK_NAME_PATTERN = /^tb113-report-([0-9a-f]{32})$/;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function send(response, status, body) {
  const bytes = Buffer.from(JSON.stringify(body));
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": bytes.byteLength,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    connection: "close",
  });
  response.end(bytes);
}

async function readBody(request) {
  const declaredLength = request.headers["content-length"];
  if (declaredLength !== undefined &&
      (!/^(0|[1-9][0-9]*)$/.test(declaredLength) || Number(declaredLength) > MAX_REQUEST_BYTES))
    return null;
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.byteLength;
    if (length > MAX_REQUEST_BYTES) return null;
    chunks.push(chunk);
  }
  if (declaredLength !== undefined && Number(declaredLength) !== length) return null;
  try {
    return JSON.parse(Buffer.concat(chunks, length).toString("utf8"));
  } catch {
    return null;
  }
}

function taskIdentity(task, expected) {
  if (!isRecord(task) || task.name !== expected.name || !isRecord(task.httpRequest)) return false;
  const request = task.httpRequest;
  const headers = request.headers;
  const oidcToken = request.oidcToken;
  if (request.httpMethod !== "POST" || request.url !== expected.workerUrl ||
      !isRecord(headers) || headers["Content-Type"] !== "application/json" ||
      !isRecord(oidcToken) || oidcToken.serviceAccountEmail !== expected.principal ||
      oidcToken.audience !== expected.audience || typeof request.body !== "string") return false;
  let command;
  try {
    const bytes = Buffer.from(request.body, "base64");
    if (bytes.toString("base64") !== request.body) return false;
    command = JSON.parse(bytes.toString("utf8"));
  } catch {
    return false;
  }
  const match = TASK_NAME_PATTERN.exec(expected.taskName);
  return Boolean(match && isRecord(command) && Object.keys(command).length === 2 &&
    command.commandVersion === "survey-report-command.v1" &&
    command.reportRunId === `${match[1].slice(0, 8)}-${match[1].slice(8, 12)}-${match[1].slice(12, 16)}-${match[1].slice(16, 20)}-${match[1].slice(20)}`);
}

export function createLocalTaskQueueServer({
  queuePath,
  workerUrl,
  audience,
  principal,
  createOidcToken,
  fetchImplementation = fetch,
}) {
  const worker = new URL(workerUrl);
  if (worker.protocol !== "http:" || worker.hostname !== "127.0.0.1" ||
      !/^[1-9][0-9]{0,4}$/.test(worker.port) || Number(worker.port) >= 65_535 ||
      worker.pathname !== "/internal/v1/report-runs:execute" || worker.search || worker.hash ||
      audience !== worker.origin || !/^projects\/teleferico-bariloche-2024\/locations\/southamerica-east1\/queues\/[a-z][a-z0-9-]{0,62}$/.test(queuePath) ||
      typeof createOidcToken !== "function" || typeof principal !== "string" || !principal)
    throw new TypeError("Local task queue configuration is invalid");

  const tasks = new Map();
  const server = createServer(async (request, response) => {
    const authorization = request.headers.authorization;
    if (authorization !== `Bearer ${API_TOKEN}`) {
      send(response, 401, { error: { code: "UNAUTHENTICATED" } });
      return;
    }
    const target = new URL(request.url ?? "/", "http://127.0.0.1");
    const createPath = `${API_PREFIX}/${queuePath}/tasks`;
    if (request.method === "POST" && target.pathname === createPath && !target.search) {
      if (request.headers["content-type"]?.toLowerCase() !== "application/json") {
        send(response, 415, { error: { code: "UNSUPPORTED_MEDIA_TYPE" } });
        return;
      }
      const input = await readBody(request);
      if (!isRecord(input) || Object.keys(input).length !== 1 || !isRecord(input.task) ||
          typeof input.task.name !== "string" || !input.task.name.startsWith(`${queuePath}/tasks/`)) {
        send(response, 400, { error: { code: "INVALID_ARGUMENT" } });
        return;
      }
      const taskName = input.task.name.slice(`${queuePath}/tasks/`.length);
      const expected = { name: input.task.name, taskName, workerUrl, audience, principal };
      if (!TASK_NAME_PATTERN.test(taskName)) {
        send(response, 400, { error: { code: "INVALID_ARGUMENT" } });
        return;
      }
      if (tasks.has(taskName)) {
        send(response, 409, { error: { status: "ALREADY_EXISTS" } });
        return;
      }
      if (!taskIdentity(input.task, expected)) {
        send(response, 400, { error: { code: "INVALID_ARGUMENT" } });
        return;
      }
      let token;
      try {
        token = await createOidcToken();
      } catch {
        send(response, 503, { error: { code: "UNAVAILABLE" } });
        return;
      }
      const stored = structuredClone(input.task);
      tasks.set(taskName, stored);
      try {
        const delivery = await fetchImplementation(workerUrl, {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: Buffer.from(stored.httpRequest.body, "base64"),
          redirect: "error",
          signal: AbortSignal.timeout(10_000),
        });
        await delivery.body?.cancel().catch(() => undefined);
      } catch {
        // The created named task remains available for safe readback after an ambiguous delivery.
      }
      send(response, 200, { name: stored.name });
      return;
    }

    const getPrefix = `${API_PREFIX}/${queuePath}/tasks/`;
    const taskName = target.pathname.startsWith(getPrefix)
      ? target.pathname.slice(getPrefix.length)
      : "";
    if (request.method === "GET" && TASK_NAME_PATTERN.test(taskName) &&
        target.searchParams.size === 1 && target.searchParams.get("responseView") === "FULL") {
      const task = tasks.get(taskName);
      if (!task) {
        send(response, 404, { error: { code: "NOT_FOUND" } });
        return;
      }
      send(response, 200, task);
      return;
    }
    send(response, 404, { error: { code: "NOT_FOUND" } });
  });
  return server;
}
