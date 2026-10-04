'use strict';

const STATUS_COLUMNS = Object.freeze([
  ['survey_qr_points', 'qr_point_status'],
  ['survey_versions', 'survey_version_status'],
  ['survey_report_generations', 'generation_status'],
]);

const TABLE_NAMES = STATUS_COLUMNS.map(([table]) => `'${table}'`).join(',');
const STATUS_COLUMN_NAMES = ['status', ...STATUS_COLUMNS.map(([, column]) => column)]
  .map((column) => `'${column}'`)
  .join(',');

const SCHEMA_SQL = `SELECT tables.table_name, columns.column_name FROM information_schema.tables AS tables LEFT JOIN information_schema.columns AS columns ON columns.table_schema=tables.table_schema AND columns.table_name=tables.table_name AND columns.column_name IN (${STATUS_COLUMN_NAMES}) WHERE tables.table_schema=current_schema() AND tables.table_name IN (${TABLE_NAMES})`;

function failPartialMigration() {
  throw new Error('TB-113 partial survey status-column migration; refusing to synchronize schema');
}

async function up(knex) {
  const { rows } = await knex.raw(SCHEMA_SQL);
  const presentTables = new Set(rows.map(({ table_name }) => table_name));
  if (presentTables.size === 0) return false;
  if (STATUS_COLUMNS.some(([table]) => !presentTables.has(table))) failPartialMigration();

  const columnsByTable = new Map(STATUS_COLUMNS.map(([table]) => [table, new Set()]));
  for (const { table_name, column_name } of rows) {
    if (column_name !== null) columnsByTable.get(table_name)?.add(column_name);
  }

  const states = STATUS_COLUMNS.map(([table, target]) => {
    const columns = columnsByTable.get(table);
    const hasOld = columns.has('status');
    const hasTarget = columns.has(target);
    if (hasOld === hasTarget) failPartialMigration();
    return hasOld ? 'old' : 'new';
  });

  if (states.every((state) => state === 'new')) return true;
  if (!states.every((state) => state === 'old')) failPartialMigration();

  for (const [table, target] of STATUS_COLUMNS) {
    await knex.raw(`ALTER TABLE "${table}" RENAME COLUMN "status" TO "${target}"`);
  }
  return true;
}

async function down() {
  throw new Error('TB-113 status-column migration is forward-only; restore from backup to roll back');
}

module.exports = { SCHEMA_SQL, STATUS_COLUMNS, down, up };
