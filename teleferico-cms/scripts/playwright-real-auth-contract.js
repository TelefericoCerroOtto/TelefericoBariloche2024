"use strict";

const fs = require("node:fs");
const path = require("node:path");

const NAMESPACE_PATTERN = /^[a-f0-9]{24}$/;
const BLOCKED_VALUE_PATTERN = /(staging|production|cloudsql|cloud\.google|googleapis\.com)/i;
const SECRET_KEY_PATTERN = /(credential|password|secret|token|jwt)/i;

function required(environment, key) {
  const value = environment[key];
  if (!value) throw new Error(`${key} is required for Playwright real-auth provisioning.`);
  return value;
}

function validateProvisioningEnvironment(environment) {
  if (environment.NODE_ENV !== "test") {
    throw new Error("Playwright real-auth provisioning requires NODE_ENV=test.");
  }
  if (environment.PLAYWRIGHT_REAL_AUTH_OPT_IN !== "provision") {
    throw new Error("Playwright real-auth provisioning requires its explicit opt-in.");
  }
  if (environment.DATABASE_CLIENT !== "postgres") {
    throw new Error("Playwright real-auth provisioning requires PostgreSQL.");
  }

  const namespace = required(environment, "PLAYWRIGHT_REAL_AUTH_RUN_ID");
  if (!NAMESPACE_PATTERN.test(namespace)) {
    throw new Error("PLAYWRIGHT_REAL_AUTH_RUN_ID must be exactly 24 lowercase hexadecimal characters.");
  }

  const expectedHost = `tb122-real-auth-postgres-${namespace}`;
  const expectedDatabase = `tb122_real_auth_${namespace}`;
  const databaseHost = required(environment, "DATABASE_HOST");
  const databaseName = required(environment, "DATABASE_NAME");
  if (
    environment.PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_HOST !== expectedHost ||
    environment.PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_NAME !== expectedDatabase ||
    databaseHost !== expectedHost ||
    databaseName !== expectedDatabase
  ) {
    throw new Error("Database identity does not match the harness-owned ephemeral PostgreSQL instance.");
  }

  const prohibited = [
    "DATABASE_URL",
    "INSTANCE_CONNECTION_NAME",
    "GCS_BUCKET_NAME",
    "GCS_BASE_URL",
    "GOOGLE_APPLICATION_CREDENTIALS",
  ];
  for (const key of prohibited) {
    if (environment[key]) throw new Error(`${key} is prohibited during Playwright real-auth provisioning.`);
  }
  if (BLOCKED_VALUE_PATTERN.test(`${databaseHost} ${databaseName}`)) {
    throw new Error("Staging, production, Cloud SQL, and Google-hosted databases are prohibited.");
  }

  return { databaseHost, databaseName, namespace };
}

function manifestPath(environment, namespace) {
  const candidate = required(environment, "PLAYWRIGHT_REAL_AUTH_MANIFEST_PATH");
  const expectedDirectory = `/tmp/tb122-real-auth-${namespace}`;
  const resolved = path.resolve(candidate);
  if (resolved !== path.join(expectedDirectory, "manifest.json")) {
    throw new Error("Manifest path is outside the run-scoped temporary directory.");
  }
  return resolved;
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SECRET_KEY_PATTERN.test(key))
      .map(([key, nested]) => [key, sanitizeValue(nested)]),
  );
}

function serializeManifest(manifest) {
  const serialized = `${JSON.stringify(sanitizeValue(manifest), null, 2)}\n`;
  if (Buffer.byteLength(serialized) >= 8 * 1024) {
    throw new Error("Playwright real-auth manifest exceeds its 8 KiB limit.");
  }
  return serialized;
}

function writeManifest(filePath, manifest) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, serializeManifest(manifest), {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
}

function readManifest(filePath, marker) {
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (manifest.version !== 1 || manifest.marker !== marker) {
    throw new Error("Manifest does not belong to the current real-auth run.");
  }
  return manifest;
}

module.exports = {
  manifestPath,
  readManifest,
  serializeManifest,
  validateProvisioningEnvironment,
  writeManifest,
};
