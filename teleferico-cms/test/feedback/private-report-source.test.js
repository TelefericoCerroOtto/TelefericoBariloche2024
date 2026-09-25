const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  executeFixed,
} = require('./harness/postgres-harness');
const { createSubmissionPersistence } = require('../../src/api/survey-submission/services/persistence');

const OWNER = 'tb113_test_private_report_source';
const SOURCE_ENDPOINT = '/api/tb113/worker/report-source';
const SOURCE_ACTION = 'api::survey-report-generation.survey-report-generation.workerSourceRead';
const WORKER_RUN_ID = '00000000-0000-4000-8000-000000000120';
const GENERATION_UID = 'api::survey-report-generation.survey-report-generation';
const WORKER_ACTIONS = {
  claim: `${GENERATION_UID}.workerClaim`,
  snapshot: `${GENERATION_UID}.workerSnapshot`,
  fail: `${GENERATION_UID}.workerFail`,
};
const WORKER_ORIGIN = 'https://cms.example.com';
const WORKER_PATH_ROOT = '/api/tb113/worker/generations';
const WORKER_PATH = `/api/tb113/worker/generations/${WORKER_RUN_ID}`;
const PRIVATE_WORKER_COMMENT = 'Synthetic private worker comment must not reach logs';
const RANGE = {
  acceptedAtGte: '2026-09-01T03:00:00.000Z',
  acceptedAtLte: '2026-09-12T02:59:59.999Z',
  dataCutoffAt: '2026-09-10T12:00:00.000Z',
};
const compose = (...args) => executeFixed(DOCKER_EXECUTABLE, [
  'compose', '--file', COMPOSE_FILE, '--project-name', OWNER, ...args,
]);

async function grant(strapi, roleId, action) {
  await strapi.db.query('plugin::users-permissions.permission').create({
    data: { action, role: roleId },
  });
}

async function createPrincipal(strapi, { name, email, role }) {
  const user = await strapi.plugin('users-permissions').service('user').add({
    username: name,
    email,
    password: `${name}-synthetic-password`,
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: role.id,
  });
  return strapi.plugin('users-permissions').service('jwt').issue({ id: user.id });
}

async function readPage(port, token, input) {
  const response = await fetch(`http://127.0.0.1:${port}${SOURCE_ENDPOINT}`, {
    method: 'POST',
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function captureQueries(strapi, operation) {
  const queries = [];
  const listener = ({ sql }) => queries.push(sql);
  strapi.db.connection.on('query', listener);
  try {
    return { result: await operation(), queries };
  } finally {
    strapi.db.connection.off('query', listener);
  }
}

function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function loadPrivateReportSourceAppModules() {
  let ts;
  try {
    ts = require('typescript');
  } catch {
    throw new Error('The isolated source integration requires transitive TypeScript 5.4.5');
  }
  if (ts.version !== '5.4.5' || typeof ts.transpileModule !== 'function')
    throw new Error('The isolated source integration requires transitive TypeScript 5.4.5');

  const repositoryRoot = path.resolve(__dirname, '../../..');
  const sourceRoots = [
    fs.realpathSync(path.join(repositoryRoot, 'teleferico-app/services/survey-report-worker/src')),
    fs.realpathSync(path.join(repositoryRoot, 'teleferico-app/packages/survey-reporting-core/src')),
    fs.realpathSync(path.join(repositoryRoot, 'teleferico-app/src/lib/feedback')),
  ];
  const approvedAliasModules = new Map([
    [
      '@/lib/constants/env.const',
      fs.realpathSync(path.join(repositoryRoot, 'teleferico-app/src/lib/constants/env.const.ts')),
    ],
  ]);
  const moduleCache = new Map();

  function resolveLocalModule(parentFile, request) {
    if (request.startsWith('@/')) {
      const aliased = approvedAliasModules.get(request);
      if (!aliased)
        throw new Error('The isolated app module graph contains an unapproved alias import');
      return aliased;
    }
    if (!request.startsWith('.'))
      throw new Error('The isolated app module graph contains an unsupported external import');

    const requestedPath = path.resolve(path.dirname(parentFile), request);
    if (!sourceRoots.some((root) => isWithin(root, requestedPath)))
      throw new Error('The isolated app module graph escaped its approved source roots');

    const candidates = path.extname(requestedPath)
      ? [requestedPath]
      : [`${requestedPath}.ts`, path.join(requestedPath, 'index.ts')];
    const resolved = candidates.find((candidate) => fs.existsSync(candidate));
    if (!resolved)
      throw new Error('The isolated app module graph references an unavailable local module');

    const realPath = fs.realpathSync(resolved);
    if (!sourceRoots.some((root) => isWithin(root, realPath)) || !realPath.endsWith('.ts'))
      throw new Error('The isolated app module graph resolved outside approved TypeScript sources');
    return realPath;
  }

  function load(filePath) {
    const realPath = fs.realpathSync(filePath);
    const approvedRoot = sourceRoots.some((root) => isWithin(root, realPath));
    const approvedAlias = [...approvedAliasModules.values()].includes(realPath);
    if ((!approvedRoot && !approvedAlias) || !realPath.endsWith('.ts'))
      throw new Error('The isolated app module loader rejected a non-approved source path');
    if (moduleCache.has(realPath)) return moduleCache.get(realPath).exports;

    const module = { exports: {} };
    moduleCache.set(realPath, module);
    const source = fs.readFileSync(realPath, 'utf8');
    const output = ts.transpileModule(source, {
      fileName: realPath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
      reportDiagnostics: true,
    });
    if (output.diagnostics?.some(({ category }) => category === ts.DiagnosticCategory.Error))
      throw new Error('The isolated app TypeScript source could not be transpiled');

    function localRequire(request) {
      if (request === 'server-only') return {};
      if (request === 'node:net') return require('node:net');
      if (request === 'node:crypto') return require('node:crypto');
      return load(resolveLocalModule(realPath, request));
    }

    new Function('require', 'module', 'exports', output.outputText)(
      localRequire,
      module,
      module.exports,
    );
    return module.exports;
  }

  const workerRoot = sourceRoots[0];
  const feedbackRoot = sourceRoots[2];
  return {
    createWorkerCmsClient: load(path.join(workerRoot, 'worker-cms-client.ts')).createWorkerCmsClient,
    createSnapshot: load(path.join(repositoryRoot, 'teleferico-app/packages/survey-reporting-core/src/index.ts')).createSnapshot,
    createPrivateReportSourceTransport: load(
      path.join(workerRoot, 'private-report-source-transport.ts'),
    ).createPrivateReportSourceTransport,
    buildAuthoritativeGenerationInputsV1: load(
      path.join(workerRoot, 'authoritative-generation-source.ts'),
    ).buildAuthoritativeGenerationInputsV1,
    createFeedbackAdminCommandTransport: load(
      path.join(feedbackRoot, 'admin-command.ts'),
    ).createFeedbackAdminCommandTransport,
  };
}

function sourceModelConfig(sourceRevision, evidenceKeyId) {
  return {
    version: 'survey-model-config.v1',
    evidenceKeyId,
    provider: 'vertex-ai',
    vertexProjectId: 'teleferico-bariloche-2024',
    vertexLocation: 'us',
    vertexApiEndpoint: 'aiplatform.us.rep.googleapis.com',
    model: 'gemini-3.8-flash',
    temperature: 0,
    reasoning: 'LOW',
    grounding: false,
    promptVersion: 'prompt.v1',
    mapSchemaVersion: 'survey-map.v1',
    analysisSchemaVersion: 'survey-analysis.v1',
    redactionVersion: 'redaction.v1',
    validatorVersion: 'validator.v1',
    chunkVersion: 'chunk.v1',
    verifiedInputTokenLimit: 10000,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision,
  };
}

function createWorkerClientFetch(
  port,
  actionTokens,
  observedRequests,
  transformResponse,
  reportRunIds = [WORKER_RUN_ID],
) {
  const routes = new Map();
  for (const reportRunId of reportRunIds) {
    const root = `${WORKER_PATH_ROOT}/${reportRunId}`;
    routes.set(`${root}/claim`, { action: WORKER_ACTIONS.claim, method: 'POST' });
    routes.set(`${root}/snapshot`, { action: WORKER_ACTIONS.snapshot, method: 'GET' });
    routes.set(`${root}/fail`, { action: WORKER_ACTIONS.fail, method: 'POST' });
  }

  return async (input, init = {}) => {
    if (!(input instanceof URL) || input.origin !== WORKER_ORIGIN || input.search !== '')
      throw new Error('The test fetch rejected a non-approved logical worker URL');
    const route = routes.get(input.pathname);
    if (!route) throw new Error('The test fetch rejected an unregistered worker path');
    if (init.method !== route.method || init.redirect !== 'error')
      throw new Error('The test fetch rejected an unexpected worker transport policy');

    const authorization = new Headers(init.headers).get('authorization');
    const expectedToken = actionTokens[route.action];
    if (!expectedToken || authorization !== `Bearer ${expectedToken}`)
      throw new Error('The test fetch rejected an unexpected synthetic worker token');

    const localUrl = `http://127.0.0.1:${port}${input.pathname}`;
    const upstreamResponse = await fetch(localUrl, {
      method: init.method,
      headers: init.headers,
      body: init.body,
      cache: 'no-store',
      redirect: 'error',
      signal: init.signal,
    });
    if (upstreamResponse.redirected || upstreamResponse.url !== localUrl)
      throw new Error('The test fetch observed an unexpected local Strapi response origin');

    const request = {
      path: input.pathname,
      method: init.method,
      action: route.action,
      authorizationMatchesAction: authorization === `Bearer ${expectedToken}`,
    };
    observedRequests.push(request);

    let logicalResponse;
    if (transformResponse && upstreamResponse.ok) {
      const body = await upstreamResponse.clone().json();
      const transformed = transformResponse({ route, body });
      const headers = new Headers(upstreamResponse.headers);
      headers.delete('content-length');
      logicalResponse = new Response(JSON.stringify(transformed), {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers,
      });
    } else {
      logicalResponse = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: upstreamResponse.headers,
      });
    }
    Object.defineProperties(logicalResponse, {
      url: { value: input.href },
      redirected: { value: false },
    });
    return logicalResponse;
  };
}

async function verifyWorkerCmsClientIntegration(strapi, port, appCreatedReportRunId) {
  const { createSnapshot, createWorkerCmsClient } = loadPrivateReportSourceAppModules();
  const userPermissions = strapi.plugin('users-permissions');
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: 'authenticated' },
  });
  for (const action of Object.values(WORKER_ACTIONS)) await grant(strapi, role.id, action);
  await grant(strapi, role.id, `${GENERATION_UID}.create`);
  const jwtUser = await userPermissions.service('user').add({
    username: 'tb113-worker-client-jwt',
    email: 'tb113-worker-client-jwt@local.invalid',
    password: 'tb113-worker-client-synthetic-password',
    provider: 'local',
    confirmed: true,
    blocked: false,
    role: role.id,
  });
  const jwt = await userPermissions.service('jwt').issue({ id: jwtUser.id });

  strapi.config.set('admin.secrets.encryptionKey', 'tb113-worker-client-synthetic-encryption');
  const tokenService = strapi.service('admin::api-token-content-api');
  const actionTokens = {};
  for (const [name, action] of Object.entries(WORKER_ACTIONS)) {
    const token = await tokenService.create({
      name: `tb113-worker-client-${name}`,
      description: `Disposable ${name}-only worker client token`,
      type: 'custom',
      permissions: [action],
      lifespan: null,
    });
    assert.deepEqual(token.permissions, [action]);
    actionTokens[action] = token.accessKey;
  }
  const actualWorkerPermissions = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
  });
  assert.ok(Object.values(WORKER_ACTIONS).every((action) =>
    actualWorkerPermissions.some(({ action: grantedAction }) => grantedAction === action),
  ));

  const snapshotEnvelope = createSnapshot({
    range: { from: '2040-09-01', to: '2040-09-10' },
    dataCutoffAt: '2040-09-11T12:00:00.000Z',
    sourceRevision: 'worker-client-integration-v1',
    createdAt: '2040-09-11T12:00:00.000Z',
    filters: { pointKey: null, versionKey: null },
    submissions: [{
      recordId: 'synthetic-worker-record',
      receipt: '00000000-0000-4000-8000-000000000121',
      acceptedAt: '2040-09-05T12:00:00.000Z',
      source: 'valid_qr',
      versionKey: 'synthetic-worker-version',
      pointKey: 'synthetic-worker-point',
      overallRating: 5,
      locale: 'en',
      commentText: PRIVATE_WORKER_COMMENT,
      payloadDigest: 'a'.repeat(64),
      aspects: [],
    }],
    definitions: [{ aspectKey: 'other', sortOrder: 99 }],
    points: [{ pointKey: 'synthetic-worker-point', displayName: 'Synthetic point', sortOrder: 1 }],
  });
  const sourceRevision = 'worker-client-integration-v1';
  const modelConfig = sourceModelConfig(sourceRevision, 'synthetic-worker-evidence-key');
  const pricingSnapshot = {
    version: 'pricing.v1',
    currency: 'USD',
    units: [{ sku: 'gemini-input', inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
  };
  const checkpoints = {
    version: 'survey-checkpoints.v1',
    snapshotDigest: snapshotEnvelope.digestHex,
    route: 'direct',
    chunkCount: null,
    entries: [],
  };
  const createResponse = await fetch(`http://127.0.0.1:${port}/api/survey-report-generations`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${jwt}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ data: {
      reportRunId: WORKER_RUN_ID,
      periodStart: '2040-09-01',
      periodEnd: '2040-09-10',
      dataCutoffAt: '2040-09-11T12:00:00.000Z',
      overlapOverrideAccepted: false,
      snapshotDigest: snapshotEnvelope.digestHex,
      sourceRevision,
      snapshotJson: snapshotEnvelope.payload,
      checkpointsJson: checkpoints,
      modelConfigJson: modelConfig,
      usageJson: {},
      pricingSnapshotJson: pricingSnapshot,
      status: 'queued',
    } }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.data.reportRunId, WORKER_RUN_ID);
  const seeded = await strapi.db.query(GENERATION_UID).findOne({
    where: { reportRunId: WORKER_RUN_ID },
  });
  assert.equal(seeded.status, 'queued');
  assert.equal(seeded.stateVersion, 1);
  assert.equal(seeded.snapshotDigest, snapshotEnvelope.digestHex);
  assert.deepEqual(seeded.checkpointsJson, checkpoints);
  assert.deepEqual(seeded.modelConfigJson, modelConfig);
  assert.deepEqual(seeded.pricingSnapshotJson, pricingSnapshot);

  await strapi.db.connection('survey_report_generations')
    .where({ report_run_id: WORKER_RUN_ID })
    .update({ checkpoints_json: JSON.stringify('{') });
  const invalidStoredClaim = await fetch(`http://127.0.0.1:${port}${WORKER_PATH}/claim`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${actionTokens[WORKER_ACTIONS.claim]}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ commandVersion: 'survey-report-command.v1' }),
  });
  assert.equal(invalidStoredClaim.status, 409);
  const invalidStoredClaimBody = await invalidStoredClaim.json();
  assert.deepEqual(invalidStoredClaimBody, {
    error: { code: 'INVALID_STATE', message: 'The worker command was rejected' },
  });
  assert.equal(JSON.stringify(invalidStoredClaimBody).includes(PRIVATE_WORKER_COMMENT), false);
  assert.ok(Object.values(actionTokens).every((token) =>
    !JSON.stringify(invalidStoredClaimBody).includes(token),
  ));
  const unchangedQueuedRow = await strapi.db.connection('survey_report_generations')
    .where({ report_run_id: WORKER_RUN_ID })
    .select('status', 'state_version', 'claimed_at')
    .first();
  assert.equal(unchangedQueuedRow.status, 'queued');
  assert.equal(unchangedQueuedRow.state_version, 1);
  assert.equal(unchangedQueuedRow.claimed_at, null);
  await strapi.db.connection('survey_report_generations')
    .where({ report_run_id: WORKER_RUN_ID })
    .update({ checkpoints_json: checkpoints });

  const routeDetails = [
    { suffix: 'claim', action: WORKER_ACTIONS.claim, method: 'POST', body: { commandVersion: 'survey-report-command.v1' } },
    { suffix: 'snapshot', action: WORKER_ACTIONS.snapshot, method: 'GET' },
    {
      suffix: 'fail',
      action: WORKER_ACTIONS.fail,
      method: 'POST',
      body: {
        contractVersion: 'survey-worker-cms.v1',
        expectedStateVersion: 2,
        failureCode: 'INVALID_OUTPUT',
        safeFailureMessage: 'The report output did not satisfy its contract.',
      },
    },
  ];
  const nativeCollectionUrl = `http://127.0.0.1:${port}/api/survey-report-generations`;
  for (const route of routeDetails) {
    const jwtAttempt = await captureQueries(strapi, () => fetch(
      `http://127.0.0.1:${port}${WORKER_PATH}/${route.suffix}`,
      {
        method: route.method,
        headers: {
          authorization: `Bearer ${jwt}`,
          ...(route.body ? { 'content-type': 'application/json' } : {}),
        },
        ...(route.body ? { body: JSON.stringify(route.body) } : {}),
      },
    ));
    assert.ok([401, 403].includes(jwtAttempt.result.status));
    assert.equal(jwtAttempt.queries.some((sql) => /survey_report_generations/i.test(sql)), false);
  }
  for (const route of routeDetails) {
    for (const [wrongAction, wrongToken] of Object.entries(actionTokens)) {
      if (wrongAction === route.action) continue;
      const denied = await captureQueries(strapi, () => fetch(
        `http://127.0.0.1:${port}${WORKER_PATH}/${route.suffix}`,
        {
          method: route.method,
          headers: {
            authorization: `Bearer ${wrongToken}`,
            ...(route.body ? { 'content-type': 'application/json' } : {}),
          },
          ...(route.body ? { body: JSON.stringify(route.body) } : {}),
        },
      ));
      assert.equal(denied.result.status, 403);
      assert.equal(denied.queries.some((sql) => /survey_report_generations/i.test(sql)), false);
    }
  }

  for (const token of [jwt, ...Object.values(actionTokens)]) {
    const nativeRead = await captureQueries(strapi, () => fetch(nativeCollectionUrl, {
      headers: { authorization: `Bearer ${token}` },
    }));
    assert.equal(nativeRead.result.status, 403);
    assert.equal(nativeRead.queries.some((sql) => /survey_report_generations/i.test(sql)), false);
  }

  const observedRequests = [];
  const tokenRequests = [];
  const client = createWorkerCmsClient({
    baseUrl: WORKER_ORIGIN,
    allowedOrigins: [WORKER_ORIGIN],
    tokenProvider: async (action) => {
      tokenRequests.push(action);
      return { action, value: actionTokens[action] };
    },
    fetchImplementation: createWorkerClientFetch(port, actionTokens, observedRequests),
  });
  const consoleOutput = [];
  const consoleMethods = ['debug', 'info', 'log', 'warn', 'error'];
  const originalConsole = new Map(consoleMethods.map((method) => [method, console[method]]));
  for (const method of consoleMethods) {
    console[method] = (...values) => consoleOutput.push(values.map(String).join(' '));
  }
  try {
    const beforeUnsupportedOperations = { tokens: tokenRequests.length, requests: observedRequests.length };
    await assert.rejects(client.checkpoint(WORKER_RUN_ID, {}), { code: 'UNKNOWN_VERSION' });
    await assert.rejects(client.complete(WORKER_RUN_ID, {}), { code: 'UNSUPPORTED_OPERATION' });
    assert.deepEqual(
      { tokens: tokenRequests.length, requests: observedRequests.length },
      beforeUnsupportedOperations,
    );

    const claimed = await client.claim(WORKER_RUN_ID);
    const claimReplay = await client.claim(WORKER_RUN_ID);
    assert.equal(claimed.status, 'running');
    assert.equal(claimed.disposition, 'claimed');
    assert.equal(claimed.stateVersion, 2);
    assert.equal(claimReplay.status, 'running');
    assert.equal(claimReplay.disposition, 'resumed');
    assert.equal(claimReplay.stateVersion, 2);

    const snapshot = await client.snapshot(WORKER_RUN_ID);
    assert.equal(snapshot.snapshot.digestHex, snapshotEnvelope.digestHex);
    assert.deepEqual(snapshot.snapshot.payload, snapshotEnvelope.payload);
    assert.equal(snapshot.snapshot.payload.comments[0].text, PRIVATE_WORKER_COMMENT);

    const malformedClaimClient = createWorkerCmsClient({
      baseUrl: WORKER_ORIGIN,
      allowedOrigins: [WORKER_ORIGIN],
      tokenProvider: async (action) => ({ action, value: actionTokens[action] }),
      fetchImplementation: createWorkerClientFetch(port, actionTokens, [], ({ route, body }) =>
        route.action === WORKER_ACTIONS.claim ? { ...body, unexpected: PRIVATE_WORKER_COMMENT } : body,
      ),
    });
    const malformedClaim = await malformedClaimClient.claim(WORKER_RUN_ID).catch((error) => error);
    assert.equal(malformedClaim.code, 'INVALID_RESPONSE');
    assert.equal(`${malformedClaim.name} ${malformedClaim.message}`.includes(PRIVATE_WORKER_COMMENT), false);
    assert.ok(Object.values(actionTokens).every((token) =>
      !`${malformedClaim.name} ${malformedClaim.message}`.includes(token),
    ));

    const alteredDigestClient = createWorkerCmsClient({
      baseUrl: WORKER_ORIGIN,
      allowedOrigins: [WORKER_ORIGIN],
      tokenProvider: async (action) => ({ action, value: actionTokens[action] }),
      fetchImplementation: createWorkerClientFetch(port, actionTokens, [], ({ route, body }) => {
        if (route.action !== WORKER_ACTIONS.snapshot) return body;
        return {
          ...body,
          snapshot: {
            ...body.snapshot,
            payload: {
              ...body.snapshot.payload,
              comments: body.snapshot.payload.comments.map((comment) => ({
                ...comment,
                text: `${comment.text} altered`,
              })),
            },
          },
        };
      }),
    });
    const alteredSnapshot = await alteredDigestClient.snapshot(WORKER_RUN_ID).catch((error) => error);
    assert.equal(alteredSnapshot.code, 'INVALID_RESPONSE');
    assert.equal(`${alteredSnapshot.name} ${alteredSnapshot.message}`.includes(PRIVATE_WORKER_COMMENT), false);
    assert.ok(Object.values(actionTokens).every((token) =>
      !`${alteredSnapshot.name} ${alteredSnapshot.message}`.includes(token),
    ));

    const failCommand = routeDetails.find(({ suffix }) => suffix === 'fail').body;
    const failed = await client.fail(WORKER_RUN_ID, failCommand);
    const failReplay = await client.fail(WORKER_RUN_ID, failCommand);
    assert.deepEqual(
      { status: failed.status, stateVersion: failed.stateVersion, failureCode: failed.failureCode, replayed: failed.replayed },
      { status: 'failed', stateVersion: 3, failureCode: 'INVALID_OUTPUT', replayed: false },
    );
    assert.deepEqual(
      { status: failReplay.status, stateVersion: failReplay.stateVersion, failureCode: failReplay.failureCode, replayed: failReplay.replayed },
      { status: 'failed', stateVersion: 3, failureCode: 'INVALID_OUTPUT', replayed: true },
    );

    const appCreatedRow = await strapi.db.query(GENERATION_UID).findOne({
      where: { reportRunId: appCreatedReportRunId },
    });
    assert.ok(appCreatedRow);
    assert.equal(appCreatedRow.status, 'queued');
    assert.equal(appCreatedRow.stateVersion, 1);
    assert.equal(appCreatedRow.checkpointsJson.route, 'undecided');
    assert.deepEqual(appCreatedRow.checkpointsJson.entries, []);
    const appCreatedRequests = [];
    const appCreatedTokenRequests = [];
    const appCreatedClient = createWorkerCmsClient({
      baseUrl: WORKER_ORIGIN,
      allowedOrigins: [WORKER_ORIGIN],
      tokenProvider: async (action) => {
        appCreatedTokenRequests.push(action);
        return { action, value: actionTokens[action] };
      },
      fetchImplementation: createWorkerClientFetch(
        port,
        actionTokens,
        appCreatedRequests,
        undefined,
        [appCreatedReportRunId],
      ),
    });
    const appCreatedClaim = await appCreatedClient.claim(appCreatedReportRunId);
    assert.equal(appCreatedClaim.status, 'running');
    assert.equal(appCreatedClaim.disposition, 'claimed');
    assert.equal(appCreatedClaim.stateVersion, 2);
    assert.equal(appCreatedClaim.checkpoints.route, 'undecided');
    assert.equal(appCreatedClaim.checkpoints.chunkCount, null);
    assert.deepEqual(appCreatedClaim.checkpoints.entries, []);
    const appCreatedReplay = await appCreatedClient.claim(appCreatedReportRunId);
    assert.equal(appCreatedReplay.status, 'running');
    assert.equal(appCreatedReplay.disposition, 'resumed');
    assert.equal(appCreatedReplay.stateVersion, 2);
    const appCreatedSnapshot = await appCreatedClient.snapshot(appCreatedReportRunId);
    assert.equal(appCreatedSnapshot.snapshot.digestHex, appCreatedRow.snapshotDigest);
    assert.equal(appCreatedSnapshot.snapshot.payload.comments.length, appCreatedRow.snapshotJson.comments.length);
    assert.ok(appCreatedSnapshot.snapshot.payload.comments.some(({ text }) => typeof text === 'string' && text.length > 0));
    const appCreatedFailCommand = {
      contractVersion: 'survey-worker-cms.v1',
      expectedStateVersion: 2,
      failureCode: 'INVALID_OUTPUT',
      safeFailureMessage: 'The report output did not satisfy its contract.',
    };
    const appCreatedFailure = await appCreatedClient.fail(appCreatedReportRunId, appCreatedFailCommand);
    const appCreatedFailReplay = await appCreatedClient.fail(appCreatedReportRunId, appCreatedFailCommand);
    assert.deepEqual(
      { status: appCreatedFailure.status, stateVersion: appCreatedFailure.stateVersion, failureCode: appCreatedFailure.failureCode, replayed: appCreatedFailure.replayed },
      { status: 'failed', stateVersion: 3, failureCode: 'INVALID_OUTPUT', replayed: false },
    );
    assert.deepEqual(
      { status: appCreatedFailReplay.status, stateVersion: appCreatedFailReplay.stateVersion, failureCode: appCreatedFailReplay.failureCode, replayed: appCreatedFailReplay.replayed },
      { status: 'failed', stateVersion: 3, failureCode: 'INVALID_OUTPUT', replayed: true },
    );
    assert.deepEqual(appCreatedTokenRequests, [
      WORKER_ACTIONS.claim,
      WORKER_ACTIONS.claim,
      WORKER_ACTIONS.snapshot,
      WORKER_ACTIONS.fail,
      WORKER_ACTIONS.fail,
    ]);
    assert.deepEqual(appCreatedRequests.map(({ path, method }) => ({ path, method })), [
      { path: `${WORKER_PATH_ROOT}/${appCreatedReportRunId}/claim`, method: 'POST' },
      { path: `${WORKER_PATH_ROOT}/${appCreatedReportRunId}/claim`, method: 'POST' },
      { path: `${WORKER_PATH_ROOT}/${appCreatedReportRunId}/snapshot`, method: 'GET' },
      { path: `${WORKER_PATH_ROOT}/${appCreatedReportRunId}/fail`, method: 'POST' },
      { path: `${WORKER_PATH_ROOT}/${appCreatedReportRunId}/fail`, method: 'POST' },
    ]);

  } finally {
    for (const [method, original] of originalConsole) console[method] = original;
  }

  assert.deepEqual(tokenRequests, [
    WORKER_ACTIONS.claim,
    WORKER_ACTIONS.claim,
    WORKER_ACTIONS.snapshot,
    WORKER_ACTIONS.fail,
    WORKER_ACTIONS.fail,
  ]);
  assert.deepEqual(observedRequests.map(({ path, method }) => ({ path, method })), [
    { path: `${WORKER_PATH}/claim`, method: 'POST' },
    { path: `${WORKER_PATH}/claim`, method: 'POST' },
    { path: `${WORKER_PATH}/snapshot`, method: 'GET' },
    { path: `${WORKER_PATH}/fail`, method: 'POST' },
    { path: `${WORKER_PATH}/fail`, method: 'POST' },
  ]);
  assert.ok(observedRequests.every(({ authorizationMatchesAction }) => authorizationMatchesAction));
  assert.ok(consoleOutput.every((line) =>
    !line.includes(PRIVATE_WORKER_COMMENT) && !Object.values(actionTokens).some((token) => line.includes(token)),
  ));

  const storedFailure = await strapi.db.query(GENERATION_UID).findOne({
    where: { reportRunId: WORKER_RUN_ID },
  });
  assert.equal(storedFailure.status, 'failed');
  assert.equal(storedFailure.stateVersion, 3);
  assert.equal(storedFailure.failureCode, 'INVALID_OUTPUT');
  assert.equal(storedFailure.safeFailureMessage, 'The report output did not satisfy its contract.');
  assert.ok(storedFailure.completedAt);
  const generationQuery = await strapi.db.connection('survey_report_generations')
    .where({ report_run_id: WORKER_RUN_ID })
    .select('status', 'state_version', 'failure_code', 'safe_failure_message', 'snapshot_json')
    .first();
  assert.equal(JSON.stringify(generationQuery.snapshot_json).includes(PRIVATE_WORKER_COMMENT), true);
  const appCreatedFailureRow = await strapi.db.query(GENERATION_UID).findOne({
    where: { reportRunId: appCreatedReportRunId },
  });
  assert.equal(appCreatedFailureRow.status, 'failed');
  assert.equal(appCreatedFailureRow.stateVersion, 3);
  assert.equal(appCreatedFailureRow.failureCode, 'INVALID_OUTPUT');
}

function createSourceIntegrationFetch(port, syntheticToken, observedPages) {
  const logicalUrl = new URL(`https://cms.example.com${SOURCE_ENDPOINT}`);
  const localUrl = `http://127.0.0.1:${port}${SOURCE_ENDPOINT}`;

  return async (input, init = {}) => {
    if (!(input instanceof URL) || input.href !== logicalUrl.href)
      throw new Error('The test fetch rejected a non-approved logical CMS URL');
    if (init.method !== 'POST' || init.redirect !== 'error')
      throw new Error('The test fetch rejected an unexpected transport policy');

    const headers = new Headers(init.headers);
    if (headers.get('authorization') !== `Bearer ${syntheticToken}`)
      throw new Error('The test fetch rejected an unexpected synthetic token');

    const upstreamResponse = await fetch(localUrl, {
      method: init.method,
      headers,
      body: init.body,
      cache: 'no-store',
      redirect: 'error',
      signal: init.signal,
    });
    if (upstreamResponse.redirected || upstreamResponse.url !== localUrl)
      throw new Error('The test fetch observed an unexpected local Strapi response origin');

    const request = JSON.parse(String(init.body));
    const page = await upstreamResponse.clone().json();
    observedPages.push({ request, page });

    const logicalResponse = new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
    });
    Object.defineProperties(logicalResponse, {
      url: { value: logicalUrl.href },
      redirected: { value: false },
    });
    return logicalResponse;
  };
}

async function verifyAppSourceIntegration(port, syntheticToken) {
  const {
    buildAuthoritativeGenerationInputsV1,
    createPrivateReportSourceTransport,
  } = loadPrivateReportSourceAppModules();
  const observedPages = [];
  const fetchImplementation = createSourceIntegrationFetch(port, syntheticToken, observedPages);
  const transport = createPrivateReportSourceTransport({
    baseUrl: 'https://cms.example.com',
    allowedOrigins: ['https://cms.example.com'],
    tokenProvider: async () => syntheticToken,
    fetchImplementation,
  });
  const sourceRevision = 'private-source-integration-v1';
  const evidenceKeyId = 'synthetic-integration-key-1';
  const sourceInput = {
    range: { from: '2026-09-01', to: '2026-09-10' },
    dataCutoffAt: '2026-09-02T12:00:00.000Z',
    sourceRevision,
    modelConfig: sourceModelConfig(sourceRevision, evidenceKeyId),
    pricingSnapshot: {
      version: 'pricing.v1',
      currency: 'USD',
      units: [{ sku: 'gemini-input', inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
    },
    evidenceKeyId,
    readPage: transport.readPage,
  };

  const materialized = await buildAuthoritativeGenerationInputsV1(sourceInput);
  const snapshot = materialized.snapshotJson;
  const submissionsPages = observedPages.filter(({ page }) => page.resource === 'submissions');
  const versionPages = observedPages.filter(({ page }) => page.resource === 'versions');
  const pointPages = observedPages.filter(({ page }) => page.resource === 'points');
  assert.equal(snapshot.population.previousSubmissionCount, 13);
  assert.equal(snapshot.population.currentSubmissionCount, 13);
  assert.equal(snapshot.population.excludedAfterCutoffCount, 1);
  assert.equal(snapshot.population.dataCutoffAt, sourceInput.dataCutoffAt);
  assert.equal(snapshot.comments.length, 25);
  assert.equal(new Set(submissionsPages.flatMap(({ page }) => page.items).map(({ receipt }) => receipt)).size, 27);
  assert.equal(new Set(snapshot.comments.map(({ receipt }) => receipt)).size, 25);
  assert.equal(materialized.checkpointsJson.entries.length, 0);
  assert.equal(Object.isFrozen(snapshot), true);

  assert.equal(observedPages.length, 4);
  assert.equal(submissionsPages.length, 2);
  assert.deepEqual(submissionsPages.map(({ page }) => page.items.length).sort((a, b) => a - b), [2, 25]);
  assert.deepEqual(submissionsPages.map(({ page }) => page.total), [27, 27]);
  assert.deepEqual(submissionsPages.map(({ page }) => page.cursor === null).sort(), [false, true]);
  const firstSubmissionPage = submissionsPages.find(({ page }) => page.cursor === null).page;
  const finalSubmissionPage = submissionsPages.find(({ page }) => page.cursor !== null).page;
  assert.equal(firstSubmissionPage.nextCursor, finalSubmissionPage.cursor);
  assert.equal(finalSubmissionPage.nextCursor, null);
  assert.equal(versionPages.length, 1);
  assert.equal(versionPages[0].page.total, 1);
  assert.equal(versionPages[0].page.items.length, 1);
  assert.equal(pointPages.length, 1);
  assert.equal(pointPages[0].page.total, 1);
  assert.equal(pointPages[0].page.items.length, 1);
  assert.equal(submissionsPages.flatMap(({ page }) => page.items).length, 27);
  assert.ok(submissionsPages.flatMap(({ page }) => page.items).some(({ comment }) => comment === null));
  assert.ok(submissionsPages.flatMap(({ page }) => page.items).every(({ payloadDigest }) => /^[a-f0-9]{64}$/.test(payloadDigest)));
  assert.ok(observedPages.every(({ request }) => request.dataCutoffAt === sourceInput.dataCutoffAt));
  assert.ok(observedPages.every(({ request }) => request.pageSize === 25));

  const interruptedTransport = createPrivateReportSourceTransport({
    baseUrl: 'https://cms.example.com',
    allowedOrigins: ['https://cms.example.com'],
    tokenProvider: async () => syntheticToken,
    fetchImplementation: async (input, init) => {
      const request = JSON.parse(String(init.body));
      if (request.resource === 'submissions' && request.cursor !== null)
        throw new Error('Synthetic continuation interruption');
      return fetchImplementation(input, init);
    },
  });
  await assert.rejects(
    buildAuthoritativeGenerationInputsV1({ ...sourceInput, readPage: interruptedTransport.readPage }),
    /INVALID_GENERATION_SOURCE/,
  );
}

function createAdminCommandFetch(port, generationJwt, createBodies, events) {
  const logicalOrigin = 'https://cms.example.com';

  return async (input, init = {}) => {
    const logicalUrl = new URL(String(input));
    if (
      logicalUrl.origin !== logicalOrigin ||
      logicalUrl.pathname !== '/api/survey-report-generations'
    )
      throw new Error('The test fetch rejected a non-approved generation URL');

    const method = init.method ?? 'GET';
    if (!['GET', 'POST'].includes(method))
      throw new Error('The test fetch rejected an unexpected generation method');
    const headers = new Headers(init.headers);
    if (headers.get('authorization') !== `Bearer ${generationJwt}`)
      throw new Error('The test fetch rejected an unexpected generation principal');

    if (method === 'POST') {
      const envelope = JSON.parse(String(init.body));
      assert.deepEqual(Object.keys(envelope), ['data']);
      createBodies.push(envelope.data);
      events.push('cms:create:request');
    }

    const localUrl = `http://127.0.0.1:${port}${logicalUrl.pathname}${logicalUrl.search}`;
    const response = await fetch(localUrl, {
      ...init,
      redirect: 'error',
    });
    if (response.redirected || response.url !== localUrl)
      throw new Error('The test fetch observed an unexpected generation response origin');
    if (method === 'POST') {
      if (response.ok) {
        events.push('cms:create:response');
      } else {
        const body = await response.clone().json().catch(() => null);
        const paths = Array.isArray(body?.error?.details?.errors)
          ? body.error.details.errors.map(({ path: issuePath }) => issuePath)
          : [];
        const knownFields = [
          'reportRunId', 'periodStart', 'periodEnd', 'dataCutoffAt',
          'overlapOverrideAccepted', 'overlapDigest', 'snapshotDigest',
          'sourceRevision', 'snapshotJson', 'checkpointsJson', 'modelConfigJson',
          'usageJson', 'pricingSnapshotJson', 'requestedBy', 'retryOfGeneration',
        ].filter((field) => JSON.stringify(body?.error ?? {}).includes(field));
        events.push(`cms:create:error:${response.status}:${body?.error?.name ?? 'unknown'}:${JSON.stringify(paths)}:${knownFields.join(',')}`);
      }
    } else if (response.ok) events.push('cms:find:response');
    return response;
  };
}

async function verifyAppGenerationCommandIntegration(strapi, port, workerToken) {
  const generationUid = 'api::survey-report-generation.survey-report-generation';
  const createAction = `${generationUid}.create`;
  const findAction = `${generationUid}.find`;
  const permissionQuery = strapi.db.query('plugin::users-permissions.permission');
  const generationRole = await strapi.db.query('plugin::users-permissions.role').create({
    data: {
      name: 'TB-113 Synthetic Generation Command',
      description: 'Disposable find/create-only integration role',
      type: 'tb113-generation-command',
    },
  });
  await grant(strapi, generationRole.id, findAction);
  await grant(strapi, generationRole.id, createAction);

  const generationPermissions = await permissionQuery.findMany({
    where: { role: generationRole.id },
  });
  assert.deepEqual(
    generationPermissions.map(({ action }) => action).sort(),
    [createAction, findAction].sort(),
  );
  const generationJwt = await createPrincipal(strapi, {
    name: 'tb113-generation-command-user',
    email: 'tb113-generation-command-user@local.invalid',
    role: generationRole,
  });
  assert.deepEqual(workerToken.permissions, [SOURCE_ACTION]);

  const sourceRequest = sourceInput('submissions');
  const jwtOnPrivateSource = await captureQueries(strapi, () =>
    readPage(port, generationJwt, sourceRequest),
  );
  assert.ok([401, 403].includes(jwtOnPrivateSource.result.status));
  assert.equal(
    jwtOnPrivateSource.queries.some((sql) => /survey_submissions/.test(sql)),
    false,
  );

  const generationEndpoint = `http://127.0.0.1:${port}/api/survey-report-generations`;
  const beforeCrossUse = await strapi.db.query(generationUid).count();
  const workerTokenFind = await fetch(generationEndpoint, {
    headers: { authorization: `Bearer ${workerToken.accessKey}` },
  });
  assert.equal(workerTokenFind.status, 403);
  const workerTokenCreate = await fetch(generationEndpoint, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${workerToken.accessKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ data: {} }),
  });
  assert.equal(workerTokenCreate.status, 403);
  assert.equal(await strapi.db.query(generationUid).count(), beforeCrossUse);

  const failedGeneration = await strapi.documents(generationUid).create({
    data: {
      reportRunId: '00000000-0000-4000-8000-000000000101',
      periodStart: '2026-08-29',
      periodEnd: '2026-09-05',
      dataCutoffAt: '2026-09-10T12:00:00.000Z',
      overlapOverrideAccepted: false,
      snapshotDigest: 'f'.repeat(64),
      sourceRevision: 'synthetic-failed-source',
      snapshotJson: { seeded: 'failed-source' },
      checkpointsJson: {
        version: 'survey-checkpoints.v1',
        snapshotDigest: 'f'.repeat(64),
        route: 'undecided',
        chunkCount: null,
        entries: [],
      },
      modelConfigJson: {},
      usageJson: {},
      pricingSnapshotJson: {},
      status: 'failed',
      completedAt: '2026-09-10T12:01:00.000Z',
      failureCode: 'SYNTHETIC_FAILURE',
    },
  });
  const originalFailedRow = await strapi.db.query(generationUid).findOne({
    where: { reportRunId: failedGeneration.reportRunId },
  });
  const originalFailedState = {
    reportRunId: originalFailedRow.reportRunId,
    periodStart: originalFailedRow.periodStart,
    periodEnd: originalFailedRow.periodEnd,
    dataCutoffAt: originalFailedRow.dataCutoffAt,
    status: originalFailedRow.status,
    snapshotDigest: originalFailedRow.snapshotDigest,
    sourceRevision: originalFailedRow.sourceRevision,
    snapshotJson: originalFailedRow.snapshotJson,
  };

  const {
    createFeedbackAdminCommandTransport,
    createPrivateReportSourceTransport,
  } = loadPrivateReportSourceAppModules();
  const sourcePages = [];
  const sourceFetch = createSourceIntegrationFetch(port, workerToken.accessKey, sourcePages);
  const sourceTransport = createPrivateReportSourceTransport({
    baseUrl: 'https://cms.example.com',
    allowedOrigins: ['https://cms.example.com'],
    tokenProvider: async () => workerToken.accessKey,
    fetchImplementation: sourceFetch,
  });
  const sourceRevision = 'admin-command-http-integration-v1';
  const evidenceKeyId = 'synthetic-admin-integration-key-1';
  const approvedConfiguration = {
    sourceRevision,
    modelConfig: sourceModelConfig(sourceRevision, evidenceKeyId),
    pricingSnapshot: {
      version: 'pricing.v1',
      currency: 'USD',
      units: [{ sku: 'gemini-input', inputMicrosPerMillion: 1, outputMicrosPerMillion: 2 }],
    },
    evidenceKeyId,
  };
  const createBodies = [];
  const events = [];
  const dispatchCalls = [];
  const dispatcher = {
    async dispatch(request) {
      dispatchCalls.push(request);
      events.push('dispatch');
      return {
        contractVersion: 'survey-dispatch-command.v1',
        status: 'queued',
        disposition: 'dispatcher-unavailable',
        taskName: request.taskName,
        dispatchAttemptCount: 0,
        failureCode: 'DISPATCH_UNAVAILABLE',
      };
    },
  };
  const createInputsPort = (readPage = sourceTransport.readPage) => ({
    readPage,
    getApprovedConfiguration: async () => approvedConfiguration,
  });
  const createTransport = (generationInputs, fetchImplementation = createAdminCommandFetch(
    port,
    generationJwt,
    createBodies,
    events,
  )) => createFeedbackAdminCommandTransport({
    baseUrl: 'https://cms.example.com',
    token: generationJwt,
    fetchImplementation,
    dispatcher,
    generationInputs,
  });
  const transport = createTransport(createInputsPort());
  const generateCommand = {
    contractVersion: 'feedback-admin.v1',
    period: { from: '2026-09-01', to: '2026-09-10' },
    override: { accepted: false, overlapDigest: null },
  };

  let overlapError;
  await assert.rejects(transport.generate(generateCommand), (error) => {
    overlapError = error;
    return error.code === 'OVERLAP_REQUIRES_OVERRIDE' && error.status === 409;
  });
  assert.equal(typeof overlapError.details.overlapDigest, 'string');
  assert.equal(sourcePages.length, 0);
  assert.equal(createBodies.length, 0);
  assert.equal(dispatchCalls.length, 0);

  const countBeforeRejectedSourceReads = await strapi.db.query(generationUid).count();
  const deniedSourceTransport = createPrivateReportSourceTransport({
    baseUrl: 'https://cms.example.com',
    allowedOrigins: ['https://cms.example.com'],
    tokenProvider: async () => generationJwt,
    fetchImplementation: createSourceIntegrationFetch(port, generationJwt, []),
  });
  const deniedSourceCommand = createTransport(createInputsPort(deniedSourceTransport.readPage));
  const retryableGenerateCommand = {
    ...generateCommand,
    override: { accepted: true, overlapDigest: overlapError.details.overlapDigest },
  };
  await assert.rejects(
    deniedSourceCommand.generate(retryableGenerateCommand),
    { code: 'UPSTREAM_UNAVAILABLE', status: 503 },
  );

  const interruptedSourcePages = [];
  const interruptedSourceFetch = createSourceIntegrationFetch(
    port,
    workerToken.accessKey,
    interruptedSourcePages,
  );
  const interruptedSourceTransport = createPrivateReportSourceTransport({
    baseUrl: 'https://cms.example.com',
    allowedOrigins: ['https://cms.example.com'],
    tokenProvider: async () => workerToken.accessKey,
    fetchImplementation: async (input, init) => {
      const request = JSON.parse(String(init.body));
      if (request.resource === 'submissions' && request.cursor !== null)
        throw new Error('Synthetic source continuation interruption');
      return interruptedSourceFetch(input, init);
    },
  });
  const interruptedCommand = createTransport(createInputsPort(interruptedSourceTransport.readPage));
  await assert.rejects(
    interruptedCommand.generate(retryableGenerateCommand),
    { code: 'UPSTREAM_UNAVAILABLE', status: 503 },
  );
  assert.ok(interruptedSourcePages.some(({ request, page }) =>
    request.resource === 'submissions' && request.cursor === null && typeof page.nextCursor === 'string',
  ));
  assert.equal(await strapi.db.query(generationUid).count(), countBeforeRejectedSourceReads);
  assert.equal(createBodies.length, 0);
  assert.equal(dispatchCalls.length, 0);

  let generationResult;
  try {
    generationResult = await transport.generate({
      ...generateCommand,
      override: {
        accepted: true,
        overlapDigest: overlapError.details.overlapDigest,
      },
    });
  } catch (error) {
    assert.fail(`Native generation create failed (${error.code ?? 'unknown'}; ${events.at(-1) ?? 'no CMS create response'})`);
  }
  assert.equal(generationResult.status, 'queued');
  assert.equal(sourcePages.length, 4);
  const firstGenerationPages = sourcePages.slice();
  assert.equal(firstGenerationPages.filter(({ page }) => page.resource === 'submissions').length, 2);
  assert.deepEqual(
    firstGenerationPages
      .filter(({ page }) => page.resource === 'submissions')
      .map(({ page }) => page.items.length)
      .sort((left, right) => left - right),
    [2, 25],
  );
  assert.ok(firstGenerationPages.every(({ request }) => request.pageSize === 25));

  const generationBody = createBodies[0];
  assert.equal(generationBody.reportRunId, generationResult.reportRunId);
  const persistedGeneration = await strapi.db.query(generationUid).findOne({
    where: { reportRunId: generationResult.reportRunId },
  });
  assert.ok(persistedGeneration);
  assert.equal(persistedGeneration.dataCutoffAt, generationBody.dataCutoffAt);
  assert.equal(generationBody.snapshotJson.population.dataCutoffAt, generationBody.dataCutoffAt);
  assert.deepEqual(persistedGeneration.snapshotJson, generationBody.snapshotJson);
  assert.equal(persistedGeneration.snapshotDigest, generationBody.snapshotDigest);
  assert.equal(
    persistedGeneration.snapshotDigest,
    persistedGeneration.checkpointsJson.snapshotDigest,
  );
  assert.deepEqual(persistedGeneration.checkpointsJson, generationBody.checkpointsJson);
  assert.deepEqual(persistedGeneration.modelConfigJson, approvedConfiguration.modelConfig);
  assert.deepEqual(persistedGeneration.pricingSnapshotJson, approvedConfiguration.pricingSnapshot);
  assert.equal(persistedGeneration.sourceRevision, sourceRevision);
  assert.equal(Object.hasOwn(generationBody, 'requestedBy'), false);
  const requesterLinks = await strapi.db.connection('survey_report_generations_requested_by_lnk')
    .where({ survey_report_generation_id: persistedGeneration.id })
    .count({ count: 'id' })
    .first();
  assert.equal(Number(requesterLinks.count), 0);
  assert.ok(firstGenerationPages.every(({ request }) => request.dataCutoffAt === generationBody.dataCutoffAt));
  assert.equal(events.indexOf('cms:create:response') < events.indexOf('dispatch'), true);
  assert.equal(dispatchCalls.length, 1);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const sourcePageCountBeforeRetry = sourcePages.length;
  const retryResult = await transport.retry(
    failedGeneration.reportRunId,
    { contractVersion: 'feedback-admin.v1' },
  );
  assert.equal(retryResult.status, 'queued');
  assert.equal(createBodies.length, 2);
  assert.equal(dispatchCalls.length, 2);
  const retryBody = createBodies[1];
  const retryPages = sourcePages.slice(sourcePageCountBeforeRetry);
  assert.equal(new Set(retryPages.map(({ page }) => page.resource)).size, 3);
  assert.ok(retryPages.every(({ request }) => request.dataCutoffAt === retryBody.dataCutoffAt));
  assert.notEqual(retryBody.dataCutoffAt, generationBody.dataCutoffAt);
  assert.notEqual(retryBody.snapshotDigest, generationBody.snapshotDigest);
  assert.deepEqual(retryBody.snapshotJson.population.current, {
    ...retryBody.snapshotJson.population.current,
    from: '2026-08-29',
    to: '2026-09-05',
  });
  assert.equal(retryBody.snapshotJson.population.dataCutoffAt, retryBody.dataCutoffAt);
  assert.equal(retryBody.snapshotDigest, retryBody.checkpointsJson.snapshotDigest);

  const persistedRetry = await strapi.documents(generationUid).findFirst({
    filters: { reportRunId: retryResult.reportRunId },
    populate: ['retryOfGeneration'],
  });
  assert.ok(persistedRetry);
  assert.equal(persistedRetry.retryOfGeneration.reportRunId, failedGeneration.reportRunId);
  assert.equal(persistedRetry.dataCutoffAt, retryBody.dataCutoffAt);
  assert.deepEqual(persistedRetry.snapshotJson, retryBody.snapshotJson);
  assert.equal(persistedRetry.snapshotDigest, retryBody.snapshotDigest);
  assert.deepEqual(persistedRetry.checkpointsJson, retryBody.checkpointsJson);
  assert.deepEqual(persistedRetry.modelConfigJson, approvedConfiguration.modelConfig);
  assert.deepEqual(persistedRetry.pricingSnapshotJson, approvedConfiguration.pricingSnapshot);

  const unchangedFailedRow = await strapi.db.query(generationUid).findOne({
    where: { reportRunId: failedGeneration.reportRunId },
  });
  assert.deepEqual({
    reportRunId: unchangedFailedRow.reportRunId,
    periodStart: unchangedFailedRow.periodStart,
    periodEnd: unchangedFailedRow.periodEnd,
    dataCutoffAt: unchangedFailedRow.dataCutoffAt,
    status: unchangedFailedRow.status,
    snapshotDigest: unchangedFailedRow.snapshotDigest,
    sourceRevision: unchangedFailedRow.sourceRevision,
    snapshotJson: unchangedFailedRow.snapshotJson,
  }, originalFailedState);

  return generationResult.reportRunId;
}

function sourceInput(resource, cursor = null, pageSize = 1, overrides = {}) {
  return {
    contractVersion: 'survey-generation-source.v1',
    resource,
    ...RANGE,
    cursor,
    pageSize,
    ...overrides,
  };
}

test('private report source requires its isolated worker action and returns complete raw-source pages', async () => {
  let strapi;
  let strapiStarted = false;
  const previous = { ...process.env };
  try {
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await compose('up', '--detach', '--wait');
    const databasePort = (await compose('port', 'postgres', '5432')).stdout.trim().split(':').at(-1);
    const secret = 'tb113-private-report-source-local-only';
    Object.assign(process.env, {
      NODE_ENV: 'test',
      ENV_PATH: '/dev/null',
      DATABASE_CLIENT: 'postgres',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: databasePort,
      DATABASE_NAME: 'tb113_test_feedback',
      DATABASE_USERNAME: 'tb113_test_runner',
      DATABASE_PASSWORD: 'tb113_test_local_only',
      DATABASE_SSL: 'false',
      APP_KEYS: `${secret}-1,${secret}-2`,
      API_TOKEN_SALT: `${secret}-api`,
      ADMIN_JWT_SECRET: `${secret}-admin`,
      TRANSFER_TOKEN_SALT: `${secret}-transfer`,
      JWT_SECRET: `${secret}-jwt`,
      PORT: '0',
    });

    const { createStrapi } = require('@strapi/strapi');
    strapi = createStrapi({ autoReload: false, serveAdminPanel: false });
    await strapi.load();
    const regularRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });
    await grant(strapi, regularRole.id, SOURCE_ACTION);
    const regularJwt = await createPrincipal(strapi, {
      name: 'tb113-source-regular-user',
      email: 'tb113-source-regular-user@local.invalid',
      role: regularRole,
    });
    strapi.config.set('admin.secrets.encryptionKey', `${secret}-encryption`);
    const tokenService = strapi.service('admin::api-token-content-api');
    const workerToken = await tokenService.create({
      name: 'tb113-private-source-synthetic-worker',
      description: 'Disposable source-read token for isolated HTTP coverage',
      type: 'custom',
      permissions: [SOURCE_ACTION],
      lifespan: null,
    });
    const ungrantedToken = await tokenService.create({
      name: 'tb113-private-source-synthetic-ungranted',
      description: 'Disposable custom token with no source permission',
      type: 'custom',
      permissions: [],
      lifespan: null,
    });
    assert.deepEqual(workerToken.permissions, [SOURCE_ACTION]);
    assert.deepEqual(ungrantedToken.permissions, []);

    const version = await strapi.documents('api::survey-version.survey-version').create({
      data: {
        versionKey: 'private-source-v1',
        status: 'published',
        copyEs: {},
        copyEn: {},
        copyPt: {},
        aspects: [
          { ownerVersionKey: 'private-source-v1', aspectKey: 'views', sortOrder: 1, labelEs: 'Vistas', labelEn: 'Views', labelPt: 'Vistas' },
          { ownerVersionKey: 'private-source-v1', aspectKey: 'other', sortOrder: 13, labelEs: 'Otro', labelEn: 'Other', labelPt: 'Outro' },
        ],
      },
    });
    const point = await strapi.documents('api::survey-qr-point.survey-qr-point').create({
      data: {
        pointKey: 'private-source-point',
        publicCode: 'S'.repeat(32),
        displayName: 'Private source point',
        status: 'active',
        sortOrder: 4,
      },
    });
    const persistence = createSubmissionPersistence(strapi);
    const sourceSubmissions = Array.from({ length: 27 }, (_, index) => {
      const acceptedAt = index < 13
        ? `2026-08-25T15:${String(index).padStart(2, '0')}:00.000Z`
        : index < 26
          ? `2026-09-02T04:${String(index - 13).padStart(2, '0')}:00.000Z`
          : '2026-09-03T15:00:00.000Z';
      const digestIndex = index + 1;
      return {
        index,
        acceptedAt,
        receipt: `00000000-0000-4000-8000-${String(digestIndex + 10).padStart(12, '0')}`,
        payloadDigest: sha256(`private-source-payload-${index}`),
      };
    });
    for (const { index, acceptedAt, receipt, payloadDigest } of sourceSubmissions) {
      const nonceHash = sha256(`private-source-nonce-${index}`);
      const browserHash = sha256(`private-source-browser-${index}`);
      await persistence.accept({
        contractVersion: 'feedback-cms-submission.v1',
        operation: 'accept',
        claims: { pointKey: point.pointKey, publicCodeHash: sha256(point.publicCode), versionKey: version.versionKey },
        pointDocumentId: point.documentId,
        versionDocumentId: version.documentId,
        submission: {
          receipt,
          acceptedAt,
          source: 'valid_qr',
          locale: 'en',
          overallRating: (index % 5) + 1,
          ratings: [
            { aspectKey: 'views', label: 'Views', sortOrder: 1, rating: 'positive' },
            { aspectKey: 'other', label: 'Other', sortOrder: 13, rating: 'neutral', customText: 'Access' },
          ],
          ...(index === 14 ? { comment: null } : { comment: `Private report comment ${index + 1}` }),
          sessionNonceHash: nonceHash,
          payloadDigest,
          browserTokenHash: browserHash,
          idempotencyKey: `private-source-key-${String(index + 1).padStart(3, '0')}`,
        },
      });
    }

    await strapi.start();
    strapiStarted = true;
    const port = strapi.server.httpServer.address().port;
    const input = sourceInput('submissions');
    const anonymous = await readPage(port, null, input);
    assert.ok([401, 403].includes(anonymous.status));
    const regularActionGranted = await captureQueries(strapi, () => readPage(port, regularJwt, input));
    assert.ok([401, 403].includes(regularActionGranted.result.status));
    assert.equal(regularActionGranted.queries.some((sql) => /survey_submissions/.test(sql)), false);
    const deniedBeforeValidation = await readPage(port, regularJwt, {
      ...input,
      unknown: 'x'.repeat(4096),
    });
    assert.ok([401, 403].includes(deniedBeforeValidation.status));
    const missingAction = await readPage(port, ungrantedToken.accessKey, input);
    assert.equal(missingAction.status, 403);

    const publicCollectionRead = await fetch(`http://127.0.0.1:${port}/api/survey-submissions`);
    assert.ok([401, 403].includes(publicCollectionRead.status));
    const ordinaryCollectionRead = await fetch(`http://127.0.0.1:${port}/api/survey-submissions`, {
      headers: { authorization: `Bearer ${regularJwt}` },
    });
    assert.equal(ordinaryCollectionRead.status, 403);
    const tokenCollectionRead = await fetch(`http://127.0.0.1:${port}/api/survey-submissions`, {
      headers: { authorization: `Bearer ${workerToken.accessKey}` },
    });
    assert.equal(tokenCollectionRead.status, 403);

    const capturedFirst = await captureQueries(strapi, () => readPage(port, workerToken.accessKey, input));
    const first = capturedFirst.result;
    assert.equal(first.status, 200);
    assert.equal(first.body.contractVersion, 'survey-generation-source.v1');
    assert.equal(first.body.resource, 'submissions');
    assert.equal(first.body.cursor, null);
    assert.equal(typeof first.body.nextCursor, 'string');
    assert.equal(first.body.total, 14);
    assert.equal(first.body.items.length, 1);
    const firstItem = first.body.items[0];
    assert.equal(firstItem.receipt, '00000000-0000-4000-8000-000000000024');
    assert.equal(firstItem.comment, 'Private report comment 14');
    assert.equal(firstItem.payloadDigest, sourceSubmissions[13].payloadDigest);
    assert.equal(firstItem.source, 'valid_qr');
    assert.deepEqual(firstItem.ratings.map(({ aspectKey, sortOrder, rating }) => ({ aspectKey, sortOrder, rating })), [
      { aspectKey: 'views', sortOrder: 1, rating: 'positive' },
      { aspectKey: 'other', sortOrder: 13, rating: 'neutral' },
    ]);
    assert.equal(firstItem.qrPoint.documentId, point.documentId);
    assert.equal(firstItem.qrPoint.pointKey, point.pointKey);
    assert.equal(firstItem.surveyVersion.documentId, version.documentId);
    assert.equal(firstItem.surveyVersion.versionKey, version.versionKey);
    const sourceProjection = capturedFirst.queries.find((sql) => /select\b/i.test(sql) && /survey_submissions/.test(sql) && /payload_digest/.test(sql));
    assert.ok(sourceProjection);
    assert.match(sourceProjection, /submission"\."comment"/i);
    assert.match(sourceProjection, /submission"\."payload_digest"/i);
    assert.doesNotMatch(sourceProjection, /session_nonce_hash|browser_token_hash|idempotency_key/i);

    const second = await readPage(port, workerToken.accessKey, sourceInput('submissions', first.body.nextCursor));
    assert.equal(second.status, 200);
    assert.equal(second.body.cursor, first.body.nextCursor);
    assert.equal(typeof second.body.nextCursor, 'string');
    assert.equal(second.body.total, 14);
    assert.equal(second.body.items.length, 1);
    assert.equal(second.body.items[0].receipt, '00000000-0000-4000-8000-000000000025');
    assert.equal(Object.hasOwn(second.body.items[0], 'comment'), true);
    assert.equal(second.body.items[0].comment, null);

    for (const changedCursorScope of [
      sourceInput('submissions', first.body.nextCursor, 1, { dataCutoffAt: '2026-09-10T12:00:01.000Z' }),
      sourceInput('versions', first.body.nextCursor, 1),
      sourceInput('submissions', first.body.nextCursor, 1, { acceptedAtGte: '2026-09-02T03:00:00.000Z' }),
    ]) {
      const rejected = await readPage(port, workerToken.accessKey, changedCursorScope);
      assert.equal(rejected.status, 400);
      assert.equal(rejected.body.error.code, 'VALIDATION_FAILED');
    }

    for (const resource of ['versions', 'points']) {
      const page = await readPage(port, workerToken.accessKey, sourceInput(resource, null, 25));
      assert.equal(page.status, 200);
      assert.equal(page.body.total, 1);
      assert.equal(page.body.items.length, 1);
      if (resource === 'versions') {
        assert.equal(page.body.items[0].documentId, version.documentId);
        assert.equal(page.body.items[0].versionKey, version.versionKey);
        assert.deepEqual(page.body.items[0].aspects.map(({ aspectKey, sortOrder }) => ({ aspectKey, sortOrder })), [
          { aspectKey: 'views', sortOrder: 1 },
          { aspectKey: 'other', sortOrder: 13 },
        ]);
      } else {
        assert.equal(page.body.items[0].documentId, point.documentId);
        assert.equal(page.body.items[0].pointKey, point.pointKey);
      }
    }

    await verifyAppSourceIntegration(port, workerToken.accessKey);
    const appCreatedReportRunId = await verifyAppGenerationCommandIntegration(strapi, port, workerToken);
    await verifyWorkerCmsClientIntegration(strapi, port, appCreatedReportRunId);

    for (const malformed of [
      { ...input, unknown: true },
      { ...input, acceptedAtGte: '2026-09-01' },
      { ...input, acceptedAtLte: '2026-08-01T00:00:00.000Z' },
      { ...input, dataCutoffAt: '2026-09-10' },
      { ...input, pageSize: 0 },
      { ...input, pageSize: 26 },
      { ...input, resource: 'survey-report-generation' },
      { ...input, cursor: 'forged-invalid-cursor' },
    ]) {
      const rejected = await readPage(port, workerToken.accessKey, malformed);
      assert.equal(rejected.status, 400);
      assert.equal(rejected.body.error.code, 'VALIDATION_FAILED');
    }

    const oversized = await readPage(port, workerToken.accessKey, {
      ...sourceInput('submissions', null, 25),
      extra: 'x'.repeat(4096),
    });
    assert.equal(oversized.status, 413);
    assert.equal(oversized.body.error.code, 'PAYLOAD_TOO_LARGE');

    const service = strapi.service('api::survey-report-generation.survey-report-generation');
    const originalReader = service.readWorkerReportSourcePage;
    service.readWorkerReportSourcePage = async () => {
      throw Object.assign(new Error('synthetic database detail must not escape'), { code: 'SOURCE_UNAVAILABLE' });
    };
    try {
      const unavailable = await readPage(port, workerToken.accessKey, input);
      assert.equal(unavailable.status, 503);
      assert.equal(unavailable.body.error.code, 'UPSTREAM_UNAVAILABLE');
      assert.equal(JSON.stringify(unavailable.body).includes('synthetic database detail'), false);
      service.readWorkerReportSourcePage = async () => {
        throw new Error('synthetic internal detail must not escape');
      };
      const internal = await readPage(port, workerToken.accessKey, input);
      assert.equal(internal.status, 500);
      assert.equal(internal.body.error.code, 'INTERNAL_ERROR');
      assert.equal(JSON.stringify(internal.body).includes('synthetic internal detail'), false);
    } finally {
      service.readWorkerReportSourcePage = originalReader;
    }
  } finally {
    if (strapi) {
      await strapi.destroy();
      if (strapiStarted) assert.equal(strapi.server.httpServer.listening, false);
    }
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
    const label = `label=com.docker.compose.project=${OWNER}`;
    assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
    assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
  }
});
