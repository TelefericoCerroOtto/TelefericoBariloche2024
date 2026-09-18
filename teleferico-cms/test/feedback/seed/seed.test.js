const assert = require('node:assert/strict');
const test = require('node:test');

const {
  ASPECT_CATALOG,
  FIXTURE_MANIFEST,
  FIXTURE_MARKER,
  PRODUCTION_BOOTSTRAP,
  assertFixtureOwnership,
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
