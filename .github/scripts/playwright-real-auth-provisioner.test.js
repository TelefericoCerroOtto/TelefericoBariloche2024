const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const provisioner = require("../../teleferico-cms/scripts/provision-playwright-real-auth.js");

function fixtureContext() {
  const namespace = "a".repeat(24);
  return provisioner.buildContext({
    NODE_ENV: "test",
    PLAYWRIGHT_REAL_AUTH_OPT_IN: "provision",
    PLAYWRIGHT_REAL_AUTH_RUN_ID: namespace,
    PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_HOST: `tb122-real-auth-postgres-${namespace}`,
    PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_NAME: `tb122_real_auth_${namespace}`,
    DATABASE_CLIENT: "postgres",
    DATABASE_HOST: `tb122-real-auth-postgres-${namespace}`,
    DATABASE_NAME: `tb122_real_auth_${namespace}`,
  });
}

function fixtureManifest(context) {
  return {
    version: 1,
    marker: context.marker,
    database: { host: context.databaseHost, name: context.databaseName },
    roles: [],
    users: [],
    sector: { id: 10, documentId: "owned-sector", key: context.sectorKey },
    postulation: {
      id: 20,
      documentId: "owned-postulation",
      email: context.postulationEmail,
      note: context.marker,
    },
    serviceState: { id: 30, documentId: "owned-service-state", initialState: "normal" },
    contentApiAccess: {
      id: 40,
      name: context.contentTokenName,
      description: context.marker,
      type: "custom",
      permissions: [...provisioner.CONTENT_TOKEN_PERMISSIONS],
    },
  };
}

function fakeStrapi(context, missing) {
  const owned = {
    sector: { id: 11, documentId: "owned-sector", key: context.sectorKey },
    postulation: {
      id: 21,
      documentId: "owned-postulation",
      email: context.postulationEmail,
      note: context.marker,
    },
    serviceState: { id: 31, documentId: "owned-service-state", state: "normal" },
  };
  const unrelated = {
    sector: { id: 10, documentId: "other-sector", key: context.sectorKey },
    postulation: {
      id: 20,
      documentId: "other-postulation",
      email: context.postulationEmail,
      note: context.marker,
    },
    serviceState: { id: 30, documentId: "other-service-state", state: "normal" },
  };
  const uidToFixture = {
    "api::sector.sector": "sector",
    "api::postulation.postulation": "postulation",
    "api::service-state.service-state": "serviceState",
  };
  const finds = [];
  const deletes = [];
  const query = (uid) => {
    const fixture = uidToFixture[uid];
    if (fixture) {
      return {
        findOne: async ({ where }) => {
          finds.push({ fixture, where });
          if (fixture === missing) return null;
          if (where.documentId === owned[fixture].documentId) return owned[fixture];
          if (where.id === unrelated[fixture].id) return unrelated[fixture];
          return null;
        },
        update: async () => owned[fixture],
        delete: async ({ where }) => { deletes.push({ fixture, where }); },
      };
    }
    if (uid === "plugin::users-permissions.role") {
      return { findOne: async () => ({ id: 50 }) };
    }
    if (uid === "plugin::users-permissions.permission") {
      return { findOne: async () => ({ id: 60 }) };
    }
    throw new Error(`Unexpected query UID: ${uid}`);
  };
  return {
    deletes,
    finds,
    strapi: {
      db: { query },
      service: () => ({
        getByName: async () => ({
          id: 40,
          kind: "content-api",
          name: context.contentTokenName,
          description: context.marker,
          type: "custom",
          permissions: [...provisioner.CONTENT_TOKEN_PERMISSIONS],
        }),
        revoke: async () => {},
      }),
    },
  };
}

test("manifest records stable document identities for draft-and-publish fixtures", () => {
  const context = fixtureContext();
  const fixtures = {
    sector: { id: 10, documentId: "owned-sector" },
    postulation: { id: 20, documentId: "owned-postulation" },
    serviceState: { id: 30, documentId: "owned-service-state" },
  };
  const manifest = provisioner.manifestFor(context, [], [], fixtures, { id: 40 });

  assert.deepEqual(
    [manifest.sector.documentId, manifest.postulation.documentId, manifest.serviceState.documentId],
    ["owned-sector", "owned-postulation", "owned-service-state"],
  );
  assert.throws(
    () => provisioner.manifestFor(
      context,
      [],
      [],
      { ...fixtures, serviceState: { id: 30 } },
      { id: 40 },
    ),
    /no stable document identity/,
  );
});

test("verification and cleanup follow logical fixtures after physical ID drift", async () => {
  const context = fixtureContext();
  const manifest = fixtureManifest(context);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-fixture-ownership-"));
  const filePath = path.join(directory, "manifest.json");
  fs.writeFileSync(filePath, JSON.stringify(manifest));
  const { strapi, deletes, finds } = fakeStrapi(context);

  try {
    await provisioner.verify(strapi, context, filePath);
    await provisioner.cleanup(strapi, context, filePath);

    assert.ok(finds.every(({ where }) => where.documentId && where.id === undefined));
    assert.deepEqual(
      deletes.filter(({ fixture }) => fixture !== "contentApiToken").map(({ where }) => where.id).sort(),
      [11, 21, 31],
    );
    assert.ok(deletes.every(({ where }) => !where || ![10, 20, 30].includes(where.id)));
    assert.equal(fs.existsSync(filePath), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("ownership diagnostics name the fixture that cannot be proven", async () => {
  const context = fixtureContext();
  const manifest = fixtureManifest(context);
  for (const [fixture, expected] of [
    ["sector", /Synthetic sector fixture ownership could not be proven/],
    ["postulation", /Synthetic postulation fixture ownership could not be proven/],
    ["serviceState", /Synthetic service-state fixture ownership could not be proven/],
  ]) {
    await assert.rejects(
      provisioner.findOwnedFixtures(fakeStrapi(context, fixture).strapi, manifest, context),
      expected,
    );
  }
});
