const assert = require("node:assert/strict");
const test = require("node:test");
const {
  COMPOSE_FILE,
  DOCKER_EXECUTABLE,
  executeFixed,
} = require("./harness/postgres-harness");

const OWNER = "tb113_test_admin_commands";
const REPORT_RUN_ID = "00000000-0000-4000-8000-000000000001";
const compose = (...args) =>
  executeFixed(DOCKER_EXECUTABLE, [
    "compose",
    "--file",
    COMPOSE_FILE,
    "--project-name",
    OWNER,
    ...args,
  ]);

function generationData() {
  return {
    reportRunId: REPORT_RUN_ID,
    periodStart: "2026-08-01",
    periodEnd: "2026-08-20",
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
