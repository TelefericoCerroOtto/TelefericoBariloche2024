const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const SURVEY_APIS = [
  'survey-version',
  'survey-settings',
  'survey-qr-point',
  'survey-submission',
  'survey-report-generation',
  'survey-report',
];
const APP_FEEDBACK_CAPABILITIES = [
  'feedback.read',
  'feedback.comments.read',
  'feedback.reports.read',
  'feedback.reports.generate',
];
const {
  createPrivateFeedbackAdminReader,
  validateQuery: validateFeedbackAdminReadQuery,
} = require('../../../src/api/survey-report-generation/services/private-feedback-admin-read');

test('survey routes expose bounded native reads and mediated writes', () => {
  for (const api of SURVEY_APIS.filter((candidate) => ['survey-version', 'survey-settings', 'survey-qr-point'].includes(candidate))) {
    const root = path.resolve(__dirname, `../../../src/api/${api}`);
    const routes = fs.readFileSync(path.join(root, `routes/${api}.js`), 'utf8');
    const controller = fs.readFileSync(path.join(root, `controllers/${api}.js`), 'utf8');

    assert.match(routes, /createCoreRouter/, api);
    assert.match(controller, /createCoreController/, api);
  }

  const generationRoot = path.resolve(__dirname, '../../../src/api/survey-report-generation');
  const generationController = fs.readFileSync(
    path.join(generationRoot, 'controllers/survey-report-generation.js'),
    'utf8',
  );
  const generationRoutes = fs.readFileSync(
    path.join(generationRoot, 'routes/survey-report-generation.js'),
    'utf8',
  );
  const generationAdminRoutes = require(path.join(generationRoot, 'routes/admin')).routes;
  const privateSourceRoute = generationAdminRoutes.find(({ handler }) => handler === 'survey-report-generation.workerSourceRead');
  const workerAuthRoutes = new Map([
    ['workerClaim', 'api::survey-report-generation.survey-report-generation.workerClaim'],
    ['workerFail', 'api::survey-report-generation.survey-report-generation.workerFail'],
    ['workerAlertAck', 'api::survey-report-generation.survey-report-generation.workerAlertAck'],
    ['workerSnapshot', 'api::survey-report-generation.survey-report-generation.workerSnapshot'],
    ['workerCheckpoint', 'api::survey-report-generation.survey-report-generation.workerCheckpoint'],
    ['workerComplete', 'api::survey-report-generation.survey-report-generation.workerComplete'],
    ['workerReportDownloadMetadata', 'api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata'],
    ['feedbackAdminRead', 'api::survey-report-generation.survey-report-generation.feedbackAdminRead'],
  ]);
  assert.match(generationController, /createCoreController/);
  assert.match(generationController, /dispatchFailure/);
  assert.match(generationRoutes, /createCoreRouter/);
  assert.doesNotMatch(generationRoutes, /tb113\/admin/);
  assert.deepEqual(generationAdminRoutes.map(({ method, path: routePath, handler }) => [method, routePath, handler]), [
    ['POST', '/tb113/admin/generations/:reportRunId/dispatch-failure', 'survey-report-generation.dispatchFailure'],
    ['POST', '/tb113/admin/generations/:reportRunId/dispatch-state', 'survey-report-generation.dispatchState'],
    ['POST', '/tb113/worker/generations/:reportRunId/claim', 'survey-report-generation.workerClaim'],
    ['POST', '/tb113/worker/generations/:reportRunId/fail', 'survey-report-generation.workerFail'],
    ['POST', '/tb113/worker/generations/:reportRunId/alerts/ack', 'survey-report-generation.workerAlertAck'],
    ['GET', '/tb113/worker/generations/:reportRunId/snapshot', 'survey-report-generation.workerSnapshot'],
    ['POST', '/tb113/worker/report-source', 'survey-report-generation.workerSourceRead'],
    ['POST', '/tb113/admin/feedback/read', 'survey-report-generation.feedbackAdminRead'],
    ['GET', '/tb113/worker/reports/:reportId/download-metadata', 'survey-report-generation.workerReportDownloadMetadata'],
    ['PUT', '/tb113/worker/generations/:reportRunId/checkpoints/:stageKey', 'survey-report-generation.workerCheckpoint'],
    ['POST', '/tb113/worker/generations/:reportRunId/complete', 'survey-report-generation.workerComplete'],
  ]);
  assert.ok(generationAdminRoutes.every(({ config }) => config?.auth !== false));
  assert.deepEqual(privateSourceRoute.config.auth, {
    strategies: ['content-api-token'],
    scope: ['api::survey-report-generation.survey-report-generation.workerSourceRead'],
  });
  for (const [action, scope] of workerAuthRoutes) {
    const route = generationAdminRoutes.find(({ handler }) => handler.endsWith(`.${action}`));
    assert.deepEqual(route.config.auth, {
      strategies: ['content-api-token'],
      scope: [scope],
    });
    assert.match(generationController, new RegExp(`async ${action}\\(ctx\\) \\{\\s*if \\(!hasCustomContentApiTokenIdentity\\(ctx\\)\\)`));
  }
  assert.equal(generationAdminRoutes.find(({ handler }) => handler.endsWith('.dispatchFailure')).config, undefined);
  assert.equal(generationAdminRoutes.find(({ handler }) => handler.endsWith('.dispatchState')).config, undefined);
  assert.equal(fs.existsSync(path.join(generationRoot, 'services/admin-commands.js')), false);
  const reportRoutes = fs.readFileSync(path.resolve(__dirname, '../../../src/api/survey-report/routes/survey-report.js'), 'utf8');
  assert.match(reportRoutes, /createCoreRouter/);

  const root = path.resolve(__dirname, '../../../src/api/survey-submission');
  const actions = require(path.join(root, 'routes/survey-submission')).routes.map(({ handler }) => handler);
  assert.deepEqual(actions, [
    'survey-submission.submit',
  ]);
  assert.match(fs.readFileSync(path.join(root, 'routes/native.js'), 'utf8'), /only: \['find', 'findOne'\]/);
});

test('documents the four role-derived application capabilities without durable grants', () => {
  const documentation = fs.readFileSync(
    path.resolve(__dirname, '../../../../docs/STRAPI_PERMISSIONS.md'),
    'utf8',
  );
  const documentedCapabilities = [...documentation.matchAll(/^\| `(feedback\.[^`]+)` \|/gm)]
    .map((match) => match[1]);

  assert.deepEqual(documentedCapabilities, APP_FEEDBACK_CAPABILITIES);
  assert.match(documentation, /Only the exact\s+`Administrator` and `Digital Experience Operator` role names receive this\s+bundle/);
  assert.match(documentation, /blocked users, `Public`, `Authenticated`, and\s+`Media Manager` receive none/);
  assert.match(documentation, /No role or token grant is provisioned automatically/);
  assert.match(documentation, /not Strapi action IDs or durable Users &\s+Permissions rows/);
  assert.match(documentation, /U7,\s+U8, and U10/);
  assert.match(documentation, /workerClaim/);
  assert.match(documentation, /workerSnapshot/);
  assert.match(documentation, /workerSourceRead/);
  assert.match(documentation, /workerCheckpoint/);
  assert.match(documentation, /workerComplete/);
  assert.match(documentation, /workerFail/);
  assert.match(documentation, /workerAlertAck/);
  assert.match(documentation, /workerReportDownloadMetadata/);
  assert.match(documentation, /feedbackAdminRead/);
  assert.match(documentation, /workerClaim.*content-api-token/s);
  assert.match(documentation, /Users & Permissions JWT is denied even if its\s+role is granted the\s+same action/);
  assert.match(documentation, /no default role or API-token/);
  assert.doesNotMatch(documentation, /bootstrap-feedback-permissions|--plan|--verify|--apply/);
});

test('private feedback admin read accepts only the closed fixed-page contract', () => {
  const request = {
    contractVersion: 'feedback-admin-source.v1',
    resource: 'submissions',
    acceptedAtGte: '2026-08-01T03:00:00.000Z',
    acceptedAtLte: '2026-08-21T02:59:59.999Z',
    dataCutoffAt: '2026-08-21T12:00:00.000Z',
    cursor: null,
    pageSize: 25,
  };
  assert.doesNotThrow(() => validateFeedbackAdminReadQuery(request));
  const generationRequest = {
    ...request,
    resource: 'generations',
    status: 'failed',
  };
  assert.doesNotThrow(() => validateFeedbackAdminReadQuery(generationRequest));
  for (const invalid of [
    { ...request, pageSize: 26 },
    { ...request, resource: 'worker' },
    { ...request, cursor: 'bad cursor' },
    { ...request, unknown: true },
    { ...request, dataCutoffAt: 'not-a-date' },
    { ...generationRequest, status: 'secret' },
    { ...generationRequest, objectKey: 'private/path' },
  ]) {
    assert.throws(
      () => validateFeedbackAdminReadQuery(invalid),
      (error) => error.code === 'VALIDATION_FAILED',
    );
  }
});

test('generation history remains behind the exact private custom-token action', () => {
  const route = require('../../../src/api/survey-report-generation/routes/admin').routes
    .find(({ handler }) => handler === 'survey-report-generation.feedbackAdminRead');
  assert.deepEqual(route.config.auth, {
    strategies: ['content-api-token'],
    scope: ['api::survey-report-generation.survey-report-generation.feedbackAdminRead'],
  });
  const source = fs.readFileSync(
    path.resolve(__dirname, '../../../src/api/survey-report-generation/services/private-feedback-admin-read.js'),
    'utf8',
  );
  assert.match(source, /orderBy: \[\{ createdAt: 'desc' \}, \{ reportRunId: 'asc' \}\]/);
  assert.match(source, /'safeFailureMessage', 'snapshotJson'/);
  assert.match(source, /safeFailureMessage !== SAFE_FAILURE_MESSAGES\[row\.failureCode\]/);
  assert.match(source, /retryOfReportRunId/);
  assert.doesNotMatch(source.slice(source.indexOf('return {\n        reportRunId:'), source.indexOf('const last = rows[Math.min(rows.length, PAGE_SIZE) - 1]', source.indexOf('async function readGenerationPage'))), /snapshotJson|checkpointsJson|modelConfigJson|pricingSnapshotJson|cumulativeCostMicros|objectKey|taskName/);
});

test('generation history projects synthetic failed and succeeded rows without private metadata', async () => {
  const runId = '00000000-0000-4000-8000-000000000001';
  const reportId = '00000000-0000-4000-8000-000000000002';
  const calls = [];
  const rows = [
    {
      reportRunId: runId,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      dataCutoffAt: '2026-09-01T12:00:00.000Z',
      status: 'failed',
      createdAt: '2026-09-01T13:00:00.000Z',
      completedAt: '2026-09-01T13:05:00.000Z',
      failureCode: 'PROVIDER_TIMEOUT',
      safeFailureMessage: 'The report provider timed out.',
      retryOfGeneration: { reportRunId: '00000000-0000-4000-8000-000000000003' },
      report: null,
      snapshotJson: { private: 'snapshot' },
      checkpointsJson: { private: 'checkpoints' },
      modelConfigJson: { private: 'model' },
      pricingSnapshotJson: { private: 'pricing' },
      cumulativeCostMicros: '987654',
      taskName: 'private-task-name',
    },
    {
      reportRunId: '00000000-0000-4000-8000-000000000004',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      dataCutoffAt: '2026-09-01T12:00:00.000Z',
      status: 'succeeded',
      createdAt: '2026-09-01T12:00:00.000Z',
      completedAt: '2026-09-01T12:10:00.000Z',
      failureCode: null,
      safeFailureMessage: null,
      retryOfGeneration: null,
      report: {
        reportId,
        generationRunId: '00000000-0000-4000-8000-000000000004',
        createdAt: '2026-09-01T12:10:00.000Z',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
      },
      snapshotJson: { population: { currentSubmissionCount: 12, currentCommentCount: 4 } },
      checkpointsJson: { private: 'checkpoints' },
      modelConfigJson: { private: 'model' },
      pricingSnapshotJson: { private: 'pricing' },
      cumulativeCostMicros: '111',
      taskName: 'private-task-name',
    },
  ];
  const generationQuery = {
    count: async ({ where }) => {
      calls.push(['count', where]);
      return rows.length;
    },
    findMany: async (query) => {
      calls.push(['findMany', query]);
      return rows;
    },
  };
  const strapi = {
    db: { query: (uid) => {
      assert.equal(uid, 'api::survey-report-generation.survey-report-generation');
      return generationQuery;
    } },
  };
  const reader = createPrivateFeedbackAdminReader(strapi);

  const result = await reader.readPage({
    contractVersion: 'feedback-admin-source.v1',
    resource: 'generations',
    acceptedAtGte: '2026-08-01T03:00:00.000Z',
    acceptedAtLte: '2026-09-01T02:59:59.999Z',
    dataCutoffAt: '2026-09-02T12:00:00.000Z',
    cursor: null,
    pageSize: 25,
    status: null,
  });

  assert.equal(result.total, 2);
  assert.equal(result.items[0].safeFailureMessage, 'The report provider timed out.');
  assert.equal(result.items[0].retryOfReportRunId, '00000000-0000-4000-8000-000000000003');
  assert.deepEqual(result.items[1].report, {
    reportId,
    createdAt: '2026-09-01T12:10:00.000Z',
    periodStart: '2026-08-01',
    periodEnd: '2026-08-31',
    analyzedResponseCount: 12,
    analyzedCommentCount: 4,
  });
  assert.doesNotMatch(JSON.stringify(result), /snapshotJson|checkpointsJson|modelConfigJson|pricingSnapshotJson|cumulativeCostMicros|private-task-name|objectKey/);
  assert.deepEqual(calls[1][1].orderBy, [{ createdAt: 'desc' }, { reportRunId: 'asc' }]);
  assert.equal(calls[1][1].fields.includes('snapshotJson'), true);
  assert.equal(Object.hasOwn(result.items[0], 'snapshotJson'), false);
});
