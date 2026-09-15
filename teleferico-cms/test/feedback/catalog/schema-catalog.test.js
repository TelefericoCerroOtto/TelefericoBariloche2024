const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const CMS_ROOT = path.resolve(__dirname, '../../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(CMS_ROOT, relativePath), 'utf8'));
}

const SURVEY_SCHEMAS = {
  'survey-version': 'src/api/survey-version/content-types/survey-version/schema.json',
  'survey-settings': 'src/api/survey-settings/content-types/survey-settings/schema.json',
  'survey-qr-point': 'src/api/survey-qr-point/content-types/survey-qr-point/schema.json',
  'survey-submission': 'src/api/survey-submission/content-types/survey-submission/schema.json',
  'survey-report-generation': 'src/api/survey-report-generation/content-types/survey-report-generation/schema.json',
  'survey-report': 'src/api/survey-report/content-types/survey-report/schema.json',
  'survey.aspect-definition': 'src/components/survey/aspect-definition.json',
  'survey.aspect-rating': 'src/components/survey/aspect-rating.json',
};

const APPROVED_COLLECTIONS = new Set([
  'survey-version',
  'survey-qr-point',
  'survey-submission',
  'survey-report-generation',
  'survey-report',
]);

test('survey persistence uses exactly the approved Strapi identities', () => {
  const schemas = Object.fromEntries(
    Object.entries(SURVEY_SCHEMAS).map(([name, file]) => [name, readJson(file)]),
  );

  assert.equal(schemas['survey-settings'].kind, 'singleType');
  for (const name of APPROVED_COLLECTIONS) {
    assert.equal(schemas[name].kind, 'collectionType');
  }
  assert.equal(schemas['survey.aspect-definition'].collectionName, 'components_survey_aspect_definitions');
  assert.equal(schemas['survey.aspect-rating'].collectionName, 'components_survey_aspect_ratings');

  const surveyApis = readdirSync(path.join(CMS_ROOT, 'src/api'))
    .filter((name) => name.startsWith('survey-') && name !== 'survey-settings');
  assert.deepEqual(surveyApis.sort(), [...APPROVED_COLLECTIONS].sort());
  assert.equal(surveyApis.every((name) => APPROVED_COLLECTIONS.has(name)), true);

  const surveyComponents = readdirSync(path.join(CMS_ROOT, 'src/components/survey')).sort();
  assert.deepEqual(surveyComponents, ['aspect-definition.json', 'aspect-rating.json']);
});

test('definition foundation is disabled and draft-safe by default', () => {
  const version = readJson(SURVEY_SCHEMAS['survey-version']);
  const settings = readJson(SURVEY_SCHEMAS['survey-settings']);

  assert.equal(version.options.draftAndPublish, false);
  assert.deepEqual(version.attributes.status.enum, ['draft', 'published']);
  assert.equal(version.attributes.status.default, 'draft');
  assert.equal('publishedAt' in version.attributes, false);
  assert.deepEqual(version.attributes.lifecyclePublishedAt, { type: 'datetime', private: true });
  assert.equal(settings.options.draftAndPublish, false);
  assert.equal(settings.attributes.singletonKey.default, 'default');
  assert.equal(settings.attributes.intakeEnabled.default, false);
  assert.equal(settings.attributes.generationEnabled.default, false);
  assert.equal(settings.attributes.activeSurveyVersion.required, undefined);
});

test('versioned definitions enforce bounded multilingual catalog fields', () => {
  const version = readJson(SURVEY_SCHEMAS['survey-version']);
  const definition = readJson(SURVEY_SCHEMAS['survey.aspect-definition']);

  assert.equal(version.attributes.versionKey.unique, true);
  assert.equal(version.attributes.versionKey.regex, '^[a-z0-9][a-z0-9._-]*$');
  assert.deepEqual(version.attributes.aspects.min, 1);
  assert.deepEqual(version.attributes.aspects.max, 64);

  for (const field of ['aspectKey', 'ownerVersionKey']) {
    assert.equal(definition.attributes[field].required, true);
    assert.equal(definition.attributes[field].maxLength, 64);
  }
  for (const field of ['labelEs', 'labelEn', 'labelPt']) {
    assert.equal(definition.attributes[field].required, true);
    assert.equal(definition.attributes[field].maxLength, 120);
  }
  assert.equal(definition.attributes.ownerVersionKey.private, true);
  assert.equal(definition.attributes.sortOrder.min, 0);
  assert.equal(definition.attributes.sortOrder.max, 63);
});

test('QR point identity and lifecycle fields are constrained without visitor ownership', () => {
  const point = readJson(SURVEY_SCHEMAS['survey-qr-point']);

  assert.equal(point.options.draftAndPublish, false);
  assert.equal(point.attributes.pointKey.unique, true);
  assert.equal(point.attributes.publicCode.unique, true);
  assert.equal(point.attributes.publicCode.regex, '^[A-Za-z0-9_-]+$');
  assert.deepEqual(point.attributes.status.enum, ['active', 'inactive']);
  assert.equal(point.attributes.status.default, 'active');
  assert.equal(point.attributes.sortOrder.min, 0);
  assert.equal('visitor' in point.attributes, false);
  assert.equal('ticket' in point.attributes, false);
  assert.equal('owner' in point.attributes, false);
});

test('remaining persistence schemas preserve critical constraints and private ownership', () => {
  const submission = readJson(SURVEY_SCHEMAS['survey-submission']);
  const rating = readJson(SURVEY_SCHEMAS['survey.aspect-rating']);
  const generation = readJson(SURVEY_SCHEMAS['survey-report-generation']);
  const report = readJson(SURVEY_SCHEMAS['survey-report']);

  assert.equal(submission.attributes.receipt.unique, true);
  assert.deepEqual(submission.attributes.locale.enum, ['es', 'en', 'pt']);
  assert.equal(submission.attributes.overallRating.min, 1);
  assert.equal(submission.attributes.overallRating.max, 5);
  assert.equal(submission.attributes.ratings.component, 'survey.aspect-rating');
  assert.equal(submission.attributes.ratings.min, 1);
  assert.equal(submission.attributes.ratings.max, 3);
  assert.equal(submission.attributes.comment.maxLength, 2000);

  for (const field of ['sessionNonceHash', 'payloadDigest', 'browserTokenHash']) {
    assert.equal(submission.attributes[field].required, true);
    assert.equal(submission.attributes[field].private, true);
    assert.equal(submission.attributes[field].regex, '^[a-f0-9]{64}$');
  }
  for (const field of ['surveyVersion', 'qrPoint']) {
    assert.equal(submission.attributes[field].relation, 'manyToOne');
    assert.equal(submission.attributes[field].required, true);
  }

  assert.equal(rating.attributes.ownerReceipt.private, true);
  assert.equal(rating.attributes.ownerReceipt.required, true);
  assert.deepEqual(rating.attributes.rating.enum, ['negative', 'neutral', 'positive']);
  assert.equal(rating.attributes.label.maxLength, 120);
  assert.equal(rating.attributes.customText.maxLength, 300);

  assert.equal(generation.attributes.reportRunId.unique, true);
  assert.deepEqual(generation.attributes.status.enum, ['queued', 'running', 'succeeded', 'failed']);
  assert.equal(generation.attributes.status.default, 'queued');
  assert.equal(generation.attributes.stateVersion.min, 1);
  for (const field of ['snapshotJson', 'checkpointsJson', 'modelConfigJson', 'usageJson', 'pricingSnapshotJson']) {
    assert.equal(generation.attributes[field].type, 'json');
    assert.equal(generation.attributes[field].required, true);
    assert.equal(generation.attributes[field].private, true);
  }
  assert.equal(generation.attributes.requestedBy.target, 'plugin::users-permissions.user');
  assert.equal(generation.attributes.retryOfGeneration.target, 'api::survey-report-generation.survey-report-generation');

  assert.equal(report.attributes.reportId.unique, true);
  assert.equal(report.attributes.generationRunId.unique, true);
  assert.equal(report.attributes.sourceGeneration.required, true);
  assert.equal(report.attributes.sourceGeneration.private, true);
  assert.equal(report.attributes.validatedAnalysisJson.private, true);
  assert.equal(report.attributes.objectKey.private, true);
  assert.equal(report.attributes.mimeType.default, 'application/pdf');
  assert.equal(report.attributes.generatedBy.target, 'plugin::users-permissions.user');
});

test('new persistence definitions remain inert and deny generic runtime exposure', () => {
  for (const name of APPROVED_COLLECTIONS) {
    const apiRoot = path.join(CMS_ROOT, 'src/api', name);
    assert.deepEqual(readdirSync(apiRoot), ['content-types']);
    assert.equal(readJson(SURVEY_SCHEMAS[name]).options.draftAndPublish, false);
  }

  const permissions = readFileSync(path.join(CMS_ROOT, '../docs/STRAPI_PERMISSIONS.md'), 'utf8');
  for (const name of [...APPROVED_COLLECTIONS, 'survey-settings']) {
    assert.match(permissions, new RegExp(`\\b${name}\\b`));
  }
  assert.match(permissions, /generic collection CRUD remains outside the access model/);
});
