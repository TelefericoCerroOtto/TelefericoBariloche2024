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

async function grant(strapi, roleId, action) {
  await strapi.db.query("plugin::users-permissions.permission").create({
    data: { action, role: roleId },
  });
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
    const reservations = await Promise.all([sendReserve(), sendReserve()]);
    assert.deepEqual(reservations.map(({ status }) => status), [200, 200]);
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
    const ungrantedClaim = await fetch(claimUrl, {
      method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" }, body: JSON.stringify(claimCommand),
    });
    assert.equal(ungrantedClaim.status, 403);
    await grant(strapi, role.id, "api::survey-report-generation.survey-report-generation.workerClaim");
    const claimed = await Promise.all([1, 2].map(() => fetch(claimUrl, {
      method: "POST", headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" }, body: JSON.stringify(claimCommand),
    })));
    assert.deepEqual(claimed.map(({ status }) => status), [200, 200]);
    const claimResults = await Promise.all(claimed.map((response) => response.json()));
    assert.deepEqual(claimResults.map(({ disposition }) => disposition).sort(), ["claimed", "resumed"]);
    assert.ok(claimResults.every((result) => result.status === "running" && result.stateVersion === 2));
    assert.ok(claimResults.every((result) => !JSON.stringify(result).includes("comment")));
    const oversizedClaim = await fetch(claimUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${jwt}`, "content-type": "application/json" },
      body: `${JSON.stringify(claimCommand)}${" ".repeat(4_097)}`,
    });
    assert.equal(oversizedClaim.status, 413);
    assert.equal((await oversizedClaim.json()).error.code, "PAYLOAD_TOO_LARGE");

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
