#!/usr/bin/env node
'use strict';

const FIXTURE_MARKER = 'tb113-fixture-v1';
const LOCAL_FEEDBACK_MARKER = 'tb113-local-feedback-v1';
const PRODUCTION_DOCUMENT_ID = 'tb113visitorfeedbackv001';
const LOCAL_FEEDBACK_VERSION_UID = 'api::survey-version.survey-version';
const LOCAL_FEEDBACK_POINT_UID = 'api::survey-qr-point.survey-qr-point';
const LOCAL_FEEDBACK_SUBMISSION_UID = 'api::survey-submission.survey-submission';
const { createSubmissionPersistence } = require('../src/api/survey-submission/services/persistence');

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

const LOCAL_FEEDBACK_FIXTURE = Object.freeze({
  marker: LOCAL_FEEDBACK_MARKER,
  rows: Object.freeze([
    Object.freeze({ id: `survey-version:${LOCAL_FEEDBACK_MARKER}`, type: 'version', key: LOCAL_FEEDBACK_MARKER, documentId: 'tb113localfeedbackversion001' }),
    Object.freeze({ id: `survey-qr-point:${LOCAL_FEEDBACK_MARKER}`, type: 'point', key: LOCAL_FEEDBACK_MARKER, documentId: 'tb113localfeedbackpoint001' }),
    Object.freeze({ id: `survey-submission:${LOCAL_FEEDBACK_MARKER}:one`, type: 'submission', key: 'one' }),
    Object.freeze({ id: `survey-submission:${LOCAL_FEEDBACK_MARKER}:two`, type: 'submission', key: 'two' }),
  ]),
});

function localFeedbackRecords() {
  const hash = (value) => require('node:crypto').createHash('sha256').update(value).digest('hex');
  const versionKey = LOCAL_FEEDBACK_MARKER;
  const pointKey = LOCAL_FEEDBACK_MARKER;
  const versionAspects = [
    { ownerVersionKey: versionKey, aspectKey: 'views', sortOrder: 1, labelEs: 'Vistas', labelEn: 'Views', labelPt: 'Vistas' },
    { ownerVersionKey: versionKey, aspectKey: 'other', sortOrder: 13, labelEs: 'Otro', labelEn: 'Other', labelPt: 'Outro' },
  ];
  return [
    { ...LOCAL_FEEDBACK_FIXTURE.rows[0], fixtureMarker: LOCAL_FEEDBACK_MARKER, versionKey, status: 'published', copyEs: {}, copyEn: {}, copyPt: {}, aspects: versionAspects },
    { ...LOCAL_FEEDBACK_FIXTURE.rows[1], fixtureMarker: LOCAL_FEEDBACK_MARKER, pointKey, publicCode: 'TB113LOCALFEEDBACKPOINT000000001', displayName: 'Synthetic local feedback point', status: 'active', sortOrder: 999 },
    ...['one', 'two'].map((key, index) => {
      const receipt = `00000000-0113-4113-8113-${String(index + 1).padStart(12, '0')}`;
      return {
        ...LOCAL_FEEDBACK_FIXTURE.rows[index + 2],
        fixtureMarker: LOCAL_FEEDBACK_MARKER,
        receipt,
        acceptedAt: `2026-09-${String(28 + index).padStart(2, '0')}T12:00:00.000Z`,
        source: 'valid_qr',
        locale: 'en',
        overallRating: index === 0 ? 5 : 4,
        ratings: [
          { ownerReceipt: receipt, aspectKey: 'views', label: 'Views', sortOrder: 1, rating: 'positive' },
          { ownerReceipt: receipt, aspectKey: 'other', label: 'Other', sortOrder: 13, rating: index === 0 ? 'neutral' : 'positive', customText: 'Synthetic local feedback' },
        ],
        comment: index === 0 ? 'Synthetic feedback: excellent summit views.' : 'Synthetic feedback: clear wayfinding would help.',
        sessionNonceHash: hash(`${LOCAL_FEEDBACK_MARKER}:nonce:${key}`),
        payloadDigest: hash(`${LOCAL_FEEDBACK_MARKER}:payload:${key}`),
        browserTokenHash: hash(`${LOCAL_FEEDBACK_MARKER}:browser:${key}`),
        idempotencyKey: `${LOCAL_FEEDBACK_MARKER}-${key}-submission`,
      };
    }),
  ];
}

function assertLocalFeedbackOwnership(records, allowSubset = false) {
  const expected = localFeedbackRecords();
  const ordered = [...records].sort((left, right) => left.id.localeCompare(right.id));
  const expectedOrdered = [...expected].sort((left, right) => left.id.localeCompare(right.id));
  const expectedById = new Map(expectedOrdered.map((record) => [record.id, record]));
  const isOwnedExactly = (allowSubset || ordered.length === expectedOrdered.length) &&
    new Set(ordered.map(({ id }) => id)).size === ordered.length &&
    ordered.every((record) => {
      const fixture = expectedById.get(record.id);
      return fixture && record.type === fixture.type && record.key === fixture.key &&
        record.fixtureMarker === LOCAL_FEEDBACK_MARKER;
    });
  if (!isOwnedExactly) throw new Error('Fixture ownership mismatch; cleanup aborted');
  return records;
}

function createLocalFeedbackSeeder(store) {
  const run = store.transaction ?? ((work) => work());
  async function apply() {
    return run(async () => {
      const existing = await store.readLocalFixture();
      const expected = localFeedbackRecords();
      if (existing.length) {
        assertLocalFeedbackOwnership(existing);
        return { created: false, count: expected.length };
      }
      for (const record of expected) {
        await store.createLocalFixtureRow(record);
      }
      return { created: true, count: expected.length };
    });
  }

  async function cleanup() {
    return run(async () => {
      const existing = await store.readLocalFixture();
      if (!existing.length) return { deleted: false, count: 0 };
      assertLocalFeedbackOwnership(existing, true);
      const childFirst = { submission: 0, point: 1, version: 2 };
      for (const record of [...existing].sort((left, right) =>
        childFirst[left.type] - childFirst[right.type] || right.id.localeCompare(left.id)))
        await store.deleteLocalFixtureRow(record.id);
      return { deleted: true, count: existing.length };
    });
  }

  return Object.freeze({ apply, cleanup });
}

function createStrapiLocalFeedbackStore(strapi) {
  const definitions = {
    version: { uid: LOCAL_FEEDBACK_VERSION_UID, field: 'versionKey' },
    point: { uid: LOCAL_FEEDBACK_POINT_UID, field: 'pointKey' },
    submission: { uid: LOCAL_FEEDBACK_SUBMISSION_UID, field: 'idempotencyKey' },
  };
  return {
    readLocalFixture: async () => {
      const records = [];
      for (const [type, definition] of Object.entries(definitions)) {
        const rows = await strapi.db.query(definition.uid).findMany({
          where: { fixtureMarker: LOCAL_FEEDBACK_MARKER },
          select: ['documentId', definition.field, 'fixtureMarker'],
          orderBy: { id: 'asc' },
        });
        records.push(...rows.map((row) => ({
          id: type === 'submission'
            ? `survey-submission:${LOCAL_FEEDBACK_MARKER}:${row[definition.field].endsWith('-one-submission') ? 'one' : 'two'}`
            : `${type === 'version' ? 'survey-version' : 'survey-qr-point'}:${row[definition.field]}`,
          type,
          key: type === 'submission'
            ? (row[definition.field].endsWith('-one-submission') ? 'one' : 'two')
            : row[definition.field],
          documentId: row.documentId,
          fixtureMarker: row.fixtureMarker,
        })));
      }
      return records.sort((left, right) => left.id.localeCompare(right.id));
    },
    createLocalFixtureRow: async (record) => {
      const definition = definitions[record.type];
      if (record.type === 'version') {
        await strapi.db.connection.transaction(async (trx) => {
          const [created] = await trx('survey_versions').insert({
            document_id: record.documentId,
            version_key: record.versionKey,
            status: record.status,
            copy_es: record.copyEs,
            copy_en: record.copyEn,
            copy_pt: record.copyPt,
            fixture_marker: record.fixtureMarker,
            created_at: new Date(),
            updated_at: new Date(),
          }).returning('id');
          for (const aspect of record.aspects) {
            const [component] = await trx('components_survey_aspect_definitions').insert({
              owner_version_key: aspect.ownerVersionKey,
              aspect_key: aspect.aspectKey,
              sort_order: aspect.sortOrder,
              label_es: aspect.labelEs,
              label_en: aspect.labelEn,
              label_pt: aspect.labelPt,
            }).returning('id');
            await trx('survey_versions_cmps').insert({
              entity_id: created.id,
              cmp_id: component.id,
              component_type: 'survey.aspect-definition',
              field: 'aspects',
              order: aspect.sortOrder,
            });
          }
        });
        return;
      }
      if (record.type === 'point') {
        await strapi.db.connection('survey_qr_points').insert({
          document_id: record.documentId,
          point_key: record.pointKey,
          public_code: record.publicCode,
          display_name: record.displayName,
          status: record.status,
          sort_order: record.sortOrder,
          fixture_marker: record.fixtureMarker,
          created_at: new Date(),
          updated_at: new Date(),
        });
        return;
      }
      const [version, point] = await Promise.all([
        strapi.db.query(LOCAL_FEEDBACK_VERSION_UID).findOne({
          where: { versionKey: LOCAL_FEEDBACK_MARKER },
          select: ['documentId'],
        }),
        strapi.db.query(LOCAL_FEEDBACK_POINT_UID).findOne({
          where: { pointKey: LOCAL_FEEDBACK_MARKER },
          select: ['documentId'],
        }),
      ]);
      const publicCode = localFeedbackRecords()[1].publicCode;
      const sha256 = (value) => require('node:crypto').createHash('sha256').update(value).digest('hex');
      await createSubmissionPersistence(strapi).acceptLocalFixture({
        contractVersion: 'feedback-cms-submission.v1',
        operation: 'accept',
        claims: {
          pointKey: LOCAL_FEEDBACK_MARKER,
          publicCodeHash: sha256(publicCode),
          versionKey: LOCAL_FEEDBACK_MARKER,
        },
        pointDocumentId: point.documentId,
        versionDocumentId: version.documentId,
        submission: {
          receipt: record.receipt, acceptedAt: record.acceptedAt, source: record.source,
          locale: record.locale, overallRating: record.overallRating, ratings: record.ratings,
          comment: record.comment, sessionNonceHash: record.sessionNonceHash,
          payloadDigest: record.payloadDigest, browserTokenHash: record.browserTokenHash,
          idempotencyKey: record.idempotencyKey, fixtureMarker: record.fixtureMarker,
        },
      }, record.fixtureMarker);
    },
    deleteLocalFixtureRow: async (id) => {
      const record = (await createStrapiLocalFeedbackStore(strapi).readLocalFixture())
        .find((candidate) => candidate.id === id);
      if (!record?.documentId) throw new Error('Fixture ownership mismatch; cleanup aborted');
      if (record.type === 'submission') {
        await strapi.db.connection.transaction(async (trx) => {
          const submission = await trx('survey_submissions')
            .select('id', 'receipt')
            .where({
              idempotency_key: `${LOCAL_FEEDBACK_MARKER}-${record.key}-submission`,
              fixture_marker: LOCAL_FEEDBACK_MARKER,
            })
            .first();
          if (!submission) throw new Error('Fixture ownership mismatch; cleanup aborted');
          const ratings = await trx('survey_submissions_cmps')
            .select('cmp_id')
            .where({ entity_id: submission.id, component_type: 'survey.aspect-rating', field: 'ratings' });
          if (ratings.length) {
            await trx('components_survey_aspect_ratings').whereIn('id', ratings.map(({ cmp_id }) => cmp_id)).del();
            await trx('survey_submissions_cmps')
              .where({ entity_id: submission.id, component_type: 'survey.aspect-rating', field: 'ratings' }).del();
          }
          await trx('survey_submissions_qr_point_lnk').where({ survey_submission_id: submission.id }).del();
          await trx('survey_submissions_survey_version_lnk').where({ survey_submission_id: submission.id }).del();
          await trx('survey_submissions').where({ id: submission.id, fixture_marker: LOCAL_FEEDBACK_MARKER }).del();
        });
        return;
      }
      if (record.type === 'point') {
        await strapi.db.connection('survey_qr_points')
          .where({ point_key: LOCAL_FEEDBACK_MARKER, fixture_marker: LOCAL_FEEDBACK_MARKER }).del();
        return;
      }
      await strapi.db.connection.transaction(async (trx) => {
        const version = await trx('survey_versions')
          .select('id')
          .where({ version_key: LOCAL_FEEDBACK_MARKER, fixture_marker: LOCAL_FEEDBACK_MARKER })
          .first();
        if (!version) throw new Error('Fixture ownership mismatch; cleanup aborted');
        const aspects = await trx('survey_versions_cmps')
          .select('cmp_id')
          .where({ entity_id: version.id, component_type: 'survey.aspect-definition', field: 'aspects' });
        if (aspects.length) {
          await trx('components_survey_aspect_definitions').whereIn('id', aspects.map(({ cmp_id }) => cmp_id)).del();
          await trx('survey_versions_cmps')
            .where({ entity_id: version.id, component_type: 'survey.aspect-definition', field: 'aspects' }).del();
        }
        await trx('survey_versions').where({ id: version.id, fixture_marker: LOCAL_FEEDBACK_MARKER }).del();
      });
    },
  };
}

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

async function runLocalFeedbackSeed({ cleanup = false, createStrapi, createStore = createStrapiLocalFeedbackStore, env = process.env } = {}) {
  if (env.NODE_ENV !== 'development') throw new Error('Local feedback seed requires NODE_ENV=development');
  const factory = createStrapi ?? require('@strapi/strapi').createStrapi;
  const strapi = factory({ autoReload: false, serveAdminPanel: false });
  let operationError;
  try {
    await strapi.load();
    const connection = strapi.config.get('database.connection');
    const database = connection?.connection ?? {};
    const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
    let localDatabase = connection?.client === 'sqlite';
    if (connection?.client === 'postgres') {
      let host = database.host;
      if (database.connectionString) {
        try { host = new URL(database.connectionString).hostname; } catch { host = undefined; }
      }
      localDatabase = localHosts.has(host);
    }
    if (!localDatabase) throw new Error('Local feedback seed requires a loopback database');
    const seeder = createLocalFeedbackSeeder(createStore(strapi));
    return cleanup ? await seeder.cleanup() : await seeder.apply();
  } catch (error) {
    operationError = error;
    throw error;
  } finally {
    try {
      await strapi.destroy();
    } catch (error) {
      if (!operationError) throw error;
    }
  }
}

if (require.main === module) {
  const cleanup = process.argv.includes('--cleanup-local-feedback');
  const local = cleanup || process.argv.includes('--local-feedback');
  const args = process.argv.slice(2);
  const validArguments = args.length === 0 || (args.length === 1 && local);
  const operation = !validArguments
    ? Promise.reject(new Error('Use no arguments for the production catalog or one local feedback option'))
    : local ? runLocalFeedbackSeed({ cleanup }) : runProductionSeed();
  operation
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
  LOCAL_FEEDBACK_FIXTURE,
  LOCAL_FEEDBACK_MARKER,
  PRODUCTION_BOOTSTRAP,
  assertFixtureOwnership,
  assertLocalFeedbackOwnership,
  createLocalFeedbackSeeder,
  createStrapiSurveyStore,
  createStrapiLocalFeedbackStore,
  runLocalFeedbackSeed,
  createSurveySeeder,
  runProductionSeed,
};
