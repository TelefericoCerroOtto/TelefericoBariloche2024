const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');
const { Client } = require('pg');
const test = require('node:test');
const { promisify } = require('node:util');
const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require('../harness/postgres-harness');
const { FIXTURE_MANIFEST, createSurveySeeder } = require('../../../scripts/seed-surveys');

const OWNER = 'tb113_test_seed';
const execFileAsync = promisify(execFile);
const compose = (...args) => executeFixed(DOCKER_EXECUTABLE, ['compose', '--file', COMPOSE_FILE, '--project-name', OWNER, ...args]);

function postgresStore(client) {
  return {
    transaction: async (work) => {
      await client.query('BEGIN');
      try { const result = await work(); await client.query('COMMIT'); return result; }
      catch (error) { await client.query('ROLLBACK'); throw error; }
    },
    read: async () => {
      const parent = (await client.query('SELECT version_key AS "versionKey",status,fixture_marker AS "fixtureMarker",synthetic FROM survey_versions WHERE version_key=$1', [FIXTURE_MANIFEST.versionKey])).rows[0];
      if (!parent) return null;
      parent.aspects = (await client.query('SELECT owner_version_key AS "ownerVersionKey",aspect_key AS "aspectKey",sort_order AS "sortOrder",label_es AS "labelEs",label_en AS "labelEn",label_pt AS "labelPt" FROM survey_aspects WHERE version_key=$1 ORDER BY sort_order', [parent.versionKey])).rows;
      return parent;
    },
    createParent: (parent) => client.query('INSERT INTO survey_versions(version_key,status,fixture_marker,synthetic) VALUES($1,$2,$3,$4)', [parent.versionKey, parent.status, parent.fixtureMarker, parent.synthetic]),
    createChild: (child) => client.query('INSERT INTO survey_aspects(version_key,owner_version_key,aspect_key,sort_order,label_es,label_en,label_pt) VALUES($1,$2,$3,$4,$5,$6,$7)', [FIXTURE_MANIFEST.versionKey, child.ownerVersionKey, child.aspectKey, child.sortOrder, child.labelEs, child.labelEn, child.labelPt]),
    deleteChild: (key) => client.query('DELETE FROM survey_aspects WHERE version_key=$1 AND aspect_key=$2', [FIXTURE_MANIFEST.versionKey, key]),
    deleteParent: () => client.query('DELETE FROM survey_versions WHERE version_key=$1', [FIXTURE_MANIFEST.versionKey]),
  };
}

test('PostgreSQL fixture apply, replay, rollback, and cleanup are transactional', async () => {
  let client;
  try {
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await compose('up', '--detach', '--wait');
    const port = (await compose('port', 'postgres', '5432')).stdout.trim().split(':').at(-1);
    client = new Client({ host: '127.0.0.1', port: Number(port), database: 'tb113_test_feedback', user: 'tb113_test_runner', password: 'tb113_test_local_only' });
    await client.connect();
    await client.query('CREATE TABLE survey_versions(version_key text PRIMARY KEY,status text,fixture_marker text,synthetic boolean); CREATE TABLE survey_aspects(version_key text REFERENCES survey_versions,owner_version_key text,aspect_key text,sort_order int,label_es text,label_en text,label_pt text,PRIMARY KEY(version_key,aspect_key))');
    const store = postgresStore(client);
    const failingStore = { ...store, createChild: async (child) => {
      if (child.aspectKey === 'views') throw new Error('synthetic child failure');
      return store.createChild(child);
    } };
    await assert.rejects(createSurveySeeder(failingStore).applyFixture(), /synthetic child failure/);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM survey_versions')).rows[0].count, 0);
    const seeder = createSurveySeeder(store);
    assert.equal((await seeder.applyFixture()).created, true);
    assert.equal((await seeder.applyFixture()).created, false);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM survey_aspects')).rows[0].count, 14);
    await client.query("UPDATE survey_versions SET fixture_marker='unexpected'");
    await assert.rejects(seeder.cleanupFixture(), /Fixture ownership mismatch/);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM survey_versions')).rows[0].count, 1);
    await client.query('UPDATE survey_versions SET fixture_marker=$1', [FIXTURE_MANIFEST.marker]);
    assert.equal((await seeder.cleanupFixture()).deleted, true);
    assert.equal((await client.query('SELECT count(*)::int AS count FROM survey_versions')).rows[0].count, 0);

    await client.query('DROP TABLE survey_aspects; DROP TABLE survey_versions');
    const cmsRoot = path.resolve(__dirname, '../../..');
    const secret = 'tb113-seed-local-only';
    const environment = {
      PATH: process.env.PATH, HOME: '/tmp/opencode', NODE_ENV: 'test', ENV_PATH: '/dev/null',
      DATABASE_CLIENT: 'postgres', DATABASE_HOST: '127.0.0.1', DATABASE_PORT: port,
      DATABASE_NAME: 'tb113_test_feedback', DATABASE_USERNAME: 'tb113_test_runner',
      DATABASE_PASSWORD: 'tb113_test_local_only', DATABASE_SSL: 'false',
      APP_KEYS: `${secret}-1,${secret}-2`, API_TOKEN_SALT: `${secret}-api`,
      ADMIN_JWT_SECRET: `${secret}-admin`, TRANSFER_TOKEN_SALT: `${secret}-transfer`,
      JWT_SECRET: `${secret}-jwt`,
    };
    const command = [path.join(cmsRoot, 'scripts/seed-surveys.js')];
    const first = await execFileAsync(process.execPath, command, { cwd: cmsRoot, env: environment });
    const replay = await execFileAsync(process.execPath, command, { cwd: cmsRoot, env: environment });
    assert.deepEqual(JSON.parse(first.stdout.trim().split('\n').at(-1)), { created: true, count: 15 });
    assert.deepEqual(JSON.parse(replay.stdout.trim().split('\n').at(-1)), { created: false, count: 15 });
    assert.equal((await client.query("SELECT count(*)::int AS count FROM survey_versions WHERE version_key='visitor-feedback-v1'")).rows[0].count, 1);
    assert.equal((await client.query("SELECT count(*)::int AS count FROM components_survey_aspect_definitions WHERE owner_version_key='visitor-feedback-v1'")).rows[0].count, 14);
  } finally {
    if (client) await client.end();
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }
  const label = `label=com.docker.compose.project=${OWNER}`;
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
});
