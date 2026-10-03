import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import {
  cp,
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  symlink,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCAL_FEEDBACK_EVIDENCE_KEY_VERSION,
  LOCAL_FEEDBACK_OPERATOR_EMAIL,
  LOCAL_FEEDBACK_OPERATOR_PASSWORD,
  LOCAL_FEEDBACK_QUEUE_PATH,
} from "./synthetic-identity.mjs";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPO_ROOT = resolve(APP_ROOT, "..");
const CMS_ROOT = join(REPO_ROOT, "teleferico-cms");
const WORKER_ROOT = join(REPO_ROOT, "services/survey-report-worker");
const CMS_RUNTIME = join(
  CMS_ROOT,
  "test/feedback/seed/local-feedback-browser-runtime.mjs",
);
const WORKER_RUNTIME = join(
  WORKER_ROOT,
  "test/local-report-worker-harness.mjs",
);
const CMS_PORT = 1337;
const APP_PORT = 3200;
const CMS_DATABASE_NAME = "tb113_test_feedback";
const CMS_DATABASE_USER = "tb113_test_runner";
const CMS_DATABASE_PASSWORD = "tb113_test_local_only";
const require = createRequire(import.meta.url);
const { COMPOSE_FILE, DOCKER_EXECUTABLE, executeFixed } = require(
  join(CMS_ROOT, "test/feedback/harness/postgres-harness.js"),
);

function sleep(milliseconds) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

async function assertPortAvailable(port) {
  const server = createServer();
  try {
    await new Promise((resolveListen, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolveListen);
    });
  } catch {
    throw new Error(`Local feedback harness requires free loopback port ${port}.`);
  } finally {
    if (server.listening)
      await new Promise((resolveClose) => server.close(resolveClose));
  }
}

async function reserveWorkerPortPair() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const workerServer = createServer();
    await new Promise((resolveListen, reject) => {
      workerServer.once("error", reject);
      workerServer.listen(0, "127.0.0.1", resolveListen);
    });
    const port = workerServer.address().port;
    const queueServer = createServer();
    try {
      await new Promise((resolveListen, reject) => {
        queueServer.once("error", reject);
        queueServer.listen(port + 1, "127.0.0.1", resolveListen);
      });
      return port;
    } catch {
      // Retry if the adjacent queue port was claimed after the probe.
    } finally {
      await Promise.all([
        new Promise((resolveClose) => workerServer.close(resolveClose)),
        new Promise((resolveClose) => queueServer.close(resolveClose)),
      ]);
    }
  }
  throw new Error("Could not reserve adjacent loopback worker and queue ports.");
}

async function docker(args, timeoutMs = 120_000) {
  return executeFixed(DOCKER_EXECUTABLE, args, {
    signal: AbortSignal.timeout(timeoutMs),
  });
}

function composeArguments(owner, ...operation) {
  return ["compose", "--file", COMPOSE_FILE, "--project-name", owner, ...operation];
}

async function assertNoOwnedResources(owner) {
  const label = `label=com.docker.compose.project=${owner}`;
  const [containers, volumes] = await Promise.all([
    docker(["ps", "-aq", "--filter", label]),
    docker(["volume", "ls", "-q", "--filter", label]),
  ]);
  if (containers.stdout.trim() || volumes.stdout.trim())
    throw new Error("Refusing to reuse a pre-existing local feedback test owner.");
}

async function copyTreeWithoutCredentialFiles(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: (sourcePath) => {
      const name = basename(sourcePath);
      return !name.startsWith(".env") && name !== ".npmrc";
    },
  });
}

async function createIsolatedAppRoot(stackRoot) {
  const workspaceRoot = join(stackRoot, "workspace");
  const appRuntimeRoot = join(workspaceRoot, "teleferico-app");
  await mkdir(appRuntimeRoot, { recursive: true, mode: 0o700 });
  await symlink(join(REPO_ROOT, "packages"), join(workspaceRoot, "packages"), "dir");
  for (const name of ["public", "node_modules"]) {
    await symlink(join(APP_ROOT, name), join(appRuntimeRoot, name), "dir");
  }
  await copyTreeWithoutCredentialFiles(
    join(APP_ROOT, "src"),
    join(appRuntimeRoot, "src"),
  );
  for (const name of [
    "package.json",
    "next.config.mjs",
    "postcss.config.mjs",
    "tailwind.config.ts",
    "tsconfig.json",
    "next-env.d.ts",
  ]) {
    await copyFile(join(APP_ROOT, name), join(appRuntimeRoot, name));
  }
  const entries = await readdir(appRuntimeRoot);
  if (entries.some((name) => name.startsWith(".env") || name === ".npmrc"))
    throw new Error("The sanitized Next project unexpectedly contains runtime credentials.");
  return appRuntimeRoot;
}

async function createIsolatedCmsRoot(stackRoot) {
  const runtimeRoot = join(stackRoot, "teleferico-cms");
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  await copyFile(join(CMS_ROOT, "package.json"), join(runtimeRoot, "package.json"));
  await symlink(join(CMS_ROOT, "node_modules"), join(runtimeRoot, "node_modules"), "dir");
  await copyTreeWithoutCredentialFiles(join(CMS_ROOT, "src"), join(runtimeRoot, "src"));
  await copyTreeWithoutCredentialFiles(
    join(CMS_ROOT, "database"),
    join(runtimeRoot, "database"),
  );
  await mkdir(join(runtimeRoot, "config"), { recursive: true, mode: 0o700 });
  for (const name of await readdir(join(CMS_ROOT, "config"))) {
    if (name.endsWith(".js"))
      await copyFile(join(CMS_ROOT, "config", name), join(runtimeRoot, "config", name));
  }
  await mkdir(join(runtimeRoot, "public", "uploads"), {
    recursive: true,
    mode: 0o700,
  });
  const entries = await readdir(runtimeRoot);
  if (entries.some((name) => name.startsWith(".env") || name === ".npmrc"))
    throw new Error("The sanitized Strapi project unexpectedly contains runtime credentials.");
  return runtimeRoot;
}

function launch(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    detached: process.platform !== "win32",
    shell: false,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });
  child.localFeedbackDiagnostic = "";
  child.localFeedbackDiagnosticScore = -1;
  child.localFeedbackOutput = "";
  child.localFeedbackRedactions = Object.entries(options.env)
    .filter(([name, value]) => /(token|secret|password|credential|jwt)/i.test(name) && value)
    .map(([, value]) => String(value));
  child.localFeedbackStderrBytes = 0;
  child.localFeedbackClosed = false;
  child.once("close", () => {
    child.localFeedbackClosed = true;
  });
  if (options.captureSafeFailure && child.stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      child.localFeedbackStderrBytes += Buffer.byteLength(text);
      const match = /LOCAL_FEEDBACK_CMS_FAILURE phase=[a-z-]+ name=[A-Za-z]+(?: code=[A-Z0-9_]+)?(?: message=[^\r\n]*)?/.exec(text);
      if (match) child.localFeedbackDiagnostic = match[0];
      else if (!child.localFeedbackDiagnostic && /\bERR_[A-Z0-9_]+\b/.test(text))
        child.localFeedbackDiagnostic = text.match(/\bERR_[A-Z0-9_]+\b/)[0];
      else if (!child.localFeedbackDiagnostic && /\b(?:TypeError|SyntaxError|Error):/.test(text))
        child.localFeedbackDiagnostic = text.match(/\b(?:TypeError|SyntaxError|Error):/)[0].slice(0, -1);
    });
  }
  if (options.captureFailureDiagnostic) {
    const capture = (stream) => {
      stream?.setEncoding("utf8");
      stream?.on("data", (chunk) => {
        let text = String(chunk).replace(/\u001b\[[0-9;]*m/g, "");
        for (const [name, value] of Object.entries(options.env)) {
          if (/(token|secret|password|credential|jwt)/i.test(name) && value)
            text = text.split(String(value)).join("[redacted]");
        }
        text = text.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]");
        child.localFeedbackOutput = `${child.localFeedbackOutput}${text}`.slice(-4_096);
        const errorLine = text
          .split(/\r?\n/)
          .find((line) => /(?:Error:|error|failed|Cannot find module|Module not found)/i.test(line));
        if (errorLine) {
          const score = /ELIFECYCLE|Command failed with exit code/i.test(errorLine)
            ? 0
            : /(?:Error:|TypeError:|Cannot find module|Module not found)/i.test(errorLine)
              ? 2
              : 1;
          if (score > child.localFeedbackDiagnosticScore) {
            child.localFeedbackDiagnostic = errorLine
              .replace(/[\r\n\t]+/g, " ")
              .slice(0, 300);
            child.localFeedbackDiagnosticScore = score;
          }
        }
      });
    };
    capture(child.stdout);
    capture(child.stderr);
  }
  child.once("error", () => {});
  return child;
}

async function waitForDescriptor(child, timeoutMs) {
  const descriptor = child.stdio[3];
  if (!descriptor) throw new Error("The isolated CMS descriptor pipe is unavailable.");
  return new Promise((resolveDescriptor, rejectDescriptor) => {
    let output = "";
    const timeout = setTimeout(() => {
      rejectDescriptor(new Error("The isolated CMS did not provision its runtime."));
    }, timeoutMs);
    descriptor.setEncoding("utf8");
    descriptor.on("data", (chunk) => {
      output += chunk;
      const newline = output.indexOf("\n");
      if (newline >= 0) {
        clearTimeout(timeout);
        try {
          resolveDescriptor(JSON.parse(output.slice(0, newline)));
        } catch {
          rejectDescriptor(new Error("The isolated CMS runtime descriptor was invalid."));
        }
      }
    });
    child.once("close", (code, signal) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        rejectDescriptor(
          new Error(
            child.localFeedbackDiagnostic ||
              `The isolated CMS exited before readiness (code ${code}, signal ${signal ?? "none"}, stderr bytes ${child.localFeedbackStderrBytes}).`,
          ),
        );
      }
    });
  });
}

async function waitForReadyText(child, marker, timeoutMs) {
  return new Promise((resolveReady, rejectReady) => {
    let output = "";
    const timeout = setTimeout(() => {
      rejectReady(new Error("A local feedback service did not become ready."));
    }, timeoutMs);
    const onData = (chunk) => {
      let text = String(chunk).replace(/\u001b\[[0-9;]*m/g, "");
      for (const secret of child.localFeedbackRedactions ?? [])
        text = text.split(secret).join("[redacted]");
      text = text.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [redacted]");
      output = `${output}${text}`.slice(-4_096);
      if (output.includes(marker)) {
        clearTimeout(timeout);
        resolveReady();
      }
    };
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.once("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        rejectReady(
          new Error(
            `A local feedback service exited before readiness (code ${code}): ${output.slice(-800)}`,
          ),
        );
      }
    });
  });
}

async function waitForLogin(child, url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = "connection-failed";
  while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        if (!child.localFeedbackClosed)
          await Promise.race([once(child, "close"), sleep(1_000)]);
      throw new Error(
        (child.localFeedbackDiagnosticScore > 0 && child.localFeedbackDiagnostic) ||
          `The isolated Next dev server exited before login readiness: ${child.localFeedbackOutput.slice(-800)}`,
      );
    }
    const ready = await fetch(url, { redirect: "manual" })
      .then(async (response) => {
        lastStatus = String(response.status);
        await response.body?.cancel().catch(() => undefined);
        return response.status === 200;
      })
      .catch(() => false);
    if (ready) return;
    await sleep(200);
  }
  throw new Error(
    child.localFeedbackDiagnostic ||
      `The isolated Next dev server did not become ready (HTTP ${lastStatus}).`,
  );
}

async function stopProcess(child, timeoutMs = 10_000) {
  if (!child || child.exitCode !== null) return;
  try {
    if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {}
  const exited = await Promise.race([
    once(child, "exit").then(() => true),
    sleep(timeoutMs).then(() => false),
  ]);
  if (exited) return;
  try {
    if (child.pid && process.platform !== "win32") process.kill(-child.pid, "SIGKILL");
    else child.kill("SIGKILL");
  } catch {}
  await Promise.race([once(child, "exit"), sleep(2_000)]);
}

function isolatedProcessEnvironment(stackRoot, values) {
  return {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    HOME: join(stackRoot, "home"),
    COREPACK_ENABLE_NETWORK: "0",
    COREPACK_HOME: process.env.COREPACK_HOME ?? join(homedir(), ".cache/node/corepack"),
    NPM_CONFIG_USERCONFIG: "/dev/null",
    NPM_CONFIG_GLOBALCONFIG: "/dev/null",
    XDG_CONFIG_HOME: join(stackRoot, "home", ".config"),
    ...values,
  };
}

export async function startLocalFeedbackStack() {
  const owner = `tb113_test_l4_${randomUUID().replaceAll("-", "")}`;
  const ownerSuffix = owner.slice("tb113_test_l4_".length);
  const marker = `tb113-local-feedback:${ownerSuffix}`;
  const stackRoot = await mkdtemp(join(tmpdir(), "tb113-local-feedback-"));
  const homeRoot = join(stackRoot, "home");
  const artifactRoot = join(
    stackRoot,
    "workspace",
    ".local",
    "tb113-private-reports",
  );
  const compose = (...operation) => [
    "compose",
    "--file",
    COMPOSE_FILE,
    "--project-name",
    owner,
    ...operation,
  ];
  let composeAttempted = false;
  let cms;
  let worker;
  let app;
  let stopped = false;

  const cleanup = async () => {
    if (stopped) return;
    stopped = true;
    const failures = [];
    for (const child of [app, worker, cms]) {
      try {
        await stopProcess(child);
      } catch {
        failures.push("A local service did not stop within its bound.");
      }
    }
    if (composeAttempted) {
      try {
        await docker(compose("down", "--volumes", "--remove-orphans", "--timeout=5"), 20_000);
      } catch {
        failures.push("The harness-owned PostgreSQL resources did not clean up.");
      }
      try {
        await assertNoOwnedResources(owner);
      } catch {
        failures.push("Harness-owned PostgreSQL resources remain after cleanup.");
      }
    }
    try {
      await rm(stackRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch {
      failures.push("The harness-owned temporary directory did not clean up.");
    }
    if (failures.length)
      throw new Error(`Local feedback harness cleanup failed: ${failures.join(" ")}`);
  };

  try {
    await Promise.all([assertPortAvailable(CMS_PORT), assertPortAvailable(APP_PORT)]);
    await assertNoOwnedResources(owner);
    await mkdir(homeRoot, { recursive: true, mode: 0o700 });
    // The isolated CMS source keeps its monorepo-relative pure contracts import.
    await symlink(join(REPO_ROOT, "packages"), join(stackRoot, "packages"), "dir");
    const appRoot = await createIsolatedAppRoot(stackRoot);
    const cmsRoot = await createIsolatedCmsRoot(stackRoot);
    const workerPort = await reserveWorkerPortPair();
    const workerUrl = `http://127.0.0.1:${workerPort}/internal/v1/report-runs:execute`;
    const cmsOrigin = `http://127.0.0.1:${CMS_PORT}`;
    const siteOrigin = `http://localhost:${APP_PORT}`;
    const secret = randomBytes(32).toString("hex");

    composeAttempted = true;
    await docker(compose("up", "--detach", "--wait"), 120_000);
    const databasePortOutput = await docker(compose("port", "postgres", "5432"));
    const databasePort = Number(databasePortOutput.stdout.trim().split(":").at(-1));
    if (!Number.isSafeInteger(databasePort) || databasePort < 1 || databasePort > 65_535)
      throw new Error("The isolated PostgreSQL port was invalid.");
    const databaseIdentity = await docker([
      "compose",
      "--file",
      COMPOSE_FILE,
      "--project-name",
      owner,
      "exec",
      "--no-TTY",
      "postgres",
      "psql",
      `--username=${CMS_DATABASE_USER}`,
      `--dbname=${CMS_DATABASE_NAME}`,
      "--tuples-only",
      "--no-align",
      "--command=SELECT current_database();",
    ]);
    if (databaseIdentity.stdout.trim() !== CMS_DATABASE_NAME)
      throw new Error("The isolated PostgreSQL identity did not match its fixed database.");

    const cmsEnvironment = isolatedProcessEnvironment(stackRoot, {
      NODE_ENV: "development",
      ENV_PATH: "/dev/null",
      HOST: "127.0.0.1",
      PORT: String(CMS_PORT),
      DATABASE_CLIENT: "postgres",
      DATABASE_HOST: "127.0.0.1",
      DATABASE_PORT: String(databasePort),
      DATABASE_NAME: CMS_DATABASE_NAME,
      DATABASE_USERNAME: CMS_DATABASE_USER,
      DATABASE_PASSWORD: CMS_DATABASE_PASSWORD,
      DATABASE_SSL: "false",
      DATABASE_POOL_MIN: "0",
      DATABASE_POOL_MAX: "10",
      APP_KEYS: `${secret}-app-1,${secret}-app-2`,
      API_TOKEN_SALT: `${secret}-api-token-salt`,
      ADMIN_JWT_SECRET: `${secret}-admin-jwt`,
      TRANSFER_TOKEN_SALT: `${secret}-transfer-token-salt`,
      JWT_SECRET: `${secret}-users-permissions-jwt`,
      BUILD_STRAPI_BASE_URL: cmsOrigin,
      FEEDBACK_CMS_ALLOWED_ORIGIN: cmsOrigin,
      FEEDBACK_WORKER_EVIDENCE_KEY: LOCAL_FEEDBACK_EVIDENCE_KEY_VERSION,
      FEEDBACK_VERTEX_PROJECT_ID: "teleferico-bariloche-2024",
      FEEDBACK_LOCAL_CMS_ROOT: cmsRoot,
      FEEDBACK_LOCAL_OWNER: marker,
      FEEDBACK_LOCAL_CMS_SECRET: `${secret}-content-api-secret`,
      FEEDBACK_LOCAL_OPERATOR_EMAIL: LOCAL_FEEDBACK_OPERATOR_EMAIL,
      FEEDBACK_LOCAL_OPERATOR_PASSWORD: LOCAL_FEEDBACK_OPERATOR_PASSWORD,
    });
    cms = launch(
      process.execPath,
      ["test/feedback/seed/local-feedback-browser-runtime.mjs"],
      {
        cwd: CMS_ROOT,
        env: cmsEnvironment,
        stdio: ["ignore", "ignore", "pipe", "pipe"],
        captureSafeFailure: true,
      },
    );
    const descriptor = await waitForDescriptor(cms, 90_000);

    const workerEnvironment = isolatedProcessEnvironment(stackRoot, {
      NODE_ENV: "development",
      ENV_PATH: "/dev/null",
      BUILD_STRAPI_BASE_URL: cmsOrigin,
      FEEDBACK_CMS_ALLOWED_ORIGIN: cmsOrigin,
      FEEDBACK_WORKER_CMS_TOKEN: descriptor.workerToken,
      FEEDBACK_WORKER_EVIDENCE_KEY: LOCAL_FEEDBACK_EVIDENCE_KEY_VERSION,
      FEEDBACK_VERTEX_PROJECT_ID: "teleferico-bariloche-2024",
      FEEDBACK_PRIVATE_BUCKET: "tb113-local-feedback-private",
      FEEDBACK_WORKER_URL: workerUrl,
      FEEDBACK_TASK_QUEUE_PATH: LOCAL_FEEDBACK_QUEUE_PATH,
    });
    worker = launch(
      process.execPath,
      ["--conditions=react-server", WORKER_RUNTIME, artifactRoot],
      { cwd: WORKER_ROOT, env: workerEnvironment },
    );
    await waitForReadyText(worker, "ISOLATED_LOCAL_REPORT_WORKER_READY", 30_000);

    const appEnvironment = isolatedProcessEnvironment(stackRoot, {
      NODE_ENV: "development",
      PORT: String(APP_PORT),
      AUTH_SECRET: randomBytes(32).toString("base64url"),
      AUTH_TRUST_HOST: "true",
      AUTH_URL: siteOrigin,
      NEXTAUTH_URL: siteOrigin,
      APP_INTERNAL_BASE_URL: siteOrigin,
      NEXT_PUBLIC_SITE_URL: siteOrigin,
      ENABLE_STATIC_LOCALE_PARAMS: "false",
      BUILD_STRAPI_BASE_URL: cmsOrigin,
      BUILD_STRAPI_BUCKET_HOSTNAME: "127.0.0.1",
      BUILD_STRAPI_BUCKET_PATHNAME: "/uploads/**",
      FEEDBACK_CMS_ALLOWED_ORIGIN: cmsOrigin,
      FEEDBACK_APP_CMS_TOKEN: descriptor.appToken,
      FEEDBACK_WORKER_EVIDENCE_KEY: LOCAL_FEEDBACK_EVIDENCE_KEY_VERSION,
      FEEDBACK_VERTEX_PROJECT_ID: "teleferico-bariloche-2024",
      FEEDBACK_PRIVATE_BUCKET: "tb113-local-feedback-private",
      FEEDBACK_WORKER_URL: workerUrl,
      FEEDBACK_TASK_QUEUE_PATH: LOCAL_FEEDBACK_QUEUE_PATH,
      FEEDBACK_CAPABILITY_ENABLED: "true",
      NEXT_TELEMETRY_DISABLED: "1",
    });
    app = launch(
      "pnpm",
      ["run", "dev", "--hostname", "localhost", "--port", String(APP_PORT)],
      { cwd: appRoot, env: appEnvironment, captureFailureDiagnostic: true },
    );
    await waitForLogin(app, `${siteOrigin}/es-AR/login`, 180_000);

    return Object.freeze({ stop: cleanup });
  } catch (error) {
    await cleanup().catch(() => undefined);
    if (error instanceof Error) throw error;
    throw new Error("The isolated local feedback stack failed to start.");
  }
}
