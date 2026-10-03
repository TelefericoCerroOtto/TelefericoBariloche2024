import "server-only";

import {
  createGooglePrivateReportBucket,
  type GoogleStoragePort,
} from "@teleferico/tb113-private-report-storage";
import { createLocalPrivateReportBucket } from "../../../packages/tb113-private-report-storage/src/local-private-storage";
import { deriveLocalEvidenceKey } from "../../../packages/tb113-runtime-contracts/src/local-evidence-key.cjs";
import { loadTb113ReportGenerationProfile } from "../../../packages/tb113-runtime-contracts/src/report-generation-profile.cjs";
import { resolve } from "node:path";
import {
  createGoogleTaskOidcPolicy,
  type GoogleIdTokenVerifier,
} from "./google-task-oidc";
import {
  createGoogleVertexCountTokensProvider,
  createGoogleVertexModelProviders,
} from "./google-vertex-count-tokens";
import { createGoogleEvidenceKeyProvider } from "./google-evidence-key-provider";
import { createLocalGoogleAccessTokenProvider } from "./google-local-auth-provider";
import { createPrivateReportObjectStorage } from "@teleferico/tb113-private-report-storage";
import { createPlaywrightPdfRenderer } from "./pdf";
import {
  createWorkerCmsClient,
  WorkerCmsClientError,
} from "./worker-cms-client";
import {
  createReportWorkerHttpHandler,
  createReportWorkerNodeServer,
  type ReportWorkerRuntimeConfig,
} from "./worker-http";
import type {
  EvidenceKeyProvider,
  CountTokensProvider,
  MapAnalysisProvider,
  PdfRenderer,
  ReduceAnalysisProvider,
  ValidatedAnalysisProvider,
  WorkerRuntimeDependencies,
} from "./contracts";
import type { WorkerCmsAction } from "./worker-cms-client";
import {
  readTb113WorkerConfiguration,
  readTb113ApprovedGenerationConfiguration,
  readTb113CmsOrigin,
  readTb113EvidenceKeySecretVersion,
  readTb113LocalCloudTasksConfiguration,
  readTb113WorkerTokens,
  TB113_WORKER_TOKEN_ACTIONS,
  type Tb113WorkerTokenKey,
} from "@teleferico/tb113-runtime-contracts";

const ACTION_TOKEN_KEYS: Partial<Record<WorkerCmsAction, Tb113WorkerTokenKey>> =
  {
    [TB113_WORKER_TOKEN_ACTIONS.workerClaim]: "workerClaim",
    [TB113_WORKER_TOKEN_ACTIONS.workerSnapshot]: "workerSnapshot",
    [TB113_WORKER_TOKEN_ACTIONS.workerCheckpoint]: "workerCheckpoint",
    [TB113_WORKER_TOKEN_ACTIONS.workerComplete]: "workerComplete",
    [TB113_WORKER_TOKEN_ACTIONS.workerFail]: "workerFail",
  };

export type ReportWorkerCompositionPorts = {
  readonly generationProfile?: unknown;
  readonly fetchImplementation?: typeof fetch;
  readonly accessTokenProvider?: () => Promise<string>;
  readonly storage?: GoogleStoragePort;
  readonly idTokenVerifier?: GoogleIdTokenVerifier;
  readonly evidenceKeyProvider?: EvidenceKeyProvider;
  readonly renderer?: PdfRenderer;
  readonly analysisProvider?: ValidatedAnalysisProvider;
  readonly countTokens?: CountTokensProvider;
  readonly mapProvider?: MapAnalysisProvider;
  readonly reduceProvider?: ReduceAnalysisProvider;
  readonly now?: () => Date;
};

export function createDevelopmentWorkerCmsClient(
  env: NodeJS.ProcessEnv = process.env,
  ports: Pick<ReportWorkerCompositionPorts, "fetchImplementation"> = {},
) {
  if (env.NODE_ENV !== "development")
    throw new TypeError("TB-113 runtime configuration is unavailable");
  const origin = readTb113CmsOrigin(env);
  const tokens = readTb113WorkerTokens(env);
  return createWorkerCmsClient({
    ...origin,
    runtimeMode: "development",
    fetchImplementation: ports.fetchImplementation,
    tokenProvider: async (action) => {
      const key = ACTION_TOKEN_KEYS[action];
      if (!key) throw new WorkerCmsClientError("INVALID_CONFIGURATION");
      return { action, value: tokens[key] };
    },
  });
}

/**
 * Builds the local report runtime with production provider adapters and a
 * synthetic evidence key. ADC access remains lazy until a provider is called.
 */
export function createDevelopmentReportWorkerDependencies(
  env: NodeJS.ProcessEnv = process.env,
  ports: ReportWorkerCompositionPorts & { readonly rootDirectory?: string } = {},
): WorkerRuntimeDependencies {
  if (env.NODE_ENV !== "development")
    throw new TypeError("TB-113 runtime configuration is unavailable");
  readTb113LocalCloudTasksConfiguration(env);
  const generationProfile = loadTb113ReportGenerationProfile(ports.generationProfile);
  const generation = readTb113ApprovedGenerationConfiguration(generationProfile);
  const evidenceKeySecretVersion = readTb113EvidenceKeySecretVersion(env);
  if (
    env.K_SERVICE ||
    env.K_REVISION ||
    (env.GOOGLE_APPLICATION_CREDENTIALS !== undefined &&
      env.GOOGLE_APPLICATION_CREDENTIALS !== "")
  )
    throw new TypeError("Local Google OAuth context is unavailable");

  const bucket = createLocalPrivateReportBucket({
    rootDirectory:
      ports.rootDirectory ?? resolve(process.cwd(), "../../.local/tb113-private-reports"),
  });
  const { artifacts } = createPrivateReportObjectStorage({ bucket });
  const accessTokenProvider =
    ports.accessTokenProvider ?? createLocalGoogleAccessTokenProvider(env);
  const vertexOptions = {
    fetchImplementation: ports.fetchImplementation,
    accessTokenProvider,
  };
  const vertexProviders = createGoogleVertexModelProviders(vertexOptions);
  const countTokens = createGoogleVertexCountTokensProvider(vertexOptions);
  const localEvidenceKey = deriveLocalEvidenceKey({
    evidenceKeyId: generation.evidenceKeyId,
    sourceRevision: generation.sourceRevision,
    secretVersion: evidenceKeySecretVersion,
  });
  const evidenceKeyProvider = ports.evidenceKeyProvider ?? (async (evidenceKeyId: string) => {
    if (evidenceKeyId !== generation.evidenceKeyId)
      throw Object.assign(new TypeError("Evidence key identifier is not configured"), {
        code: "CONFIGURATION" as const,
      });
    return new Uint8Array(localEvidenceKey);
  });
  return Object.freeze({
    cms: createDevelopmentWorkerCmsClient(env, ports),
    artifacts,
    renderer: ports.renderer ?? createPlaywrightPdfRenderer(),
    analysisProvider: ports.analysisProvider ?? vertexProviders.analysisProvider,
    countTokens: ports.countTokens ?? countTokens,
    evidenceKeyProvider: ports.evidenceKeyProvider ?? evidenceKeyProvider,
    mapProvider: ports.mapProvider ?? vertexProviders.mapProvider,
    reduceProvider: ports.reduceProvider ?? vertexProviders.reduceProvider,
    approvedModelConfig: generation.modelConfig,
    approvedPricingSnapshot: generation.pricingSnapshot,
    ...(ports.now ? { now: ports.now } : {}),
  });
}

export function createLocalDevelopmentQueueOnlyDependencies(input: {
  readonly env?: NodeJS.ProcessEnv;
  readonly rootDirectory?: string;
  readonly renderer?: PdfRenderer;
} = {}): WorkerRuntimeDependencies {
  const env = input.env ?? process.env;
  if (env.NODE_ENV !== "development")
    throw new TypeError("TB-113 runtime configuration is unavailable");
  const unavailable = async (): Promise<never> => {
    throw Object.assign(new Error("Local report providers are not configured"), {
      code: "CONFIGURATION" as const,
    });
  };
  const bucket = createLocalPrivateReportBucket({
    rootDirectory:
      input.rootDirectory ?? resolve(process.cwd(), "../../.local/tb113-private-reports"),
  });
  const { artifacts } = createPrivateReportObjectStorage({ bucket });
  return Object.freeze({
    cms: Object.freeze({
      claim: unavailable,
      snapshot: unavailable,
      checkpoint: unavailable,
      complete: unavailable,
      fail: unavailable,
      acknowledgeAlert: unavailable,
    }),
    artifacts,
    renderer: input.renderer ?? createPlaywrightPdfRenderer(),
  });
}

export function createConfiguredReportWorkerRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  ports: ReportWorkerCompositionPorts = {},
): ReportWorkerRuntimeConfig {
  const generationProfile = loadTb113ReportGenerationProfile(ports.generationProfile);
  const configuration = readTb113WorkerConfiguration(env, generationProfile);
  const tokens = configuration.workerTokens;
  const cms = createWorkerCmsClient({
    baseUrl: configuration.baseUrl,
    allowedOrigins: configuration.allowedOrigins,
    ...(env.NODE_ENV === "development" ? { runtimeMode: "development" as const } : {}),
    fetchImplementation: ports.fetchImplementation,
    tokenProvider: async (action) => {
      const key = ACTION_TOKEN_KEYS[action];
      if (!key) throw new WorkerCmsClientError("INVALID_CONFIGURATION");
      return { action, value: tokens[key] };
    },
  });
  const bucket = createGooglePrivateReportBucket({
    bucketName: configuration.privateBucket,
    objectPrefix: "private/feedback-reports",
    storage: ports.storage,
  });
  const objectStorage = createPrivateReportObjectStorage({ bucket });
  const vertexOptions = {
    fetchImplementation: ports.fetchImplementation,
    accessTokenProvider: ports.accessTokenProvider,
  };
  const countTokens = createGoogleVertexCountTokensProvider(vertexOptions);
  const providers = createGoogleVertexModelProviders(vertexOptions);
  const evidenceKeyProvider =
    ports.evidenceKeyProvider ??
    createGoogleEvidenceKeyProvider({
      secretVersion: configuration.evidenceKeySecretVersion,
      evidenceKeyId: configuration.generation.evidenceKeyId,
      fetchImplementation: ports.fetchImplementation,
      accessTokenProvider: ports.accessTokenProvider,
    });
  const dependencies: WorkerRuntimeDependencies = Object.freeze({
    cms,
    artifacts: objectStorage.artifacts,
    renderer: ports.renderer ?? createPlaywrightPdfRenderer(),
    countTokens,
    analysisProvider: providers.analysisProvider,
    mapProvider: providers.mapProvider,
    reduceProvider: providers.reduceProvider,
    evidenceKeyProvider,
    approvedModelConfig: configuration.generation.modelConfig,
    approvedPricingSnapshot: configuration.generation.pricingSnapshot,
    ...(ports.now ? { now: ports.now } : {}),
  });
  return Object.freeze({
    oidc: createGoogleTaskOidcPolicy({
      audience: configuration.audience,
      principal: configuration.workerOidcPrincipal,
      issuerAllowlist: ["https://accounts.google.com", "accounts.google.com"],
      verifier: ports.idTokenVerifier,
    }),
    dependencies,
  });
}

export function createConfiguredReportWorkerHttpHandler(
  env: NodeJS.ProcessEnv = process.env,
  ports: ReportWorkerCompositionPorts = {},
) {
  return createReportWorkerHttpHandler(
    createConfiguredReportWorkerRuntimeConfig(env, ports),
  );
}

export function createConfiguredReportWorkerNodeServer(
  env: NodeJS.ProcessEnv = process.env,
  ports: ReportWorkerCompositionPorts = {},
) {
  return createReportWorkerNodeServer(
    createConfiguredReportWorkerRuntimeConfig(env, ports),
  );
}

export function startConfiguredReportWorkerServer(input: {
  readonly port: number;
  readonly env?: NodeJS.ProcessEnv;
  readonly ports?: ReportWorkerCompositionPorts;
}) {
  if (!Number.isInteger(input.port) || input.port < 1 || input.port > 65_535)
    throw new TypeError("Worker listening port is invalid");
  const server = createConfiguredReportWorkerNodeServer(
    input.env ?? process.env,
    input.ports,
  );
  return server.listen(input.port);
}

export function startConfiguredReportWorkerFromEnvironment(
  env: NodeJS.ProcessEnv = process.env,
  ports: ReportWorkerCompositionPorts = {},
) {
  const rawPort = env.PORT ?? "8080";
  if (!/^[1-9][0-9]{0,4}$/.test(rawPort))
    throw new TypeError("Worker listening port is invalid");
  return startConfiguredReportWorkerServer({
    port: Number(rawPort),
    env,
    ports,
  });
}
