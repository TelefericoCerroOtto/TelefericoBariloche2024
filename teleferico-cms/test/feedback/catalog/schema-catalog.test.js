const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const CMS_ROOT = path.resolve(__dirname, '../../..');

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(CMS_ROOT, relativePath), 'utf8'));
}

const FOUNDATION_SCHEMAS = {
  'survey-version': 'src/api/survey-version/content-types/survey-version/schema.json',
  'survey-settings': 'src/api/survey-settings/content-types/survey-settings/schema.json',
  'survey-qr-point': 'src/api/survey-qr-point/content-types/survey-qr-point/schema.json',
  'survey.aspect-definition': 'src/components/survey/aspect-definition.json',
};

const APPROVED_COLLECTIONS = new Set([
  'survey-version',
  'survey-qr-point',
  'survey-submission',
  'survey-report-generation',
  'survey-report',
]);

test('definition foundation uses only approved Strapi identities', () => {
  const schemas = Object.fromEntries(
    Object.entries(FOUNDATION_SCHEMAS).map(([name, file]) => [name, readJson(file)]),
  );

  assert.equal(schemas['survey-version'].kind, 'collectionType');
  assert.equal(schemas['survey-settings'].kind, 'singleType');
  assert.equal(schemas['survey-qr-point'].kind, 'collectionType');
  assert.equal(schemas['survey.aspect-definition'].collectionName, 'components_survey_aspect_definitions');

  const surveyApis = readdirSync(path.join(CMS_ROOT, 'src/api'))
    .filter((name) => name.startsWith('survey-') && name !== 'survey-settings');
  assert.deepEqual(surveyApis.sort(), ['survey-qr-point', 'survey-version']);
  assert.equal(surveyApis.every((name) => APPROVED_COLLECTIONS.has(name)), true);

  const surveyComponents = readdirSync(path.join(CMS_ROOT, 'src/components/survey'));
  assert.deepEqual(surveyComponents, ['aspect-definition.json']);
});

test('definition foundation is disabled and draft-safe by default', () => {
  const version = readJson(FOUNDATION_SCHEMAS['survey-version']);
  const settings = readJson(FOUNDATION_SCHEMAS['survey-settings']);

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
  const version = readJson(FOUNDATION_SCHEMAS['survey-version']);
  const definition = readJson(FOUNDATION_SCHEMAS['survey.aspect-definition']);

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
  const point = readJson(FOUNDATION_SCHEMAS['survey-qr-point']);

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
