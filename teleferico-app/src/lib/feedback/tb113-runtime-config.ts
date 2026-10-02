import "server-only";

import { ENV_KEYS } from "@/lib/constants/env.const";
import { validateGenerationInputContractsV1 } from "../../../services/survey-report-worker/src/checkpoint-contract";
import { assertKeylessCloudRunEnvironment } from "../../../services/survey-report-worker/src/google-auth-runtime";
import type {
  ModelConfigV1,
  PricingSnapshotV1,
} from "../../../services/survey-report-worker/src/contracts";
import type { WorkerCmsAction } from "../../../services/survey-report-worker/src/worker-cms-client";
import { validateTrustedCmsOrigin } from "../../../services/survey-report-worker/src/cms-origin";

export const TB113_APP_TOKEN_KEYS = [
  "feedbackAdminRead",
  "workerSourceRead",
  "workerReportDownloadMetadata",
] as const;

export const TB113_WORKER_TOKEN_ACTIONS = {
  workerClaim: "api::survey-report-generation.survey-report-generation.workerClaim",
  workerSnapshot: "api::survey-report-generation.survey-report-generation.workerSnapshot",
  workerCheckpoint: "api::survey-report-generation.survey-report-generation.workerCheckpoint",
  workerComplete: "api::survey-report-generation.survey-report-generation.workerComplete",
  workerFail: "api::survey-report-generation.survey-report-generation.workerFail",
} as const satisfies Readonly<Record<string, WorkerCmsAction>>;

export type Tb113AppTokenKey = (typeof TB113_APP_TOKEN_KEYS)[number];
export type Tb113WorkerTokenKey = keyof typeof TB113_WORKER_TOKEN_ACTIONS;
export type Tb113CmsTokens = Readonly<Record<Tb113AppTokenKey, string>>;
export type Tb113WorkerTokens = Readonly<Record<Tb113WorkerTokenKey, string>>;

export type Tb113ApprovedGenerationConfiguration = {
  readonly contractVersion: "survey-approved-generation-config.v1";
  readonly sourceRevision: string;
  readonly evidenceKeyId: string;
  readonly modelConfig: ModelConfigV1;
  readonly pricingSnapshot: PricingSnapshotV1;
};

export type Tb113CmsOrigin = {
  readonly baseUrl: string;
  readonly allowedOrigins: readonly [string];
};

export type Tb113CloudTasksConfiguration = {
  readonly projectId: "teleferico-bariloche-2024";
  readonly location: "southamerica-east1";
  readonly queue: string;
  readonly workerUrl: string;
  readonly audience: string;
  readonly taskInvokerEmail: string;
  readonly workerOidcPrincipal: string;
  readonly vertexProjectId: "teleferico-bariloche-2024";
};

export type Tb113WorkerIdentityConfiguration = Pick<
  Tb113CloudTasksConfiguration,
  "workerUrl" | "audience" | "taskInvokerEmail" | "workerOidcPrincipal" | "vertexProjectId"
>;

export type Tb113WorkerConfiguration = Tb113CmsOrigin & Tb113WorkerIdentityConfiguration & {
  readonly workerTokens: Tb113WorkerTokens;
  readonly privateBucket: string;
  readonly evidenceKeySecretVersion: string;
  readonly generation: Tb113ApprovedGenerationConfiguration;
};

const PROJECT_ID = "teleferico-bariloche-2024" as const;
const TASKS_LOCATION = "southamerica-east1" as const;
const WORKER_PATH = "/internal/v1/report-runs:execute";
const CONFIG_ERROR = "TB-113 runtime configuration is unavailable";

function fail(): never {
  throw new TypeError(CONFIG_ERROR);
}

function required(env: NodeJS.ProcessEnv, key: string, maxLength = 16_384): string {
  const value = env[key];
  if (!value || value.length > maxLength || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value))
    return fail();
  return value;
}

function parseJsonRecord(env: NodeJS.ProcessEnv, key: string, maxLength: number): Record<string, unknown> {
  const raw = env[key];
  if (!raw || raw.length > maxLength) return fail();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail();
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return fail();
  return parsed as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function validateToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 8192 &&
    value.trim() === value && !/[\u0000-\u0020\u007f]/.test(value);
}

function readTokenMap<const K extends readonly string[]>(env: NodeJS.ProcessEnv, key: string, names: K): Readonly<Record<K[number], string>> {
  const parsed = parseJsonRecord(env, key, 32_768);
  if (!exactKeys(parsed, names) || !names.every((name) => validateToken(parsed[name]))) return fail();
  const values = names.map((name) => parsed[name] as string);
  if (new Set(values).size !== values.length) return fail();
  return Object.freeze(Object.fromEntries(names.map((name) => [name, parsed[name]]))) as Readonly<Record<K[number], string>>;
}

export function readTb113AppTokens(env: NodeJS.ProcessEnv = process.env): Tb113CmsTokens {
  return readTokenMap(env, ENV_KEYS.TB113_APP_CMS_TOKENS_JSON, TB113_APP_TOKEN_KEYS);
}

export function readTb113WorkerTokens(env: NodeJS.ProcessEnv = process.env): Tb113WorkerTokens {
  return readTokenMap(env, ENV_KEYS.TB113_WORKER_CMS_TOKENS_JSON, Object.keys(TB113_WORKER_TOKEN_ACTIONS) as Tb113WorkerTokenKey[]);
}

export function readTb113CmsOrigin(env: NodeJS.ProcessEnv = process.env): Tb113CmsOrigin {
  const baseUrl = required(env, ENV_KEYS.BUILD_STRAPI_BASE_URL, 2048);
  const approvedOrigin = required(env, ENV_KEYS.TB113_CMS_ALLOWED_ORIGIN, 2048);
  try {
    const target = validateTrustedCmsOrigin(baseUrl, [approvedOrigin]);
    return Object.freeze({ baseUrl: target.origin, allowedOrigins: Object.freeze([target.origin]) as unknown as readonly [string] });
  } catch {
    return fail();
  }
}

export function readTb113ApprovedGenerationConfiguration(env: NodeJS.ProcessEnv = process.env): Tb113ApprovedGenerationConfiguration {
  const value = parseJsonRecord(env, ENV_KEYS.TB113_APPROVED_GENERATION_CONFIG_JSON, 32_768);
  const keys = ["contractVersion", "sourceRevision", "evidenceKeyId", "modelConfig", "pricingSnapshot"] as const;
  if (!exactKeys(value, keys) || value.contractVersion !== "survey-approved-generation-config.v1" ||
      typeof value.sourceRevision !== "string" || value.sourceRevision.length === 0 ||
      typeof value.evidenceKeyId !== "string" || value.evidenceKeyId.length === 0 ||
      !value.modelConfig || typeof value.modelConfig !== "object" || Array.isArray(value.modelConfig) ||
      !value.pricingSnapshot || typeof value.pricingSnapshot !== "object" || Array.isArray(value.pricingSnapshot))
    return fail();
  try {
    validateGenerationInputContractsV1({
      modelConfig: value.modelConfig,
      pricingSnapshot: value.pricingSnapshot,
      evidenceKeyId: value.evidenceKeyId,
      sourceRevision: value.sourceRevision,
    });
  } catch {
    return fail();
  }
  return Object.freeze(value as unknown as Tb113ApprovedGenerationConfiguration);
}

export function readTb113WorkerIdentityConfiguration(env: NodeJS.ProcessEnv = process.env): Tb113WorkerIdentityConfiguration {
  assertKeylessCloudRunEnvironment(env);
  const workerUrlValue = required(env, ENV_KEYS.TB113_WORKER_URL, 2048);
  const audience = required(env, ENV_KEYS.TB113_WORKER_OIDC_AUDIENCE, 2048);
  const taskInvokerEmail = required(env, ENV_KEYS.TB113_TASK_INVOKER_EMAIL, 320);
  const workerOidcPrincipal = required(env, ENV_KEYS.TB113_WORKER_OIDC_PRINCIPAL, 320);
  const vertexProjectId = required(env, ENV_KEYS.TB113_VERTEX_PROJECT_ID, 128);
  let workerUrl: URL;
  try {
    workerUrl = new URL(workerUrlValue);
  } catch {
    return fail();
  }
  if (vertexProjectId !== PROJECT_ID || workerUrl.protocol !== "https:" ||
      !workerUrl.hostname.endsWith(".a.run.app") || workerUrl.username || workerUrl.password ||
      workerUrl.pathname !== WORKER_PATH || workerUrl.search || workerUrl.hash ||
      workerUrl.origin !== audience || workerUrlValue !== `${workerUrl.origin}${WORKER_PATH}` ||
      !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(taskInvokerEmail) ||
      taskInvokerEmail !== workerOidcPrincipal)
    return fail();
  return Object.freeze({
    workerUrl: workerUrlValue,
    audience,
    taskInvokerEmail,
    workerOidcPrincipal,
    vertexProjectId: PROJECT_ID,
  });
}

export function readTb113CloudTasksConfiguration(env: NodeJS.ProcessEnv = process.env): Tb113CloudTasksConfiguration {
  const identity = readTb113WorkerIdentityConfiguration(env);
  const queuePath = required(env, ENV_KEYS.TB113_TASK_QUEUE_PATH, 512);
  const match = new RegExp(`^projects/${PROJECT_ID}/locations/${TASKS_LOCATION}/queues/([a-z][a-z0-9-]{0,62})$`).exec(queuePath);
  if (!match) return fail();
  return Object.freeze({ ...identity, projectId: PROJECT_ID, location: TASKS_LOCATION, queue: match[1]! });
}

export function readTb113PrivateBucket(env: NodeJS.ProcessEnv = process.env): string {
  const name = required(env, ENV_KEYS.TB113_PRIVATE_BUCKET, 222);
  if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(name)) return fail();
  return name;
}

export function readTb113EvidenceKeySecretVersion(env: NodeJS.ProcessEnv = process.env): string {
  const resource = required(env, ENV_KEYS.TB113_WORKER_EVIDENCE_KEY, 512);
  if (!new RegExp(`^projects/${PROJECT_ID}/secrets/[a-zA-Z0-9_-]{1,255}/versions/[1-9][0-9]*$`).test(resource))
    return fail();
  return resource;
}

export function readTb113WorkerConfiguration(env: NodeJS.ProcessEnv = process.env): Tb113WorkerConfiguration {
  return Object.freeze({
    ...readTb113CmsOrigin(env),
    ...readTb113WorkerIdentityConfiguration(env),
    workerTokens: readTb113WorkerTokens(env),
    privateBucket: readTb113PrivateBucket(env),
    evidenceKeySecretVersion: readTb113EvidenceKeySecretVersion(env),
    generation: readTb113ApprovedGenerationConfiguration(env),
  });
}
