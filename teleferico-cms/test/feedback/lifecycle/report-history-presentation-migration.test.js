'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const migration = require('../../../database/migrations/2026.10.21T0001-tb113-report-history-presentation');

test('adds only missing shared presentation fields and replays without mutation', async () => {
  const columns = new Set();
  const changes = [];
  const knex = {
    schema: {
      hasTable: async () => true,
      hasColumn: async (_table, name) => columns.has(name),
      alterTable: async (_table, change) => change({
        string: (name, size) => ({ nullable: () => { columns.add(name); changes.push([name, size]); } }),
        boolean: (name) => ({ notNullable: () => ({ defaultTo: (value) => { columns.add(name); changes.push([name, value]); } }) }),
      }),
    },
  };
  assert.equal(await migration.up(knex), true);
  assert.deepEqual(changes, [['display_name', 80], ['history_hidden', false]]);
  assert.equal(await migration.up(knex), true);
  assert.equal(changes.length, 2);
  await assert.rejects(migration.down(), /forward-only/);
});
