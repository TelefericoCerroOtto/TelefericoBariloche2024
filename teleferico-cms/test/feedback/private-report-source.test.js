const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
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
    for (const [index, acceptedAt, receipt] of [
      ['1', '2026-09-10T11:00:00.000Z', '00000000-0000-4000-8000-000000000011'],
      ['2', '2026-09-10T13:00:00.000Z', '00000000-0000-4000-8000-000000000012'],
    ]) {
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
          overallRating: Number(index) + 3,
          ratings: [
            { aspectKey: 'views', label: 'Views', sortOrder: 1, rating: 'positive' },
            { aspectKey: 'other', label: 'Other', sortOrder: 13, rating: 'neutral', customText: 'Access' },
          ],
          ...(index === '1' ? { comment: 'Private report comment 1' } : { comment: null }),
          sessionNonceHash: index.repeat(64),
          payloadDigest: index.repeat(64),
          browserTokenHash: 'c'.repeat(64),
          idempotencyKey: `private-source-key-${index}`,
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
    assert.equal(first.body.total, 2);
    assert.equal(first.body.items.length, 1);
    const firstItem = first.body.items[0];
    assert.equal(firstItem.receipt, '00000000-0000-4000-8000-000000000011');
    assert.equal(firstItem.comment, 'Private report comment 1');
    assert.equal(firstItem.payloadDigest, '1'.repeat(64));
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
    assert.equal(second.body.nextCursor, null);
    assert.equal(second.body.total, 2);
    assert.equal(second.body.items.length, 1);
    assert.equal(second.body.items[0].receipt, '00000000-0000-4000-8000-000000000012');
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
