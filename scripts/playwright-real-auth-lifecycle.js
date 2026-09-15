#!/usr/bin/env node
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const shared = require("./playwright-real-stack-lifecycle");
const realAuthContract = require("../teleferico-cms/scripts/playwright-real-auth-contract");

const LOGS = Object.freeze({
  provisioner: "/tmp/playwright-real-auth-provisioner.log",
  strapi: "/tmp/playwright-real-auth-strapi.log",
  next: "/tmp/playwright-real-auth-next.log",
  playwright: "/tmp/playwright-real-auth-playwright.log",
});
const SIGNAL_CODES = Object.freeze({ SIGINT: 130, SIGTERM: 143 });
const ACCEPTED_SCENARIO_COUNT = 3;
const INTERNAL_ACCEPTANCE_SIGNAL = "TB122 real-auth internal=validated-scenarios:3/3";
const PLAYWRIGHT_REPORT_MAX_BYTES = 256 * 1024;

function validatePlaywrightAcceptance(rawReport) {
  let report;
  try {
    report = JSON.parse(rawReport);
  } catch {
    throw new Error("Playwright acceptance report is not valid JSON.");
  }
  const tests = [];
  const visitSuite = (suite) => {
    for (const spec of suite.specs ?? []) tests.push(...(spec.tests ?? []));
    for (const child of suite.suites ?? []) visitSuite(child);
  };
  for (const suite of report.suites ?? []) visitSuite(suite);
  const accepted = tests.filter((test) =>
    test.expectedStatus === "passed" &&
    test.results?.length === 1 &&
    test.results[0].status === "passed"
  );
  if (
    tests.length !== ACCEPTED_SCENARIO_COUNT ||
    accepted.length !== ACCEPTED_SCENARIO_COUNT ||
    report.stats?.expected !== ACCEPTED_SCENARIO_COUNT ||
    report.stats?.skipped !== 0 ||
    report.stats?.unexpected !== 0 ||
    report.stats?.flaky !== 0
  ) {
    throw new Error("Playwright acceptance report must prove exactly three discovered, non-skipped, passing scenarios.");
  }
  return ACCEPTED_SCENARIO_COUNT;
}

async function runRealAuthPhases(phases) {
  let primary = null;
  let provisioningAttempted = false;
  let acceptedScenarios = null;
  try {
    const contentApiToken = await phases.provision(() => {
      provisioningAttempted = true;
    });
    validateContentToken(contentApiToken);
    await phases.startStrapi();
    await phases.startNext(contentApiToken);
    acceptedScenarios = validatePlaywrightAcceptance(await phases.runPlaywright());
    await phases.verifySyntheticState();
  } catch (error) {
    primary = error;
  }
  const cleanup = [];
  if (provisioningAttempted) {
    try {
      await phases.cleanupSyntheticState();
      cleanup.push({ name: "synthetic-cleanup", status: "succeeded" });
    } catch (error) {
      cleanup.push({ name: "synthetic-cleanup", status: "failed", detail: error.message });
    }
  } else {
    cleanup.push({
      name: "synthetic-cleanup",
      status: "succeeded",
      detail: "provisioning-not-attempted",
    });
  }
  try {
    const serviceResults = await phases.stopServices();
    cleanup.push(...(Array.isArray(serviceResults) ? serviceResults : [{
      name: "services-cleanup",
      status: "succeeded",
    }]));
  } catch (error) {
    cleanup.push({
      name: "services-cleanup",
      status: "failed",
      detail: error.message,
    });
  }
  return { acceptedScenarios, primary, cleanup };
}

function resolveRealAuthFinalResult(result, signal) {
  const primary = result.primary
    ? commandFailure("real-auth-lifecycle", result.primary)
    : null;
  const effectivePrimary = primary ?? (signal ? {
    kind: "signal", phase: "cleanup", signal, code: SIGNAL_CODES[signal],
  } : null);
  const final = shared.selectFinalResult({
    primary: effectivePrimary,
    signal,
    cleanup: result.cleanup,
  });
  if (final.exitCode !== 0) {
    return { cleanup: result.cleanup, effectivePrimary, final, internalAcceptanceSignal: null };
  }
  if (result.acceptedScenarios !== ACCEPTED_SCENARIO_COUNT) {
    throw new Error("Real-auth acceptance signal requires the exact scenario contract.");
  }
  return {
    cleanup: result.cleanup,
    effectivePrimary,
    final,
    internalAcceptanceSignal: `${INTERNAL_ACCEPTANCE_SIGNAL}\n`,
  };
}

function validateRealAuthPreflight(environment, contract = realAuthContract) {
  const identity = contract.validateProvisioningEnvironment(environment);
  const boundManifestPath = contract.manifestPath(environment, identity.namespace);
  return { ...identity, manifestPath: boundManifestPath };
}

async function runValidatedRealAuthPhases(environment, phases, contract = realAuthContract) {
  validateRealAuthPreflight(environment, contract);
  return runRealAuthPhases(phases);
}

function requireEnvironment(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function commandFailure(phase, error) {
  if (error?.kind) return error;
  return { kind: "command", phase, code: 1, detail: error?.message ?? String(error) };
}

function validateContentToken(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{256}$/.test(value)) {
    throw new Error("Synthetic content token handoff is missing or invalid.");
  }
  return value;
}

function buildPlaywrightArguments() {
  return [
    "exec",
    "playwright",
    "test",
    "--config=playwright.real-auth.config.ts",
  ];
}

function printDiagnostics(primary, cleanup, services, secrets) {
  const write = (message) => process.stderr.write(shared.redact(message, secrets));
  write(`TB122 real-auth primary=${primary ? JSON.stringify(primary) : "success"}\n`);
  for (const [resource, state] of Object.entries(services)) {
    write(`TB122 real-auth resource=${resource} state=${state}\n`);
  }
  for (const result of cleanup) {
    write(`TB122 real-auth cleanup=${JSON.stringify(result)}\n`);
  }
  if (!primary && cleanup.every(({ status }) => status === "succeeded")) return;

  for (const [resource, logPath] of Object.entries(LOGS)) {
    let evidence;
    try {
      evidence = shared.readBoundedLog(logPath, {
        allowedPaths: Object.values(LOGS),
        maxBytes: shared.LOG_LIMITS.maxBytes,
        maxLines: shared.LOG_LIMITS.maxLines,
        secrets,
      });
    } catch (error) {
      evidence = { status: `unavailable:${error.message}`, content: "" };
    }
    write(`TB122 real-auth diagnostic resource=${resource} status=${evidence.status} lines<=${shared.LOG_LIMITS.maxLines} bytes<=${shared.LOG_LIMITS.maxBytes}\n`);
    if (evidence.content) write(`${evidence.content}\n`);
  }
}

async function getKnownStrapiJwt(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/local`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: email, password }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Server-side credentials probe failed with status ${response.status}.`);
  const payload = await response.json();
  if (typeof payload.jwt !== "string" || !payload.jwt) throw new Error("Server-side credentials probe returned no Strapi JWT.");
  return payload.jwt;
}

async function main() {
  const readinessSecret = requireEnvironment("READINESS_SECRET");
  const namespace = requireEnvironment("PLAYWRIGHT_REAL_AUTH_RUN_ID");
  const manifestPath = requireEnvironment("PLAYWRIGHT_REAL_AUTH_MANIFEST_PATH");
  const expectedDatabaseHost = requireEnvironment("PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_HOST");
  const expectedDatabaseName = requireEnvironment("PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_NAME");
  if (process.env.NODE_ENV !== "test" || process.env.PLAYWRIGHT_REAL_AUTH_OPT_IN !== "provision") {
    throw new Error("Real-auth lifecycle requires test mode and explicit provisioning opt-in.");
  }

  const adminEmail = `administrator-${namespace}@real-auth.invalid`;
  const mediaEmail = `media-manager-${namespace}@real-auth.invalid`;
  const adminPassword = crypto.randomBytes(32).toString("base64url");
  const mediaPassword = crypto.randomBytes(32).toString("base64url");
  const isolatedEnvironment = { ...process.env };
  delete isolatedEnvironment.BUILD_STRAPI_CONTENT_TOKEN;
  const serviceRegistry = new shared.CleanupRegistry();
  const signalState = { signal: null, active: null };
  const signalHandlers = shared.installSignalHandlers(signalState);
  const services = { strapi: "not-started", next: "not-started", syntheticData: "not-provisioned" };
  let strapi = null;
  let next = null;
  let knownStrapiJwt = null;
  let contentApiToken = null;

  const cmsEnvironment = {
    ...isolatedEnvironment,
    NODE_ENV: "test",
    DATABASE_CLIENT: "postgres",
    DATABASE_PORT: "5432",
    DATABASE_SSL: "false",
    APP_KEYS: `${readinessSecret}-app-1,${readinessSecret}-app-2`,
    API_TOKEN_SALT: `${readinessSecret}-api`,
    ADMIN_JWT_SECRET: `${readinessSecret}-admin`,
    TRANSFER_TOKEN_SALT: `${readinessSecret}-transfer`,
    JWT_SECRET: `${readinessSecret}-jwt`,
    PLAYWRIGHT_REAL_AUTH_ADMIN_EMAIL: adminEmail,
    PLAYWRIGHT_REAL_AUTH_ADMIN_PASSWORD: adminPassword,
    PLAYWRIGHT_REAL_AUTH_MEDIA_EMAIL: mediaEmail,
    PLAYWRIGHT_REAL_AUTH_MEDIA_PASSWORD: mediaPassword,
  };

  const baseURL = "http://127.0.0.1:3200";
  const appEnvironment = {
    ...isolatedEnvironment,
    NODE_ENV: "test",
    APP_INTERNAL_BASE_URL: baseURL,
    AUTH_SECRET: `${readinessSecret}-auth`,
    AUTH_TRUST_HOST: "true",
    BUILD_STRAPI_BASE_URL: "http://127.0.0.1:1337",
    BUILD_STRAPI_BUCKET_HOSTNAME: "127.0.0.1",
    BUILD_STRAPI_BUCKET_PATHNAME: "/uploads/**",
    CV_STORAGE_DRIVER: "local",
    CV_LOCAL_STORAGE_DIR: path.join(path.dirname(manifestPath), "private-cv"),
    NEXT_PUBLIC_SITE_URL: baseURL,
  };
  const phases = {
    provision: async (markProvisioningAttempted) => {
      services.syntheticData = "provisioning-prerequisites";
      await shared.runCommand("cms-install", "npm", ["ci"], {
        cwd: "/workspace/teleferico-cms", env: isolatedEnvironment, logPath: LOGS.strapi,
      }, signalState);
      await shared.runCommand("cms-build", "npm", ["run", "build"], {
        cwd: "/workspace/teleferico-cms", env: cmsEnvironment, logPath: LOGS.strapi,
      }, signalState);
      markProvisioningAttempted();
      services.syntheticData = "provisioning-attempted";
      contentApiToken = await shared.runCommand("synthetic-provision", "node", ["scripts/provision-playwright-real-auth.js", "--provision"], {
        cwd: "/workspace/teleferico-cms",
        env: cmsEnvironment,
        logPath: LOGS.provisioner,
        captureFd3MaxBytes: 256,
      }, signalState);
      services.syntheticData = "provisioned";
      return contentApiToken;
    },
    startStrapi: async () => {
      strapi = shared.ManagedProcess.start({
        name: "strapi", command: "npm", args: ["run", "start"],
        cwd: "/workspace/teleferico-cms", env: cmsEnvironment, logPath: LOGS.strapi,
      });
      services.strapi = "started";
      serviceRegistry.register("process", "strapi", () => strapi.stop({ graceMs: 5_000, killMs: 5_000, intervalMs: 100 }));
      await shared.waitForHttp("strapi", "http://127.0.0.1:1337/admin/init", strapi, signalState);
      services.strapi = "ready";
      knownStrapiJwt = await getKnownStrapiJwt("http://127.0.0.1:1337", adminEmail, adminPassword);
    },
    startNext: async (contentApiToken) => {
      const nextEnvironment = {
        ...appEnvironment,
        BUILD_STRAPI_CONTENT_TOKEN: contentApiToken,
      };
      await shared.runCommand("app-corepack", "corepack", ["enable"], {
        cwd: "/workspace/teleferico-app", env: isolatedEnvironment, logPath: LOGS.next,
      }, signalState, [strapi]);
      await shared.runCommand("app-pnpm-version", "bash", ["-c", 'test "$(corepack pnpm --version)" = "10.33.0"'], {
        cwd: "/workspace/teleferico-app", env: isolatedEnvironment, logPath: LOGS.next,
      }, signalState, [strapi]);
      await shared.runCommand("app-install", "pnpm", ["install", "--frozen-lockfile"], {
        cwd: "/workspace/teleferico-app", env: isolatedEnvironment, logPath: LOGS.next,
      }, signalState, [strapi]);
      await shared.runCommand("playwright-browser", "pnpm", ["exec", "playwright", "install", "--with-deps", "chromium"], {
        cwd: "/workspace/teleferico-app", env: isolatedEnvironment, logPath: LOGS.playwright,
      }, signalState, [strapi]);
      next = shared.ManagedProcess.start({
        name: "next", command: "pnpm",
        args: ["exec", "next", "dev", "--turbopack", "--hostname", "0.0.0.0", "--port", "3200"],
        cwd: "/workspace/teleferico-app", env: nextEnvironment, logPath: LOGS.next,
      });
      services.next = "started";
      serviceRegistry.register("process", "next", () => next.stop({ graceMs: 5_000, killMs: 5_000, intervalMs: 100 }));
      await shared.waitForHttp("next", `${baseURL}/es-AR/login`, next, signalState);
      services.next = "ready";
    },
    runPlaywright: () => shared.runCommand("playwright-real-auth", "bash", [
      "-c",
      'exec "$@" >&3',
      "playwright-real-auth",
      "pnpm",
      ...buildPlaywrightArguments(),
      "--reporter=json",
    ], {
      cwd: "/workspace/teleferico-app",
      env: {
        ...appEnvironment,
        CI: "true",
        PLAYWRIGHT_NO_COPY_PROMPT: "1",
        PLAYWRIGHT_REAL_AUTH_BASE_URL: baseURL,
        PLAYWRIGHT_REAL_AUTH_MARKER: `tb122-real-auth:${namespace}`,
        PLAYWRIGHT_REAL_AUTH_ADMIN_EMAIL: adminEmail,
        PLAYWRIGHT_REAL_AUTH_ADMIN_PASSWORD: adminPassword,
        PLAYWRIGHT_REAL_AUTH_MEDIA_EMAIL: mediaEmail,
        PLAYWRIGHT_REAL_AUTH_MEDIA_PASSWORD: mediaPassword,
        PLAYWRIGHT_REAL_AUTH_KNOWN_STRAPI_JWT: knownStrapiJwt,
      },
      logPath: LOGS.playwright,
      captureFd3MaxBytes: PLAYWRIGHT_REPORT_MAX_BYTES,
    }, signalState, [strapi, next]),
    verifySyntheticState: () => shared.runCommand("synthetic-verify", "node", ["scripts/provision-playwright-real-auth.js", "--verify"], {
      cwd: "/workspace/teleferico-cms", env: cmsEnvironment, logPath: LOGS.provisioner,
    }, signalState, [strapi, next]),
    cleanupSyntheticState: async () => {
      services.syntheticData = "cleanup-started";
      await shared.runCommand("synthetic-cleanup", "node", ["scripts/provision-playwright-real-auth.js", "--cleanup"], {
        cwd: "/workspace/teleferico-cms", env: cmsEnvironment, logPath: LOGS.provisioner,
      }, signalState);
      services.syntheticData = "cleaned";
    },
    stopServices: () => serviceRegistry.cleanup(),
  };
  const result = await runValidatedRealAuthPhases(cmsEnvironment, phases);
  const resolved = resolveRealAuthFinalResult(result, signalState.signal);
  const { cleanup, effectivePrimary, final, internalAcceptanceSignal } = resolved;
  printDiagnostics(effectivePrimary, cleanup, services, [
    readinessSecret,
    adminPassword,
    mediaPassword,
    knownStrapiJwt,
    contentApiToken,
  ]);
  process.stderr.write(`TB122 real-auth final=${JSON.stringify({ outcome: final.outcome, exitCode: final.exitCode })}\n`);
  signalHandlers.dispose();
  if (internalAcceptanceSignal) process.stderr.write(internalAcceptanceSignal);
  process.exitCode = final.exitCode;
}

module.exports = {
  buildPlaywrightArguments,
  INTERNAL_ACCEPTANCE_SIGNAL,
  printDiagnostics,
  resolveRealAuthFinalResult,
  runRealAuthPhases,
  runValidatedRealAuthPhases,
  validatePlaywrightAcceptance,
  validateContentToken,
  validateRealAuthPreflight,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`TB122 real-auth bootstrap failed: ${shared.redact(error.message)}\n`);
    process.exitCode = 1;
  });
}
