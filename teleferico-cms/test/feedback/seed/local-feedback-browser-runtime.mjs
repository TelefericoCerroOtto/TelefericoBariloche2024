import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { closeSync, writeSync } from "node:fs";

const require = createRequire(import.meta.url);
const CMS_SOURCE_ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
let RUNTIME_ROOT;
let createStrapi;
let createLocalFeedbackSeeder;
let createStrapiLocalFeedbackStore;
let LOCAL_FEEDBACK_MARKER;

const USER_ROLE_UID = "plugin::users-permissions.role";
const USER_UID = "plugin::users-permissions.user";
const PERMISSION_UID = "plugin::users-permissions.permission";
const TOKEN_SERVICE = "admin::api-token-content-api";
const APP_ROLE_NAME = "Digital Experience Operator";
const APP_ROLE_ACTIONS = [
  "plugin::users-permissions.role.find",
  "plugin::users-permissions.user.me",
  "api::survey-report-generation.survey-report-generation.find",
  "api::survey-report-generation.survey-report-generation.create",
  "api::survey-report-generation.survey-report-generation.dispatchState",
];
const APP_TOKEN_ACTIONS = {
  feedbackAdminRead:
    "api::survey-report-generation.survey-report-generation.feedbackAdminRead",
  workerSourceRead:
    "api::survey-report-generation.survey-report-generation.workerSourceRead",
  workerReportDownloadMetadata:
    "api::survey-report-generation.survey-report-generation.workerReportDownloadMetadata",
};
const WORKER_TOKEN_ACTIONS = {
  workerClaim:
    "api::survey-report-generation.survey-report-generation.workerClaim",
  workerSnapshot:
    "api::survey-report-generation.survey-report-generation.workerSnapshot",
  workerCheckpoint:
    "api::survey-report-generation.survey-report-generation.workerCheckpoint",
  workerComplete:
    "api::survey-report-generation.survey-report-generation.workerComplete",
  workerFail:
    "api::survey-report-generation.survey-report-generation.workerFail",
};
let phase = "startup";

function safeErrorMessage(error) {
  let message = error && typeof error.message === "string" ? error.message : "";
  for (const [key, value] of Object.entries(process.env)) {
    if (/(password|secret|token|credential|private.key)/i.test(key) && value)
      message = message.split(value).join("[redacted]");
  }
  return message
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[database-url]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 240);
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing isolated CMS setting ${name}`);
  return value;
}

function assertIsolatedEnvironment() {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ENV_PATH !== "/dev/null" ||
    process.env.DATABASE_CLIENT !== "postgres" ||
    process.env.DATABASE_HOST !== "127.0.0.1" ||
    process.env.DATABASE_NAME !== "tb113_test_feedback" ||
    !/^tb113-local-feedback:[a-f0-9]{32}$/.test(
      process.env.FEEDBACK_LOCAL_OWNER ?? "",
    ) ||
    process.env.K_SERVICE ||
    process.env.K_REVISION ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
    throw new Error("Refusing a non-isolated local feedback CMS runtime.");
}

function permissionTree(actions) {
  const tree = {};
  for (const fullAction of actions) {
    const [type, controller, action] = fullAction.split(".");
    tree[type] ??= { controllers: {} };
    tree[type].controllers[controller] ??= {};
    tree[type].controllers[controller][action] = { enabled: true, policy: "" };
  }
  return tree;
}

function equalSets(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

async function assertPublicLoginPermission(strapi) {
  const publicRole = await strapi.db.query(USER_ROLE_UID).findOne({
    where: { type: "public" },
    select: ["id"],
  });
  if (!publicRole) throw new Error("The isolated Public role is missing.");
  const permission = await strapi.db.query(PERMISSION_UID).findOne({
    where: {
      action: "plugin::users-permissions.auth.callback",
      role: publicRole.id,
    },
    select: ["id"],
  });
  if (!permission)
    throw new Error("The isolated Public role does not permit credentials login.");
  return publicRole;
}

async function createSyntheticOperator(strapi) {
  const roleService = strapi.plugin("users-permissions").service("role");
  const userService = strapi.plugin("users-permissions").service("user");
  if ((await strapi.db.query(USER_ROLE_UID).findMany({ where: { name: APP_ROLE_NAME } })).length)
    throw new Error("Refusing to reuse a pre-existing operator role.");

  const namespace = process.env.FEEDBACK_LOCAL_OWNER.split(":")[1];
  const roleType = `tb113_l4_${namespace}`;
  await roleService.createRole({
    name: APP_ROLE_NAME,
    description: process.env.FEEDBACK_LOCAL_OWNER,
    type: roleType,
    permissions: permissionTree(APP_ROLE_ACTIONS),
  });
  const role = await strapi.db.query(USER_ROLE_UID).findOne({
    where: { type: roleType },
    populate: ["permissions"],
  });
  if (
    !role ||
    role.name !== APP_ROLE_NAME ||
    role.description !== process.env.FEEDBACK_LOCAL_OWNER ||
    !equalSets(role.permissions.map(({ action }) => action), APP_ROLE_ACTIONS) ||
    role.permissions.some(({ action }) => /\.worker(?:Claim|Snapshot|Checkpoint|Complete|Fail)$/.test(action))
  )
    throw new Error("The synthetic operator role did not match its exact app permissions.");

  const email = required("FEEDBACK_LOCAL_OPERATOR_EMAIL");
  const username = `tb113-l4-${namespace}`;
  if (await strapi.db.query(USER_UID).findOne({ where: { email } }))
    throw new Error("Refusing to reuse a pre-existing synthetic operator user.");
  const user = await userService.add({
    username,
    email,
    password: required("FEEDBACK_LOCAL_OPERATOR_PASSWORD"),
    provider: "local",
    confirmed: true,
    blocked: false,
    name: "Synthetic",
    surname: "FeedbackOperator",
    role: role.id,
  });
  if (!user?.id || user.email !== email || user.role?.id !== role.id)
    throw new Error("The marker-owned operator user was not created.");
  return { role, roleType, user };
}

async function createScopedToken(strapi, name, permissions) {
  const token = await strapi.service(TOKEN_SERVICE).create({
    name,
    description: process.env.FEEDBACK_LOCAL_OWNER,
    type: "custom",
    permissions,
    lifespan: null,
  });
  if (!token?.id || !token.accessKey || !equalSets(token.permissions, permissions))
    throw new Error("A synthetic API token did not receive its exact action scope.");
  return { id: token.id, name, permissions, accessKey: token.accessKey };
}

async function createTokenSet(strapi) {
  const namespace = process.env.FEEDBACK_LOCAL_OWNER.split(":")[1];
  const tokens = {
    app: await createScopedToken(
      strapi,
      `tb113-l4-${namespace}-app`,
      Object.values(APP_TOKEN_ACTIONS),
    ),
    worker: await createScopedToken(
      strapi,
      `tb113-l4-${namespace}-worker`,
      Object.values(WORKER_TOKEN_ACTIONS),
    ),
  };
  return tokens;
}

async function cleanupOwnedResources(strapi, seeder, operator, tokens, publicRole) {
  const failures = [];
  const attempt = async (operation) => {
    try {
      await operation();
    } catch {
      failures.push("owned resource cleanup failed");
    }
  };

  if (seeder) await attempt(() => seeder.cleanup());
  if (tokens) {
    const tokenService = strapi.service(TOKEN_SERVICE);
    const tokenList = [tokens.app, tokens.worker].reverse();
    for (const token of tokenList) {
      await attempt(async () => {
        const current = await tokenService.getByName(token.name);
        if (
          current?.id !== token.id ||
          current.description !== process.env.FEEDBACK_LOCAL_OWNER ||
          current.type !== "custom" ||
          !equalSets(current.permissions, token.permissions)
        )
          throw new Error("Synthetic token ownership mismatch.");
        await tokenService.revoke(current.id);
      });
    }
  }
  if (operator?.user?.id) {
    await attempt(async () => {
      const user = await strapi.db.query(USER_UID).findOne({
        where: {
          id: operator.user.id,
          username: operator.user.username,
          email: operator.user.email,
          role: operator.role.id,
        },
      });
      if (!user) throw new Error("Synthetic user ownership mismatch.");
      await strapi.plugin("users-permissions").service("user").remove({ id: user.id });
    });
  }
  if (operator?.role?.id && publicRole?.id) {
    await attempt(async () => {
      const role = await strapi.db.query(USER_ROLE_UID).findOne({
        where: {
          id: operator.role.id,
          type: operator.roleType,
          name: APP_ROLE_NAME,
          description: process.env.FEEDBACK_LOCAL_OWNER,
        },
        populate: ["permissions"],
      });
      if (!role || !equalSets(role.permissions.map(({ action }) => action), APP_ROLE_ACTIONS))
        throw new Error("Synthetic role ownership mismatch.");
      await strapi.plugin("users-permissions").service("role").deleteRole(
        role.id,
        publicRole.id,
      );
    });
  }
  if (failures.length)
    throw new Error(`Isolated CMS cleanup could not verify ${failures.length} owner(s).`);
}

async function run() {
  assertIsolatedEnvironment();
  phase = "resolve-isolated-cms-root";
  RUNTIME_ROOT = resolve(required("FEEDBACK_LOCAL_CMS_ROOT"));
  phase = "working-directory";
  process.chdir(RUNTIME_ROOT);
  phase = "load-runtime-modules";
  const requireFromCms = createRequire(resolve(RUNTIME_ROOT, "package.json"));
  ({ createStrapi } = requireFromCms("@strapi/strapi"));
  ({
    createLocalFeedbackSeeder,
    createStrapiLocalFeedbackStore,
    LOCAL_FEEDBACK_MARKER,
  } = require(resolve(CMS_SOURCE_ROOT, "scripts/seed-surveys.js")));
  phase = "create-strapi";
  const strapi = createStrapi({
    appDir: RUNTIME_ROOT,
    distDir: RUNTIME_ROOT,
    autoReload: false,
    serveAdminPanel: false,
  });
  let seeder;
  let operator;
  let tokens;
  let publicRole;
  try {
    phase = "load-strapi";
    await strapi.load();
    strapi.config.set(
      "admin.secrets.encryptionKey",
      `${required("FEEDBACK_LOCAL_CMS_SECRET")}-encryption`,
    );
    phase = "seed-marker-owned-surveys";
    seeder = createLocalFeedbackSeeder(createStrapiLocalFeedbackStore(strapi));
    await seeder.apply();
    strapi.config.set("feedback.workerCountTokensProvider", async (request) => {
      if (request.modelConfig.model !== "gemini-3.8-flash")
        throw Object.assign(new Error("Synthetic CountTokens provider rejected input."), {
          code: "CONFIGURATION",
        });
      return { instructions: 1, schema: 1, metrics: 1, comments: 1 };
    });
    // Keep the CMS's configured development evidence-key derivation independent
    // from the worker; only external CountTokens/model calls are test fakes.
    phase = "verify-public-login-role";
    publicRole = await assertPublicLoginPermission(strapi);
    phase = "provision-synthetic-operator";
    operator = await createSyntheticOperator(strapi);
    phase = "create-scoped-custom-tokens";
    tokens = await createTokenSet(strapi);
    phase = "start-strapi";
    await strapi.start();

    phase = "verify-grouped-token-action-boundaries";
    const localOrigin = `http://127.0.0.1:${process.env.PORT}`;
    const appRead = await fetch(`${localOrigin}/api/tb113/admin/feedback/read`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokens.app.accessKey}`, "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (appRead.status === 401 || appRead.status === 403)
      throw new Error("The grouped app token was denied its app action.");
    const appClaim = await fetch(`${localOrigin}/api/tb113/worker/generations/00000000-0000-4000-8000-000000000001/claim`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokens.app.accessKey}`, "content-type": "application/json" },
      body: JSON.stringify({ commandVersion: "survey-report-command.v1" }),
    });
    if (appClaim.status !== 403)
      throw new Error("The grouped app token was not denied worker claim.");
    const workerAdminRead = await fetch(`${localOrigin}/api/tb113/admin/feedback/read`, {
      method: "POST",
      headers: { authorization: `Bearer ${tokens.worker.accessKey}`, "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    if (workerAdminRead.status !== 403)
      throw new Error("The grouped worker token was not denied app admin read.");

    phase = "verify-synthetic-users-permissions-login";
    const loginResponse = await fetch(
      `http://127.0.0.1:${process.env.PORT}/api/auth/local`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          identifier: process.env.FEEDBACK_LOCAL_OPERATOR_EMAIL,
          password: process.env.FEEDBACK_LOCAL_OPERATOR_PASSWORD,
        }),
      },
    );
    const login = await loginResponse.json().catch(() => null);
    if (!loginResponse.ok || typeof login?.jwt !== "string")
      throw new Error(`Synthetic CMS login failed with HTTP ${loginResponse.status}.`);
    const verifiedUserResponse = await fetch(
      `http://127.0.0.1:${process.env.PORT}/api/users/me?populate=role`,
      { headers: { authorization: `Bearer ${login.jwt}` } },
    );
    const verifiedUser = await verifiedUserResponse.json().catch(() => null);
    if (
      !verifiedUserResponse.ok ||
      verifiedUser?.role?.name !== APP_ROLE_NAME ||
      verifiedUser?.blocked !== false
    )
      throw new Error(`Synthetic CMS role verification failed with HTTP ${verifiedUserResponse.status}.`);

    const descriptor = JSON.stringify({
      appToken: tokens.app.accessKey,
      workerToken: tokens.worker.accessKey,
    });
    phase = "deliver-runtime-descriptor";
    const bytes = Buffer.from(`${descriptor}\n`, "utf8");
    if (writeSync(3, bytes) !== bytes.byteLength)
      throw new Error("Could not transfer isolated credentials to the harness.");
    closeSync(3);

    await new Promise((resolveWait) => {
      process.once("SIGINT", resolveWait);
      process.once("SIGTERM", resolveWait);
    });
  } finally {
    try {
      await cleanupOwnedResources(strapi, seeder, operator, tokens, publicRole);
    } finally {
      await strapi.destroy();
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    try {
      const safeName =
        error && typeof error.name === "string" && /^[A-Za-z]+Error$/.test(error.name)
          ? error.name
          : "Error";
      const safeCode =
        error && typeof error.code === "string" && /^[A-Z0-9_]{1,40}$/.test(error.code)
          ? ` code=${error.code}`
          : "";
      const safeMessage = safeErrorMessage(error);
      const messagePart = safeMessage ? ` message=${safeMessage}` : "";
      writeSync(
        2,
        Buffer.from(`LOCAL_FEEDBACK_CMS_FAILURE phase=${phase} name=${safeName}${safeCode}${messagePart}\n`),
      );
      closeSync(3);
    } catch {}
    process.exitCode = 1;
  });
}
