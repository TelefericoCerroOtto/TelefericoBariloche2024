const { spawnSync } = require('node:child_process');
const path = require('node:path');

const TESTS_BY_SELECTOR = {
  'feedback/catalog': path.join(__dirname, '../catalog/schema-catalog.test.js'),
  'feedback/harness': path.join(__dirname, 'process-boundary.test.js'),
  'feedback/lifecycle': [
    path.join(__dirname, '../lifecycle/lifecycle.test.js'),
    path.join(__dirname, '../lifecycle/postgres-lifecycle.test.js'),
  ],
  'feedback/permissions': [
    path.join(__dirname, '../permissions/permissions.test.js'),
    path.join(__dirname, '../permissions/postgres-permissions.test.js'),
  ],
  'feedback/seed': [
    path.join(__dirname, '../seed/seed.test.js'),
    path.join(__dirname, '../seed/postgres-seed.test.js'),
  ],
};
const selector = process.argv[2];

if (!(selector in TESTS_BY_SELECTOR)) {
  process.stderr.write(`Unsupported test selector: ${selector ?? '<missing>'}\n`);
  process.exitCode = 2;
} else {
  const testFiles = [TESTS_BY_SELECTOR[selector]].flat();
  const result = spawnSync(process.execPath, ['--test', ...testFiles], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
