import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { WorkerCmsConflictError, type RuntimeFailureCode, type WorkerRuntimeDependencies } from "./contracts";
import { WorkerCmsClientError } from "./worker-cms-client";
import { executeReportWorker } from "./worker-runtime";

export const REPORT_WORKER_EXECUTE_PATH = "/internal/v1/report-runs:execute";
export const REPORT_WORKER_MAX_REQUEST_BYTES = 4 * 1024;

const REPORT_RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RETRYABLE_FAILURES: readonly RuntimeFailureCode[] = [
  "PROVIDER_TRANSIENT",
  "CMS_TRANSIENT",
  "STORAGE_TRANSIENT",
];
const KNOWN_FAILURES: readonly RuntimeFailureCode[] = [
  "PROVIDER_TRANSIENT",
  "PROVIDER_RATE_LIMIT",
  "PROVIDER_TIMEOUT",
  "CMS_TRANSIENT",
  "STORAGE_TRANSIENT",
  "INVALID_OUTPUT",
  "AUTHENTICATION",
  "CONFIGURATION",
  "UNKNOWN_VERSION",
  "INVARIANT",
  "PROHIBITED_CONTENT",
  "QUEUE_ENQUEUE_EXHAUSTED",
];

export type VerifiedOidcClaims = {
  readonly signatureVerified: true;
  readonly issuer: string;
  readonly audience: string | readonly string[];
  readonly principal: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly notBefore?: number;
};

export type ReportWorkerOidcPolicy = {
  readonly issuerAllowlist: readonly string[];
  readonly audience: string;
  readonly principal: string;
  readonly verifySignedToken: (token: string) => Promise<VerifiedOidcClaims | null>;
  readonly nowSeconds?: () => number;
};

export type ReportWorkerRuntimeConfig = {
  readonly oidc: ReportWorkerOidcPolicy;
  readonly dependencies: WorkerRuntimeDependencies;
};

export type ReportWorkerHttpRequest = {
  readonly method: string;
  readonly url: string;
  readonly headers: Headers;
  readonly readBody: () => Promise<Uint8Array>;
};

export type ReportWorkerHttpResponse = {
  readonly status: number;
  readonly body: Readonly<Record<string, unknown>>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validPolicy(policy: ReportWorkerOidcPolicy): boolean {
  return (
    typeof policy?.verifySignedToken === "function" &&
    Array.isArray(policy.issuerAllowlist) &&
    policy.issuerAllowlist.length > 0 &&
    policy.issuerAllowlist.every((issuer) => typeof issuer === "string" && issuer.length > 0) &&
    new Set(policy.issuerAllowlist).size === policy.issuerAllowlist.length &&
    typeof policy.audience === "string" && policy.audience.length > 0 &&
    typeof policy.principal === "string" && policy.principal.length > 0
  );
}

function validDependencies(dependencies: WorkerRuntimeDependencies): boolean {
  return Boolean(
    dependencies &&
      dependencies.cms &&
      dependencies.artifacts &&
      dependencies.renderer &&
      typeof dependencies.cms.claim === "function" &&
      typeof dependencies.cms.snapshot === "function" &&
      typeof dependencies.cms.checkpoint === "function" &&
      typeof dependencies.cms.complete === "function" &&
      typeof dependencies.cms.fail === "function" &&
      typeof dependencies.artifacts.stage === "function" &&
      typeof dependencies.artifacts.readStaged === "function" &&
      typeof dependencies.artifacts.discardStaged === "function" &&
      typeof dependencies.renderer.render === "function" &&
      typeof dependencies.renderer.rendererVersion === "string" &&
      dependencies.renderer.rendererVersion.length > 0,
  );
}

function jsonResponse(
  status: number,
  code: string,
  extra: Record<string, unknown> = {},
): ReportWorkerHttpResponse {
  return { status, body: { error: { code, ...extra } } };
}

function audMatches(audience: VerifiedOidcClaims["audience"], expected: string): boolean {
  return typeof audience === "string"
    ? audience === expected
    : Array.isArray(audience) && audience.length === 1 && audience[0] === expected;
}

function verifiedClaimsAreValid(
  value: unknown,
  policy: ReportWorkerOidcPolicy,
): value is VerifiedOidcClaims {
  if (!isRecord(value)) return false;
  const claims = value as unknown as VerifiedOidcClaims;
  const now = (policy.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
  return (
    claims.signatureVerified === true &&
    typeof claims.issuer === "string" && policy.issuerAllowlist.includes(claims.issuer) &&
    audMatches(claims.audience, policy.audience) &&
    typeof claims.principal === "string" &&
    Number.isSafeInteger(claims.issuedAt) && claims.issuedAt <= now + 30 &&
    Number.isSafeInteger(claims.expiresAt) && claims.expiresAt > now &&
    claims.expiresAt > claims.issuedAt &&
    (claims.notBefore === undefined ||
      (Number.isSafeInteger(claims.notBefore) && claims.notBefore <= now))
  );
}

async function authenticate(
  authorization: string | null,
  policy: ReportWorkerOidcPolicy,
): Promise<"accepted" | "invalid" | "forbidden"> {
  if (!authorization || !/^Bearer [A-Za-z0-9._~-]{1,8192}$/.test(authorization)) return "invalid";
  try {
    const claims = await policy.verifySignedToken(authorization.slice("Bearer ".length));
    if (!verifiedClaimsAreValid(claims, policy)) return "invalid";
    return claims.principal === policy.principal ? "accepted" : "forbidden";
  } catch {
    return "invalid";
  }
}

function parseTarget(target: string): URL | null {
  try {
    return new URL(target, "http://worker.invalid");
  } catch {
    return null;
  }
}

function isJsonContentType(value: string | null): boolean {
  return value !== null && /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(value.trim());
}

function validCommand(value: unknown): value is { commandVersion: string; reportRunId: string } {
  return (
    isRecord(value) &&
    Object.keys(value).length === 2 &&
    value.commandVersion === "survey-report-command.v1" &&
    typeof value.reportRunId === "string" &&
    REPORT_RUN_ID_PATTERN.test(value.reportRunId)
  );
}

function toExecutionResponse(
  result: Awaited<ReturnType<typeof executeReportWorker>>,
): ReportWorkerHttpResponse {
  if (result.status === "failed" && RETRYABLE_FAILURES.includes(result.failureCode))
    return jsonResponse(503, "RETRYABLE_EXECUTION", { reportRunId: result.reportRunId });
  if (result.status === "failed" && !KNOWN_FAILURES.includes(result.failureCode))
    return jsonResponse(500, "INTERNAL_ERROR");

  return {
    status: 200,
    body: {
      contractVersion: "survey-worker-execution.v1",
      reportRunId: result.reportRunId,
      status: result.status,
      disposition: result.disposition,
      ...(result.status === "failed" ? { failureCode: result.failureCode } : {}),
    },
  };
}

export function createReportWorkerHttpHandler(config: ReportWorkerRuntimeConfig) {
  if (!config || !validPolicy(config.oidc) || !validDependencies(config.dependencies))
    throw new TypeError("Private report worker runtime configuration is incomplete");

  const policy: ReportWorkerOidcPolicy = Object.freeze({
    ...config.oidc,
    issuerAllowlist: Object.freeze([...config.oidc.issuerAllowlist]),
  });

  return async (request: ReportWorkerHttpRequest): Promise<ReportWorkerHttpResponse> => {
    const authentication = await authenticate(request.headers.get("authorization"), policy);
    if (authentication === "invalid")
      return jsonResponse(401, "INVALID_OIDC");
    if (authentication === "forbidden")
      return jsonResponse(403, "FORBIDDEN_INVOKER");

    const target = parseTarget(request.url);
    if (request.method !== "POST")
      return jsonResponse(405, "METHOD_NOT_ALLOWED", { allow: "POST" });
    if (!target || target.pathname !== REPORT_WORKER_EXECUTE_PATH || target.hash)
      return jsonResponse(404, "NOT_FOUND");
    if (target.search)
      return jsonResponse(400, "INVALID_COMMAND");
    if (!isJsonContentType(request.headers.get("content-type")))
      return jsonResponse(415, "UNSUPPORTED_MEDIA_TYPE");

    const declaredLength = request.headers.get("content-length");
    if (declaredLength !== null) {
      if (!/^(0|[1-9]\d*)$/.test(declaredLength))
        return jsonResponse(400, "INVALID_COMMAND");
      if (Number(declaredLength) > REPORT_WORKER_MAX_REQUEST_BYTES)
        return jsonResponse(413, "PAYLOAD_TOO_LARGE");
    }

    let bytes: Uint8Array;
    try {
      bytes = await request.readBody();
    } catch {
      return jsonResponse(400, "INVALID_COMMAND");
    }
    if (bytes.byteLength > REPORT_WORKER_MAX_REQUEST_BYTES)
      return jsonResponse(413, "PAYLOAD_TOO_LARGE");
    if (declaredLength !== null && Number(declaredLength) !== bytes.byteLength)
      return jsonResponse(400, "INVALID_COMMAND");

    let command: unknown;
    try {
      command = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      return jsonResponse(400, "INVALID_COMMAND");
    }
    if (!validCommand(command)) return jsonResponse(400, "INVALID_COMMAND");

    try {
      return toExecutionResponse(
        await executeReportWorker(command.reportRunId, config.dependencies),
      );
    } catch (error) {
      if (error instanceof WorkerCmsClientError) {
        if (error.code === "UNKNOWN_VERSION") return jsonResponse(404, "RUN_NOT_FOUND");
        if (error.code === "CMS_TRANSIENT" || error.code === "TIMEOUT")
          return jsonResponse(503, "RETRYABLE_EXECUTION", { reportRunId: command.reportRunId });
        return jsonResponse(500, "INTERNAL_ERROR");
      }
      if (error instanceof WorkerCmsConflictError)
        return jsonResponse(409, "INVALID_STATE");
      if (isRecord(error) &&
        (error.code === "STATE_VERSION_CONFLICT" || error.code === "INVALID_STATE"))
        return jsonResponse(409, "INVALID_STATE");
      return jsonResponse(500, "INTERNAL_ERROR");
    }
  };
}

async function readBoundedNodeBody(request: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.byteLength;
    if (length > REPORT_WORKER_MAX_REQUEST_BYTES)
      return new Uint8Array(REPORT_WORKER_MAX_REQUEST_BYTES + 1);
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, length);
}

function writeNodeResponse(response: ServerResponse, result: ReportWorkerHttpResponse): void {
  const body = Buffer.from(JSON.stringify(result.body));
  response.writeHead(result.status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": body.byteLength,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    connection: "close",
  });
  response.end(body);
}

export function createReportWorkerNodeServer(config: ReportWorkerRuntimeConfig): Server {
  const handler = createReportWorkerHttpHandler(config);
  return createServer(async (request, response) => {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(", "));
    }
    const result = await handler({
      method: request.method ?? "",
      url: request.url ?? "",
      headers,
      readBody: () => readBoundedNodeBody(request),
    });
    writeNodeResponse(response, result);
  });
}
