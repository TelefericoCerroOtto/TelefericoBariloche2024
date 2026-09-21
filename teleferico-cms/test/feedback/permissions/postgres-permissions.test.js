const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const test = require('node:test');

const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require('../harness/postgres-harness');

const OWNER = 'tb113_test_permissions';
const SURVEY_PREFIX = 'api::survey-';
const FUTURE_CAPABILITIES = new Set([
  'feedback.read',
  'feedback.comments.read',
  'feedback.reports.read',
  'feedback.reports.generate',
  'feedback.reports.download',
]);
const compose = (...args) => ['compose', '--file', COMPOSE_FILE, '--project-name', OWNER, ...args];
const executeCompose = (...args) => executeFixed(DOCKER_EXECUTABLE, compose(...args));

function runtimeEnvironment(databasePort) {
  const secret = 'tb113-permissions-local-only';
  return {
    HOME: '/tmp/opencode', NODE_ENV: 'test', ENV_PATH: '/dev/null', HOST: '127.0.0.1',
    DATABASE_CLIENT: 'postgres', DATABASE_HOST: '127.0.0.1', DATABASE_PORT: databasePort,
    DATABASE_NAME: 'tb113_test_feedback', DATABASE_USERNAME: 'tb113_test_runner',
    DATABASE_PASSWORD: 'tb113_test_local_only', DATABASE_SSL: 'false',
    APP_KEYS: `${secret}-1,${secret}-2`, API_TOKEN_SALT: `${secret}-api`,
    ADMIN_JWT_SECRET: `${secret}-admin`, TRANSFER_TOKEN_SALT: `${secret}-transfer`, JWT_SECRET: `${secret}-jwt`,
  };
}

async function stopProcess(child) {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) {
    child.kill('SIGKILL');
    await new Promise((resolve) => child.once('exit', resolve));
  }
}

async function synchronizeStrapi(databasePort) {
  const cmsRoot = path.resolve(__dirname, '../../..');
  const child = spawn(path.join(cmsRoot, 'node_modules/.bin/strapi'), ['start'], {
    cwd: cmsRoot,
    env: { PATH: process.env.PATH, ...runtimeEnvironment(databasePort), PORT: '14338' },
    stdio: 'ignore',
  });
  try {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (child.exitCode !== null) throw new Error('Strapi exited before readiness');
      const ready = await new Promise((resolve) => {
        const request = http.get('http://127.0.0.1:14338/admin/init', (response) => {
          response.resume(); resolve(response.statusCode < 500);
        });
        request.once('error', () => resolve(false));
        request.setTimeout(500, () => { request.destroy(); resolve(false); });
      });
      if (ready) return;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error('Strapi did not become ready');
  } finally {
    await stopProcess(child);
  }
}

async function inspectWithCleanup(strapi, inspect) {
  try {
    await strapi.register();
    return await inspect(strapi);
  } finally {
    await strapi.destroy();
  }
}

async function withRegisteredStrapi(databasePort, inspect) {
  const environment = runtimeEnvironment(databasePort);
  const previous = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  const cmsRoot = path.resolve(__dirname, '../../..');
  const { createStrapi } = require('@strapi/strapi');
  const strapi = createStrapi({ appDir: cmsRoot, distDir: cmsRoot });
  try {
    return await inspectWithCleanup(strapi, inspect);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

function surveyActions(actions) {
  return actions.filter((action) => action.startsWith(SURVEY_PREFIX) || FUTURE_CAPABILITIES.has(action));
}

test('destroys a registered Strapi instance when inspection fails', async () => {
  const calls = [];
  const fake = { register: async () => calls.push('register'), destroy: async () => calls.push('destroy') };
  await assert.rejects(inspectWithCleanup(fake, async () => { throw new Error('inspection failed'); }), /inspection failed/);
  assert.deepEqual(calls, ['register', 'destroy']);
});

test('real isolated Strapi exposes core routes without default survey grants', async () => {
  try {
    await executeCompose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await executeCompose('up', '--detach', '--wait');
    const port = (await executeCompose('port', 'postgres', '5432')).stdout.trim().split(':').at(-1);
    await synchronizeStrapi(port);

    await withRegisteredStrapi(port, async (strapi) => {
      const queries = [];
      const recordQuery = (query) => queries.push(query);
      strapi.db.connection.on('query', recordQuery);
      try {
        const surveyApis = Object.entries(strapi.apis).filter(([name]) => name.startsWith('survey-'));
        const registeredActions = surveyApis
          .flatMap(([, api]) => Object.values(api.routes).flatMap((route) => route.routes ?? route))
          .map((route) => route.handler);
        const roles = await strapi.db.connection('up_roles').select('name');
        const permissions = await strapi.db.connection('up_permissions').select('action');
        const tokenPermissions = await strapi.db.connection('strapi_api_token_permissions').select('action');

        assert.equal(surveyApis.length, 6);
        assert.deepEqual(registeredActions, [
          'api::survey-report-generation.survey-report-generation.find',
          'api::survey-report-generation.survey-report-generation.findOne',
          'api::survey-report-generation.survey-report-generation.create',
          'api::survey-report-generation.survey-report-generation.update',
          'api::survey-report-generation.survey-report-generation.delete',
          'survey-submission.resolveSurvey',
          'survey-submission.submit',
        ]);
        assert.ok(roles.some(({ name }) => name === 'Public'));
        assert.ok(roles.some(({ name }) => name === 'Authenticated'));
        assert.equal(roles.some(({ name }) => name === 'Super Admin'), false);
        assert.deepEqual(surveyActions(permissions.map(({ action }) => action)), []);
        assert.deepEqual(surveyActions(tokenPermissions.map(({ action }) => action)), []);
      } finally {
        strapi.db.connection.off('query', recordQuery);
      }
      assert.ok(queries.length >= 3);
      assert.ok(queries.every(({ method }) => !['insert', 'update', 'del', 'delete', 'truncate'].includes(method)));
      assert.ok(queries.every(({ sql }) => !/^\s*(?:insert|update|delete|truncate|alter|create|drop)\b/i.test(sql)));
      assert.ok(queries.every(({ sql }) => !/admin_(?:roles|permissions)/.test(sql)));
    });
  } finally {
    await executeCompose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }

  const label = `label=com.docker.compose.project=${OWNER}`;
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
});
