const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');
const { createSubmissionPersistence } = require('../../../src/api/survey-submission/services/persistence');

const {
  ASPECT_CATALOG,
  FIXTURE_MANIFEST,
  FIXTURE_MARKER,
  PRODUCTION_BOOTSTRAP,
  assertFixtureOwnership,
  createLocalFeedbackSeeder,
  createSurveySeeder,
  runProductionSeed,
} = require('../../../scripts/seed-surveys');

const expected = [
  ['cable-car', 'Viaje en teleférico', 'Cable car ride', 'Viagem de teleférico'],
  ['views', 'Paisajes y vistas', 'Landscapes and views', 'Paisagens e vistas'],
  ['staff', 'Atención del personal', 'Staff service', 'Atendimento da equipe'],
  ['wait', 'Organización y tiempos de espera', 'Organization and waiting times', 'Organização e tempos de espera'],
  ['signage', 'Señalización y orientación', 'Signage and wayfinding', 'Sinalização e orientação'],
  ['cleanliness', 'Instalaciones y limpieza', 'Facilities and cleanliness', 'Instalações e limpeza'],
  ['mobility', 'Comodidad para moverse por el complejo', 'Ease of moving around the complex', 'Facilidade para circular pelo complexo'],
  ['activities', 'Actividades en la cumbre', 'Summit activities', 'Atividades no cume'],
  ['rotating-cafe', 'Confitería Giratoria', 'Rotating Café', 'Confeitaria Giratória'],
  ['food', 'Comidas y bebidas', 'Food and drinks', 'Comidas e bebidas'],
  ['stores', 'Tiendas y opciones de compra', 'Shops and shopping options', 'Lojas e opções de compra'],
  ['bus', 'Transporte en bus', 'Bus transportation', 'Transporte de ônibus'],
  ['price', 'Precio y relación con la experiencia', 'Price and value for the experience', 'Preço e relação com a experiência'],
  ['other', 'Otro aspecto', 'Other aspect', 'Outro aspecto'],
];

test('exports the exact ordered multilingual Appendix-01 catalog', () => {
  assert.deepEqual(
    ASPECT_CATALOG.map(({ aspectKey, labelEs, labelEn, labelPt }) => [aspectKey, labelEs, labelEn, labelPt]),
    expected,
  );
  assert.deepEqual(ASPECT_CATALOG.map(({ sortOrder }) => sortOrder), [...expected.keys()]);
  assert.equal(PRODUCTION_BOOTSTRAP.fixtureMarker, null);
  assert.equal(PRODUCTION_BOOTSTRAP.status, 'published');
  assert.equal(FIXTURE_MANIFEST.marker, FIXTURE_MARKER);
  assert.equal(FIXTURE_MANIFEST.parent.status, 'draft');
  assert.notEqual(PRODUCTION_BOOTSTRAP.versionKey, FIXTURE_MANIFEST.versionKey);
});

test('local feedback seed is repeatable and cleanup removes only its exact marker-owned rows', async () => {
  const rows = new Map();
  const deleted = [];
  const store = {
    transaction: async (work) => work(),
    readLocalFixture: async () => [...rows.values()].map((row) => structuredClone(row)),
    createLocalFixtureRow: async (row) => {
      if (rows.has(row.id)) throw new Error('duplicate fixture row');
      rows.set(row.id, structuredClone(row));
    },
    deleteLocalFixtureRow: async (id) => {
      deleted.push(id);
      rows.delete(id);
    },
  };
  const seeder = createLocalFeedbackSeeder(store);

  assert.deepEqual(await seeder.apply(), { created: true, count: 4 });
  assert.deepEqual(await seeder.apply(), { created: false, count: 4 });
  assert.equal(rows.size, 4);
  assert.deepEqual(await seeder.cleanup(), { deleted: true, count: 4 });
  assert.equal(rows.size, 0);
  assert.deepEqual(new Set(deleted), new Set([
    'survey-version:tb113-local-feedback-v1',
    'survey-qr-point:tb113-local-feedback-v1',
    'survey-submission:tb113-local-feedback-v1:one',
    'survey-submission:tb113-local-feedback-v1:two',
  ]));
});

test('local feedback cleanup aborts without deleting when any marker-owned row is outside the manifest', async () => {
  const rows = new Map([
    ['unexpected', { id: 'unexpected', fixtureMarker: 'tb113-local-feedback-v1' }],
  ]);
  let deleted = 0;
  const store = {
    transaction: async (work) => work(),
    readLocalFixture: async () => [...rows.values()],
    createLocalFixtureRow: async (row) => rows.set(row.id, row),
    deleteLocalFixtureRow: async () => { deleted += 1; },
  };
  await assert.rejects(createLocalFeedbackSeeder(store).cleanup(), /Fixture ownership mismatch/);
  assert.equal(deleted, 0);
});

test('local feedback cleanup safely removes a partial interrupted seed using only known marker identities', async () => {
  const id = 'survey-submission:tb113-local-feedback-v1:one';
  const rows = new Map([[id, {
    id,
    type: 'submission',
    key: 'one',
    fixtureMarker: 'tb113-local-feedback-v1',
  }]]);
  const store = {
    readLocalFixture: async () => [...rows.values()],
    createLocalFixtureRow: async (row) => rows.set(row.id, row),
    deleteLocalFixtureRow: async (rowId) => rows.delete(rowId),
  };
  assert.deepEqual(await createLocalFeedbackSeeder(store).cleanup(), { deleted: true, count: 1 });
  assert.equal(rows.size, 0);
});

test('local seed submission keeps row, components, relations, and marker in the acceptance transaction', async () => {
  const point = { id: 41, documentId: 'point-document', pointKey: 'local-point', publicCode: 'A'.repeat(32), status: 'active' };
  const version = { id: 52, documentId: 'version-document', versionKey: 'local-version', status: 'published' };
  const inserted = [];
  let id = 100;
  const existing = {
    select() { return this; },
    where() { return this; },
    forUpdate() { return this; },
    first: async () => null,
  };
  const trx = Object.assign((table) => ({
    ...existing,
    insert(row) {
      const created = { ...row, id: ++id };
      inserted.push({ table, row: created });
      return {
        returning: async (fields) => [Array.isArray(fields)
          ? Object.fromEntries(fields.map((field) => [field, created[field]]))
          : { id: created.id }],
      };
    },
  }), { raw: async () => undefined });
  const strapi = {
    db: {
      query(uid) {
        return {
          findOne: async ({ where }) => uid.endsWith('survey-qr-point')
            ? where.documentId === point.documentId ? point : null
            : where.documentId === version.documentId ? version : null,
        };
      },
      transaction: async (operation) => operation({ trx }),
    },
  };
  const command = {
    pointDocumentId: point.documentId,
    versionDocumentId: version.documentId,
    claims: {
      pointKey: point.pointKey,
      publicCodeHash: createHash('sha256').update(point.publicCode).digest('hex'),
      versionKey: version.versionKey,
    },
    submission: {
      receipt: '00000000-0113-4113-8113-000000000001',
      acceptedAt: '2026-09-29T12:00:00.000Z',
      source: 'valid_qr',
      locale: 'en',
      overallRating: 5,
      ratings: [{ aspectKey: 'views', label: 'Views', sortOrder: 1, rating: 'positive' }],
      sessionNonceHash: 'a'.repeat(64),
      payloadDigest: 'b'.repeat(64),
      browserTokenHash: 'c'.repeat(64),
      idempotencyKey: 'local-seed-submission-0001',
      fixtureMarker: 'tb113-local-feedback-v1',
    },
  };

  const accepted = await createSubmissionPersistence(strapi).acceptLocalFixture(
    command,
    command.submission.fixtureMarker,
  );
  assert.equal(accepted.status, 201);
  assert.equal(inserted.find(({ table }) => table === 'survey_submissions')?.row.fixture_marker, command.submission.fixtureMarker);
  assert.equal(inserted.filter(({ table }) => table === 'components_survey_aspect_ratings').length, 1);
  assert.deepEqual(inserted.filter(({ table }) => table === 'survey_submissions_cmps').map(({ row }) => row), [
    { entity_id: 101, cmp_id: 102, component_type: 'survey.aspect-rating', field: 'ratings', order: 0, id: 103 },
  ]);
  assert.deepEqual(inserted.filter(({ table }) => table.endsWith('_lnk')).map(({ table, row }) => ({ table, row })), [
    { table: 'survey_submissions_qr_point_lnk', row: { survey_submission_id: 101, survey_qr_point_id: 41, id: 104 } },
    { table: 'survey_submissions_survey_version_lnk', row: { survey_submission_id: 101, survey_version_id: 52, id: 105 } },
  ]);
});

function memoryStore(initial = null) {
  let state = initial && structuredClone(initial);
  const events = [];
  return {
    events,
    read: async () => structuredClone(state),
    transaction: async (work) => work(),
    createParent: async (parent) => { events.push(`parent:${parent.versionKey}`); state = { ...parent, aspects: [] }; },
    createChild: async (child) => { events.push(`child:${child.aspectKey}`); state.aspects.push(child); },
    deleteChild: async (key) => { events.push(`delete-child:${key}`); state.aspects = state.aspects.filter((item) => item.aspectKey !== key); },
    deleteParent: async () => { events.push('delete-parent'); state = null; },
  };
}

test('creates parent before children and repeats deterministically without duplicates', async () => {
  const production = memoryStore();
  const productionSeeder = createSurveySeeder(production);
  assert.deepEqual(await productionSeeder.applyProduction(), { created: true, count: 15 });
  assert.deepEqual(await productionSeeder.applyProduction(), { created: false, count: 15 });
  assert.equal(production.events[0], `parent:${PRODUCTION_BOOTSTRAP.versionKey}`);
  assert.equal(production.events.length, 15);

  const store = memoryStore();
  const seeder = createSurveySeeder(store);
  assert.deepEqual(await seeder.applyFixture(), { created: true, count: 15 });
  assert.equal(store.events[0], `parent:${FIXTURE_MANIFEST.versionKey}`);
  assert.equal(store.events.at(-1), 'child:other');
  assert.deepEqual(await seeder.applyFixture(), { created: false, count: 15 });
  assert.equal(store.events.length, 15);
});

test('cleanup validates marker, exact manifest identities, and count before child-first deletion', async (t) => {
  const valid = { ...FIXTURE_MANIFEST.parent, aspects: FIXTURE_MANIFEST.aspects };
  for (const [name, mutation] of [
    ['marker', (value) => { value.fixtureMarker = 'unrelated'; }],
    ['status', (value) => { value.status = 'published'; }],
    ['synthetic flag', (value) => { value.synthetic = false; }],
    ['identity', (value) => { value.aspects[0].aspectKey = 'unrelated'; }],
    ['count', (value) => { value.aspects.pop(); }],
  ]) {
    await t.test(name, async () => {
      const candidate = structuredClone(valid);
      mutation(candidate);
      const store = memoryStore(candidate);
      await assert.rejects(createSurveySeeder(store).cleanupFixture(), /Fixture ownership mismatch/);
      assert.deepEqual(store.events, []);
    });
  }

  const store = memoryStore(valid);
  assert.deepEqual(await createSurveySeeder(store).cleanupFixture(), { deleted: true, count: 15 });
  assert.equal(store.events[0], 'delete-child:other');
  assert.equal(store.events.at(-1), 'delete-parent');
  assert.doesNotThrow(() => assertFixtureOwnership(valid));
});

test('production runner destroys Strapi and rejects when the production apply fails', async () => {
  const events = [];
  const failure = new Error('seed transaction failed');
  const strapi = {
    load: async () => { events.push('load'); },
    destroy: async () => { events.push('destroy'); },
  };
  const store = { transaction: async () => { throw failure; } };

  await assert.rejects(
    runProductionSeed({ createStrapi: () => strapi, createStore: () => store }),
    (error) => error === failure,
  );
  assert.deepEqual(events, ['load', 'destroy']);
});
