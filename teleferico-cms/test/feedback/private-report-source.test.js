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
  ];
  const moduleCache = new Map();

  function resolveLocalModule(parentFile, request) {
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
    if (!sourceRoots.some((root) => isWithin(root, realPath)) || !realPath.endsWith('.ts'))
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
  return {
    createPrivateReportSourceTransport: load(
      path.join(workerRoot, 'private-report-source-transport.ts'),
    ).createPrivateReportSourceTransport,
    buildAuthoritativeGenerationInputsV1: load(
      path.join(workerRoot, 'authoritative-generation-source.ts'),
    ).buildAuthoritativeGenerationInputsV1,
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
    if (strapi) await strapi.destroy();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }

  const label = `label=com.docker.compose.project=${OWNER}`;
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
});
