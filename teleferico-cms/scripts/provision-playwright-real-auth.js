#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const {
  manifestPath,
  readManifest,
  validateProvisioningEnvironment,
  writeManifest,
} = require("./playwright-real-auth-contract");

const UIDS = Object.freeze({
  permission: "plugin::users-permissions.permission",
  role: "plugin::users-permissions.role",
  user: "plugin::users-permissions.user",
  serviceState: "api::service-state.service-state",
  postulation: "api::postulation.postulation",
  sector: "api::sector.sector",
});
const ACTIONS = Object.freeze({
  login: "plugin::users-permissions.auth.callback",
  roleFind: "plugin::users-permissions.role.find",
  me: "plugin::users-permissions.user.me",
  postulationFind: "api::postulation.postulation.find",
  serviceStateUpdate: "api::service-state.service-state.update",
});
const ROLE_DEFINITIONS = Object.freeze([
  {
    key: "administrator",
    name: "Administrator",
    actions: [
      ACTIONS.roleFind,
      ACTIONS.me,
      ACTIONS.postulationFind,
      ACTIONS.serviceStateUpdate,
    ],
  },
  {
    key: "mediaManager",
    name: "Media Manager",
    actions: [ACTIONS.roleFind, ACTIONS.me],
  },
]);
const CONTENT_TOKEN_PERMISSIONS = Object.freeze([
  "api::service-state.service-state.find",
]);

function parseOperation(argv) {
  const operations = argv.filter((argument) =>
    ["--provision", "--verify", "--cleanup"].includes(argument),
  );
  if (operations.length !== 1 || argv.length !== 1) {
    throw new Error("Use exactly one operation: --provision, --verify, or --cleanup.");
  }
  return operations[0].slice(2);
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

function roleType(namespace, key) {
  return `tb122_${namespace}_${key}`;
}

function buildContext(environment) {
  const database = validateProvisioningEnvironment(environment);
  return {
    ...database,
    marker: `tb122-real-auth:${database.namespace}`,
    contentTokenName: `TB122 Service State Read ${database.namespace}`,
    sectorKey: `tb122-real-auth-${database.namespace}`,
    postulationEmail: `tb122-${database.namespace}@real-auth.invalid`,
  };
}

function assertSameSet(actual, expected, label) {
  if (JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())) {
    throw new Error(`${label} differ from the least-privilege real-auth contract.`);
  }
}

async function assertPublicLoginPermission(strapi) {
  const publicRole = await strapi.db.query(UIDS.role).findOne({
    where: { type: "public" },
    select: ["id"],
  });
  if (!publicRole) throw new Error("The default Public role is missing.");
  const permission = await strapi.db.query(UIDS.permission).findOne({
    where: { action: ACTIONS.login, role: publicRole.id },
    select: ["id"],
  });
  if (!permission) throw new Error("The default Public role does not permit credentials login.");
  return publicRole;
}

async function createRole(strapi, definition, context) {
  const type = roleType(context.namespace, definition.key);
  const sameName = await strapi.db.query(UIDS.role).findMany({
    where: { name: definition.name },
  });
  if (sameName.length > 0) {
    throw new Error(`Refusing to touch pre-existing ${definition.name} role.`);
  }
  await strapi.plugin("users-permissions").service("role").createRole({
    name: definition.name,
    description: context.marker,
    type,
    permissions: permissionTree(definition.actions),
  });
  const role = await strapi.db.query(UIDS.role).findOne({
    where: { type },
    populate: ["permissions"],
  });
  if (!role || role.name !== definition.name || role.description !== context.marker) {
    throw new Error(`Failed to create ${definition.name} role.`);
  }
  assertSameSet(
    role.permissions.map(({ action }) => action),
    definition.actions,
    `${definition.name} permissions`,
  );
  return role;
}

async function createUser(strapi, definition, role, context) {
  const administrator = definition.key === "administrator";
  const email = process.env[
    administrator
      ? "PLAYWRIGHT_REAL_AUTH_ADMIN_EMAIL"
      : "PLAYWRIGHT_REAL_AUTH_MEDIA_EMAIL"
  ];
  const password = process.env[
    administrator
      ? "PLAYWRIGHT_REAL_AUTH_ADMIN_PASSWORD"
      : "PLAYWRIGHT_REAL_AUTH_MEDIA_PASSWORD"
  ];
  if (!email || !password) {
    throw new Error(`Synthetic ${definition.name} credentials are required.`);
  }
  const username = `tb122-${definition.key}-${context.namespace}`;
  const conflicting = await strapi.db.query(UIDS.user).findOne({ where: { email } });
  if (conflicting) throw new Error(`Refusing to touch pre-existing ${definition.name} user.`);
  const user = await strapi.plugin("users-permissions").service("user").add({
    username,
    email,
    password,
    provider: "local",
    confirmed: true,
    blocked: false,
    name: "Synthetic",
    surname: definition.name.replace(" ", ""),
    role: role.id,
  });
  if (!user?.id || !user.confirmed || user.blocked) {
    throw new Error(`Synthetic ${definition.name} user is not usable.`);
  }
  return { ...user, roleType: role.type };
}

async function createDomainFixtures(strapi, context) {
  const existingStates = await strapi.db.query(UIDS.serviceState).findMany();
  if (existingStates.length !== 0) {
    throw new Error("Refusing to mutate a pre-existing service-state record.");
  }
  const sector = await strapi.db.query(UIDS.sector).create({
    data: { key: context.sectorKey, isActive: true, publishedAt: new Date() },
  });
  const postulation = await strapi.db.query(UIDS.postulation).create({
    data: {
      name: "Synthetic",
      surname: "Applicant",
      gender: "other",
      age: 30,
      email: context.postulationEmail,
      note: context.marker,
      postulation_status: "unreviewed",
      sector: sector.id,
      publishedAt: new Date(),
    },
  });
  const serviceState = await strapi.db.query(UIDS.serviceState).create({
    data: { state: "normal", publishedAt: new Date() },
  });
  return { sector, postulation, serviceState };
}

async function createContentToken(strapi, context) {
  const service = strapi.service("admin::api-token-content-api");
  if (await service.getByName(context.contentTokenName)) {
    throw new Error("Refusing to touch a pre-existing content API token.");
  }
  const token = await service.create({
    name: context.contentTokenName,
    description: context.marker,
    type: "custom",
    permissions: [...CONTENT_TOKEN_PERMISSIONS],
    lifespan: null,
  });
  if (!token?.id || !token.accessKey) {
    throw new Error("Content API token creation returned incomplete data.");
  }
  assertSameSet(token.permissions, CONTENT_TOKEN_PERMISSIONS, "Content API token permissions");
  return token;
}

function requiredDocumentId(entity, label) {
  if (!entity?.documentId) {
    throw new Error(`Synthetic ${label} creation returned no stable document identity.`);
  }
  return entity.documentId;
}

function manifestFor(context, roles, users, fixtures, token) {
  return {
    version: 1,
    marker: context.marker,
    database: { host: context.databaseHost, name: context.databaseName },
    roles: roles.map(({ id, type, name }) => ({ id, type, name })),
    users: users.map(({ id, username, email, roleType }) => ({
      id,
      username,
      email,
      roleType,
    })),
    sector: {
      id: fixtures.sector.id,
      documentId: requiredDocumentId(fixtures.sector, "sector"),
      key: context.sectorKey,
    },
    postulation: {
      id: fixtures.postulation.id,
      documentId: requiredDocumentId(fixtures.postulation, "postulation"),
      email: context.postulationEmail,
      note: context.marker,
    },
    serviceState: {
      id: fixtures.serviceState.id,
      documentId: requiredDocumentId(fixtures.serviceState, "service-state"),
      initialState: "normal",
    },
    contentApiAccess: {
      id: token.id,
      name: context.contentTokenName,
      description: context.marker,
      type: "custom",
      permissions: [...CONTENT_TOKEN_PERMISSIONS],
    },
  };
}

function readOwnedManifest(filePath, context) {
  const manifest = readManifest(filePath, context.marker);
  if (
    manifest.database?.host !== context.databaseHost ||
    manifest.database?.name !== context.databaseName ||
    !Array.isArray(manifest.roles) ||
    !Array.isArray(manifest.users)
  ) {
    throw new Error("Manifest ownership does not match the isolated database.");
  }
  return manifest;
}

async function findOwnedRole(strapi, owned, context) {
  const role = await strapi.db.query(UIDS.role).findOne({
    where: { id: owned.id },
    populate: ["permissions"],
  });
  if (
    !role ||
    role.type !== owned.type ||
    role.name !== owned.name ||
    role.description !== context.marker
  ) {
    throw new Error("Synthetic role ownership could not be proven.");
  }
  const definition = ROLE_DEFINITIONS.find(({ name }) => name === owned.name);
  if (!definition) throw new Error("Synthetic role is outside the contract.");
  assertSameSet(role.permissions.map(({ action }) => action), definition.actions, `${owned.name} permissions`);
  return role;
}

async function findOwnedUser(strapi, owned) {
  const user = await strapi.db.query(UIDS.user).findOne({
    where: { id: owned.id },
    populate: ["role"],
  });
  if (
    !user ||
    user.username !== owned.username ||
    user.email !== owned.email ||
    user.role?.type !== owned.roleType
  ) {
    throw new Error("Synthetic user ownership could not be proven.");
  }
  return user;
}

async function findOwnedFixtures(strapi, manifest, context) {
  if (!manifest.sector.documentId) {
    throw new Error("Synthetic sector fixture has no stable document identity.");
  }
  const sector = await strapi.db.query(UIDS.sector).findOne({
    where: {
      documentId: manifest.sector.documentId,
      key: manifest.sector.key,
    },
  });
  if (!sector || sector.documentId !== manifest.sector.documentId) {
    throw new Error("Synthetic sector fixture ownership could not be proven.");
  }
  if (!manifest.postulation.documentId) {
    throw new Error("Synthetic postulation fixture has no stable document identity.");
  }
  const postulation = await strapi.db.query(UIDS.postulation).findOne({
    where: {
      documentId: manifest.postulation.documentId,
      email: manifest.postulation.email,
      note: context.marker,
    },
  });
  if (!postulation || postulation.documentId !== manifest.postulation.documentId) {
    throw new Error("Synthetic postulation fixture ownership could not be proven.");
  }
  if (!manifest.serviceState.documentId) {
    throw new Error("Synthetic service-state fixture has no stable document identity.");
  }
  const serviceState = await strapi.db.query(UIDS.serviceState).findOne({
    where: { documentId: manifest.serviceState.documentId },
  });
  if (!serviceState || serviceState.documentId !== manifest.serviceState.documentId) {
    throw new Error("Synthetic service-state fixture ownership could not be proven.");
  }
  return { sector, postulation, serviceState };
}

async function findOwnedContentToken(strapi, owned, context, includeAccessKey = false) {
  const token = await strapi.service("admin::api-token-content-api").getByName(
    owned.name,
    { includeDecryptedKey: includeAccessKey },
  );
  if (
    !token ||
    token.id !== owned.id ||
    token.kind !== "content-api" ||
    token.name !== owned.name ||
    token.description !== context.marker ||
    token.type !== "custom"
  ) {
    throw new Error("Content API token ownership could not be proven.");
  }
  assertSameSet(token.permissions, CONTENT_TOKEN_PERMISSIONS, "Content API token permissions");
  return token;
}

async function provision(strapi, context, filePath) {
  if (fs.existsSync(filePath)) {
    throw new Error("Refusing to provision over an existing run manifest.");
  }
  await assertPublicLoginPermission(strapi);
  const roles = [];
  const users = [];
  for (const definition of ROLE_DEFINITIONS) {
    const role = await createRole(strapi, definition, context);
    roles.push(role);
    users.push(await createUser(strapi, definition, role, context));
  }
  const fixtures = await createDomainFixtures(strapi, context);
  const token = await createContentToken(strapi, context);
  const manifest = manifestFor(context, roles, users, fixtures, token);
  writeManifest(filePath, manifest);
  Object.defineProperty(manifest, "contentApiToken", {
    value: token.accessKey,
    enumerable: false,
  });
  return manifest;
}

async function verify(strapi, context, filePath) {
  const manifest = readOwnedManifest(filePath, context);
  for (const role of manifest.roles) await findOwnedRole(strapi, role, context);
  for (const user of manifest.users) await findOwnedUser(strapi, user);
  const fixtures = await findOwnedFixtures(strapi, manifest, context);
  if (fixtures.serviceState.state !== manifest.serviceState.initialState) {
    throw new Error("Synthetic service state was not restored.");
  }
  await findOwnedContentToken(strapi, manifest.contentApiAccess, context);
  return { marker: context.marker, verified: true };
}

async function cleanup(strapi, context, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error("Synthetic cleanup failed closed: the ownership manifest is absent.");
  }
  const manifest = readOwnedManifest(filePath, context);
  const failures = [];
  const attempt = async (name, operation) => {
    try {
      await operation();
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  };

  let fixtures;
  await attempt("fixtures", async () => {
    fixtures = await findOwnedFixtures(strapi, manifest, context);
  });
  if (fixtures) {
    await attempt("restore-service-state", async () => {
      if (fixtures.serviceState.state !== manifest.serviceState.initialState) {
        await strapi.db.query(UIDS.serviceState).update({
          where: { id: fixtures.serviceState.id },
          data: { state: manifest.serviceState.initialState },
        });
      }
    });
  }
  if (failures.length) {
    throw new Error(`Synthetic cleanup failed: ${failures.join("; ")}`);
  }

  await attempt("content-api-token", async () => {
    const token = await findOwnedContentToken(strapi, manifest.contentApiAccess, context);
    await strapi.service("admin::api-token-content-api").revoke(token.id);
  });
  await attempt("postulation", () =>
    strapi.db.query(UIDS.postulation).delete({
      where: { id: fixtures.postulation.id, note: context.marker },
    }),
  );
  await attempt("service-state", () =>
    strapi.db.query(UIDS.serviceState).delete({
      where: { id: fixtures.serviceState.id },
    }),
  );
  await attempt("sector", () =>
    strapi.db.query(UIDS.sector).delete({
      where: { id: fixtures.sector.id, key: context.sectorKey },
    }),
  );
  for (const owned of [...manifest.users].reverse()) {
    await attempt(`user-${owned.id}`, async () => {
      const user = await findOwnedUser(strapi, owned);
      await strapi.plugin("users-permissions").service("user").remove({ id: user.id });
    });
  }
  const publicRole = await assertPublicLoginPermission(strapi);
  for (const owned of [...manifest.roles].reverse()) {
    await attempt(`role-${owned.id}`, async () => {
      const role = await findOwnedRole(strapi, owned, context);
      await strapi.plugin("users-permissions").service("role").deleteRole(
        role.id,
        publicRole.id,
      );
    });
  }
  if (failures.length) {
    throw new Error(`Synthetic cleanup failed: ${failures.join("; ")}`);
  }
  fs.rmSync(filePath, { force: true });
  return { marker: context.marker, cleaned: true };
}

async function run() {
  const operation = parseOperation(process.argv.slice(2));
  const context = buildContext(process.env);
  const filePath = manifestPath(process.env, context.namespace);
  const { createStrapi } = require("@strapi/strapi");
  const strapi = createStrapi({ autoReload: false, serveAdminPanel: false });
  try {
    await strapi.load();
    let result;
    if (operation === "provision") {
      const provisioned = await provision(strapi, context, filePath);
      result = { marker: provisioned.marker };
      const written = fs.writeSync(3, provisioned.contentApiToken, null, "utf8");
      if (written !== Buffer.byteLength(provisioned.contentApiToken)) {
        throw new Error("Content API token descriptor write was incomplete.");
      }
    }
    if (operation === "verify") result = await verify(strapi, context, filePath);
    if (operation === "cleanup") result = await cleanup(strapi, context, filePath);
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    await strapi.destroy();
  }
}

if (require.main === module) {
  run().catch((error) => {
    process.stderr.write(`Playwright real-auth provisioner failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}

module.exports = {
  ACTIONS,
  CONTENT_TOKEN_PERMISSIONS,
  ROLE_DEFINITIONS,
  buildContext,
  cleanup,
  findOwnedFixtures,
  manifestFor,
  parseOperation,
  permissionTree,
  provision,
  verify,
};
