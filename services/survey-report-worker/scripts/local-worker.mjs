import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createLocalTaskQueueServer } from "./local-task-queue.mjs";
import { createLocalDevelopmentOidc } from "./local-dev-oidc.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
process.env.PLAYWRIGHT_BROWSERS_PATH = join(ROOT, "dist", "browsers");
const require = createRequire(import.meta.url);
const {
  createDevelopmentReportWorkerDependencies,
  createPlaywrightPdfRenderer,
  createReportWorkerNodeServer,
  REPORT_WORKER_EXECUTE_PATH,
} = require(resolve(ROOT, "dist/server.cjs"));

function readLocalConfig(env) {
  const workerUrlValue = env.FEEDBACK_WORKER_URL;
  const queuePath = env.FEEDBACK_TASK_QUEUE_PATH;
  let workerUrl;
  try {
    workerUrl = new URL(workerUrlValue);
  } catch {
    throw new TypeError("Local worker configuration is unavailable");
  }
  if (
    workerUrl.protocol !== "http:" ||
    workerUrl.hostname !== "127.0.0.1" ||
    !/^[1-9][0-9]{0,4}$/.test(workerUrl.port) ||
    Number(workerUrl.port) >= 65_535 ||
    workerUrl.pathname !== REPORT_WORKER_EXECUTE_PATH ||
    workerUrl.search ||
    workerUrl.hash ||
    workerUrlValue !== `${workerUrl.origin}${REPORT_WORKER_EXECUTE_PATH}` ||
    !/^projects\/teleferico-bariloche-2024\/locations\/southamerica-east1\/queues\/[a-z][a-z0-9-]{0,62}$/.test(
      queuePath ?? "",
    )
  )
    throw new TypeError("Local worker configuration is unavailable");
  return { workerUrl, queuePath };
}

function localReportDependencies(env, ports) {
  return createDevelopmentReportWorkerDependencies(env, {
    ...ports,
    renderer: ports?.renderer ?? createPlaywrightPdfRenderer({
      fontPath: join(ROOT, "dist", "assets", "fonts", "DejaVuSans.ttf"),
    }),
  });
}

function listen(server, port) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolveListen();
    });
  });
}

function close(server) {
  return new Promise((resolveClose, reject) => {
    if (!server.listening) return resolveClose();
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
}

export function createLocalWorkerServers(env = process.env, ports = {}) {
  if (
    env.NODE_ENV !== "development" ||
    env.K_SERVICE ||
    env.K_REVISION ||
    (env.GOOGLE_APPLICATION_CREDENTIALS !== undefined &&
      env.GOOGLE_APPLICATION_CREDENTIALS !== "")
  )
    throw new TypeError("Local worker configuration is unavailable");
  const { workerUrl, queuePath } = readLocalConfig(env);
  const oidc = createLocalDevelopmentOidc({ audience: workerUrl.origin });
  const worker = createReportWorkerNodeServer({
    oidc,
    dependencies: localReportDependencies(env, ports),
  });
  const queue = createLocalTaskQueueServer({
    queuePath,
    workerUrl: workerUrl.toString(),
    audience: oidc.audience,
    principal: oidc.principal,
    createOidcToken: async () => oidc.createToken(),
  });
  return Object.freeze({
    worker,
    queue,
    workerUrl,
    workerPort: Number(workerUrl.port),
    queuePort: Number(workerUrl.port) + 1,
  });
}

export async function startLocalWorker(env = process.env, ports = {}) {
  const servers = createLocalWorkerServers(env, ports);
  try {
    await listen(servers.worker, servers.workerPort);
    await listen(servers.queue, servers.queuePort);
  } catch {
    await Promise.all([close(servers.worker), close(servers.queue)]);
    throw new Error("Local worker failed to bind its loopback listeners");
  }
  return Object.freeze({
    ...servers,
    async stop() {
      await Promise.all([close(servers.queue), close(servers.worker)]);
    },
  });
}

async function run() {
  let runtime;
  try {
    runtime = await startLocalWorker(process.env);
  } catch (error) {
    const message = error instanceof TypeError && error.message === "TB-113 report profile is not configured"
      ? error.message
      : "Local worker startup failed; verify loopback and report settings.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(
    `Local TB-113 worker: ${runtime.workerUrl.origin}${REPORT_WORKER_EXECUTE_PATH}\n`,
  );
  process.stdout.write(
    `Local TB-113 task API: http://127.0.0.1:${runtime.queuePort}/_local-tasks/v2\n`,
  );
  process.stdout.write("Both local listeners are restricted to 127.0.0.1.\n");
  const stop = () => {
    void runtime.stop().finally(() => process.exit());
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url)
  await run();
