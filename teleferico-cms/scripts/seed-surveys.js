#!/usr/bin/env node
'use strict';

const FIXTURE_MARKER = 'tb113-fixture-v1';
const PRODUCTION_DOCUMENT_ID = 'tb113visitorfeedbackv001';

const labels = [
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

const ASPECT_CATALOG = Object.freeze(labels.map(
  ([aspectKey, labelEs, labelEn, labelPt], sortOrder) =>
    Object.freeze({ aspectKey, sortOrder, labelEs, labelEn, labelPt }),
));

const PRODUCTION_BOOTSTRAP = Object.freeze({
  versionKey: 'visitor-feedback-v1',
  status: 'published',
  fixtureMarker: null,
  aspects: ASPECT_CATALOG,
});

const fixtureAspects = Object.freeze(ASPECT_CATALOG.map((aspect) => Object.freeze({
  ...aspect,
  ownerVersionKey: FIXTURE_MARKER,
})));
const FIXTURE_MANIFEST = Object.freeze({
  marker: FIXTURE_MARKER,
  versionKey: FIXTURE_MARKER,
  parent: Object.freeze({
    versionKey: FIXTURE_MARKER,
    status: 'draft',
    fixtureMarker: FIXTURE_MARKER,
    synthetic: true,
  }),
  aspects: fixtureAspects,
  ids: Object.freeze([
    `survey-version:${FIXTURE_MARKER}`,
    ...fixtureAspects.map(({ aspectKey }) => `survey-aspect:${FIXTURE_MARKER}:${aspectKey}`),
  ]),
});

function actualIds(record) {
  return [
    `survey-version:${record.versionKey}`,
    ...record.aspects.map(
      ({ aspectKey }) => `survey-aspect:${record.versionKey}:${aspectKey}`,
    ),
  ];
}

function assertFixtureOwnership(record) {
  const exactCatalog = record?.aspects?.every((aspect, index) => {
    const expected = FIXTURE_MANIFEST.aspects[index];
    return expected && Object.keys(expected).every((key) => aspect[key] === expected[key]);
  });
  const exactIds = record && JSON.stringify(actualIds(record)) === JSON.stringify(FIXTURE_MANIFEST.ids);
  if (
    record?.fixtureMarker !== FIXTURE_MARKER ||
    record.versionKey !== FIXTURE_MANIFEST.versionKey ||
    record.status !== FIXTURE_MANIFEST.parent.status ||
    record.synthetic !== FIXTURE_MANIFEST.parent.synthetic ||
    record.aspects?.length + 1 !== FIXTURE_MANIFEST.ids.length ||
    !exactCatalog ||
    !exactIds
  ) {
    throw new Error('Fixture ownership mismatch; cleanup aborted');
  }
  return record;
}

function assertProductionSeed(record) {
  const exactCatalog = record?.aspects?.length === ASPECT_CATALOG.length &&
    record.aspects.every((aspect, index) => Object.keys(ASPECT_CATALOG[index])
      .every((key) => aspect[key] === ASPECT_CATALOG[index][key]));
  if (
    record?.versionKey !== PRODUCTION_BOOTSTRAP.versionKey ||
    record.status !== 'published' ||
    record.fixtureMarker !== null ||
    !exactCatalog
  ) throw new Error('Production seed identity mismatch; apply aborted');
  return record;
}

function createSurveySeeder(store) {
  async function apply(parent, aspects, validate) {
    return store.transaction(async () => {
      const existing = await store.read(parent.versionKey);
      if (existing) {
        validate(existing);
        return { created: false, count: aspects.length + 1 };
      }
      await store.createParent(parent, aspects);
      for (const aspect of aspects) await store.createChild(aspect);
      return { created: true, count: aspects.length + 1 };
    });
  }

  const applyProduction = () => apply(PRODUCTION_BOOTSTRAP, ASPECT_CATALOG, assertProductionSeed);
  const applyFixture = () => apply(
    FIXTURE_MANIFEST.parent,
    FIXTURE_MANIFEST.aspects,
    assertFixtureOwnership,
  );

  async function cleanupFixture() {
    return store.transaction(async () => {
      const existing = await store.read(FIXTURE_MANIFEST.versionKey);
      if (!existing) return { deleted: false, count: 0 };
      assertFixtureOwnership(existing);
      for (const { aspectKey } of [...existing.aspects].reverse()) {
        await store.deleteChild(aspectKey);
      }
      await store.deleteParent(FIXTURE_MANIFEST.versionKey);
      return { deleted: true, count: FIXTURE_MANIFEST.ids.length };
    });
  }

  return Object.freeze({ applyProduction, applyFixture, cleanupFixture });
}

function createStrapiSurveyStore(strapi) {
  let transaction;
  let parentId;
  let parentVersionKey;
  const table = (name) => (transaction ?? strapi.db.connection)(name);

  return {
    transaction: (work) => strapi.db.connection.transaction(async (trx) => {
      transaction = trx;
      try { return await work(); } finally { transaction = undefined; }
    }),
    read: async (versionKey) => {
      const record = await table('survey_versions')
        .select({ versionKey: 'version_key', status: 'status', fixtureMarker: 'fixture_marker' })
        .where({ version_key: versionKey })
        .first();
      if (!record) return null;
      return {
        ...record,
        aspects: await table('components_survey_aspect_definitions')
          .select({ ownerVersionKey: 'owner_version_key', aspectKey: 'aspect_key', sortOrder: 'sort_order', labelEs: 'label_es', labelEn: 'label_en', labelPt: 'label_pt' })
          .where({ owner_version_key: versionKey })
          .orderBy('sort_order', 'asc'),
      };
    },
    createParent: async (parent) => {
      parentVersionKey = parent.versionKey;
      const [created] = await table('survey_versions').insert({
        document_id: PRODUCTION_DOCUMENT_ID, version_key: parent.versionKey,
        status: parent.status, copy_es: {}, copy_en: {}, copy_pt: {},
        fixture_marker: parent.fixtureMarker, created_at: new Date(), updated_at: new Date(),
      }).returning('id');
      parentId = created.id;
    },
    createChild: async (aspect) => {
      const [created] = await table('components_survey_aspect_definitions').insert({
        owner_version_key: parentVersionKey, aspect_key: aspect.aspectKey,
        sort_order: aspect.sortOrder, label_es: aspect.labelEs,
        label_en: aspect.labelEn, label_pt: aspect.labelPt,
      }).returning('id');
      await table('survey_versions_cmps').insert({
        entity_id: parentId, cmp_id: created.id, component_type: 'survey.aspect-definition',
        field: 'aspects', order: aspect.sortOrder,
      });
    },
  };
}

async function runProductionSeed({ createStrapi, createStore = createStrapiSurveyStore } = {}) {
  const factory = createStrapi ?? require('@strapi/strapi').createStrapi;
  const strapi = factory({ autoReload: false, serveAdminPanel: false });
  try {
    await strapi.load();
    return await createSurveySeeder(createStore(strapi)).applyProduction();
  } finally {
    await strapi.destroy();
  }
}

if (require.main === module) {
  runProductionSeed()
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  ASPECT_CATALOG,
  FIXTURE_MANIFEST,
  FIXTURE_MARKER,
  PRODUCTION_BOOTSTRAP,
  assertFixtureOwnership,
  createStrapiSurveyStore,
  createSurveySeeder,
  runProductionSeed,
};
