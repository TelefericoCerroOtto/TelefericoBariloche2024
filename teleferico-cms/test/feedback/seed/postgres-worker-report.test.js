'use strict';

const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { createServer } = require('node:http');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { promisify } = require('node:util');
const { deriveLocalEvidenceKey } = require('../../../../packages/tb113-runtime-contracts/src/local-evidence-key.cjs');
const test = require('node:test');

const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require('../harness/postgres-harness');
const { createLocalFeedbackSeeder, createStrapiLocalFeedbackStore, LOCAL_FEEDBACK_MARKER } = require('../../../scripts/seed-surveys');

const execFileAsync = promisify(require('node:child_process').execFile);
const OWNER = 'tb113_seed_worker_report';
const CMS_UID = 'api::survey-report-generation.survey-report-generation';
const REPORT_UID = 'api::survey-report.survey-report';
const WORKER_PACKAGE = path.resolve(__dirname, '../../../../services/survey-report-worker');
const WORKER_HARNESS = path.join(WORKER_PACKAGE, 'test/local-report-worker-harness.mjs');
const REPORT_RUN_ID = '00000000-0113-4113-8113-000000000099';
const PROJECT_ID = 'teleferico-bariloche-2024';
const MODEL = 'gemini-3.8-flash';
const SECRET_VERSION = `projects/${PROJECT_ID}/secrets/tb113-local-test-evidence/versions/1`;
const EVIDENCE_KEY_ID = 'tb113-local-test-evidence-v1';
const SOURCE_ACTION = 'api::survey-report-generation.survey-report-generation.workerSourceRead';
const WORKER_ACTIONS = {
  workerClaim: 'api::survey-report-generation.survey-report-generation.workerClaim',
  workerSnapshot: 'api::survey-report-generation.survey-report-generation.workerSnapshot',
  workerCheckpoint: 'api::survey-report-generation.survey-report-generation.workerCheckpoint',
  workerComplete: 'api::survey-report-generation.survey-report-generation.workerComplete',
  workerFail: 'api::survey-report-generation.survey-report-generation.workerFail',
};

function composeArguments(...operation) {
  return ['compose', '--file', COMPOSE_FILE, '--project-name', OWNER, ...operation];
}

async function compose(...operation) {
  return executeFixed(DOCKER_EXECUTABLE, composeArguments(...operation));
}

async function reservePortPair() {
  const first = createServer();
  await new Promise((resolveListen, reject) => {
    first.once('error', reject);
    first.listen(0, '127.0.0.1', resolveListen);
  });
  const port = first.address().port;
  const second = createServer();
  try {
    await new Promise((resolveListen, reject) => {
      second.once('error', reject);
      second.listen(port + 1, '127.0.0.1', resolveListen);
    });
  } finally {
    await Promise.all([
      new Promise((resolveClose) => first.close(resolveClose)),
      new Promise((resolveClose) => second.close(resolveClose)),
    ]);
  }
  return port;
}

async function waitForReady(child, output) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Strapi exited before readiness: ${output.value}`);
    const ready = await new Promise((resolveReady) => {
      const request = require('node:http').get('http://127.0.0.1:1337/admin/init', (response) => {
        response.resume();
        resolveReady(response.statusCode >= 200 && response.statusCode < 500);
      });
      request.once('error', () => resolveReady(false));
      request.setTimeout(500, () => { request.destroy(); resolveReady(false); });
    });
    if (ready) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 100));
  }
  throw new Error(`Strapi did not become ready: ${output.value}`);
}

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

function modelConfig() {
  return {
    version: 'survey-model-config.v1',
    evidenceKeyId: EVIDENCE_KEY_ID,
    provider: 'vertex-ai',
    vertexProjectId: PROJECT_ID,
    vertexLocation: 'us',
    vertexApiEndpoint: 'aiplatform.us.rep.googleapis.com',
    model: MODEL,
    temperature: 0,
    reasoning: 'LOW',
    grounding: false,
    promptVersion: 'prompt.v1',
    mapSchemaVersion: 'survey-map.v1',
    analysisSchemaVersion: 'survey-analysis.v1',
    redactionVersion: 'redaction.v1',
    validatorVersion: 'validator.v1',
    chunkVersion: 'chunk.v1',
    verifiedInputTokenLimit: 8192,
    map: { targetMin: 600, targetMax: 1200, hardMax: 4000 },
    directReduce: { targetMin: 1800, targetMax: 3000, hardMax: 8000 },
    safetyHeadroomTokens: 2048,
    sourceRevision: 'feedback-admin.v1',
  };
}

function pricingSnapshot() {
  return {
    version: 'survey-pricing.v1',
    currency: 'USD',
    units: [{ sku: MODEL, inputMicrosPerMillion: 0, outputMicrosPerMillion: 0 }],
  };
}

async function createScopedToken(strapi, name, permissions) {
  const token = await strapi.service('admin::api-token-content-api').create({
    name,
    description: 'Disposable scoped token for isolated local report integration',
    type: 'custom',
    permissions,
    lifespan: null,
  });
  assert.deepEqual([...token.permissions].sort(), [...permissions].sort());
  return token.accessKey;
}

test('configured local worker processes seeded Strapi data over HTTP and stores a real private PDF', async (t) => {
  let strapi;
  let worker;
  let workerOutput = '';
  let localStorageRoot;
  const previousEnvironment = process.env;
  const secret = `tb113-worker-report-${randomUUID()}`;
  const cmsPort = 1337;
  let databasePort;
  try {
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
    await compose('up', '--detach', '--wait');
    databasePort = Number((await compose('port', 'postgres', '5432')).stdout.trim().split(':').at(-1));
    const generationConfig = {
      contractVersion: 'survey-approved-generation-config.v1',
      sourceRevision: 'feedback-admin.v1',
      evidenceKeyId: EVIDENCE_KEY_ID,
      modelConfig: modelConfig(),
      pricingSnapshot: pricingSnapshot(),
    };
    const environment = {
      PATH: process.env.PATH ?? '',
      HOME: '/tmp/opencode',
      NODE_ENV: 'development',
      ENV_PATH: '/dev/null',
      HOST: '127.0.0.1',
      PORT: String(cmsPort),
      DATABASE_CLIENT: 'postgres',
      DATABASE_HOST: '127.0.0.1',
      DATABASE_PORT: String(databasePort),
      DATABASE_NAME: 'tb113_test_feedback',
      DATABASE_USERNAME: 'tb113_test_runner',
      DATABASE_PASSWORD: 'tb113_test_local_only',
      DATABASE_SSL: 'false',
      DATABASE_POOL_MIN: '0',
      DATABASE_POOL_MAX: '10',
      APP_KEYS: `${secret}-app-1,${secret}-app-2`,
      API_TOKEN_SALT: `${secret}-api`,
      ADMIN_JWT_SECRET: `${secret}-admin`,
      TRANSFER_TOKEN_SALT: `${secret}-transfer`,
      JWT_SECRET: `${secret}-jwt`,
      BUILD_STRAPI_BASE_URL: `http://127.0.0.1:${cmsPort}`,
      FEEDBACK_CMS_ALLOWED_ORIGIN: `http://127.0.0.1:${cmsPort}`,
      FEEDBACK_WORKER_EVIDENCE_KEY: SECRET_VERSION,
      FEEDBACK_VERTEX_PROJECT_ID: PROJECT_ID,
    };
    process.env = { ...environment };
    const { createStrapi } = require('@strapi/strapi');
    strapi = createStrapi({ autoReload: false, serveAdminPanel: false });
    await strapi.load();
    strapi.config.set('admin.secrets.encryptionKey', `${secret}-encryption`);
    await createLocalFeedbackSeeder(createStrapiLocalFeedbackStore(strapi)).apply();

    let cmsCountCalls = 0;
    strapi.config.set('feedback.workerCountTokensProvider', async (request) => {
      cmsCountCalls += 1;
      assert.equal(request.modelConfig.model, MODEL);
      return { instructions: 1, schema: 1, metrics: 1, comments: 1 };
    });
    const cmsDevelopmentEvidenceKeyProvider = strapi.config.get('feedback.workerEvidenceKeyProvider');
    let cmsEvidenceCalls = 0;
    strapi.config.set('feedback.workerEvidenceKeyProvider', async (keyId) => {
      cmsEvidenceCalls += 1;
      return cmsDevelopmentEvidenceKeyProvider(keyId);
    });

    const appToken = await createScopedToken(strapi, 'tb113-worker-report-app', [
      'api::survey-report-generation.survey-report-generation.feedbackAdminRead',
      SOURCE_ACTION,
      'api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata',
    ]);
    const workerToken = await createScopedToken(
      strapi,
      'tb113-worker-report-worker',
      Object.values(WORKER_ACTIONS),
    );
    await strapi.start();

    const appReadResponse = await fetch(`http://127.0.0.1:${cmsPort}/api/tb113/admin/feedback/read`, {
      method: 'POST',
      headers: { authorization: `Bearer ${appToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.notEqual(appReadResponse.status, 401, 'app token authenticates its admin-read action');
    assert.notEqual(appReadResponse.status, 403, 'app token authenticates its admin-read action');
    const appCannotClaim = await fetch(`http://127.0.0.1:${cmsPort}/api/tb113/worker/generations/${REPORT_RUN_ID}/claim`, {
      method: 'POST',
      headers: { authorization: `Bearer ${appToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ commandVersion: 'survey-report-command.v1' }),
    });
    assert.equal(appCannotClaim.status, 403, 'app token is denied worker claim');
    const workerCannotAdminRead = await fetch(`http://127.0.0.1:${cmsPort}/api/tb113/admin/feedback/read`, {
      method: 'POST',
      headers: { authorization: `Bearer ${workerToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(workerCannotAdminRead.status, 403, 'worker token is denied app admin-read');

    const acceptedAtGte = '2026-09-26T00:00:00.000Z';
    const acceptedAtLte = '2026-09-29T23:59:59.999Z';
    const cutoff = acceptedAtLte;
    const sourceResponse = await fetch(`http://127.0.0.1:${cmsPort}/api/tb113/worker/report-source`, {
      method: 'POST',
      headers: { authorization: `Bearer ${appToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        contractVersion: 'survey-generation-source.v1',
        resource: 'submissions',
        acceptedAtGte,
        acceptedAtLte,
        dataCutoffAt: cutoff,
        cursor: null,
        pageSize: 25,
      }),
    });
    const sourcePage = await sourceResponse.json();
    assert.equal(sourceResponse.status, 200, JSON.stringify(sourcePage));
    assert.equal(sourcePage.total, 2);
    assert.ok(sourcePage.items.every((item) => item.qrPoint.pointKey === LOCAL_FEEDBACK_MARKER));

    const snapshotInput = {
      sourceRevision: generationConfig.sourceRevision,
      createdAt: cutoff,
      dataCutoffAt: cutoff,
      range: { from: '2026-09-28', to: '2026-09-29' },
      filters: { pointKey: null, versionKey: null },
      submissions: sourcePage.items.map((item) => ({
        recordId: item.documentId,
        receipt: item.receipt,
        acceptedAt: item.acceptedAt,
        source: item.source,
        versionKey: item.surveyVersion.versionKey,
        pointKey: item.qrPoint.pointKey,
        overallRating: item.overallRating,
        locale: item.locale,
        commentText: item.comment,
        payloadDigest: item.payloadDigest,
        aspects: item.ratings.map((rating) => ({
          aspectKey: rating.aspectKey,
          label: rating.label,
          sortOrder: rating.sortOrder,
          sentiment: rating.rating,
          ...(Object.hasOwn(rating, 'customText') ? { customText: rating.customText } : {}),
        })),
      })),
      definitions: [{ aspectKey: 'views', sortOrder: 1 }, { aspectKey: 'other', sortOrder: 13 }],
      points: [{ pointKey: LOCAL_FEEDBACK_MARKER, displayName: 'Synthetic local feedback point', sortOrder: 999 }],
    };
    const snapshotProcess = spawnSync(process.execPath, [
      '--conditions=react-server',
      WORKER_HARNESS,
      '--snapshot',
      Buffer.from(JSON.stringify(snapshotInput)).toString('base64url'),
    ], {
      cwd: WORKER_PACKAGE,
      env: { PATH: environment.PATH, HOME: environment.HOME },
      encoding: 'utf8',
    });
    assert.equal(snapshotProcess.status, 0, snapshotProcess.stderr);
    const snapshotEnvelope = JSON.parse(snapshotProcess.stdout.trim());
    const snapshotDigest = snapshotEnvelope.digestHex;
    const config = modelConfig();
    const pricing = pricingSnapshot();
    await strapi.db.query(CMS_UID).create({
      data: {
        reportRunId: REPORT_RUN_ID,
        periodStart: snapshotInput.range.from,
        periodEnd: snapshotInput.range.to,
        dataCutoffAt: cutoff,
        overlapOverrideAccepted: false,
        snapshotDigest,
        sourceRevision: generationConfig.sourceRevision,
        snapshotJson: snapshotEnvelope.payload,
        checkpointsJson: {
          version: 'survey-checkpoints.v1',
          snapshotDigest,
          route: 'undecided',
          chunkCount: null,
          entries: [],
        },
        modelConfigJson: config,
        usageJson: {},
        pricingSnapshotJson: pricing,
        status: 'queued',
        stateVersion: 1,
        attemptCount: 0,
        dispatchAttemptCount: 0,
        cumulativeCostMicros: '0',
      },
    });

    const workerPort = await reservePortPair();
    const workerUrl = `http://127.0.0.1:${workerPort}/internal/v1/report-runs:execute`;
    const queuePath = 'projects/teleferico-bariloche-2024/locations/southamerica-east1/queues/feedback-reports';
    workerOutput = await mkdtemp(path.join(tmpdir(), 'tb113-worker-report-'));
    const workerEnvironment = {
      ...environment,
      FEEDBACK_WORKER_URL: workerUrl,
      FEEDBACK_TASK_QUEUE_PATH: queuePath,
      FEEDBACK_WORKER_CMS_TOKEN: workerToken,
    };
    const workerKeyProcess = spawnSync(process.execPath, [
      '--conditions=react-server',
      WORKER_HARNESS,
      '--evidence-key-fingerprint',
      workerOutput,
    ], {
      cwd: WORKER_PACKAGE,
      env: workerEnvironment,
      encoding: 'utf8',
    });
    assert.equal(workerKeyProcess.status, 0, workerKeyProcess.stderr);
    const cmsEvidenceKey = await cmsDevelopmentEvidenceKeyProvider(EVIDENCE_KEY_ID);
    const cmsEvidenceFingerprint = createHash('sha256').update(cmsEvidenceKey).digest('hex');
    assert.equal(workerKeyProcess.stdout.trim(), cmsEvidenceFingerprint);
    worker = spawn(process.execPath, [
      '--conditions=react-server',
      WORKER_HARNESS,
      workerOutput,
    ], {
      cwd: WORKER_PACKAGE,
      env: workerEnvironment,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const output = { value: '' };
    worker.stdout.setEncoding('utf8');
    worker.stderr.setEncoding('utf8');
    worker.stdout.on('data', (chunk) => { output.value += chunk; });
    worker.stderr.on('data', (chunk) => { output.value += chunk; });
    const readyDeadline = Date.now() + 15_000;
    while (!output.value.includes('ISOLATED_LOCAL_REPORT_WORKER_READY') && Date.now() < readyDeadline) {
      if (worker.exitCode !== null) throw new Error(`Worker failed to start: ${output.value}`);
      await new Promise((resolveWait) => setTimeout(resolveWait, 50));
    }
    assert.match(output.value, /ISOLATED_LOCAL_REPORT_WORKER_READY/);

    const taskName = `tb113-report-${REPORT_RUN_ID.replaceAll('-', '')}`;
    const taskPath = `/_local-tasks/v2/${queuePath}/tasks`;
    const taskResponse = await fetch(`http://127.0.0.1:${workerPort + 1}${taskPath}`, {
      method: 'POST',
      headers: { authorization: 'Bearer tb113-local-task-api-v1', 'content-type': 'application/json' },
      body: JSON.stringify({ task: {
        name: `${queuePath}/tasks/${taskName}`,
        httpRequest: {
          httpMethod: 'POST',
          url: workerUrl,
          headers: { 'Content-Type': 'application/json' },
          body: Buffer.from(JSON.stringify({ commandVersion: 'survey-report-command.v1', reportRunId: REPORT_RUN_ID })).toString('base64'),
          oidcToken: { serviceAccountEmail: 'tb113-local-task-invoker', audience: `http://127.0.0.1:${workerPort}` },
        },
      } }),
    });
    const taskBody = await taskResponse.json();
    assert.equal(taskResponse.status, 200, JSON.stringify(taskBody));
    assert.deepEqual(taskBody, { name: `${queuePath}/tasks/${taskName}` });

    const deadline = Date.now() + 20_000;
    let generation;
    while (Date.now() < deadline) {
      generation = await strapi.db.query(CMS_UID).findOne({ where: { reportRunId: REPORT_RUN_ID } });
      if (generation?.status === 'succeeded' || generation?.status === 'failed') break;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    assert.equal(generation?.status, 'succeeded', JSON.stringify({ status: generation?.status, code: generation?.failureCode }));
    const report = await strapi.db.query(REPORT_UID).findOne({ where: { generationRunId: REPORT_RUN_ID } });
    assert.ok(report);
    assert.equal(report.mimeType, 'application/pdf');
    const objectPath = path.join(workerOutput, ...report.objectKey.split('/'));
    const pdf = await readFile(objectPath);
    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.match(pdf.toString('latin1'), /%%EOF\s*$/);
    assert.equal(createHash('sha256').update(pdf).digest('hex'), report.artifactSha256);
    const downloadMetadata = require('../../../src/api/survey-report-generation/services/private-report-download-metadata')
      .createPrivateReportDownloadMetadataReader(strapi);
    assert.equal((await downloadMetadata.read(report.reportId)).sha256, report.artifactSha256);
    assert.ok(cmsCountCalls > 0, 'CMS independently recounted worker checkpoint inputs');
    assert.ok(cmsEvidenceCalls > 0, 'CMS independently checked the evidence-key ID');
  } finally {
    if (worker && worker.exitCode === null) {
      worker.kill('SIGTERM');
      await Promise.race([onceExit(worker), new Promise((resolveWait) => setTimeout(resolveWait, 5000))]);
    }
    if (strapi) await strapi.destroy();
    process.env = previousEnvironment;
    if (workerOutput) await rm(workerOutput, { recursive: true, force: true });
    await compose('down', '--volumes', '--remove-orphans', '--timeout=5');
  }
  const label = `label=com.docker.compose.project=${OWNER}`;
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['ps', '-aq', '--filter', label])).stdout.trim(), '');
  assert.equal((await executeFixed(DOCKER_EXECUTABLE, ['volume', 'ls', '-q', '--filter', label])).stdout.trim(), '');
});

function onceExit(child) {
  return new Promise((resolveExit) => child.once('exit', resolveExit));
}
