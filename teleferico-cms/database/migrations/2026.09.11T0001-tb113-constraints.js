'use strict';

const INDEX_NAMES = Object.freeze([
  'uq_submission_nonce_idem',
  'uq_definition_owner_key',
  'uq_definition_owner_order',
  'uq_rating_owner_key',
  'uq_generation_active_range',
  'uq_generation_task',
  'uq_report_generation',
  'uq_settings_singleton',
]);

const CONSTRAINT_NAMES = Object.freeze([
  'ck_settings_singleton',
  'ck_qr_point_status_time',
  'ck_generation_range',
  'ck_generation_terminal',
]);

const REQUIRED_COLUMNS = Object.freeze({
  components_survey_aspect_definitions: ['owner_version_key', 'aspect_key', 'sort_order'],
  components_survey_aspect_ratings: ['owner_receipt', 'aspect_key'],
  survey_qr_points: ['status', 'inactive_at'],
  survey_report_generations: ['period_start', 'period_end', 'status', 'completed_at', 'task_name'],
  survey_reports: ['generation_run_id'],
  survey_settings: ['document_id', 'singleton_key', 'intake_enabled', 'generation_enabled', 'settings_revision'],
  survey_submissions: ['session_nonce_hash', 'idempotency_key'],
});

const INDEX_SQL = Object.freeze([
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_submission_nonce_idem ON survey_submissions(session_nonce_hash,idempotency_key)',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_definition_owner_key ON components_survey_aspect_definitions(owner_version_key,aspect_key)',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_definition_owner_order ON components_survey_aspect_definitions(owner_version_key,sort_order)',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_rating_owner_key ON components_survey_aspect_ratings(owner_receipt,aspect_key)',
  "CREATE UNIQUE INDEX IF NOT EXISTS uq_generation_active_range ON survey_report_generations(period_start,period_end) WHERE status IN ('queued','running')",
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_generation_task ON survey_report_generations(task_name) WHERE task_name IS NOT NULL',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_report_generation ON survey_reports(generation_run_id)',
  'CREATE UNIQUE INDEX IF NOT EXISTS uq_settings_singleton ON survey_settings(singleton_key)',
]);

const CONSTRAINT_SQL = Object.freeze([
  ['survey_settings', 'ck_settings_singleton', "singleton_key='default'"],
  ['survey_qr_points', 'ck_qr_point_status_time', "(status='active' AND inactive_at IS NULL) OR (status='inactive' AND inactive_at IS NOT NULL)"],
  ['survey_report_generations', 'ck_generation_range', 'period_start<=period_end'],
  ['survey_report_generations', 'ck_generation_terminal', "(status IN ('queued','running') AND completed_at IS NULL) OR (status IN ('succeeded','failed') AND completed_at IS NOT NULL)"],
]);

function assertionSql() {
  const expected = Object.entries(REQUIRED_COLUMNS)
    .flatMap(([table, columns]) => columns.map((column) => `('${table}','${column}')`))
    .join(',');

  return `DO $$ DECLARE missing text; BEGIN SELECT string_agg(e.table_name||'.'||e.column_name, ',') INTO missing FROM (VALUES ${expected}) e(table_name,column_name) LEFT JOIN information_schema.columns c ON c.table_schema=current_schema() AND c.table_name=e.table_name AND c.column_name=e.column_name WHERE c.column_name IS NULL; IF missing IS NOT NULL THEN RAISE EXCEPTION 'TB-113 schema mismatch: %', missing; END IF; END $$`;
}

function constraintSql(table, name, check) {
  return `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='${name}' AND conrelid='${table}'::regclass) THEN ALTER TABLE ${table} ADD CONSTRAINT ${name} CHECK(${check}); END IF; END $$`;
}

const STATEMENTS = Object.freeze([
  assertionSql(),
  ...INDEX_SQL,
  ...CONSTRAINT_SQL.map(([table, name, check]) => constraintSql(table, name, check)),
  "INSERT INTO survey_settings(document_id,singleton_key,intake_enabled,generation_enabled,settings_revision,created_at,updated_at) SELECT 'tb113surveysettingsdefault','default',false,false,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM survey_settings WHERE singleton_key='default')",
]);

async function up(knex) {
  for (const statement of STATEMENTS) {
    await knex.raw(statement);
  }
}

async function down() {
  throw new Error('TB-113 constraints are additive and intentionally have no destructive rollback');
}

module.exports = { CONSTRAINT_NAMES, INDEX_NAMES, STATEMENTS, down, up };
