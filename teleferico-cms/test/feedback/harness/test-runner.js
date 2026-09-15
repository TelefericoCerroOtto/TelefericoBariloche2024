const { spawnSync } = require('node:child_process');
const path = require('node:path');

const TESTS_BY_SELECTOR = {
  'feedback/catalog': path.join(__dirname, '../catalog/schema-catalog.test.js'),
  'feedback/harness': path.join(__dirname, 'process-boundary.test.js'),
};
const selector = process.argv[2];

if (!(selector in TESTS_BY_SELECTOR)) {
  process.stderr.write(`Unsupported test selector: ${selector ?? '<missing>'}\n`);
  process.exitCode = 2;
} else {
  const testFile = TESTS_BY_SELECTOR[selector];
  const result = spawnSync(process.execPath, ['--test', testFile], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
