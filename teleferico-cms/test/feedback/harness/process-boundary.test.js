const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const test = require('node:test');

const {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  HarnessInterruptedError,
  createPostgresHarness,
  validateHarnessConfiguration,
} = require('./postgres-harness');

const LOCAL_CONFIGURATION = Object.freeze({
  databaseName: 'tb113_test_feedback',
  databaseHost: '127.0.0.1',
  composeFile: COMPOSE_FILE,
});

function successfulResult(stdout = '') {
  return Promise.resolve({ stdout, stderr: '', exitCode: 0 });
}

function createRecordingExecutor(responses = []) {
  const calls = [];
  const execute = async (executable, args) => {
    calls.push({ executable, args: [...args] });
    const response = responses.shift();
    return response ? response(executable, args) : successfulResult();
  };

  return { calls, execute };
}

test('rejects remote, staging, and production targets before spawning', async (t) => {
  const unsafeConfigurations = [
    { ...LOCAL_CONFIGURATION, databaseHost: 'db.internal.example' },
    { ...LOCAL_CONFIGURATION, databaseHost: '10.0.0.12' },
    { ...LOCAL_CONFIGURATION, databaseName: 'tb113_test_staging' },
    { ...LOCAL_CONFIGURATION, databaseName: 'tb113_test_production' },
    { ...LOCAL_CONFIGURATION, databaseName: 'survey_feedback' },
  ];

  for (const configuration of unsafeConfigurations) {
    await t.test(JSON.stringify(configuration), () => {
      assert.throws(
        () => validateHarnessConfiguration(configuration),
        /Unsafe PostgreSQL harness configuration/,
      );
    });
  }
});

test('rejects shell metacharacters and alternate Compose paths before spawning', async (t) => {
  const metacharacters = [';', '&&', '|', '$(', '`', '\n', '../'];

  for (const value of metacharacters) {
    await t.test(`database suffix ${JSON.stringify(value)}`, () => {
      assert.throws(
        () =>
          validateHarnessConfiguration({
            ...LOCAL_CONFIGURATION,
            databaseName: `tb113_test_${value}`,
          }),
        /Unsafe PostgreSQL harness configuration/,
      );
    });
  }

  assert.throws(
    () =>
      validateHarnessConfiguration({
        ...LOCAL_CONFIGURATION,
        composeFile: path.resolve(__dirname, 'alternate-compose.yaml'),
      }),
    /Unsafe PostgreSQL harness configuration/,
  );
});

test('uses fixed executable and argument arrays with bounded project ownership', async () => {
  const recorder = createRecordingExecutor([
    () => successfulResult(),
    () => successfulResult(),
    () => successfulResult('tb113_test_feedback\n'),
    () => successfulResult(),
    () => successfulResult(''),
    () => successfulResult(''),
  ]);
  const harness = createPostgresHarness({
    configuration: LOCAL_CONFIGURATION,
    execute: recorder.execute,
    ownerId: 'tb113_test_fixed_owner',
    signalSource: new EventEmitter(),
  });

  const result = await harness.run();

  assert.equal(result.databaseName, 'tb113_test_feedback');
  assert.equal(result.ownerId, 'tb113_test_fixed_owner');
  assert.equal(result.remoteContactCount, 0);
  assert.equal(result.cleanup.containerCount, 0);
  assert.equal(result.cleanup.volumeCount, 0);
  assert.equal(recorder.calls.length, 6);
  assert.ok(recorder.calls.every((call) => call.executable === DOCKER_EXECUTABLE));
  assert.deepEqual(recorder.calls[0].args.slice(-4), [
    'down',
    '--volumes',
    '--remove-orphans',
    '--timeout=5',
  ]);
  assert.deepEqual(recorder.calls[1].args.slice(-3), ['up', '--detach', '--wait']);
  assert.ok(
    recorder.calls.every(
      (call) => !call.args.some((argument) => /staging|production|https?:\/\//i.test(argument)),
    ),
  );
});

test('removes stale Compose containers and volumes before starting PostgreSQL', async () => {
  const recorder = createRecordingExecutor([
    () => successfulResult(),
    () => successfulResult(),
    () => successfulResult('tb113_test_feedback\n'),
  ]);
  const harness = createPostgresHarness({
    configuration: LOCAL_CONFIGURATION,
    execute: recorder.execute,
    ownerId: 'tb113_test_stale_owner',
    signalSource: new EventEmitter(),
  });

  await harness.run();

  assert.equal(recorder.calls[0].args.at(-4), 'down');
  assert.equal(recorder.calls[1].args.at(-3), 'up');
  assert.ok(recorder.calls[0].args.includes('--volumes'));
  assert.ok(recorder.calls[0].args.includes('--remove-orphans'));
});

test('preserves child-process failure and still performs deterministic cleanup', async () => {
  const childFailure = Object.assign(new Error('docker compose up failed'), { exitCode: 37 });
  const recorder = createRecordingExecutor([
    () => successfulResult(),
    () => Promise.reject(childFailure),
    () => successfulResult(),
    () => successfulResult(''),
    () => successfulResult(''),
  ]);
  const harness = createPostgresHarness({
    configuration: LOCAL_CONFIGURATION,
    execute: recorder.execute,
    ownerId: 'tb113_test_failure_owner',
    signalSource: new EventEmitter(),
  });

  await assert.rejects(harness.run(), (error) => error === childFailure && error.exitCode === 37);
  assert.equal(recorder.calls.filter((call) => call.args.includes('down')).length, 2);
  assert.ok(recorder.calls.some((call) => call.args[0] === 'ps'));
  assert.ok(recorder.calls.some((call) => call.args[0] === 'volume'));
});

test('cleans bounded resources exactly once when interrupted by a signal', async () => {
  const signals = new EventEmitter();
  let releaseUp;
  const upStarted = new Promise((resolve) => {
    releaseUp = resolve;
  });
  const recorder = createRecordingExecutor([
    () => successfulResult(),
    async () => {
      releaseUp();
      return new Promise(() => {});
    },
    () => successfulResult(),
    () => successfulResult(''),
    () => successfulResult(''),
  ]);
  const harness = createPostgresHarness({
    configuration: LOCAL_CONFIGURATION,
    execute: recorder.execute,
    ownerId: 'tb113_test_signal_owner',
    signalSource: signals,
  });

  const running = harness.run();
  await upStarted;
  signals.emit('SIGTERM');

  await assert.rejects(
    running,
    (error) => error instanceof HarnessInterruptedError && error.signal === 'SIGTERM',
  );
  assert.equal(recorder.calls.filter((call) => call.args.includes('down')).length, 2);
  assert.equal(signals.listenerCount('SIGINT'), 0);
  assert.equal(signals.listenerCount('SIGTERM'), 0);
});

test('fails cleanup verification when an owned container or volume remains', async (t) => {
  for (const [resource, stdout] of [
    ['container', 'container-id\n'],
    ['volume', 'tb113_test_orphan\n'],
  ]) {
    await t.test(resource, async () => {
      const responses = [
        () => successfulResult(),
        () => successfulResult(),
        () => successfulResult('tb113_test_feedback\n'),
        () => successfulResult(),
        () => successfulResult(resource === 'container' ? stdout : ''),
        () => successfulResult(resource === 'volume' ? stdout : ''),
      ];
      const recorder = createRecordingExecutor(responses);
      const harness = createPostgresHarness({
        configuration: LOCAL_CONFIGURATION,
        execute: recorder.execute,
        ownerId: 'tb113_test_orphan_owner',
        signalSource: new EventEmitter(),
      });

      await assert.rejects(harness.run(), /Owned Docker resources remain after cleanup/);
    });
  }
});
