const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const migration = require('../../../database/migrations/2026.09.11T0001-tb113-constraints');
const {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  executeFixed,
} = require('../harness/postgres-harness');

const OWNER_ID = 'tb113_test_lifecycle';

function composeArguments(...operation) {
  return ['compose', '--file', COMPOSE_FILE, '--project-name', OWNER_ID, ...operation];
}

async function executeCompose(...operation) {
  return executeFixed(DOCKER_EXECUTABLE, composeArguments(...operation));
}

async function psql(sql) {
  return executeCompose(
    'exec',
    '--no-TTY',
    'postgres',
    'psql',
    '--username=tb113_test_runner',
    '--dbname=tb113_test_feedback',
    '--set=ON_ERROR_STOP=1',
    '--tuples-only',
    '--no-align',
    `--command=${sql}`,
  );
}

async function waitForStrapi(child, output) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Strapi exited before readiness:\n${output.value}`);
    }

    const ready = await new Promise((resolve) => {
      const request = http.get('http://127.0.0.1:14337/admin/init', (response) => {
        response.resume();
        resolve(response.statusCode >= 200 && response.statusCode < 500);
      });
      request.once('error', () => resolve(false));
      request.setTimeout(1_000, () => {
        request.destroy();
        resolve(false);
      });
    });

    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Strapi did not become ready:\n${output.value}`);
}

async function stopProcess(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

const SCHEMA_SQL = `
  CREATE TABLE survey_submissions(id bigserial PRIMARY KEY,session_nonce_hash text NOT NULL,idempotency_key text NOT NULL);
  CREATE TABLE components_survey_aspect_definitions(id bigserial PRIMARY KEY,owner_version_key text NOT NULL,aspect_key text NOT NULL,sort_order integer NOT NULL);
  CREATE TABLE components_survey_aspect_ratings(id bigserial PRIMARY KEY,owner_receipt text NOT NULL,aspect_key text NOT NULL);
  CREATE TABLE survey_qr_points(id bigserial PRIMARY KEY,status text NOT NULL,inactive_at timestamptz);
  CREATE TABLE survey_report_generations(id bigserial PRIMARY KEY,period_start date NOT NULL,period_end date NOT NULL,status text NOT NULL,completed_at timestamptz,task_name text);
  CREATE TABLE survey_reports(id bigserial PRIMARY KEY,generation_run_id text NOT NULL);
  CREATE TABLE survey_settings(id bigserial PRIMARY KEY,document_id text NOT NULL,singleton_key text NOT NULL,intake_enabled boolean NOT NULL,generation_enabled boolean NOT NULL,settings_revision integer NOT NULL,created_at timestamptz NOT NULL,updated_at timestamptz NOT NULL);
`;

test('PostgreSQL migration is additive, idempotent, transactional, and enforces U4 invariants', async () => {
  try {
    await executeCompose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await executeCompose('up', '--detach', '--wait');
    await psql(SCHEMA_SQL);

    const applySql = `BEGIN;${migration.STATEMENTS.join(';')};COMMIT;`;
    await psql(applySql);
    await psql(applySql);

    const catalog = await psql(`
      SELECT
        (SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema() AND indexname LIKE 'uq_%'),
        (SELECT count(*) FROM pg_constraint WHERE conname LIKE 'ck_%'),
        (SELECT count(*) FROM survey_settings WHERE singleton_key='default' AND intake_enabled=false AND generation_enabled=false AND settings_revision=1);
    `);
    assert.equal(catalog.stdout.trim(), '8|4|1');

    await psql("INSERT INTO survey_submissions(session_nonce_hash,idempotency_key) VALUES ('nonce','idem')");
    await assert.rejects(
      psql("BEGIN; INSERT INTO survey_submissions(session_nonce_hash,idempotency_key) VALUES ('nonce','idem'); INSERT INTO survey_qr_points(status,inactive_at) VALUES ('active',CURRENT_TIMESTAMP); COMMIT;"),
      { name: 'HarnessProcessError' },
    );
    const rollbackProof = await psql("SELECT (SELECT count(*) FROM survey_submissions),(SELECT count(*) FROM survey_qr_points)");
    assert.equal(rollbackProof.stdout.trim(), '1|0');

    await psql("INSERT INTO survey_report_generations(period_start,period_end,status,completed_at,task_name) VALUES ('2026-09-01','2026-09-30','queued',NULL,'task-a')");
    await assert.rejects(
      psql("INSERT INTO survey_report_generations(period_start,period_end,status,completed_at,task_name) VALUES ('2026-09-01','2026-09-30','running',NULL,'task-b')"),
      { name: 'HarnessProcessError' },
    );
    await assert.rejects(
      psql("INSERT INTO survey_report_generations(period_start,period_end,status,completed_at,task_name) VALUES ('2026-10-02','2026-10-01','failed',NULL,'task-c')"),
      { name: 'HarnessProcessError' },
    );
  } finally {
    await executeCompose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }

  const label = `label=com.docker.compose.project=${OWNER_ID}`;
  const containers = await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label]);
  const volumes = await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label]);
  assert.equal(containers.stdout.trim(), '');
  assert.equal(volumes.stdout.trim(), '');
});

test('fresh Strapi startup synchronizes the TB-113 schema before installing invariants', async () => {
  const output = { value: '' };
  let strapi;

  try {
    await executeCompose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await executeCompose('up', '--detach', '--wait');
    const publishedPort = await executeCompose('port', 'postgres', '5432');
    const databasePort = publishedPort.stdout.trim().split(':').at(-1);
    const secret = 'tb113-fresh-start-local-only';
    strapi = spawn(path.join(__dirname, '../../../node_modules/.bin/strapi'), ['start'], {
      cwd: path.join(__dirname, '../../..'),
      env: {
        HOME: '/tmp/opencode',
        PATH: process.env.PATH,
        NODE_ENV: 'test',
        ENV_PATH: '/dev/null',
        HOST: '127.0.0.1',
        PORT: '14337',
        DATABASE_CLIENT: 'postgres',
        DATABASE_HOST: '127.0.0.1',
        DATABASE_PORT: databasePort,
        DATABASE_NAME: 'tb113_test_feedback',
        DATABASE_USERNAME: 'tb113_test_runner',
        DATABASE_PASSWORD: 'tb113_test_local_only',
        DATABASE_SSL: 'false',
        DATABASE_POOL_MIN: '0',
        DATABASE_POOL_MAX: '10',
        APP_KEYS: `${secret}-app-1,${secret}-app-2`,
        API_TOKEN_SALT: `${secret}-api`,
        ADMIN_JWT_SECRET: `${secret}-admin`,
        TRANSFER_TOKEN_SALT: `${secret}-transfer`,
        JWT_SECRET: `${secret}-jwt`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    strapi.stdout.on('data', (chunk) => { output.value += chunk; });
    strapi.stderr.on('data', (chunk) => { output.value += chunk; });

    await waitForStrapi(strapi, output);
    const catalog = await psql(`
      SELECT
        (SELECT count(*) FROM pg_indexes WHERE schemaname=current_schema() AND indexname LIKE 'uq_%'),
        (SELECT count(*) FROM pg_constraint WHERE conname LIKE 'ck_%'),
        (SELECT count(*) FROM survey_settings WHERE singleton_key='default' AND intake_enabled=false AND generation_enabled=false AND settings_revision=1);
    `);
    assert.equal(catalog.stdout.trim(), '8|4|1');
  } finally {
    if (strapi) await stopProcess(strapi);
    await executeCompose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }

  const label = `label=com.docker.compose.project=${OWNER_ID}`;
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
});
