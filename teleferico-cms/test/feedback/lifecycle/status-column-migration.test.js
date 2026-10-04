const assert = require('node:assert/strict');
const test = require('node:test');

const migration = require('../../../database/migrations/2026.10.03T0001-tb113-status-columns');

const OLD_COLUMNS = [
  ['survey_qr_points', 'status'],
  ['survey_versions', 'status'],
  ['survey_report_generations', 'status'],
];
const NEW_COLUMNS = [
  ['survey_qr_points', 'qr_point_status'],
  ['survey_versions', 'survey_version_status'],
  ['survey_report_generations', 'generation_status'],
];

function columns(rows) {
  const tableNames = new Set([...OLD_COLUMNS, ...NEW_COLUMNS].map(([table]) => table));
  const presentTables = new Set(rows.map(([table]) => table));
  return [...tableNames]
    .filter((table_name) => presentTables.has(table_name))
    .flatMap((table_name) => {
      const names = rows.filter(([table]) => table === table_name).map(([, column]) => column);
      return (names.length ? names : [null]).map((column_name) => ({ table_name, column_name }));
    });
}

function fakeKnex(rows) {
  const statements = [];
  return {
    statements,
    async raw(statement) {
      statements.push(statement);
      if (statements.length === 1) return { rows: columns(rows) };
      return { rows: [] };
    },
  };
}

test('status-column migration renames all existing domain columns in place', async () => {
  const knex = fakeKnex(OLD_COLUMNS);

  assert.equal(await migration.up(knex), true);
  assert.deepEqual(knex.statements.slice(1), [
    'ALTER TABLE "survey_qr_points" RENAME COLUMN "status" TO "qr_point_status"',
    'ALTER TABLE "survey_versions" RENAME COLUMN "status" TO "survey_version_status"',
    'ALTER TABLE "survey_report_generations" RENAME COLUMN "status" TO "generation_status"',
  ]);
});

test('status-column migration accepts fresh and already-migrated databases', async () => {
  const fresh = fakeKnex([]);
  assert.equal(await migration.up(fresh), false);
  assert.equal(fresh.statements.length, 1);

  const migrated = fakeKnex(NEW_COLUMNS);
  assert.equal(await migration.up(migrated), true);
  assert.equal(migrated.statements.length, 1);
});

test('status-column migration rejects mixed and ambiguous partial schemas', async () => {
  const mixed = fakeKnex([
    OLD_COLUMNS[0],
    NEW_COLUMNS[1],
    OLD_COLUMNS[2],
  ]);
  await assert.rejects(migration.up(mixed), /partial survey status-column migration/);

  const missing = fakeKnex(OLD_COLUMNS.slice(0, 2));
  await assert.rejects(migration.up(missing), /partial survey status-column migration/);

  const incompleteTable = fakeKnex([
    OLD_COLUMNS[0],
    OLD_COLUMNS[2],
    ['survey_versions', null],
  ]);
  await assert.rejects(migration.up(incompleteTable), /partial survey status-column migration/);

  const ambiguous = fakeKnex([
    ...OLD_COLUMNS,
    ...NEW_COLUMNS,
  ]);
  await assert.rejects(migration.up(ambiguous), /partial survey status-column migration/);
});
