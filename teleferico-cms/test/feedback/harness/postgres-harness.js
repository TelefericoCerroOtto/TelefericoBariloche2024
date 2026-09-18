const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { existsSync, statSync } = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const DOCKER_EXECUTABLE = '/usr/local/bin/docker';
const COMPOSE_FILE = path.join(__dirname, 'compose.yaml');
const DATABASE_NAME_PATTERN = /^tb113_test_[a-z0-9_]+$/;
const OWNER_PATTERN = /^tb113_test_[a-z0-9_]+$/;
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const FORBIDDEN_MARKER = /staging|production/i;
const SIGNALS = ['SIGINT', 'SIGTERM'];
const LOCAL_DOCKER_SOCKETS = Object.freeze([
  '/var/run/docker.sock',
  path.join(os.homedir(), '.docker', 'desktop', 'docker.sock'),
]);

function resolveLocalDockerSocket() {
  const socket = LOCAL_DOCKER_SOCKETS.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isSocket(),
  );

  if (!socket) {
    throw new Error('No approved local Docker socket is available');
  }

  return socket;
}

const FIXED_CHILD_ENVIRONMENT = Object.freeze({
  DOCKER_HOST: `unix://${resolveLocalDockerSocket()}`,
  HOME: '/nonexistent',
  LC_ALL: 'C',
  PATH: '/usr/local/bin:/usr/bin:/bin',
});

class HarnessInterruptedError extends Error {
  constructor(signal) {
    super(`PostgreSQL harness interrupted by ${signal}`);
    this.name = 'HarnessInterruptedError';
    this.signal = signal;
  }
}

class HarnessProcessError extends Error {
  constructor(exitCode) {
    super(`Docker subprocess failed with exit code ${exitCode}`);
    this.name = 'HarnessProcessError';
    this.exitCode = exitCode;
  }
}

function validateHarnessConfiguration(configuration) {
  const composeFile = path.resolve(configuration.composeFile ?? '');
  const databaseName = configuration.databaseName ?? '';
  const databaseHost = configuration.databaseHost ?? '';
  const safe =
    LOCAL_HOSTS.has(databaseHost) &&
    DATABASE_NAME_PATTERN.test(databaseName) &&
    !FORBIDDEN_MARKER.test(databaseName) &&
    composeFile === COMPOSE_FILE;

  if (!safe) {
    throw new Error('Unsafe PostgreSQL harness configuration');
  }

  return Object.freeze({ composeFile, databaseHost, databaseName });
}

function validateOwnerId(ownerId) {
  if (!OWNER_PATTERN.test(ownerId) || FORBIDDEN_MARKER.test(ownerId)) {
    throw new Error('Unsafe PostgreSQL harness owner');
  }
}

function executeFixed(executable, args, options = {}) {
  if (executable !== DOCKER_EXECUTABLE || !Array.isArray(args)) {
    return Promise.reject(new Error('Unsupported subprocess request'));
  }

  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, {
      env: FIXED_CHILD_ENVIRONMENT,
      shell: false,
      signal: options.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ exitCode, stderr, stdout });
      } else {
        reject(new HarnessProcessError(exitCode));
      }
    });
  });
}

function composeArguments(ownerId, ...operation) {
  return ['compose', '--file', COMPOSE_FILE, '--project-name', ownerId, ...operation];
}

function countLines(value) {
  return value.split('\n').filter(Boolean).length;
}

function createPostgresHarness({
  configuration,
  execute = executeFixed,
  ownerId = `tb113_test_${randomUUID().replaceAll('-', '')}`,
  signalSource = process,
}) {
  const safeConfiguration = validateHarnessConfiguration(configuration);
  validateOwnerId(ownerId);
  const abortController = new AbortController();
  let cleanupPromise;

  async function removeComposeResources() {
    await execute(
      DOCKER_EXECUTABLE,
      composeArguments(ownerId, 'down', '--volumes', '--remove-orphans', '--timeout=5'),
    );
  }

  async function cleanup() {
    cleanupPromise ??= (async () => {
      await removeComposeResources();
      const label = `label=com.docker.compose.project=${ownerId}`;
      const containers = await execute(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label]);
      const volumes = await execute(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label]);
      const containerCount = countLines(containers.stdout);
      const volumeCount = countLines(volumes.stdout);

      if (containerCount !== 0 || volumeCount !== 0) {
        throw new Error('Owned Docker resources remain after cleanup');
      }

      return Object.freeze({ containerCount, volumeCount });
    })();

    return cleanupPromise;
  }

  async function operate() {
    await removeComposeResources();
    await execute(DOCKER_EXECUTABLE, composeArguments(ownerId, 'up', '--detach', '--wait'), {
      signal: abortController.signal,
    });
    const database = await execute(
      DOCKER_EXECUTABLE,
      composeArguments(
        ownerId,
        'exec',
        '--no-TTY',
        'postgres',
        'psql',
        '--username=tb113_test_runner',
        `--dbname=${safeConfiguration.databaseName}`,
        '--tuples-only',
        '--no-align',
        '--command=SELECT current_database();',
      ),
      { signal: abortController.signal },
    );

    if (database.stdout.trim() !== safeConfiguration.databaseName) {
      throw new Error('PostgreSQL returned an unexpected database identity');
    }
  }

  async function run() {
    let operationError;
    let rejectInterrupted;
    const interrupted = new Promise((resolve, reject) => {
      rejectInterrupted = reject;
    });
    const handlers = new Map(
      SIGNALS.map((signal) => [
        signal,
        () => {
          abortController.abort();
          void cleanup().then(
            () => rejectInterrupted(new HarnessInterruptedError(signal)),
            rejectInterrupted,
          );
        },
      ]),
    );

    for (const [signal, handler] of handlers) {
      signalSource.once(signal, handler);
    }

    try {
      await Promise.race([operate(), interrupted]);
    } catch (error) {
      operationError = error;
    } finally {
      for (const [signal, handler] of handlers) {
        signalSource.removeListener(signal, handler);
      }

      try {
        await cleanup();
      } catch (cleanupError) {
        if (!operationError) {
          throw cleanupError;
        }

        operationError.cleanupError = cleanupError;
      }
    }

    if (operationError) {
      throw operationError;
    }

    const cleanupResult = await cleanup();
    return Object.freeze({
      cleanup: cleanupResult,
      databaseHost: safeConfiguration.databaseHost,
      databaseName: safeConfiguration.databaseName,
      ownerId,
      remoteContactCount: 0,
    });
  }

  return Object.freeze({ cleanup, run });
}

module.exports = {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  HarnessInterruptedError,
  createPostgresHarness,
  executeFixed,
  validateHarnessConfiguration,
};
