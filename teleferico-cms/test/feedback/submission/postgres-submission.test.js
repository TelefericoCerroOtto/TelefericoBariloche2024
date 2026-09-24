const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require('../harness/postgres-harness');
const { createSubmissionPersistence } = require('../../../src/api/survey-submission/services/persistence');

const OWNER = 'tb113_test_submission';
const compose = (...args) => executeFixed(DOCKER_EXECUTABLE, [
  'compose', '--file', COMPOSE_FILE, '--project-name', OWNER, ...args,
]);
const digest = (value) => createHash('sha256').update(value).digest('hex');

function command(point, version, overrides = {}) {
  return {
    pointDocumentId: point.documentId,
    versionDocumentId: version.documentId,
    claims: {
      pointKey: point.pointKey,
      publicCodeHash: digest(point.publicCode),
      versionKey: version.versionKey,
    },
    submission: {
      receipt: '00000000-0000-4000-8000-000000000001',
      acceptedAt: '2026-09-17T12:00:00.000Z',
      source: 'valid_qr',
      locale: 'en',
      overallRating: 5,
      ratings: [
        { aspectKey: 'views', label: 'Views', sortOrder: 1, rating: 'positive' },
        { aspectKey: 'other', label: 'Other', sortOrder: 13, rating: 'neutral', customText: 'Access' },
      ],
      comment: 'Wonderful visit',
      sessionNonceHash: 'a'.repeat(64),
      payloadDigest: 'b'.repeat(64),
      browserTokenHash: 'c'.repeat(64),
      idempotencyKey: 'idem-key-0000001',
      ...overrides,
    },
  };
}

test('Strapi persistence validates domain identity and commits one immutable submission', async () => {
  let strapi;
  const previous = { ...process.env };
  try {
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await compose('up', '--detach', '--wait');
    const port = (await compose('port', 'postgres', '5432')).stdout.trim().split(':').at(-1);
    const secret = 'tb113-submission-local-only';
    Object.assign(process.env, {
      NODE_ENV: 'test', ENV_PATH: '/dev/null', DATABASE_CLIENT: 'postgres',
      DATABASE_HOST: '127.0.0.1', DATABASE_PORT: port, DATABASE_NAME: 'tb113_test_feedback',
      DATABASE_USERNAME: 'tb113_test_runner', DATABASE_PASSWORD: 'tb113_test_local_only',
      DATABASE_SSL: 'false', APP_KEYS: `${secret}-1,${secret}-2`,
      API_TOKEN_SALT: `${secret}-api`, ADMIN_JWT_SECRET: `${secret}-admin`,
      TRANSFER_TOKEN_SALT: `${secret}-transfer`, JWT_SECRET: `${secret}-jwt`,
    });
    const { createStrapi } = require('@strapi/strapi');
    strapi = createStrapi({ autoReload: false, serveAdminPanel: false });
    await strapi.load();

    const version = await strapi.documents('api::survey-version.survey-version').create({ data: {
      versionKey: 'visitor-v1', status: 'published', copyEs: {}, copyEn: {}, copyPt: {},
      aspects: [
        { ownerVersionKey: 'visitor-v1', aspectKey: 'views', sortOrder: 1, labelEs: 'Vistas', labelEn: 'Views', labelPt: 'Vistas' },
        { ownerVersionKey: 'visitor-v1', aspectKey: 'other', sortOrder: 13, labelEs: 'Otro', labelEn: 'Other', labelPt: 'Outro' },
      ],
    } });
    const point = await strapi.documents('api::survey-qr-point.survey-qr-point').create({ data: {
      pointKey: 'summit', publicCode: 'A'.repeat(32), displayName: 'Summit', status: 'active', sortOrder: 1,
    } });
    const persistence = createSubmissionPersistence(strapi);

    const [first, replay] = await Promise.all([
      persistence.accept(command(point, version)),
      persistence.accept(command(point, version)),
    ]);
    assert.deepEqual([first.status, replay.status].sort(), [200, 201]);
    assert.equal(first.submissionReceipt, replay.submissionReceipt);

    const stored = await strapi.documents('api::survey-submission.survey-submission').findMany({
      populate: ['ratings', 'qrPoint', 'surveyVersion'],
    });
    assert.equal(stored.length, 1);
    assert.equal(stored[0].source, 'valid_qr');
    assert.equal(new Date(stored[0].acceptedAt).toISOString(), '2026-09-17T12:00:00.000Z');
    assert.equal(stored[0].browserTokenHash, 'c'.repeat(64));
    assert.deepEqual(stored[0].ratings.map(({ aspectKey, sortOrder, customText }) => ({ aspectKey, sortOrder, customText: customText ?? null })), [
      { aspectKey: 'views', sortOrder: 1, customText: null },
      { aspectKey: 'other', sortOrder: 13, customText: 'Access' },
    ]);
    assert.equal(stored[0].qrPoint.documentId, point.documentId);
    assert.equal(stored[0].surveyVersion.documentId, version.documentId);

    await assert.rejects(
      persistence.accept(command(point, version, { payloadDigest: 'd'.repeat(64) })),
      { code: 'IDEMPOTENCY_CONFLICT' },
    );
    await assert.rejects(
      persistence.accept({ ...command(point, version), claims: { ...command(point, version).claims, pointKey: 'wrong' } }),
      { code: 'SURVEY_UNAVAILABLE' },
    );
    await assert.rejects(
      persistence.accept(command(point, version, {
        receipt: '00000000-0000-4000-8000-000000000002',
        idempotencyKey: 'idem-key-0000002',
        ratings: [
          { aspectKey: 'views', label: 'Views', sortOrder: 1, rating: 'positive' },
          { aspectKey: 'views', label: 'Views', sortOrder: 2, rating: 'negative' },
        ],
      })),
    );
    assert.equal((await strapi.documents('api::survey-submission.survey-submission').findMany()).length, 1);
    const componentCount = await strapi.db.connection('components_survey_aspect_ratings').count('* AS count').first();
    assert.equal(Number(componentCount.count), 2);
  } finally {
    if (strapi) await strapi.destroy();
    process.env = previous;
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }
  const label = `label=com.docker.compose.project=${OWNER}`;
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
});
