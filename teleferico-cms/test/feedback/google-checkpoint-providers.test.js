'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createFeedbackCheckpointProviders } = require('../../src/api/survey-report-generation/services/google-checkpoint-providers');

const PROJECT_ID = 'teleferico-bariloche-2024';
const MODEL = 'gemini-3.8-flash';
const VERTEX_URL = `https://aiplatform.us.rep.googleapis.com/v1/projects/${PROJECT_ID}/locations/us/publishers/google/models/${MODEL}:countTokens`;
const METADATA_URL = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
const SECRET_VERSION = `projects/${PROJECT_ID}/secrets/tb113-evidence/versions/7`;
const EVIDENCE_KEY_ID = 'tb113-evidence-v1';

function modelConfig(overrides = {}) {
  return {
    version: 'survey-model-config.v1',
    evidenceKeyId: EVIDENCE_KEY_ID,
    provider: 'vertex-ai',
    vertexProjectId: PROJECT_ID,
    vertexLocation: 'us',
    vertexApiEndpoint: 'aiplatform.us.rep.googleapis.com',
    model: MODEL,
    temperature: 0,
    reasoning: 'LOW',
    grounding: false,
    promptVersion: 'prompt.v1',
    mapSchemaVersion: 'survey-map.v1',
    analysisSchemaVersion: 'survey-analysis.v1',
    redactionVersion: 'redaction.v1',
    validatorVersion: 'validator.v1',
    chunkVersion: 'chunk.v1',
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: 'feedback-admin.v1',
    ...overrides,
  };
}

function approvedConfig(overrides = {}) {
  const config = modelConfig();
  return {
    contractVersion: 'survey-approved-generation-config.v1',
    sourceRevision: config.sourceRevision,
    evidenceKeyId: config.evidenceKeyId,
    modelConfig: config,
    pricingSnapshot: {
      version: 'pricing.v1',
      currency: 'USD',
      units: [{ sku: MODEL, inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
    },
    ...overrides,
  };
}

function runtimeEnv(overrides = {}) {
  return {
    TB113_APPROVED_GENERATION_CONFIG_JSON: JSON.stringify(approvedConfig()),
    TB113_WORKER_EVIDENCE_KEY: SECRET_VERSION,
    TB113_VERTEX_PROJECT_ID: PROJECT_ID,
    K_SERVICE: 'teleferico-cms',
    K_REVISION: 'teleferico-cms-00001-abc',
    ...overrides,
  };
}

function countRequest(overrides = {}) {
  return {
    contractVersion: 'survey-count-request.v1',
    modelConfig: modelConfig(),
    segments: {
      instructions: 'instructions-v1',
      schema: 'closed-schema-v1',
      metrics: '{"current":{"submissionCount":0}}',
      comments: '[]',
    },
    ...overrides,
  };
}

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json', ...init.headers },
    ...init,
  });
}

test('incomplete, non-keyless, or mismatched operator configuration exposes neither provider', () => {
  let fetchCalls = 0;
  const fetchImplementation = async () => {
    fetchCalls += 1;
    throw new Error('unexpected network call');
  };
  const invalidConfigurations = [
    {},
    { TB113_VERTEX_PROJECT_ID: 'other-project' },
    { TB113_WORKER_EVIDENCE_KEY: `projects/${PROJECT_ID}/secrets/key/versions/latest` },
    { ...runtimeEnv(), GOOGLE_APPLICATION_CREDENTIALS: '/tmp/credential.json' },
    { ...runtimeEnv(), K_REVISION: '' },
    { ...runtimeEnv(), TB113_APPROVED_GENERATION_CONFIG_JSON: '{' },
    {
      ...runtimeEnv(),
      TB113_APPROVED_GENERATION_CONFIG_JSON: JSON.stringify(approvedConfig({
        modelConfig: modelConfig({ model: 'unapproved-model' }),
      })),
    },
    {
      ...runtimeEnv(),
      TB113_APPROVED_GENERATION_CONFIG_JSON: JSON.stringify(approvedConfig({
        evidenceKeyId: 'different-key-id',
      })),
    },
    {
      ...runtimeEnv(),
      TB113_APPROVED_GENERATION_CONFIG_JSON: JSON.stringify({ ...approvedConfig(), unexpected: true }),
    },
  ];

  for (const env of invalidConfigurations)
    assert.deepEqual(createFeedbackCheckpointProviders({ env, fetchImplementation }), {});
  assert.equal(fetchCalls, 0);
});

test('provider and Strapi config modules make no request during import', () => {
  const providerPath = require.resolve('../../src/api/survey-report-generation/services/google-checkpoint-providers');
  const configPath = require.resolve('../../config/feedback');
  const originalFetch = global.fetch;
  let fetchCalls = 0;
  global.fetch = async () => {
    fetchCalls += 1;
    throw new Error('unexpected network call');
  };
  delete require.cache[providerPath];
  delete require.cache[configPath];
  try {
    assert.doesNotThrow(() => require(providerPath));
    assert.doesNotThrow(() => require(configPath));
  } finally {
    global.fetch = originalFetch;
    delete require.cache[providerPath];
    delete require.cache[configPath];
    require(providerPath);
  }
  assert.equal(fetchCalls, 0);
});

test('Strapi config factory installs both providers only after full validation and never calls a provider at startup', () => {
  const configFactory = require('../../config/feedback');
  let fetchCalls = 0;
  const config = configFactory({
    env(key) {
      return runtimeEnv()[key];
    },
  });
  assert.equal(typeof config.workerCountTokensProvider, 'function');
  assert.equal(typeof config.workerEvidenceKeyProvider, 'function');
  assert.equal(fetchCalls, 0);
  assert.deepEqual(configFactory({ env: () => undefined }), {});
});

test('CountTokens recounts every exact approved segment at the pinned Vertex endpoint', async () => {
  const requests = [];
  const provider = createFeedbackCheckpointProviders({
    env: runtimeEnv(),
    accessTokenProvider: async () => 'synthetic-access-token',
    fetchImplementation: async (url, init) => {
      requests.push({ url, init });
      return jsonResponse({ totalTokens: requests.length });
    },
  }).workerCountTokensProvider;

  assert.deepEqual(await provider(countRequest()), {
    instructions: 1,
    schema: 2,
    metrics: 3,
    comments: 4,
  });
  assert.equal(requests.length, 4);
  assert.deepEqual(requests.map(({ url }) => url), Array(4).fill(VERTEX_URL));
  assert.deepEqual(requests.map(({ init }) => JSON.parse(init.body).contents[0].parts[0].text), [
    'instructions-v1',
    'closed-schema-v1',
    '{"current":{"submissionCount":0}}',
    '[]',
  ]);
  assert.equal(requests.every(({ init }) => init.method === 'POST' && init.redirect === 'error' &&
    init.cache === 'no-store' && init.headers.authorization === 'Bearer synthetic-access-token'), true);
});

test('CountTokens rejects config overrides and malformed segment sets before network access', async () => {
  let fetchCalls = 0;
  const provider = createFeedbackCheckpointProviders({
    env: runtimeEnv(),
    accessTokenProvider: async () => 'synthetic-access-token',
    fetchImplementation: async () => {
      fetchCalls += 1;
      return jsonResponse({ totalTokens: 1 });
    },
  }).workerCountTokensProvider;

  await assert.rejects(provider(countRequest({ modelConfig: modelConfig({ vertexApiEndpoint: 'us-aiplatform.googleapis.com' }) })), {
    code: 'CONFIGURATION',
  });
  await assert.rejects(provider(countRequest({ segments: { instructions: 'only one segment' } })), {
    code: 'CONFIGURATION',
  });
  assert.equal(fetchCalls, 0);
});

test('default access-token acquisition uses only the fixed metadata endpoint and Google flavor header', async () => {
  const requests = [];
  const provider = createFeedbackCheckpointProviders({
    env: runtimeEnv(),
    fetchImplementation: async (url, init) => {
      requests.push({ url, init });
      if (url === METADATA_URL)
        return jsonResponse({ access_token: 'synthetic-access-token', expires_in: 3599, token_type: 'Bearer' });
      return jsonResponse({ totalTokens: 1 });
    },
  }).workerCountTokensProvider;

  await provider(countRequest());
  assert.equal(requests.filter(({ url }) => url === METADATA_URL).length, 4);
  assert.equal(requests.filter(({ url }) => url === VERTEX_URL).length, 4);
  assert.equal(requests.filter(({ url }) => url === METADATA_URL).every(({ init }) =>
    init.method === 'GET' && init.redirect === 'error' && init.headers['Metadata-Flavor'] === 'Google'), true);
  assert.equal(requests.some(({ url }) => ![METADATA_URL, VERTEX_URL].includes(url)), false);
});

test('evidence-key provider reads only the pinned version, verifies key identity and does not cache key bytes', async () => {
  const keyBytes = Buffer.from('synthetic evidence-key material with sufficient entropy');
  const requests = [];
  const provider = createFeedbackCheckpointProviders({
    env: runtimeEnv(),
    accessTokenProvider: async () => 'synthetic-access-token',
    fetchImplementation: async (url, init) => {
      requests.push({ url, init });
      return jsonResponse({ name: SECRET_VERSION, payload: { data: keyBytes.toString('base64') } });
    },
  }).workerEvidenceKeyProvider;

  assert.deepEqual(Buffer.from(await provider(EVIDENCE_KEY_ID)), keyBytes);
  assert.deepEqual(Buffer.from(await provider(EVIDENCE_KEY_ID)), keyBytes);
  await assert.rejects(provider('another-evidence-key'), { code: 'CONFIGURATION' });
  assert.equal(requests.length, 2);
  assert.deepEqual(requests.map(({ url }) => url), [
    `https://secretmanager.googleapis.com/v1/${SECRET_VERSION}:access`,
    `https://secretmanager.googleapis.com/v1/${SECRET_VERSION}:access`,
  ]);
  assert.equal(requests.every(({ init }) => init.method === 'GET' && init.redirect === 'error' &&
    init.cache === 'no-store' && init.headers.authorization === 'Bearer synthetic-access-token'), true);
});

test('evidence-key response mismatch, short key, and oversized body fail with safe errors', async (t) => {
  const cases = [
    {
      name: 'wrong version name',
      response: () => jsonResponse({ name: `projects/${PROJECT_ID}/secrets/other/versions/1`, payload: { data: Buffer.alloc(32).toString('base64') } }),
    },
    {
      name: 'short key',
      response: () => jsonResponse({ name: SECRET_VERSION, payload: { data: Buffer.from('short').toString('base64') } }),
    },
    {
      name: 'oversized response',
      response: () => new Response('{"privateMarker":"must-not-escape"}', {
        status: 200,
        headers: { 'content-type': 'application/json', 'content-length': '20000' },
      }),
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const provider = createFeedbackCheckpointProviders({
        env: runtimeEnv(),
        accessTokenProvider: async () => 'synthetic-access-token',
        fetchImplementation: async () => scenario.response(),
      }).workerEvidenceKeyProvider;
      await assert.rejects(provider(EVIDENCE_KEY_ID), (error) => {
        assert.equal(error.code, 'CONFIGURATION');
        assert.equal(error.message.includes('must-not-escape'), false);
        assert.equal(error.message.includes('synthetic-access-token'), false);
        return true;
      });
    });
  }
});
