const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  executeFixed,
} = require("./harness/postgres-harness");

const OWNER = "tb113_test_admin_commands";
const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000001";
const DISPATCH_RUN_ID = "00000000-0000-4000-8000-000000000002";
const WORKER_RUN_ID = "00000000-0000-4000-8000-000000000003";
const WORKER_SNAPSHOT_RUN_ID = "00000000-0000-4000-8000-000000000004";
const WORKER_QUEUED_RUN_ID = "00000000-0000-4000-8000-000000000005";
const WORKER_VERSION_RUN_ID = "00000000-0000-4000-8000-000000000006";
const WORKER_DIGEST_RUN_ID = "00000000-0000-4000-8000-000000000007";
const WORKER_CHECKPOINT_RUN_ID = "00000000-0000-4000-8000-000000000008";
const WORKER_FAIL_RUN_ID = "00000000-0000-4000-8000-000000000009";
const compose = (...args) =>
  executeFixed(DOCKER_EXECUTABLE, [
    "compose",
    "--file",
    COMPOSE_FILE,
    "--project-name",
    OWNER,
    ...args,
  ]);

function postChunked(url, headers, body) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: "POST", headers }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { text += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(text) }));
    });
    request.once("error", reject);
    request.write(body);
    request.end();
  });
}

function generationData(reportRunId = REPORT_RUN_ID, periodStart = "2026-08-01", periodEnd = "2026-08-20") {
  return {
    reportRunId,
    periodStart,
    periodEnd,
    dataCutoffAt: "2026-08-21T00:00:00.000Z",
    snapshotDigest: "0".repeat(64),
    sourceRevision: "feedback-admin.v1",
    snapshotJson: {},
    checkpointsJson: {},
    modelConfigJson: {},
    usageJson: {},
    pricingSnapshotJson: {},
  };
}

function canonicalizeJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalizeJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

async function grant(strapi, roleId, action) {
  await strapi.db.query("plugin::users-permissions.permission").create({
    data: { action, role: roleId },
  });
}

async function captureQueries(strapi, operation) {
  const queries = [];
  const listener = ({ sql }) => queries.push(sql);
  strapi.db.connection.on("query", listener);
  try {
    return { result: await operation(), queries };
  } finally {
    strapi.db.connection.off("query", listener);
  }
}

function generationLockQuery(queries) {
  const query = queries.find((sql) => /select\b/i.test(sql) && /survey_report_generations/i.test(sql) && /for update/i.test(sql));
  assert.ok(query, "expected the operation to lock its generation row");
  return query;
}

test("native role authorization creates only through the core generation endpoint", async () => {
  let strapi;
  const previous = { ...process.env };
  try {
    await compose("down", "--volumes", "--remove-orphans", "--timeout=5");
    await compose("up", "--detach", "--wait");
    const databasePort = (await compose("port", "postgres", "5432")).stdout
      .trim()
      .split(":")
      .at(-1);
    const secret = "tb113-admin-command-local-only";
    Object.assign(process.env, {
      NODE_ENV: "test",
      ENV_PATH: "/dev/null",
      DATABASE_CLIENT: "postgres",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_PORT: databasePort,
      DATABASE_NAME: "tb113_test_feedback",
      DATABASE_USERNAME: "tb113_test_runner",
      DATABASE_PASSWORD: "tb113_test_local_only",
      DATABASE_SSL: "false",
      APP_KEYS: `${secret}-1,${secret}-2`,
      API_TOKEN_SALT: `${secret}-api`,
      ADMIN_JWT_SECRET: `${secret}-admin`,
      TRANSFER_TOKEN_SALT: `${secret}-transfer`,
      JWT_SECRET: `${secret}-jwt`,
      PORT: "0",
    });
    const { createStrapi } = require("@strapi/strapi");
    strapi = createStrapi({ autoReload: false, serveAdminPanel: false });
    await strapi.load();
    const role = await strapi.db
      .query("plugin::users-permissions.role")
      .findOne({ where: { type: "authenticated" } });
    await grant(
      strapi,
      role.id,
      "api::survey-report-generation.survey-report-generation.create",
    );
    await grant(
      strapi,
      role.id,
      "api::survey-report-generation.survey-report-generation.find",
    );
    await grant(strapi, role.id, "api::survey-submission.survey-submission.find");
    await grant(strapi, role.id, "api::survey-report.survey-report.find");
    const user = await strapi.plugin("users-permissions").service("user").add({
      username: "tb113-admin-command-user",
      email: "tb113-admin-command-user@local.invalid",
      password: "tb113-admin-command-password",
      provider: "local",
      confirmed: true,
      blocked: false,
      role: role.id,
    });
    const jwt = strapi.plugin("users-permissions").service("jwt").issue({
      id: user.id,
    });
    strapi.config.set("admin.secrets.encryptionKey", "tb113-admin-command-synthetic-encryption");
    const contentApiTokens = strapi.service("admin::api-token-content-api");
    const generationUid = "api::survey-report-generation.survey-report-generation";
    const workerActions = {
      claim: `${generationUid}.workerClaim`,
      snapshot: `${generationUid}.workerSnapshot`,
      checkpoint: `${generationUid}.workerCheckpoint`,
      fail: `${generationUid}.workerFail`,
    };
    const workerTokens = Object.fromEntries(await Promise.all(Object.entries(workerActions).map(async ([name, action]) => {
      const token = await contentApiTokens.create({
        name: `tb113-admin-command-worker-${name}`,
        description: `Disposable ${name} authorization test token`,
        type: "custom",
        permissions: [action],
        lifespan: null,
      });
      assert.deepEqual(token.permissions, [action]);
      return [name, token.accessKey];
    })));
    await strapi.start();
    const port = strapi.server.httpServer.address().port;
    const endpoint = `http://127.0.0.1:${port}/api/survey-report-generations`;
    const unauthenticated = await fetch(endpoint);
    assert.ok([401, 403].includes(unauthenticated.status));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: generationData() }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.data.reportRunId, REPORT_RUN_ID);
    assert.equal(body.data.requestedBy ?? null, null);

    const read = await fetch(
      `${endpoint}?filters[reportRunId][$eq]=${REPORT_RUN_ID}`,
      { headers: { authorization: `Bearer ${jwt}` } },
    );
    assert.equal(read.status, 200);
    const readBody = await read.json();
    assert.equal(readBody.data.length, 1);
    assert.equal(readBody.data[0].reportRunId, REPORT_RUN_ID);
    for (const nativeReadPath of ["/api/survey-submissions", "/api/survey-reports"]) {
      const nativeRead = await fetch(`http://127.0.0.1:${port}${nativeReadPath}`, {
        headers: { authorization: `Bearer ${jwt}` },
      });
      assert.equal(nativeRead.status, 200, nativeReadPath);
    }

    const dispatchFailureUrl = `http://127.0.0.1:${port}/api/tb113/admin/generations/${REPORT_RUN_ID}/dispatch-failure`;
    const dispatchFailure = {
      contractVersion: "survey-dispatch-command.v1",
      expectedStateVersion: 1,
      taskName: `tb113-report-${REPORT_RUN_ID.replaceAll("-", "")}`,
      dispatchAttemptCount: 3,
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
    };
    const anonymousFailure = await fetch(dispatchFailureUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dispatchFailure),
    });
    assert.ok([401, 403].includes(anonymousFailure.status));
    const forbidden = await fetch(dispatchFailureUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(dispatchFailure),
    });
    assert.equal(forbidden.status, 403);

    await grant(strapi, role.id, "api::survey-report-generation.survey-report-generation.dispatchFailure");
    const oversizedBody = `${JSON.stringify(dispatchFailure)}${" ".repeat(68_197)}`;
    const oversized = await fetch(dispatchFailureUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: oversizedBody,
    });
    assert.equal(oversized.status, 413);
    assert.equal((await oversized.json()).error.code, "PAYLOAD_TOO_LARGE");

    const chunked = await postChunked(
      dispatchFailureUrl,
      { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      oversizedBody,
    );
    assert.equal(chunked.status, 413);
    assert.equal(chunked.body.error.code, "PAYLOAD_TOO_LARGE");
    const stillQueued = await fetch(
      `${endpoint}?filters[reportRunId][$eq]=${REPORT_RUN_ID}`,
      { headers: { authorization: `Bearer ${jwt}` } },
    );
    assert.equal((await stillQueued.json()).data[0].status, "queued");

    const sendDispatchFailure = () => fetch(dispatchFailureUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(dispatchFailure),
    });
    const concurrent = await Promise.all([sendDispatchFailure(), sendDispatchFailure()]);
    assert.deepEqual(concurrent.map(({ status }) => status), [200, 200]);
    const results = await Promise.all(concurrent.map((response) => response.json()));
    assert.deepEqual(results.map(({ replayed }) => replayed).sort(), [false, true]);
    assert.deepEqual(results.find(({ replayed }) => !replayed), {
      contractVersion: "survey-dispatch-command.v1",
      reportRunId: REPORT_RUN_ID,
      stateVersion: 2,
      status: "failed",
      failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
      replayed: false,
    });
    const versionConflict = await fetch(dispatchFailureUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ ...dispatchFailure, expectedStateVersion: 3 }),
    });
    assert.equal(versionConflict.status, 409);
    assert.equal((await versionConflict.json()).error.code, "STATE_VERSION_CONFLICT");

    const dispatchGeneration = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ data: generationData(DISPATCH_RUN_ID, "2026-09-01", "2026-09-20") }),
    });
    assert.equal(dispatchGeneration.status, 201);
    const dispatchTaskName = `tb113-report-${DISPATCH_RUN_ID.replaceAll("-", "")}`;
    const dispatchStateUrl = `http://127.0.0.1:${port}/api/tb113/admin/generations/${DISPATCH_RUN_ID}/dispatch-state`;
    const reserveCommand = {
      contractVersion: "survey-dispatch-state.v1",
      action: "reserve",
      expectedStateVersion: 1,
      taskName: dispatchTaskName,
    };
    const anonymousReserve = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(reserveCommand),
    });
    assert.ok([401, 403].includes(anonymousReserve.status));
    const ungrantedReserve = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(reserveCommand),
    });
    assert.equal(ungrantedReserve.status, 403);
    await grant(strapi, role.id, "api::survey-report-generation.survey-report-generation.dispatchState");

    const oversizedStateBody = `${JSON.stringify(reserveCommand)}${" ".repeat(68_197)}`;
    const oversizedState = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: oversizedStateBody,
    });
    assert.equal(oversizedState.status, 413);
    const chunkedState = await postChunked(
      dispatchStateUrl,
      { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      oversizedStateBody,
    );
    assert.equal(chunkedState.status, 413);

    const sendReserve = () => fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(reserveCommand),
    });
    const capturedReservations = await captureQueries(strapi, () => Promise.all([sendReserve(), sendReserve()]));
    const reservations = capturedReservations.result;
    assert.deepEqual(reservations.map(({ status }) => status), [200, 200]);
    assert.doesNotMatch(generationLockQuery(capturedReservations.queries), /"snapshot_json"/i);
    const reservationResults = await Promise.all(reservations.map((response) => response.json()));
    reservationResults.sort((left, right) => Number(left.replayed) - Number(right.replayed));
    assert.deepEqual(reservationResults, [
      {
        contractVersion: "survey-dispatch-state.v1",
        reportRunId: DISPATCH_RUN_ID,
        taskName: dispatchTaskName,
        stateVersion: 2,
        status: "queued",
        dispatchState: "reserved",
        dispatchAttemptCount: 0,
        failureCode: null,
        replayed: false,
      },
      {
        contractVersion: "survey-dispatch-state.v1",
        reportRunId: DISPATCH_RUN_ID,
        taskName: dispatchTaskName,
        stateVersion: 2,
        status: "queued",
        dispatchState: "reserved",
        dispatchAttemptCount: 0,
        failureCode: null,
        replayed: true,
      },
    ]);

    const unknownCommand = {
      contractVersion: "survey-dispatch-state.v1",
      action: "record",
      expectedStateVersion: 2,
      taskName: dispatchTaskName,
      outcome: "unknown",
      dispatchAttemptCount: 1,
      evidence: {
        contractVersion: "survey-dispatch-evidence.v1",
        outcome: "unknown",
        taskName: dispatchTaskName,
        dispatchAttemptCount: 1,
        reasonCode: "AMBIGUOUS_RESPONSE",
      },
    };
    const unknownResponse = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(unknownCommand),
    });
    assert.equal(unknownResponse.status, 200);
    assert.deepEqual(await unknownResponse.json(), {
      contractVersion: "survey-dispatch-state.v1",
      reportRunId: DISPATCH_RUN_ID,
      taskName: dispatchTaskName,
      stateVersion: 3,
      status: "queued",
      dispatchState: "unknown",
      dispatchAttemptCount: 1,
      failureCode: null,
      replayed: false,
    });

    const blindReserve = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ ...reserveCommand, expectedStateVersion: 3 }),
    });
    assert.equal(blindReserve.status, 409);
    assert.equal((await blindReserve.json()).error.code, "TASK_ALREADY_CREATED");

    const callerAssertedAbsence = {
      contractVersion: "survey-dispatch-state.v1",
      action: "record",
      expectedStateVersion: 3,
      taskName: dispatchTaskName,
      outcome: "absent",
      dispatchAttemptCount: 3,
      evidence: {
        contractVersion: "survey-dispatch-evidence.v1",
        outcome: "absent",
        taskName: dispatchTaskName,
        dispatchAttemptCount: 3,
        lookupResult: "not-found",
        verifiedAt: "2026-09-23T22:00:00.000Z",
      },
    };
    const rejectedAbsence = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(callerAssertedAbsence),
    });
    assert.equal(rejectedAbsence.status, 400);
    assert.equal((await rejectedAbsence.json()).error.code, "VALIDATION_FAILED");

    const legacyCompensationUrl = `http://127.0.0.1:${port}/api/tb113/admin/generations/${DISPATCH_RUN_ID}/dispatch-failure`;
    const legacyCompensation = await fetch(legacyCompensationUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({
        contractVersion: "survey-dispatch-command.v1",
        expectedStateVersion: 3,
        taskName: dispatchTaskName,
        dispatchAttemptCount: 3,
        failureCode: "QUEUE_ENQUEUE_EXHAUSTED",
      }),
    });
    assert.equal(legacyCompensation.status, 409);
    assert.equal((await legacyCompensation.json()).error.code, "TASK_ALREADY_CREATED");

    const unknownReplay = await fetch(dispatchStateUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify(unknownCommand),
    });
    assert.equal(unknownReplay.status, 200);
    assert.deepEqual(await unknownReplay.json(), {
      contractVersion: "survey-dispatch-state.v1",
      reportRunId: DISPATCH_RUN_ID,
      taskName: dispatchTaskName,
      stateVersion: 3,
      status: "queued",
      dispatchState: "unknown",
      dispatchAttemptCount: 1,
      failureCode: null,
      replayed: true,
    });

    const workerGeneration = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ data: generationData(WORKER_RUN_ID, "2026-10-01", "2026-10-20") }),
    });
    assert.equal(workerGeneration.status, 201);
    const claimUrl = `http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_RUN_ID}/claim`;
    const claimCommand = { commandVersion: "survey-report-command.v1" };
    const anonymousClaim = await fetch(claimUrl, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(claimCommand),
    });
    assert.ok([401, 403].includes(anonymousClaim.status));
    await grant(strapi, role.id, workerActions.claim);
    const roleGrantedClaim = await fetch(claimUrl, {
      method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" }, body: JSON.stringify(claimCommand),
    });
    assert.ok([401, 403].includes(roleGrantedClaim.status));
    const capturedClaims = await captureQueries(strapi, () => Promise.all([1, 2].map(() => fetch(claimUrl, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" }, body: JSON.stringify(claimCommand),
    }))));
    const claimed = capturedClaims.result;
    assert.deepEqual(claimed.map(({ status }) => status), [200, 200]);
    assert.doesNotMatch(generationLockQuery(capturedClaims.queries), /"snapshot_json"/i);
    const claimResults = await Promise.all(claimed.map((response) => response.json()));
    assert.deepEqual(claimResults.map(({ disposition }) => disposition).sort(), ["claimed", "resumed"]);
    assert.ok(claimResults.every((result) => result.status === "running" && result.stateVersion === 2));
    assert.ok(claimResults.every((result) => !JSON.stringify(result).includes("comment")));
    const oversizedClaim = await fetch(claimUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" },
      body: `${JSON.stringify(claimCommand)}${" ".repeat(4_097)}`,
    });
    assert.equal(oversizedClaim.status, 413);
    assert.equal((await oversizedClaim.json()).error.code, "PAYLOAD_TOO_LARGE");
    const roleGrantedOversizedClaim = await fetch(claimUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: `${JSON.stringify(claimCommand)}${" ".repeat(4_097)}`,
    });
    assert.ok([401, 403].includes(roleGrantedOversizedClaim.status));

    const snapshotPayload = {
      contractVersion: "survey-snapshot.v1", sourceRevision: "feedback-admin.v1",
      createdAt: "2026-09-24T12:00:00.000Z",
      population: { currentSubmissionCount: 0, previousSubmissionCount: 0 },
      metrics: { current: { submissionCount: 0 }, previous: { submissionCount: 0 } },
      comments: [{ text: "worker-only private comment" }],
    };
    const snapshotDigest = require("node:crypto").createHash("sha256").update(canonicalizeJson(snapshotPayload)).digest("hex");
    const snapshotGeneration = await fetch(endpoint, {
      method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ data: { ...generationData(WORKER_SNAPSHOT_RUN_ID, "2026-10-21", "2026-10-31"), snapshotDigest, snapshotJson: snapshotPayload } }),
    });
    assert.equal(snapshotGeneration.status, 201);
    await strapi.db.connection("survey_report_generations").where({ report_run_id: WORKER_SNAPSHOT_RUN_ID })
      .update({ snapshot_digest: snapshotDigest, snapshot_json: snapshotPayload });
    const snapshotClaimUrl = `http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_SNAPSHOT_RUN_ID}/claim`;
    const snapshotClaim = await fetch(snapshotClaimUrl, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" },
      body: JSON.stringify(claimCommand),
    });
    assert.equal(snapshotClaim.status, 200);
    const snapshotUrl = `http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_SNAPSHOT_RUN_ID}/snapshot`;
    const anonymousSnapshot = await fetch(snapshotUrl);
    assert.ok([401, 403].includes(anonymousSnapshot.status));
    await grant(strapi, role.id, workerActions.snapshot);
    const roleGrantedSnapshot = await fetch(snapshotUrl, { headers: { authorization: `Bearer ${jwt}` } });
    assert.ok([401, 403].includes(roleGrantedSnapshot.status));
    const tokenWithoutSnapshotAction = await fetch(snapshotUrl, { headers: { authorization: `Bearer ${workerTokens.claim}` } });
    assert.equal(tokenWithoutSnapshotAction.status, 403);
    const capturedSnapshots = await captureQueries(strapi, () => fetch(snapshotUrl, { headers: { authorization: `Bearer ${workerTokens.snapshot}` } }));
    assert.match(generationLockQuery(capturedSnapshots.queries), /"snapshot_json"/i);
    const snapshots = [capturedSnapshots.result, await fetch(snapshotUrl, { headers: { authorization: `Bearer ${workerTokens.snapshot}` } })];
    assert.deepEqual(snapshots.map(({ status }) => status), [200, 200]);
    const snapshotBodies = await Promise.all(snapshots.map((response) => response.json()));
    assert.deepEqual(snapshotBodies[0], {
      contractVersion: "survey-worker-cms.v1", reportRunId: WORKER_SNAPSHOT_RUN_ID, stateVersion: 2,
      snapshot: { canonicalization: "tb-json.v1", algorithm: "sha256", digestHex: snapshotDigest, payload: snapshotPayload },
    });
    assert.equal(JSON.stringify(snapshotBodies[1]), JSON.stringify(snapshotBodies[0]));
    assert.equal(JSON.stringify(snapshotBodies[0]).includes("checkpoint"), false);

    const queuedGeneration = await fetch(endpoint, {
      method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ data: generationData(WORKER_QUEUED_RUN_ID, "2026-11-01", "2026-11-10") }),
    });
    assert.equal(queuedGeneration.status, 201);
    const queuedSnapshot = await fetch(`http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_QUEUED_RUN_ID}/snapshot`, { headers: { authorization: `Bearer ${workerTokens.snapshot}` } });
    assert.equal(queuedSnapshot.status, 409);
    assert.equal((await queuedSnapshot.json()).error.code, "INVALID_STATE");

    for (const [runId, snapshot, digest, expectedCode, periodStart, periodEnd] of [
      [WORKER_VERSION_RUN_ID, { ...snapshotPayload, contractVersion: "survey-snapshot.v2" }, null, "INVALID_STATE", "2026-11-11", "2026-11-20"],
      [WORKER_DIGEST_RUN_ID, snapshotPayload, "0".repeat(64), "DIGEST_MISMATCH", "2026-11-21", "2026-11-30"],
    ]) {
      const storedDigest = digest ?? require("node:crypto").createHash("sha256").update(canonicalizeJson(snapshot)).digest("hex");
      const invalidGeneration = await fetch(endpoint, {
        method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
        body: JSON.stringify({ data: { ...generationData(runId, periodStart, periodEnd), snapshotDigest: storedDigest, snapshotJson: snapshot } }),
      });
      assert.equal(invalidGeneration.status, 201);
      await strapi.db.connection("survey_report_generations").where({ report_run_id: runId })
        .update({ snapshot_digest: storedDigest, snapshot_json: snapshot });
      const invalidClaim = await fetch(`http://127.0.0.1:${port}/api/tb113/worker/generations/${runId}/claim`, {
        method: "POST", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" },
        body: JSON.stringify(claimCommand),
      });
      assert.equal(invalidClaim.status, 200);
      const invalidSnapshot = await fetch(`http://127.0.0.1:${port}/api/tb113/worker/generations/${runId}/snapshot`, { headers: { authorization: `Bearer ${workerTokens.snapshot}` } });
      assert.equal(invalidSnapshot.status, 409);
      assert.equal((await invalidSnapshot.json()).error.code, expectedCode);
    }

    const checkpointSet = { version: "survey-checkpoints.v1", snapshotDigest: "a".repeat(64), route: "undecided", chunkCount: null, entries: [] };
    const checkpointGeneration = await fetch(endpoint, {
      method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ data: { ...generationData(WORKER_CHECKPOINT_RUN_ID, "2026-12-01", "2026-12-10"), snapshotDigest: checkpointSet.snapshotDigest, checkpointsJson: checkpointSet } }),
    });
    assert.equal(checkpointGeneration.status, 201);
    await strapi.db.connection("survey_report_generations").where({ report_run_id: WORKER_CHECKPOINT_RUN_ID })
      .update({ snapshot_digest: checkpointSet.snapshotDigest, checkpoints_json: checkpointSet });
    const checkpointRoot = `http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_CHECKPOINT_RUN_ID}`;
    const checkpointClaim = await fetch(`${checkpointRoot}/claim`, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" },
      body: JSON.stringify(claimCommand),
    });
    assert.equal(checkpointClaim.status, 200);
    const checkpointUrl = `${checkpointRoot}/checkpoints/redact`;
    const payload = { kind: "redact", recordCount: 0, redactionVersion: "redaction.v1" };
    const checkpoint = {
      checkpointVersion: "survey-checkpoint.v1", stageKey: "redact", stageIndex: 0,
      route: "common", stageType: "redact", status: "valid", inputDigest: "b".repeat(64),
      outputDigest: require("node:crypto").createHash("sha256").update(canonicalizeJson(payload)).digest("hex"),
      attempts: 1, completedAt: "2026-09-24T12:00:00.000Z", payload,
    };
    const checkpointCommand = { contractVersion: "survey-worker-cms.v1", expectedStateVersion: 2, checkpoint };
    const anonymousCheckpoint = await fetch(checkpointUrl, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(checkpointCommand),
    });
    assert.ok([401, 403].includes(anonymousCheckpoint.status));
    await grant(strapi, role.id, workerActions.checkpoint);
    const roleGrantedCheckpoint = await fetch(checkpointUrl, {
      method: "PUT", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" }, body: JSON.stringify(checkpointCommand),
    });
    assert.ok([401, 403].includes(roleGrantedCheckpoint.status));
    const checkpointWithoutAction = await fetch(checkpointUrl, {
      method: "PUT", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" }, body: JSON.stringify(checkpointCommand),
    });
    assert.equal(checkpointWithoutAction.status, 403);
    const capturedCheckpoint = await captureQueries(strapi, () => fetch(checkpointUrl, {
      method: "PUT", headers: { authorization: `Bearer ${workerTokens.checkpoint}`, "content-type": "application/json" }, body: JSON.stringify(checkpointCommand),
    }));
    const checkpointResponse = capturedCheckpoint.result;
    assert.equal(capturedCheckpoint.queries.some((sql) => /survey_report_generations[\s\S]*for update/i.test(sql)), false);
    assert.deepEqual({ status: checkpointResponse.status, body: await checkpointResponse.json() }, { status: 400, body: {
      error: { code: "UNKNOWN_VERSION", message: "The worker checkpoint was rejected" },
    } });
    const checkpointReplay = await fetch(checkpointUrl, {
      method: "PUT", headers: { authorization: `Bearer ${workerTokens.checkpoint}`, "content-type": "application/json" }, body: JSON.stringify(checkpointCommand),
    });
    assert.deepEqual(await checkpointReplay.json(), {
      error: { code: "UNKNOWN_VERSION", message: "The worker checkpoint was rejected" },
    });
    const alteredCheckpoint = await fetch(checkpointUrl, {
      method: "PUT", headers: { authorization: `Bearer ${workerTokens.checkpoint}`, "content-type": "application/json" },
      body: JSON.stringify({ ...checkpointCommand, checkpoint: { ...checkpoint, attempts: 2 } }),
    });
    assert.equal(alteredCheckpoint.status, 400);
    assert.equal((await alteredCheckpoint.json()).error.code, "UNKNOWN_VERSION");
    const oversizedCheckpoint = await fetch(checkpointUrl, {
      method: "PUT", headers: { authorization: `Bearer ${workerTokens.checkpoint}`, "content-type": "application/json" },
      body: `${JSON.stringify(checkpointCommand)}${" ".repeat(4_097)}`,
    });
    assert.equal(oversizedCheckpoint.status, 413);
    assert.equal((await oversizedCheckpoint.json()).error.code, "PAYLOAD_TOO_LARGE");
    const privateCheckpointProjection = await captureQueries(strapi, async () => strapi.db.connection("survey_report_generations")
      .where({ report_run_id: WORKER_CHECKPOINT_RUN_ID }).select("checkpoints_json").first());
    const persistedCheckpoints = typeof privateCheckpointProjection.result.checkpoints_json === "string"
      ? JSON.parse(privateCheckpointProjection.result.checkpoints_json)
      : privateCheckpointProjection.result.checkpoints_json;
    assert.deepEqual(persistedCheckpoints.entries, []);
    assert.equal((await strapi.db.connection("survey_report_generations").where({ report_run_id: WORKER_CHECKPOINT_RUN_ID }).first()).state_version, 2);

    const failGeneration = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: JSON.stringify({ data: generationData(WORKER_FAIL_RUN_ID, "2027-01-01", "2027-01-10") }),
    });
    assert.equal(failGeneration.status, 201);
    const failRoot = `http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_FAIL_RUN_ID}`;
    const failUrl = `${failRoot}/fail`;
    const failCommand = {
      contractVersion: "survey-worker-cms.v1",
      expectedStateVersion: 2,
      failureCode: "INVALID_OUTPUT",
      safeFailureMessage: "The report output did not satisfy its contract.",
    };
    const anonymousFail = await fetch(failUrl, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(failCommand),
    });
    assert.ok([401, 403].includes(anonymousFail.status));
    await grant(strapi, role.id, workerActions.fail);
    const capturedDeniedFail = await captureQueries(strapi, () => Promise.all([
      fetch(failUrl, {
        method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
        body: `${JSON.stringify(failCommand)}${" ".repeat(4_097)}`,
      }),
      fetch(failUrl, {
        method: "POST", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" },
        body: JSON.stringify(failCommand),
      }),
    ]));
    assert.ok(capturedDeniedFail.result.every(({ status }) => [401, 403].includes(status)));
    assert.equal(capturedDeniedFail.queries.some((sql) => /survey_report_generations[\s\S]*for update/i.test(sql)), false);

    const claimedForFailure = await fetch(`${failRoot}/claim`, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.claim}`, "content-type": "application/json" },
      body: JSON.stringify(claimCommand),
    });
    assert.equal(claimedForFailure.status, 200);
    const capturedOversizedFail = await captureQueries(strapi, () => fetch(failUrl, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
      body: `${JSON.stringify(failCommand)}${" ".repeat(4_097)}`,
    }));
    assert.equal(capturedOversizedFail.result.status, 413);
    assert.equal((await capturedOversizedFail.result.json()).error.code, "PAYLOAD_TOO_LARGE");
    assert.equal(capturedOversizedFail.queries.some((sql) => /survey_report_generations[\s\S]*for update/i.test(sql)), false);
    const staleRunningFail = await fetch(failUrl, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
      body: JSON.stringify({ ...failCommand, expectedStateVersion: 1 }),
    });
    assert.equal(staleRunningFail.status, 409);
    assert.equal((await staleRunningFail.json()).error.code, "STATE_VERSION_CONFLICT");
    const capturedFailAuth = await captureQueries(strapi, () => Promise.all([
      fetch(failUrl, {
        method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
        body: JSON.stringify(failCommand),
      }),
      fetch(failUrl, {
        method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
        body: JSON.stringify(failCommand),
      }),
    ]));
    assert.ok(generationLockQuery(capturedFailAuth.queries));
    assert.deepEqual(capturedFailAuth.result.map(({ status }) => status), [200, 200]);
    const failResults = await Promise.all(capturedFailAuth.result.map((response) => response.json()));
    failResults.sort((left, right) => Number(left.replayed) - Number(right.replayed));
    assert.deepEqual(failResults, [
      {
        contractVersion: "survey-worker-cms.v1", reportRunId: WORKER_FAIL_RUN_ID,
        stateVersion: 3, status: "failed", failureCode: "INVALID_OUTPUT", replayed: false,
      },
      {
        contractVersion: "survey-worker-cms.v1", reportRunId: WORKER_FAIL_RUN_ID,
        stateVersion: 3, status: "failed", failureCode: "INVALID_OUTPUT", replayed: true,
      },
    ]);
    assert.equal(JSON.stringify(failResults).includes("safeFailureMessage"), false);
    const storedFailure = await strapi.db.connection("survey_report_generations")
      .where({ report_run_id: WORKER_FAIL_RUN_ID })
      .select("status", "state_version", "failure_code", "safe_failure_message", "completed_at").first();
    assert.equal(storedFailure.status, "failed");
    assert.equal(storedFailure.state_version, 3);
    assert.equal(storedFailure.failure_code, "INVALID_OUTPUT");
    assert.equal(storedFailure.safe_failure_message, failCommand.safeFailureMessage);
    assert.ok(storedFailure.completed_at);
    assert.equal(await strapi.db.connection("survey_reports").where({ generation_run_id: WORKER_FAIL_RUN_ID }).first(), undefined);

    const changedReplay = await fetch(failUrl, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
      body: JSON.stringify({
        ...failCommand,
        failureCode: "INVARIANT",
        safeFailureMessage: "The report state failed an integrity check.",
      }),
    });
    assert.equal(changedReplay.status, 409);
    assert.equal((await changedReplay.json()).error.code, "TERMINAL_CONFLICT");
    const privateMessage = "Private visitor comment must never be persisted";
    const rejectedPrivateMessage = await fetch(failUrl, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
      body: JSON.stringify({ ...failCommand, safeFailureMessage: privateMessage }),
    });
    assert.equal(rejectedPrivateMessage.status, 400);
    const rejectedPrivateBody = await rejectedPrivateMessage.json();
    assert.equal(rejectedPrivateBody.error.code, "VALIDATION_FAILED");
    assert.equal(JSON.stringify(rejectedPrivateBody).includes(privateMessage), false);

    const queuedFailure = await fetch(`http://127.0.0.1:${port}/api/tb113/worker/generations/${WORKER_QUEUED_RUN_ID}/fail`, {
      method: "POST", headers: { authorization: `Bearer ${workerTokens.fail}`, "content-type": "application/json" },
      body: JSON.stringify({ ...failCommand, expectedStateVersion: 1 }),
    });
    assert.equal(queuedFailure.status, 409);
    assert.equal((await queuedFailure.json()).error.code, "TERMINAL_CONFLICT");

    const update = await fetch(`${endpoint}/${body.data.documentId}`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${jwt}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ data: { status: "failed" } }),
    });
    assert.equal(update.status, 403);
    const remove = await fetch(`${endpoint}/${body.data.documentId}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${jwt}` },
    });
    assert.equal(remove.status, 403);
  } finally {
    if (strapi) await strapi.destroy();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await compose("down", "--volumes", "--remove-orphans", "--timeout=5");
  }
  const label = `label=com.docker.compose.project=${OWNER}`;
  assert.equal(
    (
      await executeFixed(DOCKER_EXECUTABLE, ["ps", "-aq", "--filter", label])
    ).stdout.trim(),
    "",
  );
  assert.equal(
    (
      await executeFixed(DOCKER_EXECUTABLE, [
        "volume",
        "ls",
        "-q",
        "--filter",
        label,
      ])
    ).stdout.trim(),
    "",
  );
});
