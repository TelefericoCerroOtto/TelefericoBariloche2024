const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const migration = require('../../../database/migrations/2026.09.11T0001-tb113-constraints');
const {
  prepareActivation,
  preparePublish,
} = require('../../../src/api/survey-version/services/lifecycle');
const {
  prepareQrStatus,
} = require('../../../src/api/survey-qr-point/services/lifecycle');
const {
  prepareSubmission,
} = require('../../../src/api/survey-submission/services/lifecycle');
const {
  assertReportCreation,
  prepareGenerationTransition,
} = require('../../../src/api/survey-report-generation/services/lifecycle');

const COMPLETE_COPY = Object.freeze({
  headerTitle: 'Header',
  localeLabel: 'Language',
  progressLabel: 'Progress',
  overallQuestion: 'Overall?',
  overallInstruction: 'Choose',
  aspectsQuestion: 'Aspects?',
  aspectsInstruction: 'Choose aspects',
  otherLabel: 'Other',
  sentimentQuestion: 'Sentiment?',
  sentimentInstruction: 'Choose sentiment',
  commentQuestion: 'Comment?',
  commentInstruction: 'Optional',
  commentLabel: 'Comment',
  personalDataWarning: 'Do not include personal data',
  verificationTitle: 'Verification',
  verificationInstruction: 'Complete verification',
  privacyNotice: 'Privacy notice',
  backLabel: 'Back',
  nextLabel: 'Next',
  submitLabel: 'Submit',
  loadingStatus: 'Loading',
  ratingRequired: 'Rating required',
  aspectsRequired: 'Aspect required',
  otherRequired: 'Other required',
  sentimentsRequired: 'Sentiment required',
  verificationFailed: 'Verification failed',
  submittingStatus: 'Submitting',
  genericFailure: 'Try again',
  successTitle: 'Success',
  successMessage: 'Accepted',
  receiptLabel: 'Receipt',
});

function draftVersion(overrides = {}) {
  return {
    documentId: 'version-document',
    versionKey: 'visitor-v1',
    status: 'draft',
    copyEs: COMPLETE_COPY,
    copyEn: COMPLETE_COPY,
    copyPt: COMPLETE_COPY,
    aspects: [
      {
        aspectKey: 'views',
        ownerVersionKey: 'visitor-v1',
        sortOrder: 0,
        labelEs: 'Vistas',
        labelEn: 'Views',
        labelPt: 'Vistas',
      },
    ],
    ...overrides,
  };
}

test('publishes only complete drafts and keeps published content immutable', () => {
  const published = preparePublish(draftVersion(), '2026-09-15T12:00:00.000Z');
  assert.deepEqual(published, {
    status: 'published',
    lifecyclePublishedAt: '2026-09-15T12:00:00.000Z',
  });

  assert.throws(
    () => preparePublish(draftVersion({ status: 'published' }), '2026-09-15T12:00:00.000Z'),
    { code: 'PUBLISHED_VERSION_IMMUTABLE' },
  );
  assert.throws(
    () => preparePublish(draftVersion({ copyPt: {} }), '2026-09-15T12:00:00.000Z'),
    { code: 'INCOMPLETE_TRANSLATIONS' },
  );
  assert.throws(
    () => preparePublish(draftVersion({
      aspects: [
        draftVersion().aspects[0],
        { ...draftVersion().aspects[0], aspectKey: 'staff' },
      ],
    }), '2026-09-15T12:00:00.000Z'),
    { code: 'INVALID_ASPECT_CATALOG' },
  );
});

test('activation repoints the singleton and preserves immutable published versions', () => {
  const result = prepareActivation({ settingsRevision: 3 }, draftVersion({ status: 'published' }), {
    documentId: 'old-version',
  }, '2026-09-15T12:00:00.000Z');

  assert.deepEqual(result.settings, {
    activeSurveyVersion: 'version-document',
    settingsRevision: 4,
  });
  assert.deepEqual(result.target, { lastActivatedAt: '2026-09-15T12:00:00.000Z' });
  assert.deepEqual(result.previous, { lastSupersededAt: '2026-09-15T12:00:00.000Z' });
  assert.throws(
    () => prepareActivation({ settingsRevision: 1 }, draftVersion(), null, '2026-09-15T12:00:00.000Z'),
    { code: 'VERSION_NOT_PUBLISHED' },
  );
  assert.equal(
    prepareActivation(
      { settingsRevision: 4 },
      draftVersion({ status: 'published' }),
      { documentId: 'version-document' },
      '2026-09-15T12:00:00.000Z',
    ).previous,
    null,
  );
});

test('QR status transitions set and clear inactiveAt without replacing identity', () => {
  const point = { pointKey: 'summit', publicCode: 'x'.repeat(32), status: 'active' };
  assert.deepEqual(prepareQrStatus(point, 'inactive', '2026-09-15T12:00:00.000Z'), {
    status: 'inactive',
    inactiveAt: '2026-09-15T12:00:00.000Z',
  });
  assert.deepEqual(prepareQrStatus({ ...point, status: 'inactive' }, 'active', 'ignored'), {
    status: 'active',
    inactiveAt: null,
  });
  assert.throws(() => prepareQrStatus(point, 'retired', 'now'), { code: 'INVALID_QR_STATUS' });
});

test('submission preparation validates 1..3 selections and snapshots server context', () => {
  const version = draftVersion({
    aspects: [
      draftVersion().aspects[0],
      {
        aspectKey: 'other',
        ownerVersionKey: 'visitor-v1',
        sortOrder: 1,
        labelEs: 'Otro',
        labelEn: 'Other',
        labelPt: 'Outro',
      },
    ],
  });
  const result = prepareSubmission({
    locale: 'en',
    overallRating: 5,
    aspects: [{ aspectKey: 'views', rating: 'positive' }],
    otherAspect: { customText: 'Accessibility', rating: 'neutral' },
    comment: 'Excellent visit',
  }, {
    acceptedAt: '2026-09-15T14:00:00.000Z',
    qrPointDocumentId: 'point-document',
    receipt: '2dff4c79-c121-4fa5-a3dd-f734818aba5a',
    surveyVersionDocumentId: version.documentId,
    version,
  });

  assert.equal(result.source, 'valid_qr');
  assert.equal(result.acceptedAt, '2026-09-15T14:00:00.000Z');
  assert.equal(result.surveyVersion, version.documentId);
  assert.equal(result.qrPoint, 'point-document');
  assert.deepEqual(result.ratings, [
    { aspectKey: 'views', label: 'Views', ownerReceipt: result.receipt, rating: 'positive', sortOrder: 0 },
    { aspectKey: 'other', customText: 'Accessibility', label: 'Other', ownerReceipt: result.receipt, rating: 'neutral', sortOrder: 1 },
  ]);

  assert.throws(
    () => prepareSubmission({ ...result, aspects: [] }, { ...result, version }),
    { code: 'INVALID_SELECTION_COUNT' },
  );
  assert.throws(
    () => prepareSubmission({
      locale: 'es', overallRating: 4,
      aspects: [{ aspectKey: 'views', rating: 'positive' }, { aspectKey: 'views', rating: 'negative' }],
    }, { ...result, version }),
    { code: 'DUPLICATE_ASPECT' },
  );
});

test('generation transitions require CAS and complete terminal timestamps', () => {
  const queued = { status: 'queued', stateVersion: 2, completedAt: null };
  assert.deepEqual(prepareGenerationTransition(queued, 2, 'running', '2026-09-15T12:00:00.000Z'), {
    status: 'running',
    stateVersion: 3,
    claimedAt: '2026-09-15T12:00:00.000Z',
  });
  assert.throws(
    () => prepareGenerationTransition(queued, 1, 'running', '2026-09-15T12:00:00.000Z'),
    { code: 'STATE_VERSION_CONFLICT' },
  );
  assert.throws(
    () => prepareGenerationTransition({ ...queued, status: 'succeeded' }, 2, 'running', 'now'),
    { code: 'TERMINAL_CONFLICT' },
  );
  assert.deepEqual(
    prepareGenerationTransition(
      { ...queued, status: 'running' },
      2,
      'succeeded',
      '2026-09-15T13:00:00.000Z',
    ),
    {
      status: 'succeeded',
      stateVersion: 3,
      completedAt: '2026-09-15T13:00:00.000Z',
    },
  );
  assert.throws(
    () => prepareGenerationTransition(queued, 2, 'succeeded', 'now'),
    { code: 'INVALID_STATE' },
  );
  assert.doesNotThrow(() => assertReportCreation({ status: 'running' }));
  assert.throws(() => assertReportCreation({ status: 'queued' }), { code: 'INVALID_STATE' });
});

test('migration defers on an empty database and executes through one ready transaction handle', async () => {
  const deferred = [];
  const deferredResult = await migration.up({
    raw: async (statement) => {
      deferred.push(statement);
      return { rows: [{ missing_count: 20 }] };
    },
  });
  assert.equal(deferredResult, false);
  assert.deepEqual(deferred, [migration.SCHEMA_READINESS_SQL]);

  const executed = [];
  const appliedResult = await migration.up({
    raw: async (statement) => {
      executed.push(statement);
      return { rows: [{ missing_count: 0 }] };
    },
  });
  assert.equal(appliedResult, true);
  assert.deepEqual(executed, [migration.SCHEMA_READINESS_SQL, ...migration.STATEMENTS]);
  await assert.rejects(migration.down(), /no destructive rollback/);
});

test('survey APIs expose no generic CRUD routes while lifecycle services stay aligned', () => {
  const names = [
    'survey-version',
    'survey-settings',
    'survey-qr-point',
    'survey-submission',
    'survey-report-generation',
    'survey-report',
  ];

  for (const name of names.filter((candidate) => candidate !== 'survey-submission')) {
    const routes = require(path.join(
      '../../../src/api',
      name,
      'routes',
      `${name}.js`,
    ));
    assert.deepEqual(routes, { type: 'content-api', routes: [] });
    assert.deepEqual(require(path.join(
      '../../../src/api',
      name,
      'controllers',
      `${name}.js`,
    )), {});
    assert.doesNotThrow(() => require(path.join(
      '../../../src/api',
      name,
      'services',
      `${name}.js`,
    )));
  }

  const intakeRoutes = require('../../../src/api/survey-submission/routes/survey-submission');
  assert.deepEqual(intakeRoutes.routes.map(({ method, handler }) => [method, handler]), [
    ['GET', 'survey-submission.resolveSurvey'],
    ['POST', 'survey-submission.submit'],
  ]);
});

test('submission controller rejects malformed and unknown versioned commands before persistence', async () => {
  const controller = require('../../../src/api/survey-submission/controllers/survey-submission');
  const previous = global.strapi;
  global.strapi = new Proxy({}, { get() { throw new Error('persistence reached'); } });
  try {
    for (const body of [
      { contractVersion: 'feedback-cms-submission.v0', operation: 'lookup' },
      { contractVersion: 'feedback-cms-submission.v1', operation: 'unknown' },
    ]) {
      const ctx = {
        request: { body },
        badRequest(code) { this.status = 400; this.body = { error: { code } }; },
      };
      await controller.submit(ctx);
      assert.equal(ctx.status, 400);
      assert.deepEqual(ctx.body, { error: { code: 'INVALID_COMMAND' } });
    }
  } finally {
    global.strapi = previous;
  }
});

test('migration declares every approved unique index and database invariant', () => {
  assert.deepEqual(
    migration.INDEX_NAMES,
    [
      'uq_submission_nonce_idem',
      'uq_definition_owner_key',
      'uq_definition_owner_order',
      'uq_rating_owner_key',
      'uq_generation_active_range',
      'uq_generation_task',
      'uq_report_generation',
      'uq_settings_singleton',
    ],
  );
  assert.deepEqual(
    migration.CONSTRAINT_NAMES,
    [
      'ck_settings_singleton',
      'ck_qr_point_status_time',
      'ck_generation_range',
      'ck_generation_terminal',
    ],
  );
});
