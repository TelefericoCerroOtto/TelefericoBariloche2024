const {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  createPostgresHarness,
  executeFixed,
} = require('./postgres-harness');

const OWNER_ID = 'tb113_test_runtime_stale';

function composeArguments(...operation) {
  return ['compose', '--file', COMPOSE_FILE, '--project-name', OWNER_ID, ...operation];
}

function countLines(value) {
  return value.split('\n').filter(Boolean).length;
}

async function main() {
  const harness = createPostgresHarness({
    configuration: {
      composeFile: COMPOSE_FILE,
      databaseHost: '127.0.0.1',
      databaseName: 'tb113_test_feedback',
    },
    ownerId: OWNER_ID,
  });
  let result;

  try {
    await executeFixed(DOCKER_EXECUTABLE, composeArguments('up', '--detach', '--wait'));
    const label = `label=com.docker.compose.project=${OWNER_ID}`;
    const staleContainers = await executeFixed(DOCKER_EXECUTABLE, [
      'ps',
      '-aq',
      '--filter',
      label,
    ]);
    const staleVolumes = await executeFixed(DOCKER_EXECUTABLE, [
      'volume',
      'ls',
      '-q',
      '--filter',
      label,
    ]);

    if (countLines(staleContainers.stdout) !== 1 || countLines(staleVolumes.stdout) !== 1) {
      throw new Error('Failed to seed one bounded stale container and volume');
    }

    result = await harness.run();
  } finally {
    await harness.cleanup();
  }

  process.stdout.write(
    `${JSON.stringify({
      cleanup: result.cleanup,
      databaseHost: result.databaseHost,
      databaseName: result.databaseName,
      ownerPrefixValid: result.ownerId.startsWith('tb113_test_'),
      remoteContactCount: result.remoteContactCount,
      staleContainerCountBeforeRun: 1,
      staleResourcesRemoved: true,
      staleVolumeCountBeforeRun: 1,
      status: 'passed',
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.name}: ${error.message}\n`);
  process.exitCode = error.exitCode ?? 1;
});
