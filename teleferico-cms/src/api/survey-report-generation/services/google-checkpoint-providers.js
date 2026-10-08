'use strict';

const { isDeepStrictEqual } = require('node:util');
const { validateWorkerClaimContracts } = require('./checkpoint-contract');
const { deriveLocalEvidenceKey } = require('../../../../../packages/tb113-runtime-contracts/src/local-evidence-key.cjs');
const { loadTb113ReportGenerationProfile } = require('../../../../../packages/tb113-runtime-contracts/src/report-generation-profile.cjs');

const PROJECT_ID = 'teleferico-bariloche-2024';
const PROJECT_NUMBER = '384535443802';
const MODEL = 'gemini-3.8-flash';
const LOCATION = 'us';
const VERTEX_ENDPOINT = 'aiplatform.us.rep.googleapis.com';
const METADATA_TOKEN_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const VERTEX_COUNT_TOKENS_URL = `https://${VERTEX_ENDPOINT}/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:countTokens`;
const SECRET_MANAGER_BASE_URL = 'https://secretmanager.googleapis.com/v1/';
const SECRET_VERSION_PATTERN = new RegExp(`^projects/${PROJECT_ID}/secrets/[a-zA-Z0-9_-]{1,255}/versions/[1-9][0-9]*$`);
const EVIDENCE_KEY_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SEGMENTS = Object.freeze(['instructions', 'schema', 'metrics', 'comments']);
const MAX_REQUEST_SEGMENT_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const CONFIG_KEYS = Object.freeze([
  'FEEDBACK_WORKER_EVIDENCE_KEY',
  'FEEDBACK_VERTEX_PROJECT_ID',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, keys) {
  return isRecord(value) && Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function safeConfigValue(value, maxLength) {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength &&
    Buffer.byteLength(value, 'utf8') <= maxLength &&
    value.trim() === value && !/[\u0000-\u001f\u007f]/.test(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function parseRuntimeConfiguration(input, approvedGenerationProfile) {
  if (!isRecord(input) || !exactKeys(input, CONFIG_KEYS) ||
      !safeConfigValue(input.FEEDBACK_WORKER_EVIDENCE_KEY, 512) ||
      input.FEEDBACK_VERTEX_PROJECT_ID !== PROJECT_ID ||
      !SECRET_VERSION_PATTERN.test(input.FEEDBACK_WORKER_EVIDENCE_KEY))
    return null;

  const profile = approvedGenerationProfile ?? loadTb113ReportGenerationProfile();
  if (!isRecord(profile) || profile.profileVersion !== 'feedback-report-generation-profile.v1' ||
      !isRecord(profile.generation))
    return null;
  const approved = profile.generation;

  if (!exactKeys(approved, ['contractVersion', 'sourceRevision', 'evidenceKeyId', 'modelConfig', 'pricingSnapshot']) ||
      approved.contractVersion !== 'survey-approved-generation-config.v1' ||
      !safeConfigValue(approved.sourceRevision, 128) ||
      typeof approved.evidenceKeyId !== 'string' || !EVIDENCE_KEY_ID_PATTERN.test(approved.evidenceKeyId) ||
      !isRecord(approved.modelConfig) || !isRecord(approved.pricingSnapshot) ||
      approved.modelConfig.evidenceKeyId !== approved.evidenceKeyId ||
      approved.modelConfig.sourceRevision !== approved.sourceRevision ||
      approved.modelConfig.vertexProjectId !== PROJECT_ID ||
      approved.modelConfig.vertexLocation !== LOCATION ||
      approved.modelConfig.vertexApiEndpoint !== VERTEX_ENDPOINT ||
      approved.modelConfig.model !== MODEL ||
      !Array.isArray(approved.pricingSnapshot.units) ||
      !approved.pricingSnapshot.units.some((unit) => isRecord(unit) && unit.sku === MODEL))
    return null;

  const verifiedInputTokenLimit = approved.modelConfig.verifiedInputTokenLimit;
  const pricingUnits = approved.pricingSnapshot.units;
  if (!Number.isSafeInteger(verifiedInputTokenLimit) || verifiedInputTokenLimit < 1 ||
      approved.modelConfig.safetyHeadroomTokens !== Math.max(2048, Math.ceil(verifiedInputTokenLimit * 0.1)) ||
      !safeConfigValue(approved.pricingSnapshot.version, 128) ||
      pricingUnits.some((unit) => !isRecord(unit) ||
        !Number.isSafeInteger(unit.inputMicrosPerMillion) || unit.inputMicrosPerMillion < 0 ||
        !Number.isSafeInteger(unit.outputMicrosPerMillion) || unit.outputMicrosPerMillion < 0))
    return null;

  try {
    validateWorkerClaimContracts({
      snapshotDigest: 'a'.repeat(64),
      sourceRevision: approved.sourceRevision,
      checkpoints: {
        version: 'survey-checkpoints.v1',
        snapshotDigest: 'a'.repeat(64),
        route: 'undecided',
        chunkCount: null,
        entries: [],
      },
      modelConfig: approved.modelConfig,
      pricingSnapshot: approved.pricingSnapshot,
    });
  } catch {
    return null;
  }

  return Object.freeze({
    evidenceKeyId: approved.evidenceKeyId,
    evidenceKeySecretVersion: input.FEEDBACK_WORKER_EVIDENCE_KEY,
    modelConfig: deepFreeze(approved.modelConfig),
    pricingSnapshot: deepFreeze(approved.pricingSnapshot),
    sourceRevision: approved.sourceRevision,
  });
}

function isKeylessCloudRunEnvironment(env) {
  return safeConfigValue(env.K_SERVICE, 256) && safeConfigValue(env.K_REVISION, 256) &&
    (env.GOOGLE_APPLICATION_CREDENTIALS === undefined || env.GOOGLE_APPLICATION_CREDENTIALS === '');
}

function isExactLocalCmsOrigin(value, host, port) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const origin = new URL(value);
    return origin.protocol === 'http:' && origin.hostname === host &&
      /^\d{1,5}$/.test(origin.port) && Number(origin.port) === port &&
      !origin.username && !origin.password && origin.pathname === '/' &&
      !origin.search && !origin.hash && value === origin.origin;
  } catch {
    return false;
  }
}

function localCmsServerIsLoopback(env) {
  if (!['127.0.0.1', 'localhost'].includes(env.HOST) || !Number.isSafeInteger(env.PORT) ||
      env.PORT < 1 || env.PORT > 65_535)
    return false;

  const configuredOrigin = env.BUILD_STRAPI_BASE_URL;
  const allowedOrigin = env.FEEDBACK_CMS_ALLOWED_ORIGIN;
  if (!configuredOrigin && !allowedOrigin) return true;
  return Boolean(
    configuredOrigin && allowedOrigin && configuredOrigin === allowedOrigin &&
    isExactLocalCmsOrigin(configuredOrigin, env.HOST, env.PORT),
  );
}

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

async function readJson(response, maxBytes = MAX_RESPONSE_BYTES) {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maxBytes))
    throw new Error('invalid-provider-response');
  if (!response.body) throw new Error('invalid-provider-response');

  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error('invalid-provider-response');
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
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

function createMetadataAccessTokenProvider({ fetchImplementation, env }) {
  return async () => {
    if (!isKeylessCloudRunEnvironment(env))
      fail('AUTHENTICATION', 'Cloud Run service identity is unavailable');

    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImplementation(METADATA_TOKEN_URL, {
        method: 'GET',
        headers: { accept: 'application/json', 'Metadata-Flavor': 'Google' },
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
    } catch {
      fail(signal.aborted ? 'PROVIDER_TIMEOUT' : 'AUTHENTICATION', 'Cloud Run service identity is unavailable');
    }

    if (response.redirected || !response.ok ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type') ?? ''))
      fail('AUTHENTICATION', 'Cloud Run service identity is unavailable');

    let result;
    try {
      result = await readJson(response, 4096);
    } catch {
      fail('AUTHENTICATION', 'Cloud Run service identity response is invalid');
    }

    if (!isRecord(result) || typeof result.access_token !== 'string' ||
        !result.access_token || /[\u0000-\u0020\u007f]/.test(result.access_token) ||
        result.token_type !== 'Bearer' || !Number.isSafeInteger(result.expires_in) || result.expires_in < 1)
      fail('AUTHENTICATION', 'Cloud Run service identity response is invalid');
    return result.access_token;
  };
}

function createLocalOAuthAccessTokenProvider({ env }) {
  return async () => {
    if (env.NODE_ENV !== 'development' || env.K_SERVICE || env.K_REVISION ||
        (env.GOOGLE_APPLICATION_CREDENTIALS !== undefined && env.GOOGLE_APPLICATION_CREDENTIALS !== ''))
      fail('AUTHENTICATION', 'Local Google OAuth credentials are unavailable');
    let GoogleAuth;
    try {
      ({ GoogleAuth } = require('google-auth-library'));
    } catch {
      fail('AUTHENTICATION', 'Local Google OAuth credentials are unavailable');
    }
    try {
      const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
      const client = await auth.getClient();
      const result = await client.getAccessToken();
      if (!result.token || /[\u0000-\u0020\u007f]/.test(result.token))
        fail('AUTHENTICATION', 'Local Google OAuth credentials are unavailable');
      return result.token;
    } catch {
      fail('AUTHENTICATION', 'Local Google OAuth credentials are unavailable');
    }
  };
}

function validCountRequest(request, runtime) {
  if (!exactKeys(request, ['contractVersion', 'modelConfig', 'segments']) ||
      request.contractVersion !== 'survey-count-request.v1' ||
      !isDeepStrictEqual(request.modelConfig, runtime.modelConfig) ||
      !exactKeys(request.segments, SEGMENTS))
    return false;
  return SEGMENTS.every((key) => typeof request.segments[key] === 'string' &&
    Buffer.byteLength(request.segments[key], 'utf8') <= MAX_REQUEST_SEGMENT_BYTES);
}

function createCountTokensProvider({ runtime, fetchImplementation, accessTokenProvider, env }) {
  const getAccessToken = accessTokenProvider ?? createMetadataAccessTokenProvider({ fetchImplementation, env });
  return async (request) => {
    if (!validCountRequest(request, runtime))
      fail('CONFIGURATION', 'Vertex CountTokens request is not approved');

    const counts = {};
    for (const segment of SEGMENTS) {
      const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      let token;
      try {
        token = await getAccessToken();
      } catch {
        fail(signal.aborted ? 'PROVIDER_TIMEOUT' : 'AUTHENTICATION', 'Vertex authentication is unavailable');
      }
      if (typeof token !== 'string' || !token || /[\u0000-\u0020\u007f]/.test(token))
        fail('AUTHENTICATION', 'Vertex authentication is unavailable');

      let response;
      try {
        response = await fetchImplementation(VERTEX_COUNT_TOKENS_URL, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: request.segments[segment] }] }] }),
          cache: 'no-store',
          redirect: 'error',
          signal,
        });
      } catch {
        fail(signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_TRANSIENT', 'Vertex CountTokens request failed');
      }

      if (response.redirected || !response.ok)
        fail(response.status === 429 ? 'PROVIDER_RATE_LIMIT' : response.status >= 500 ? 'PROVIDER_TRANSIENT' : 'CONFIGURATION', 'Vertex CountTokens request failed');
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type') ?? ''))
        fail('CONFIGURATION', 'Vertex CountTokens response is invalid');

      let result;
      try {
        result = await readJson(response);
      } catch {
        fail('CONFIGURATION', 'Vertex CountTokens response is invalid');
      }
      if (!isRecord(result) || !Number.isSafeInteger(result.totalTokens) || result.totalTokens < 0)
        fail('CONFIGURATION', 'Vertex CountTokens response is invalid');
      counts[segment] = result.totalTokens;
    }
    return counts;
  };
}

function createEvidenceKeyProvider({ runtime, fetchImplementation, accessTokenProvider, env }) {
  const getAccessToken = accessTokenProvider ?? createMetadataAccessTokenProvider({ fetchImplementation, env });
  return async (evidenceKeyId) => {
    if (evidenceKeyId !== runtime.evidenceKeyId)
      fail('CONFIGURATION', 'Evidence-key identifier is not approved');

    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let token;
    try {
      token = await getAccessToken();
    } catch {
      fail(signal.aborted ? 'PROVIDER_TIMEOUT' : 'AUTHENTICATION', 'Evidence-key authentication is unavailable');
    }
    if (typeof token !== 'string' || !token || /[\u0000-\u0020\u007f]/.test(token))
      fail('AUTHENTICATION', 'Evidence-key authentication is unavailable');

    let response;
    try {
      response = await fetchImplementation(`${SECRET_MANAGER_BASE_URL}${runtime.evidenceKeySecretVersion}:access`, {
        method: 'GET',
        headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
    } catch {
      fail(signal.aborted ? 'PROVIDER_TIMEOUT' : 'PROVIDER_TRANSIENT', 'Evidence-key service is unavailable');
    }

    if (response.redirected || !response.ok ||
        !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(response.headers.get('content-type') ?? ''))
      fail(response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : response.status >= 500 ? 'PROVIDER_TRANSIENT' : 'CONFIGURATION', 'Evidence-key service is unavailable');

    let result;
    try {
      result = await readJson(response);
    } catch {
      fail('CONFIGURATION', 'Evidence-key response is invalid');
    }
    if (!isRecord(result) ||
        (result.name !== runtime.evidenceKeySecretVersion &&
          result.name !== runtime.evidenceKeySecretVersion.replace(
            `projects/${PROJECT_ID}/`, `projects/${PROJECT_NUMBER}/`)) ||
        !isRecord(result.payload) || typeof result.payload.data !== 'string')
      fail('CONFIGURATION', 'Evidence-key response is invalid');

    let key;
    try {
      key = Buffer.from(result.payload.data, 'base64');
    } catch {
      fail('CONFIGURATION', 'Evidence-key response is invalid');
    }
    if (key.byteLength < 32 || key.toString('base64') !== result.payload.data)
      fail('CONFIGURATION', 'Evidence-key response is invalid');
    return new Uint8Array(key);
  };
}

function createDevelopmentCheckpointProviders(runtime, developmentProviders) {
  if (!isRecord(developmentProviders) ||
      typeof developmentProviders.countTokens !== 'function' ||
      typeof developmentProviders.evidenceKey !== 'function')
    return null;

  return {
    workerCountTokensProvider: async (request) => {
      if (!validCountRequest(request, runtime))
        fail('CONFIGURATION', 'Vertex CountTokens request is not approved');
      const result = await developmentProviders.countTokens(request);
      if (!exactKeys(result, SEGMENTS) || !SEGMENTS.every((segment) =>
        Number.isSafeInteger(result[segment]) && result[segment] >= 0))
        fail('CONFIGURATION', 'Vertex CountTokens response is invalid');
      return Object.freeze({ ...result });
    },
    workerEvidenceKeyProvider: async (evidenceKeyId) => {
      if (evidenceKeyId !== runtime.evidenceKeyId)
        fail('CONFIGURATION', 'Evidence-key identifier is not approved');
      const value = await developmentProviders.evidenceKey(evidenceKeyId);
      const bytes = typeof value === 'string' ? Buffer.from(value, 'utf8') :
        value instanceof Uint8Array ? Buffer.from(value) : null;
      if (!bytes || bytes.byteLength < 32)
        fail('CONFIGURATION', 'Evidence-key response is invalid');
      return new Uint8Array(bytes);
    },
  };
}

function createLocalEvidenceKeyProvider(runtime) {
  return async (evidenceKeyId) => {
    if (evidenceKeyId !== runtime.evidenceKeyId)
      fail('CONFIGURATION', 'Evidence-key identifier is not approved');
    return new Uint8Array(deriveLocalEvidenceKey({
      evidenceKeyId: runtime.evidenceKeyId,
      sourceRevision: runtime.sourceRevision,
      secretVersion: runtime.evidenceKeySecretVersion,
    }));
  };
}

function createFeedbackCheckpointProviders({ env = {}, fetchImplementation = fetch, accessTokenProvider, developmentProviders, approvedGenerationProfile } = {}) {
  if (!isRecord(env)) return Object.freeze({});
  const localDevelopment = env.NODE_ENV === 'development';
  if (!localDevelopment && !isKeylessCloudRunEnvironment(env)) return Object.freeze({});
  if (localDevelopment && (env.K_SERVICE || env.K_REVISION ||
      (env.GOOGLE_APPLICATION_CREDENTIALS !== undefined && env.GOOGLE_APPLICATION_CREDENTIALS !== ''))) return Object.freeze({});
  if (localDevelopment && !localCmsServerIsLoopback(env)) return Object.freeze({});
  const runtime = parseRuntimeConfiguration(Object.fromEntries(
    CONFIG_KEYS.map((key) => [key, env[key]]),
  ), approvedGenerationProfile);
  if (!runtime) return Object.freeze({});

  if (localDevelopment && developmentProviders !== undefined) {
    const providers = createDevelopmentCheckpointProviders(runtime, developmentProviders);
    return providers ? Object.freeze(providers) : Object.freeze({});
  }

  const localAccessTokenProvider = localDevelopment
    ? accessTokenProvider ?? createLocalOAuthAccessTokenProvider({ env })
    : accessTokenProvider;

  if (localDevelopment) {
    return Object.freeze({
      workerCountTokensProvider: createCountTokensProvider({
        runtime,
        fetchImplementation,
        accessTokenProvider: localAccessTokenProvider,
        env,
      }),
      workerEvidenceKeyProvider: createLocalEvidenceKeyProvider(runtime),
    });
  }

  return Object.freeze({
    workerCountTokensProvider: createCountTokensProvider({ runtime, fetchImplementation, accessTokenProvider: localAccessTokenProvider, env }),
    workerEvidenceKeyProvider: createEvidenceKeyProvider({ runtime, fetchImplementation, accessTokenProvider: localAccessTokenProvider, env }),
  });
}

module.exports = { createFeedbackCheckpointProviders, parseRuntimeConfiguration };
