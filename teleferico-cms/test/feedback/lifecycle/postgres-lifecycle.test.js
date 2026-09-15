const assert = require('node:assert/strict');
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
