#!/usr/bin/env node

'use strict';

const { createStrapi } = require('@strapi/strapi');

const POSTULATION_UID = 'api::postulation.postulation';
const SECTOR_UID = 'api::sector.sector';
const DEFAULT_COUNT = 24;
const MIN_COUNT = 1;
const MAX_COUNT = 200;
const SEED_MARKER = '[seed-postulations]';
const SEED_EMAIL_DOMAIN = 'seed.teleferico.test';
const GENDERS = ['male', 'female', 'other'];
const STATUSES = ['unreviewed', 'discarded', 'hired'];
const FIRST_NAMES = [
  'Sofia',
  'Mateo',
  'Valentina',
  'Thiago',
  'Martina',
  'Benicio',
  'Olivia',
  'Joaquin',
  'Emma',
  'Lautaro',
  'Catalina',
  'Franco'
];
const LAST_NAMES = [
  'Gonzalez',
  'Rodriguez',
  'Lopez',
  'Fernandez',
  'Martinez',
  'Perez',
  'Sanchez',
  'Romero',
  'Diaz',
  'Torres',
  'Alvarez',
  'Ruiz'
];

function parseArgs(argv) {
  const options = {
    cleanup: false,
    count: DEFAULT_COUNT,
  };

  for (const arg of argv) {
    if (arg === '--cleanup') {
      options.cleanup = true;
      continue;
    }

    if (arg.startsWith('--count=')) {
      const value = Number.parseInt(arg.slice('--count='.length), 10);

      if (!Number.isInteger(value) || value < MIN_COUNT || value > MAX_COUNT) {
        throw new Error(
          `Invalid --count value. Use an integer between ${MIN_COUNT} and ${MAX_COUNT}.`
        );
      }

      options.count = value;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`
Seed fake recruitment postulations for Strapi admin pagination testing.

Usage:
  npm run seed:postulations
  npm run seed:postulations -- --count=25
  npm run seed:postulations -- --cleanup

Flags:
  --count=<n>  Number of fake postulations to create (${DEFAULT_COUNT} by default)
  --cleanup    Delete only rows previously created by this script
  --help       Show this help message
`);
}

function pickFrom(values, index) {
  return values[index % values.length];
}

function buildSeedData(index) {
  const firstName = pickFrom(FIRST_NAMES, index);
  const lastName = pickFrom(LAST_NAMES, index * 3);
  const gender = pickFrom(GENDERS, index);
  const status = pickFrom(STATUSES, index);
  const age = 18 + (index % 43);
  const paddedNumber = String(index + 1).padStart(3, '0');
  const email = `seed-postulation-${paddedNumber}@${SEED_EMAIL_DOMAIN}`;

  // The note marker is the cleanup anchor. This avoids touching real postulations
  // if someone later adds similarly formatted fake emails by hand.
  return {
    name: firstName,
    surname: lastName,
    gender,
    age,
    email,
    campNo: 1000 + index,
    note: `${SEED_MARKER} Fake record ${paddedNumber} for recruitment admin pagination checks.`,
    postulation_status: status,
  };
}

async function findSectorId(strapi) {
  const activeSector = await strapi.db.query(SECTOR_UID).findOne({
    where: { isActive: true },
    orderBy: { id: 'asc' },
  });

  if (activeSector) {
    return activeSector.id;
  }

  const anySector = await strapi.db.query(SECTOR_UID).findOne({
    orderBy: { id: 'asc' },
  });

  if (anySector) {
    return anySector.id;
  }

  throw new Error(
    'No sectors found. Create at least one sector in Strapi before running this seed.'
  );
}

async function cleanupSeededPostulations(strapi) {
  const seededPostulations = await strapi.db.query(POSTULATION_UID).findMany({
    where: {
      note: {
        $contains: SEED_MARKER,
      },
    },
    select: ['id', 'email'],
    orderBy: { id: 'asc' },
  });

  if (seededPostulations.length === 0) {
    console.log('No seeded postulations found to delete.');
    return;
  }

  for (const postulation of seededPostulations) {
    // This script seeds only local, non-localized testing rows. Deleting by row id
    // keeps the cleanup path simple and avoids the extra document-service queries
    // that caused noisy shutdown errors in standalone script execution.
    await strapi.db.query(POSTULATION_UID).delete({
      where: { id: postulation.id },
    });
  }

  console.log(`Deleted ${seededPostulations.length} seeded postulations.`);
}

async function seedPostulations(strapi, count) {
  const sectorId = await findSectorId(strapi);
  const publishedAt = new Date();

  for (let index = 0; index < count; index += 1) {
    const data = buildSeedData(index);

    // We create published entries so the admin list behaves like real submissions
    // without going through the public form flow (captcha, upload, and API hop).
    await strapi.db.query(POSTULATION_UID).create({
      data: {
        ...data,
        sector: sectorId,
        publishedAt,
      },
    });
  }

  console.log(`Created ${count} fake postulations using sector id ${sectorId}.`);
}

async function run() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const strapi = createStrapi({
    autoReload: false,
    serveAdminPanel: false,
  });

  try {
    await strapi.load();

    if (options.cleanup) {
      await cleanupSeededPostulations(strapi);
      return;
    }

    await seedPostulations(strapi, options.count);
  } finally {
    await strapi.destroy();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
