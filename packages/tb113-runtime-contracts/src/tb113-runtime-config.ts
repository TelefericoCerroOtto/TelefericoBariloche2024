import {
  validateGenerationInputContractsV1,
  type ModelConfigV1,
  type PricingSnapshotV1,
} from "@teleferico/survey-reporting-core";
import { assertKeylessCloudRunEnvironment } from "./google-auth-runtime";
import { validateTrustedCmsOrigin } from "./cms-origin";

const ENV_KEYS = {
  BUILD_STRAPI_BASE_URL: "BUILD_STRAPI_BASE_URL",
  FEEDBACK_CMS_ALLOWED_ORIGIN: "FEEDBACK_CMS_ALLOWED_ORIGIN",
  FEEDBACK_APP_CMS_TOKEN: "FEEDBACK_APP_CMS_TOKEN",
  FEEDBACK_WORKER_CMS_TOKEN: "FEEDBACK_WORKER_CMS_TOKEN",
  FEEDBACK_WORKER_URL: "FEEDBACK_WORKER_URL",
  FEEDBACK_WORKER_OIDC_AUDIENCE: "FEEDBACK_WORKER_OIDC_AUDIENCE",
  FEEDBACK_TASK_INVOKER_EMAIL: "FEEDBACK_TASK_INVOKER_EMAIL",
  FEEDBACK_WORKER_OIDC_PRINCIPAL: "FEEDBACK_WORKER_OIDC_PRINCIPAL",
  FEEDBACK_VERTEX_PROJECT_ID: "FEEDBACK_VERTEX_PROJECT_ID",
  FEEDBACK_TASK_QUEUE_PATH: "FEEDBACK_TASK_QUEUE_PATH",
  FEEDBACK_PRIVATE_BUCKET: "FEEDBACK_PRIVATE_BUCKET",
  FEEDBACK_WORKER_EVIDENCE_KEY: "FEEDBACK_WORKER_EVIDENCE_KEY",
} as const;

export const TB113_APP_TOKEN_KEYS = [
  "feedbackAdminRead",
  "workerSourceRead",
  "workerReportDownloadMetadata",
] as const;

export const TB113_WORKER_TOKEN_ACTIONS = {
  workerClaim:
    "api::survey-report-generation.survey-report-generation.workerClaim",
  workerSnapshot:
    "api::survey-report-generation.survey-report-generation.workerSnapshot",
  workerCheckpoint:
    "api::survey-report-generation.survey-report-generation.workerCheckpoint",
  workerComplete:
    "api::survey-report-generation.survey-report-generation.workerComplete",
  workerFail:
    "api::survey-report-generation.survey-report-generation.workerFail",
} as const satisfies Readonly<Record<string, WorkerCmsAction>>;

export type WorkerCmsAction =
  | "api::survey-report-generation.survey-report-generation.workerClaim"
  | "api::survey-report-generation.survey-report-generation.workerSnapshot"
  | "api::survey-report-generation.survey-report-generation.workerCheckpoint"
  | "api::survey-report-generation.survey-report-generation.workerComplete"
  | "api::survey-report-generation.survey-report-generation.workerFail"
  | "api::survey-report-generation.survey-report-generation.workerAlertAck";

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
  | "workerUrl"
  | "audience"
  | "taskInvokerEmail"
  | "workerOidcPrincipal"
  | "vertexProjectId"
>;

export type Tb113WorkerConfiguration = Tb113CmsOrigin &
  Tb113WorkerIdentityConfiguration & {
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

function required(
  env: NodeJS.ProcessEnv,
  key: string,
  maxLength = 16_384,
): string {
  const value = env[key];
  if (
    !value ||
    value.length > maxLength ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    return fail();
  return value;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function deepFreezeValue<T>(value: T): T {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value as Record<string, unknown>).forEach(deepFreezeValue);
  return Object.freeze(value);
}

function validateToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 8192 &&
    value.trim() === value &&
    !/[\u0000-\u0020\u007f]/.test(value)
  );
}

function readProcessToken(
  env: NodeJS.ProcessEnv,
  key: string,
): string {
  const value = env[key];
  if (!validateToken(value)) return fail();
  return value;
}

export function readTb113AppTokens(
  env: NodeJS.ProcessEnv = process.env,
): Tb113CmsTokens {
  const token = readProcessToken(env, ENV_KEYS.FEEDBACK_APP_CMS_TOKEN);
  return Object.freeze(Object.fromEntries(
    TB113_APP_TOKEN_KEYS.map((key) => [key, token]),
  )) as Tb113CmsTokens;
}

export function readTb113WorkerTokens(
  env: NodeJS.ProcessEnv = process.env,
): Tb113WorkerTokens {
  const token = readProcessToken(env, ENV_KEYS.FEEDBACK_WORKER_CMS_TOKEN);
  return Object.freeze(Object.fromEntries(
    Object.keys(TB113_WORKER_TOKEN_ACTIONS).map((key) => [key, token]),
  )) as Tb113WorkerTokens;
}

export function readTb113CmsOrigin(
  env: NodeJS.ProcessEnv = process.env,
): Tb113CmsOrigin {
  const baseUrl = required(env, ENV_KEYS.BUILD_STRAPI_BASE_URL, 2048);
  const approvedOrigin = required(env, ENV_KEYS.FEEDBACK_CMS_ALLOWED_ORIGIN, 2048);
  try {
    const target = validateTrustedCmsOrigin(
      baseUrl,
      [approvedOrigin],
      env.NODE_ENV === "development" ? "development" : "production",
    );
    return Object.freeze({
      baseUrl: target.origin,
      allowedOrigins: Object.freeze([target.origin]) as unknown as readonly [
        string,
      ],
    });
  } catch {
    return fail();
  }
}

export function readTb113ApprovedGenerationConfiguration(
  normalizedProfile: unknown,
): Tb113ApprovedGenerationConfiguration {
  const profile = normalizedProfile as {
    readonly profileVersion?: unknown;
    readonly generation?: Record<string, unknown>;
  } | undefined;
  if (!profile || profile.profileVersion !== "feedback-report-generation-profile.v1" ||
      !profile.generation)
    return fail();
  const value = profile.generation;
  const modelConfig = value.modelConfig as Record<string, unknown> | undefined;
  const pricingSnapshot = value.pricingSnapshot as Record<string, unknown> | undefined;
  const pricingUnits = pricingSnapshot?.units;
  if (
    typeof value.sourceRevision !== "string" ||
    typeof value.evidenceKeyId !== "string" ||
    !modelConfig ||
    typeof modelConfig.verifiedInputTokenLimit !== "number" ||
    typeof modelConfig.safetyHeadroomTokens !== "number" ||
    typeof modelConfig.sourceRevision !== "string" ||
    !pricingSnapshot ||
    typeof pricingSnapshot.version !== "string" ||
    !Array.isArray(pricingUnits) ||
    pricingUnits.some((unit) => !unit || typeof unit !== "object" ||
      typeof (unit as Record<string, unknown>).inputMicrosPerMillion !== "number" ||
      typeof (unit as Record<string, unknown>).outputMicrosPerMillion !== "number")
  )
    throw new TypeError("TB-113 report profile is not configured");
  const keys = [
    "contractVersion",
    "sourceRevision",
    "evidenceKeyId",
    "modelConfig",
    "pricingSnapshot",
  ] as const;
  if (
    !exactKeys(value, keys) ||
    value.contractVersion !== "survey-approved-generation-config.v1" ||
    typeof value.sourceRevision !== "string" ||
    value.sourceRevision.length === 0 ||
    typeof value.evidenceKeyId !== "string" ||
    value.evidenceKeyId.length === 0 ||
    !value.modelConfig ||
    typeof value.modelConfig !== "object" ||
    Array.isArray(value.modelConfig) ||
    !value.pricingSnapshot ||
    typeof value.pricingSnapshot !== "object" ||
    Array.isArray(value.pricingSnapshot)
  )
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
  return deepFreezeValue(value as unknown as Tb113ApprovedGenerationConfiguration);
}

export function readTb113WorkerIdentityConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): Tb113WorkerIdentityConfiguration {
  assertKeylessCloudRunEnvironment(env);
  const workerUrlValue = required(env, ENV_KEYS.FEEDBACK_WORKER_URL, 2048);
  const audience = required(env, ENV_KEYS.FEEDBACK_WORKER_OIDC_AUDIENCE, 2048);
  const taskInvokerEmail = required(
    env,
    ENV_KEYS.FEEDBACK_TASK_INVOKER_EMAIL,
    320,
  );
  const workerOidcPrincipal = required(
    env,
    ENV_KEYS.FEEDBACK_WORKER_OIDC_PRINCIPAL,
    320,
  );
  const vertexProjectId = required(env, ENV_KEYS.FEEDBACK_VERTEX_PROJECT_ID, 128);
  let workerUrl: URL;
  try {
    workerUrl = new URL(workerUrlValue);
  } catch {
    return fail();
  }
  if (
    vertexProjectId !== PROJECT_ID ||
    workerUrl.protocol !== "https:" ||
    !workerUrl.hostname.endsWith(".a.run.app") ||
    workerUrl.username ||
    workerUrl.password ||
    workerUrl.pathname !== WORKER_PATH ||
    workerUrl.search ||
    workerUrl.hash ||
    workerUrl.origin !== audience ||
    workerUrlValue !== `${workerUrl.origin}${WORKER_PATH}` ||
    !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(taskInvokerEmail) ||
    taskInvokerEmail !== workerOidcPrincipal
  )
    return fail();
  return Object.freeze({
    workerUrl: workerUrlValue,
    audience,
    taskInvokerEmail,
    workerOidcPrincipal,
    vertexProjectId: PROJECT_ID,
  });
}

export function readTb113CloudTasksConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): Tb113CloudTasksConfiguration {
  const identity = readTb113WorkerIdentityConfiguration(env);
  const queuePath = required(env, ENV_KEYS.FEEDBACK_TASK_QUEUE_PATH, 512);
  const match = new RegExp(
    `^projects/${PROJECT_ID}/locations/${TASKS_LOCATION}/queues/([a-z][a-z0-9-]{0,62})$`,
  ).exec(queuePath);
  if (!match) return fail();
  return Object.freeze({
    ...identity,
    projectId: PROJECT_ID,
    location: TASKS_LOCATION,
    queue: match[1]!,
  });
}

export function readTb113LocalCloudTasksConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): Tb113CloudTasksConfiguration {
  if (env.NODE_ENV !== "development") return fail();
  const workerUrlValue = required(env, ENV_KEYS.FEEDBACK_WORKER_URL, 2048);
  const queuePath = required(env, ENV_KEYS.FEEDBACK_TASK_QUEUE_PATH, 512);
  let workerUrl: URL;
  try {
    workerUrl = new URL(workerUrlValue);
  } catch {
    return fail();
  }
  const queueMatch = new RegExp(
    `^projects/${PROJECT_ID}/locations/${TASKS_LOCATION}/queues/([a-z][a-z0-9-]{0,62})$`,
  ).exec(queuePath);
  if (
    workerUrl.protocol !== "http:" ||
    workerUrl.hostname !== "127.0.0.1" ||
    !/^[1-9][0-9]{0,4}$/.test(workerUrl.port) ||
    Number(workerUrl.port) >= 65_535 ||
    workerUrl.username ||
    workerUrl.password ||
    workerUrl.pathname !== WORKER_PATH ||
    workerUrl.search ||
    workerUrl.hash ||
    workerUrlValue !== `${workerUrl.origin}${WORKER_PATH}` ||
    !queueMatch
  )
    return fail();
  const localPrincipal = "tb113-local-task-invoker";
  return Object.freeze({
    projectId: PROJECT_ID,
    location: TASKS_LOCATION,
    queue: queueMatch[1]!,
    workerUrl: workerUrlValue,
    audience: workerUrl.origin,
    taskInvokerEmail: localPrincipal,
    workerOidcPrincipal: localPrincipal,
    vertexProjectId: PROJECT_ID,
  });
}

export function readTb113PrivateBucket(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const name = required(env, ENV_KEYS.FEEDBACK_PRIVATE_BUCKET, 222);
  if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(name)) return fail();
  return name;
}

export function readTb113EvidenceKeySecretVersion(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const resource = required(env, ENV_KEYS.FEEDBACK_WORKER_EVIDENCE_KEY, 512);
  if (
    !new RegExp(
      `^projects/${PROJECT_ID}/secrets/[a-zA-Z0-9_-]{1,255}/versions/[1-9][0-9]*$`,
    ).test(resource)
  )
    return fail();
  return resource;
}

export function readTb113WorkerConfiguration(
  env: NodeJS.ProcessEnv,
  normalizedProfile: unknown,
): Tb113WorkerConfiguration {
  return Object.freeze({
    ...readTb113CmsOrigin(env),
    ...readTb113WorkerIdentityConfiguration(env),
    workerTokens: readTb113WorkerTokens(env),
    privateBucket: readTb113PrivateBucket(env),
    evidenceKeySecretVersion: readTb113EvidenceKeySecretVersion(env),
    generation: readTb113ApprovedGenerationConfiguration(normalizedProfile),
  });
}
