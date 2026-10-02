const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const { cp, copyFile, mkdir, mkdtemp, readdir, rm, symlink, unlink } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require('../harness/postgres-harness');
const CMS_ROOT = path.resolve(__dirname, '../../..');
const OWNER = `tb113_cm_${randomUUID().replaceAll('-', '')}`;
const DATABASE_NAME = 'tb113_test_feedback';
const DATABASE_USER = 'tb113_test_runner';
const DATABASE_PASSWORD = 'tb113_test_local_only';

function compose(...args) {
  return ['compose', '--file', COMPOSE_FILE, '--project-name', OWNER, ...args];
}

async function assertNoOwnedResources() {
  const label = `label=com.docker.compose.project=${OWNER}`;
  const [containers, volumes] = await Promise.all([
    executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label]),
    executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label]),
  ]);
  assert.equal(containers.stdout.trim(), '', 'unique Docker owner already has containers');
  assert.equal(volumes.stdout.trim(), '', 'unique Docker owner already has volumes');
}

async function copyWithoutCredentialFiles(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: (sourcePath) => {
      const name = path.basename(sourcePath);
      return !name.startsWith('.env') && name !== '.npmrc';
    },
  });
}

async function assertNoCredentialFiles(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    assert.equal(entry.name.startsWith('.env') || entry.name === '.npmrc', false);
    if (entry.isDirectory()) await assertNoCredentialFiles(path.join(root, entry.name));
  }
}

async function createIsolatedCmsRoot(stackRoot) {
  const cmsRoot = path.join(stackRoot, 'teleferico-cms');
  await symlink(path.resolve(CMS_ROOT, '../packages'), path.join(stackRoot, 'packages'), 'dir');
  await mkdir(cmsRoot, { recursive: true, mode: 0o700 });
  await copyFile(path.join(CMS_ROOT, 'package.json'), path.join(cmsRoot, 'package.json'));
  await symlink(path.join(CMS_ROOT, 'node_modules'), path.join(cmsRoot, 'node_modules'), 'dir');
  await copyWithoutCredentialFiles(path.join(CMS_ROOT, 'src'), path.join(cmsRoot, 'src'));
  await copyWithoutCredentialFiles(path.join(CMS_ROOT, 'database'), path.join(cmsRoot, 'database'));
  await mkdir(path.join(cmsRoot, 'scripts'), { recursive: true, mode: 0o700 });
  await copyFile(path.join(CMS_ROOT, 'scripts/seed-surveys.js'), path.join(cmsRoot, 'scripts/seed-surveys.js'));
  await mkdir(path.join(cmsRoot, 'config'), { recursive: true, mode: 0o700 });
  for (const name of await readdir(path.join(CMS_ROOT, 'config'))) {
    if (name.endsWith('.js')) {
      await copyFile(path.join(CMS_ROOT, 'config', name), path.join(cmsRoot, 'config', name));
    }
  }
  await mkdir(path.join(cmsRoot, 'public', 'uploads'), { recursive: true, mode: 0o700 });
  await assertNoCredentialFiles(cmsRoot);
  return cmsRoot;
}

function runtimeEnvironment(stackRoot, databasePort, nodeEnv = 'test') {
  const secret = randomBytes(32).toString('hex');
  return {
    PATH: '/usr/local/bin:/usr/bin:/bin',
    HOME: path.join(stackRoot, 'home'),
    NODE_ENV: nodeEnv,
    ENV_PATH: '/dev/null',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_CLIENT: 'postgres',
    DATABASE_HOST: '127.0.0.1',
    DATABASE_PORT: String(databasePort),
    DATABASE_NAME,
    DATABASE_USERNAME: DATABASE_USER,
    DATABASE_PASSWORD,
    DATABASE_SSL: 'false',
    DATABASE_POOL_MIN: '0',
    DATABASE_POOL_MAX: '5',
    APP_KEYS: `${secret}-app-1,${secret}-app-2`,
    API_TOKEN_SALT: `${secret}-api-token-salt`,
    ADMIN_JWT_SECRET: `${secret}-admin-jwt`,
    TRANSFER_TOKEN_SALT: `${secret}-transfer-token-salt`,
    JWT_SECRET: `${secret}-users-permissions-jwt`,
    FEEDBACK_CM_OWNER: OWNER,
  };
}

function runSeed(cmsRoot, environment, cleanup = false) {
  return new Promise((resolve, reject) => {
    const option = cleanup ? '--cleanup-local-feedback' : '--local-feedback';
    const child = spawn(process.execPath, ['scripts/seed-surveys.js', option], {
      cwd: cmsRoot,
      env: environment,
      shell: false,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let stdout = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.once('error', () => reject(new Error('Marker-owned local feedback seed could not start.')));
    child.once('close', (code) => {
      if (code !== 0) return reject(new Error('Marker-owned local feedback seed failed.'));
      try {
        resolve(JSON.parse(stdout.trim().split('\n').at(-1)));
      } catch {
        reject(new Error('Marker-owned local feedback seed returned no result.'));
      }
    });
  });
}

const RUNTIME = String.raw`
const { createStrapi } = require('@strapi/strapi');
const strapi = createStrapi({ appDir: process.cwd(), distDir: process.cwd(), autoReload: false, serveAdminPanel: false });
(async () => {
  try {
    await strapi.load();
    const owner = process.env.FEEDBACK_CM_OWNER;
    const phase = process.env.FEEDBACK_CM_PHASE;
    const email = owner + '-' + phase + '@local.invalid';
    const password = process.env.ADMIN_JWT_SECRET + '-synthetic-user';
    const role = await strapi.admin.services.role.getSuperAdmin();
    if (!role) throw new Error('Synthetic Admin Panel role is unavailable.');
    await strapi.admin.services.user.create({
      email,
      firstname: 'Synthetic',
      lastname: 'Regression',
      password,
      isActive: true,
      roles: [role.id],
    });
    await strapi.start();
    const port = strapi.server.httpServer.address().port;
    const origin = 'http://127.0.0.1:' + port;
    const login = await fetch(origin + '/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await login.json().catch(() => ({}));
    const cookies = login.headers.getSetCookie?.() ?? [];
    const sessionCookie = cookies.map((cookie) => cookie.split(';', 1)[0]).join('; ');
    const bearer = loginBody?.data?.token ?? loginBody?.token;
    if (!login.ok || (!sessionCookie && typeof bearer !== 'string')) {
      throw new Error('Synthetic Admin Panel login did not establish an authenticated session.');
    }
    const headers = {
      ...(sessionCookie ? { cookie: sessionCookie } : {}),
      ...(typeof bearer === 'string' ? { authorization: 'Bearer ' + bearer } : {}),
    };
    const versionSort = phase === 'populated' ? 'versionKey%3AASC' : 'createdAt%3ADESC';
    const submissionSort = phase === 'populated' ? 'receipt%3AASC' : 'createdAt%3ADESC';
    const versionQuery = '?page=1&pageSize=10&sort=' + versionSort + '&locale=pt';
    const submissionQuery = '?page=1&pageSize=10&sort=' + submissionSort + '&locale=pt';
    const versionResponse = await fetch(origin + '/content-manager/collection-types/api::survey-version.survey-version' + versionQuery, { headers });
    const submissionResponse = await fetch(origin + '/content-manager/collection-types/api::survey-submission.survey-submission' + submissionQuery, { headers });
    const versionBody = await versionResponse.json().catch(() => ({}));
    const submissionBody = await submissionResponse.json().catch(() => ({}));
    const otherResponse = phase === 'empty'
      ? await fetch(origin + '/content-manager/collection-types/api::survey-qr-point.survey-qr-point' + versionQuery, { headers })
      : null;
    const anonymousResponse = await fetch(origin + '/api/survey-submissions?populate%5Bratings%5D%5Bfields%5D%5B0%5D=ownerReceipt');
    const publicPrivateFields = {
      version: { status: null, protected: false },
      submission: { status: null, protected: false },
    };
    if (phase === 'populated') {
      const authenticatedRole = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
      });
      if (!authenticatedRole) throw new Error('Synthetic public REST role is unavailable.');
      for (const action of [
        'api::survey-version.survey-version.find',
        'api::survey-submission.survey-submission.find',
      ]) {
        await strapi.db.query('plugin::users-permissions.permission').create({
          data: { action, role: authenticatedRole.id },
        });
      }
      const publicUser = await strapi.plugin('users-permissions').service('user').add({
        username: owner + '-public',
        email: owner + '-public@local.invalid',
        password: password + '-public',
        provider: 'local',
        confirmed: true,
        blocked: false,
        role: authenticatedRole.id,
      });
      const publicJwt = await strapi.plugin('users-permissions').service('jwt').issue({ id: publicUser.id });
      const hasKey = (value, key) => Array.isArray(value)
        ? value.some((item) => hasKey(item, key))
        : typeof value === 'object' && value !== null
          ? Object.entries(value).some(([name, child]) => name === key || hasKey(child, key))
          : false;
      const inspectPublicPrivateField = async (endpoint, query, field) => {
        const response = await fetch(origin + endpoint + query, {
          headers: { authorization: 'Bearer ' + publicJwt },
        });
        const body = await response.json().catch(() => ({}));
        const rejected = response.status === 400 && [
          body?.error?.details?.key,
          body?.error?.details?.path,
          body?.error?.details?.errors?.[0]?.path,
        ].includes(field);
        return {
          status: response.status,
          protected: rejected || (response.status === 200 && !hasKey(body, field)),
        };
      };
      publicPrivateFields.version = await inspectPublicPrivateField(
        '/api/survey-versions',
        '?populate%5Baspects%5D%5Bfields%5D%5B0%5D=ownerVersionKey',
        'ownerVersionKey',
      );
      publicPrivateFields.submission = await inspectPublicPrivateField(
        '/api/survey-submissions',
        '?populate%5Bratings%5D%5Bfields%5D%5B0%5D=ownerReceipt',
        'ownerReceipt',
      );
    }
    const privateKey = (body) => {
      const candidates = [body?.error?.details?.key, body?.error?.details?.path, body?.error?.details?.errors?.[0]?.path];
      return candidates.find((value) => ['ownerVersionKey', 'ownerReceipt'].includes(value)) ?? null;
    };
    const rows = (body) => Array.isArray(body.results) ? body.results : [];
    const dataOf = (row) => row?.attributes ?? row;
    const structuralFields = new Set(['id', 'documentId', '__component', '__temp_key', 'status']);
    const rootFieldNames = (body) => [...new Set(rows(body).flatMap((row) => Object.keys(dataOf(row))))].sort();
    const componentFieldNames = (body, field) => [...new Set(rows(body).flatMap((row) => {
      const components = dataOf(row)[field];
      return Array.isArray(components) ? components.flatMap((component) => Object.keys(component?.attributes ?? component)) : [];
    }))].sort();
    const rootFieldsOnly = (body, uid) => rows(body).every((row) =>
      Object.keys(dataOf(row)).every((key) => structuralFields.has(key) || Object.hasOwn(strapi.contentTypes[uid].attributes, key)));
    const componentFieldsOnly = (body, field, componentUid) => rows(body).every((row) => {
      const components = dataOf(row)[field];
      return Array.isArray(components) && components.every((component) =>
        Object.keys(component?.attributes ?? component).every((key) => structuralFields.has(key) || Object.hasOwn(strapi.components[componentUid].attributes, key)));
    });
    const ownerVersionKey = strapi.components['survey.aspect-definition'].attributes.ownerVersionKey;
    const ownerReceipt = strapi.components['survey.aspect-rating'].attributes.ownerReceipt;
    process.stdout.write('TB113_CM_RESULT=' + JSON.stringify({
      phase,
      adminLoginStatus: login.status,
      version: {
        status: versionResponse.status,
        key: privateKey(versionBody),
        count: rows(versionBody).length,
        pagination: versionBody.pagination ?? null,
        hasRows: rows(versionBody).length > 0,
        rootFields: rootFieldNames(versionBody),
        componentFields: componentFieldNames(versionBody, 'aspects'),
        schemaFieldsOnly: rootFieldsOnly(versionBody, 'api::survey-version.survey-version') && componentFieldsOnly(versionBody, 'aspects', 'survey.aspect-definition'),
        containsPrivateOwner: rows(versionBody).some((row) => Array.isArray(dataOf(row).aspects) && dataOf(row).aspects.some((aspect) => Object.hasOwn(aspect?.attributes ?? aspect, 'ownerVersionKey'))),
        privateRequired: ownerVersionKey.required === true,
        privateFlag: ownerVersionKey.private === true,
      },
      submission: {
        status: submissionResponse.status,
        key: privateKey(submissionBody),
        count: rows(submissionBody).length,
        pagination: submissionBody.pagination ?? null,
        hasOwnedRows: rows(submissionBody).filter((row) => /^00000000-0113-4113-8113-00000000000[12]$/.test(dataOf(row).receipt)).length === 2,
        rootFields: rootFieldNames(submissionBody),
        componentFields: componentFieldNames(submissionBody, 'ratings'),
        schemaFieldsOnly: rootFieldsOnly(submissionBody, 'api::survey-submission.survey-submission') && componentFieldsOnly(submissionBody, 'ratings', 'survey.aspect-rating'),
        containsPrivateOwner: rows(submissionBody).some((row) => Array.isArray(dataOf(row).ratings) && dataOf(row).ratings.some((rating) => Object.hasOwn(rating?.attributes ?? rating, 'ownerReceipt'))),
        privateRequired: ownerReceipt.required === true,
        privateFlag: ownerReceipt.private === true,
      },
      otherContentTypeStatus: otherResponse?.status ?? null,
      anonymousPublicStatus: anonymousResponse.status,
      publicPrivateFields,
    }) + '\n');
  } catch (error) {
    let message = error instanceof Error ? error.message : 'unknown runtime error';
    for (const [name, value] of Object.entries(process.env)) {
      if (/(password|secret|salt)/i.test(name) && value) message = message.replaceAll(value, '<redacted>');
    }
    process.stderr.write(JSON.stringify({ phase: 'runtime', errorType: error?.name ?? 'Error', message }) + '\n');
    process.exitCode = 1;
  } finally {
    await strapi.destroy().catch(() => {});
  }
})().catch(() => { process.stderr.write('Isolated Strapi runtime failed.\n'); process.exitCode = 1; });
`;

function runRuntime(cmsRoot, environment, phase) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', RUNTIME], {
      cwd: cmsRoot,
      env: { ...environment, FEEDBACK_CM_PHASE: phase },
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => {
      if (code !== 0) return reject(new Error(`Isolated CMS runtime exited ${code}: ${stderr.trim()}`));
      try {
        const resultLine = stdout.split('\n').find((line) => line.startsWith('TB113_CM_RESULT='));
        if (!resultLine) throw new Error('result marker missing');
        resolve(JSON.parse(resultLine.slice('TB113_CM_RESULT='.length)));
      } catch {
        reject(new Error('Isolated CMS runtime returned no sanitized HTTP result.'));
      }
    });
  });
}

test('Content Manager lists empty and marker-seeded nonlocalized survey collections', async (t) => {
  const expectation = process.env.FEEDBACK_CM_EXPECT;
  assert.ok(['red', 'green'].includes(expectation), 'set FEEDBACK_CM_EXPECT to red or green');
  const stackRoot = await mkdtemp(path.join(os.tmpdir(), 'tb113-cm-'));
  let composeAttempted = false;
  let seedAttempted = false;
  let cmsRoot;
  let databasePort;
  try {
    await assertNoOwnedResources();
    await mkdir(path.join(stackRoot, 'home'), { recursive: true, mode: 0o700 });
    cmsRoot = await createIsolatedCmsRoot(stackRoot);
    if (expectation === 'red') {
      await unlink(path.join(cmsRoot, 'src/extensions/content-manager/strapi-server.js'));
    }
    composeAttempted = true;
    await executeFixed(DOCKER_EXECUTABLE, compose('up', '--detach', '--wait'));
    const portOutput = await executeFixed(DOCKER_EXECUTABLE, compose('port', 'postgres', '5432'));
    assert.match(portOutput.stdout.trim(), /^127\.0\.0\.1:/);
    databasePort = Number(portOutput.stdout.trim().split(':').at(-1));
    assert.ok(Number.isSafeInteger(databasePort) && databasePort > 0 && databasePort <= 65_535);

    const empty = await runRuntime(cmsRoot, runtimeEnvironment(stackRoot, databasePort), 'empty');
    assert.equal(empty.adminLoginStatus, 200);
    assert.equal(empty.phase, 'empty');
    assert.equal(empty.otherContentTypeStatus, 200);
    assert.ok([401, 403].includes(empty.anonymousPublicStatus));
    if (expectation === 'red') {
      assert.equal(empty.version.status, 400);
      assert.equal(empty.version.key, 'ownerVersionKey');
      assert.equal(empty.submission.status, 400);
      assert.equal(empty.submission.key, 'ownerReceipt');
    } else {
      assert.equal(empty.version.status, 200);
      assert.equal(empty.version.count, 0);
      assert.ok(empty.version.pagination);
      assert.equal(empty.submission.status, 200);
      assert.equal(empty.submission.count, 0);
      assert.ok(empty.submission.pagination);
    }

    seedAttempted = true;
    const seeded = await runSeed(cmsRoot, runtimeEnvironment(stackRoot, databasePort, 'development'));
    assert.deepEqual(seeded, { created: true, count: 4 });
    const populated = await runRuntime(cmsRoot, runtimeEnvironment(stackRoot, databasePort), 'populated');
    assert.equal(populated.adminLoginStatus, 200);
    assert.equal(populated.phase, 'populated');
    assert.equal(populated.version.privateRequired, true);
    assert.equal(populated.version.privateFlag, true);
    assert.equal(populated.submission.privateRequired, true);
    assert.equal(populated.submission.privateFlag, true);
    t.diagnostic(JSON.stringify({
      redOrGreen: expectation,
      seeded: {
        version: { status: populated.version.status, count: populated.version.count, rootFields: populated.version.rootFields, componentFields: populated.version.componentFields, schemaFieldsOnly: populated.version.schemaFieldsOnly },
        submission: { status: populated.submission.status, count: populated.submission.count, rootFields: populated.submission.rootFields, componentFields: populated.submission.componentFields, schemaFieldsOnly: populated.submission.schemaFieldsOnly },
        publicPrivateFields: populated.publicPrivateFields,
      },
    }));
    if (expectation === 'red') {
      assert.equal(populated.version.status, 400);
      assert.equal(populated.version.key, 'ownerVersionKey');
      assert.equal(populated.submission.status, 400);
      assert.equal(populated.submission.key, 'ownerReceipt');
    } else {
      assert.equal(populated.version.status, 200);
      assert.ok(populated.version.count > 0);
      assert.equal(populated.version.hasRows, true);
      assert.equal(populated.version.containsPrivateOwner, true);
      assert.equal(populated.version.schemaFieldsOnly, true);
      assert.ok(populated.version.pagination);
      assert.equal(populated.submission.status, 200);
      assert.equal(populated.submission.count, 2);
      assert.equal(populated.submission.hasOwnedRows, true);
      assert.equal(populated.submission.containsPrivateOwner, true);
      assert.equal(populated.submission.schemaFieldsOnly, true);
      assert.ok(populated.submission.pagination);
      assert.ok([200, 400].includes(populated.publicPrivateFields.version.status));
      assert.equal(populated.publicPrivateFields.version.protected, true);
      assert.ok([200, 400].includes(populated.publicPrivateFields.submission.status));
      assert.equal(populated.publicPrivateFields.submission.protected, true);
    }
  } finally {
    const cleanupFailures = [];
    if (seedAttempted && cmsRoot && Number.isSafeInteger(databasePort)) {
      try {
        const cleanup = await runSeed(cmsRoot, runtimeEnvironment(stackRoot, databasePort, 'development'), true);
        if (!Number.isSafeInteger(cleanup.count) || cleanup.count < 0 || cleanup.count > 4 || cleanup.deleted !== (cleanup.count > 0)) {
          cleanupFailures.push('marker-owned survey seed cleanup returned an invalid result');
        }
      } catch {
        cleanupFailures.push('marker-owned survey rows could not be cleaned');
      }
    }
    if (composeAttempted) {
      try {
        await executeFixed(DOCKER_EXECUTABLE, compose('down', '--volumes', '--remove-orphans', '--timeout=5'));
      } catch {
        cleanupFailures.push('owned Docker resources could not be stopped');
      }
      try {
        await assertNoOwnedResources();
      } catch {
        cleanupFailures.push('owned Docker resources remain');
      }
    }
    try {
      await rm(stackRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      assert.equal(require('node:fs').existsSync(stackRoot), false);
    } catch {
      cleanupFailures.push('temporary project did not clean up');
    }
    assert.deepEqual(cleanupFailures, [], 'isolated harness cleanup failed');
  }
});
