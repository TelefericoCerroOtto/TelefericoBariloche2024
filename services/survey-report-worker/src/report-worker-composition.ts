import "server-only";

import {
  createGooglePrivateReportBucket,
  type GoogleStoragePort,
} from "@teleferico/tb113-private-report-storage";
import {
  createGoogleTaskOidcPolicy,
  type GoogleIdTokenVerifier,
} from "./google-task-oidc";
import {
  createGoogleVertexCountTokensProvider,
  createGoogleVertexModelProviders,
} from "./google-vertex-count-tokens";
import { createGoogleEvidenceKeyProvider } from "./google-evidence-key-provider";
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
  PdfRenderer,
  WorkerRuntimeDependencies,
} from "./contracts";
import type { WorkerCmsAction } from "./worker-cms-client";
import {
  readTb113WorkerConfiguration,
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
  readonly fetchImplementation?: typeof fetch;
  readonly accessTokenProvider?: () => Promise<string>;
  readonly storage?: GoogleStoragePort;
  readonly idTokenVerifier?: GoogleIdTokenVerifier;
  readonly evidenceKeyProvider?: EvidenceKeyProvider;
  readonly renderer?: PdfRenderer;
  readonly now?: () => Date;
};

export function createConfiguredReportWorkerRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
  ports: ReportWorkerCompositionPorts = {},
): ReportWorkerRuntimeConfig {
  const configuration = readTb113WorkerConfiguration(env);
  const tokens = configuration.workerTokens;
  const cms = createWorkerCmsClient({
    baseUrl: configuration.baseUrl,
    allowedOrigins: configuration.allowedOrigins,
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
