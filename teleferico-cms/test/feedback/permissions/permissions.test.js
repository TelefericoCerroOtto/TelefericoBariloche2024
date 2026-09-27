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
const FUTURE_CAPABILITIES = [
  'feedback.read',
  'feedback.comments.read',
  'feedback.reports.read',
  'feedback.reports.generate',
  'feedback.reports.read',
];
const { validateQuery: validateFeedbackAdminReadQuery } = require('../../../src/api/survey-report-generation/services/private-feedback-admin-read');

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

test('documents D31 names only as future application capabilities', () => {
  const documentation = fs.readFileSync(
    path.resolve(__dirname, '../../../../docs/STRAPI_PERMISSIONS.md'),
    'utf8',
  );
  const documentedCapabilities = [...documentation.matchAll(/^\| `(feedback\.[^`]+)` \|/gm)]
    .map((match) => match[1]);

  assert.deepEqual(documentedCapabilities, FUTURE_CAPABILITIES);
  assert.match(documentation, /not current Strapi action IDs/);
  assert.match(documentation, /U7,\s+U8, and U10/);
  assert.match(documentation, /workerClaim/);
  assert.match(documentation, /workerSnapshot/);
  assert.match(documentation, /workerSourceRead/);
  assert.match(documentation, /workerCheckpoint/);
  assert.match(documentation, /workerComplete/);
  assert.match(documentation, /workerFail/);
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
  for (const invalid of [
    { ...request, pageSize: 26 },
    { ...request, resource: 'worker' },
    { ...request, cursor: 'bad cursor' },
    { ...request, unknown: true },
    { ...request, dataCutoffAt: 'not-a-date' },
  ]) {
    assert.throws(
      () => validateFeedbackAdminReadQuery(invalid),
      (error) => error.code === 'VALIDATION_FAILED',
    );
  }
});
