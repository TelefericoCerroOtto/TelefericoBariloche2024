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
  'feedback.reports.download',
];

test('all survey route and controller modules expose no Content API actions', () => {
  for (const api of SURVEY_APIS) {
    const root = path.resolve(__dirname, `../../../src/api/${api}`);
    const routes = require(path.join(root, `routes/${api}`));
    const controller = require(path.join(root, `controllers/${api}`));

    assert.deepEqual(routes, { type: 'content-api', routes: [] }, api);
    assert.deepEqual(controller, {}, api);
  }
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
  assert.doesNotMatch(documentation, /bootstrap-feedback-permissions|--plan|--verify|--apply/);
});
