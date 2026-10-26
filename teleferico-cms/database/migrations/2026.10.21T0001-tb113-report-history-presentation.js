'use strict';

const TABLE = 'survey_report_generations';

async function up(knex) {
  if (!await knex.schema.hasTable(TABLE)) return false;
  if (!await knex.schema.hasColumn(TABLE, 'display_name')) {
    await knex.schema.alterTable(TABLE, (table) => {
      table.string('display_name', 80).nullable();
    });
  }
  if (!await knex.schema.hasColumn(TABLE, 'history_hidden')) {
    await knex.schema.alterTable(TABLE, (table) => {
      table.boolean('history_hidden').notNullable().defaultTo(false);
    });
  }
  return true;
}

async function down() {
  throw new Error('TB-113 report history presentation migration is forward-only; restore from backup to roll back');
}

module.exports = { up, down };
