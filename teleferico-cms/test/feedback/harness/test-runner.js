const { spawnSync } = require('node:child_process');
const path = require('node:path');

const SUPPORTED_SELECTOR = 'feedback/harness';
const selector = process.argv[2];

if (selector !== SUPPORTED_SELECTOR) {
  process.stderr.write(`Unsupported test selector: ${selector ?? '<missing>'}\n`);
  process.exitCode = 2;
} else {
  const testFile = path.join(__dirname, 'process-boundary.test.js');
  const result = spawnSync(process.execPath, ['--test', testFile], {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  process.exitCode = result.status ?? 1;
}
