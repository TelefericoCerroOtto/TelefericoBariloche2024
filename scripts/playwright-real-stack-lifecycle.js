#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const net = require("node:net");
const { spawn } = require("node:child_process");

const LOG_LIMITS = Object.freeze({ maxBytes: 32 * 1024, maxLines: 80 });
const SERVICE_LOGS = Object.freeze({
  strapi: "/tmp/strapi-readiness.log",
  next: "/tmp/next-readiness.log",
});
const SIGNAL_CODES = Object.freeze({ SIGINT: 130, SIGTERM: 143 });

function normalizeExitCode(code) {
  return Number.isInteger(code) && code > 0 && code <= 255 ? code : 1;
}

function selectFinalResult({ primary = null, signal = null, cleanup = [] }) {
  const cleanupFailed = cleanup.some((result) => result.status !== "succeeded");
  let exitCode = 0;
  let outcome = "success";

  if (primary) {
    exitCode = normalizeExitCode(primary.code);
    outcome = cleanupFailed ? "primary-and-cleanup-failure" : "primary-failure";
  } else if (signal) {
    exitCode = SIGNAL_CODES[signal] ?? 1;
    outcome = cleanupFailed ? "primary-and-cleanup-failure" : "primary-failure";
  } else if (cleanupFailed) {
    exitCode = 1;
    outcome = "cleanup-failure";
  }

  return { primary, cleanup, exitCode, outcome };
}

function validateResourceName(actual, expected) {
  if (!actual || !expected || actual !== expected || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(actual)) {
    throw new Error(`Resource name is outside the expected build namespace: ${String(actual)}`);
  }
  return true;
}

function redact(content, secrets = []) {
  let redacted = content;
  for (const secret of secrets.filter(Boolean)) {
    redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/((?:password|secret|token|api[_-]?key|jwt)\s*[=:]\s*)[^\s,]+/gi, "$1[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]");
}

function truncateUtf8(content, maxBytes) {
  const buffer = Buffer.from(content);
  if (buffer.length <= maxBytes) return content;
  return buffer.subarray(buffer.length - maxBytes).toString("utf8").replace(/^\uFFFD+/, "");
}

function readBoundedLog(logPath, { allowedPaths, maxBytes, maxLines, secrets = [] }) {
  if (!Array.isArray(allowedPaths) || !allowedPaths.includes(logPath)) {
    throw new Error(`Diagnostic path is not allowlisted: ${logPath}`);
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 1 || !Number.isInteger(maxLines) || maxLines < 1) {
    throw new Error("Diagnostic limits must be positive integers.");
  }
  if (!fs.existsSync(logPath)) return { path: logPath, status: "missing", content: "" };

  const stat = fs.lstatSync(logPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`Diagnostic path must be a regular non-symlink file: ${logPath}`);
  }

  const readBytes = Math.min(stat.size, maxBytes);
  const buffer = Buffer.alloc(readBytes);
  const descriptor = fs.openSync(logPath, "r");
  try {
    fs.readSync(descriptor, buffer, 0, readBytes, stat.size - readBytes);
  } finally {
    fs.closeSync(descriptor);
  }
  const lines = buffer.toString("utf8").replace(/^\uFFFD+/, "").split(/\r?\n/).slice(-maxLines);
  const content = truncateUtf8(redact(lines.join("\n"), secrets), maxBytes);
  return { path: logPath, status: content ? "captured" : "empty", content };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, { timeoutMs, intervalMs, timeoutMessage = "Operation timed out." }) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (await predicate()) return true;
    await delay(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
  }
  const error = new Error(timeoutMessage);
  error.code = "ETIMEDOUT";
  throw error;
}

function processGroupExists(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error.code === "ESRCH") return false;
    throw error;
  }
}

class ManagedProcess {
  constructor(name, child, descriptor) {
    this.name = name;
    this.child = child;
    this.descriptor = descriptor;
    this.exit = null;
    this.exitPromise = new Promise((resolve) => {
      child.once("error", (error) => {
        this.exit = { code: 1, signal: null, error: error.message };
        resolve(this.exit);
      });
      child.once("exit", (code, signal) => {
        this.exit = { code: code ?? (signal ? SIGNAL_CODES[signal] ?? 1 : 1), signal, error: null };
        resolve(this.exit);
      });
    });
  }

  static start({ name, command, args, logPath, cwd, env = process.env }) {
    const descriptor = fs.openSync(logPath, "a", 0o600);
    try {
      const child = spawn(command, args, { cwd, env, detached: true, stdio: ["ignore", descriptor, descriptor] });
      return new ManagedProcess(name, child, descriptor);
    } catch (error) {
      fs.closeSync(descriptor);
      throw error;
    }
  }

  signalGroup(signal) {
    if (!processGroupExists(this.child.pid)) return "already-exited";
    process.kill(-this.child.pid, signal);
    return "sent";
  }

  async stop({ graceMs, killMs, intervalMs }) {
    const attempts = [];
    try {
      const termDetail = this.signalGroup("SIGTERM");
      attempts.push({ operation: "signal-term", status: "succeeded", detail: termDetail });
      if (termDetail === "sent") {
        try {
          await waitFor(() => !processGroupExists(this.child.pid), {
            timeoutMs: graceMs,
            intervalMs,
            timeoutMessage: `${this.name} did not stop after SIGTERM.`,
          });
        } catch (error) {
          if (error.code !== "ETIMEDOUT") throw error;
          const killDetail = this.signalGroup("SIGKILL");
          attempts.push({ operation: "signal-kill", status: "succeeded", detail: killDetail });
        }
      }

      await waitFor(() => !processGroupExists(this.child.pid), {
        timeoutMs: killMs,
        intervalMs,
        timeoutMessage: `${this.name} process group survived SIGKILL.`,
      });
      await Promise.race([
        this.exitPromise,
        delay(killMs).then(() => { throw new Error(`${this.name} leader was not reaped.`); }),
      ]);
      fs.closeSync(this.descriptor);
      this.descriptor = null;
      attempts.push({ operation: "reap", status: "succeeded", detail: "leader-reaped" });
      return { resource: this.name, operation: "process-group-cleanup", status: "succeeded", attempts };
    } catch (error) {
      if (this.descriptor !== null) {
        fs.closeSync(this.descriptor);
        this.descriptor = null;
      }
      attempts.push({ operation: "process-group-cleanup", status: "failed", detail: error.message });
      return { resource: this.name, operation: "process-group-cleanup", status: "failed", detail: error.message, attempts };
    }
  }
}

class CleanupRegistry {
  constructor() {
    this.resources = [];
    this.result = null;
    this.cleanupPromise = null;
  }

  register(kind, name, cleanup) {
    if (!kind || !name || typeof cleanup !== "function") throw new Error("Cleanup registration requires kind, name, and operation.");
    this.resources.push({ kind, name, cleanup });
  }

  async cleanup() {
    if (this.result) return this.result;
    if (!this.cleanupPromise) {
      this.cleanupPromise = (async () => {
        const results = [];
        for (const resource of [...this.resources].reverse()) {
          try {
            const detail = await resource.cleanup();
            results.push(detail && detail.status ? detail : {
              resource: resource.name,
              operation: "cleanup",
              status: "succeeded",
            });
          } catch (error) {
            results.push({
              resource: resource.name,
              operation: "cleanup",
              status: "failed",
              detail: error.message,
            });
          }
        }
        this.result = results;
        return results;
      })();
    }
    return this.cleanupPromise;
  }
}

function installSignalHandlers(signalState) {
  const onSignal = (signal) => {
    if (!signalState.signal) signalState.signal = signal;
    if (signalState.active) {
      try {
        signalState.active.signalGroup("SIGTERM");
      } catch {
        // The registered cleanup path records the bounded process-group outcome.
      }
    }
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);
  return {
    dispose() {
      process.off("SIGINT", onSignal);
      process.off("SIGTERM", onSignal);
    },
  };
}

function readinessFailure(phase, detail, code = 1) {
  return { kind: "readiness", phase, code: normalizeExitCode(code), detail };
}

function assertManagedProcessLive(name, managed, groupExists) {
  if (managed.exit || !groupExists(managed.child.pid)) {
    throw readinessFailure(`${name}-final-process`, "process-group-not-live", managed.exit?.code);
  }
}

async function probePostgresTcp(host, port, timeoutMs = 2_000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function verifyFinalReadiness({ strapi, next, signalState, postgresHost, postgresPort }, adapters = {}) {
  const groupExists = adapters.processGroupExists ?? processGroupExists;
  const fetchImpl = adapters.fetch ?? fetch;
  const tcpProbe = adapters.probeTcp ?? probePostgresTcp;
  const checkSignal = () => {
    if (signalState.signal) {
      throw { kind: "signal", phase: "final-readiness", signal: signalState.signal, code: SIGNAL_CODES[signalState.signal] };
    }
  };
  const checkHttp = async (name, url) => {
    checkSignal();
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(2_000) });
      if (!response.ok) throw readinessFailure(`${name}-final-readiness`, `http-status-${response.status ?? "unknown"}`);
    } catch (error) {
      if (error.kind) throw error;
      throw readinessFailure(`${name}-final-readiness`, "http-unreachable");
    }
  };

  checkSignal();
  assertManagedProcessLive("strapi", strapi, groupExists);
  assertManagedProcessLive("next", next, groupExists);
  await checkHttp("strapi", "http://127.0.0.1:1337/admin/init");
  await checkHttp("next", "http://127.0.0.1:3000/api/auth/providers");
  checkSignal();
  if (!await tcpProbe(postgresHost, postgresPort, 2_000)) {
    throw readinessFailure("postgres-final-readiness", "tcp-unreachable");
  }
  assertManagedProcessLive("strapi", strapi, groupExists);
  assertManagedProcessLive("next", next, groupExists);
}

function commandFailure(phase, result) {
  return { kind: "command", phase, code: normalizeExitCode(result.code), detail: result.signal ?? result.error ?? "nonzero-exit" };
}

async function runCommand(phase, command, args, options, signalState, monitored = []) {
  const managed = ManagedProcess.start({ name: phase, command, args, ...options });
  signalState.active = managed;
  const winner = await Promise.race([
    managed.exitPromise.then((result) => ({ type: "command", result })),
    ...monitored.map((process) => process.exitPromise.then((result) => ({ type: "monitor", process, result }))),
  ]);
  signalState.active = null;
  if (winner.type === "monitor") {
    await managed.stop({ graceMs: 1_000, killMs: 2_000, intervalMs: 50 });
    throw {
      kind: "readiness",
      phase,
      code: normalizeExitCode(winner.result.code),
      detail: `${winner.process.name}-exited-during-command`,
    };
  }
  const result = winner.result;
  if (managed.descriptor !== null) {
    fs.closeSync(managed.descriptor);
    managed.descriptor = null;
  }
  if (signalState.signal) throw { kind: "signal", phase, signal: signalState.signal, code: SIGNAL_CODES[signalState.signal] };
  if (result.code !== 0) throw commandFailure(phase, result);
}

async function waitForHttp(service, url, managed, signalState) {
  try {
    await waitFor(async () => {
      if (signalState.signal) throw { kind: "signal", phase: `${service}-readiness`, signal: signalState.signal, code: SIGNAL_CODES[signalState.signal] };
      if (managed.exit) throw { kind: "readiness", phase: `${service}-readiness`, code: normalizeExitCode(managed.exit.code), detail: "process-exited-before-ready" };
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
        return response.ok;
      } catch {
        return false;
      }
    }, { timeoutMs: 90_000, intervalMs: 2_000, timeoutMessage: `${service} readiness timed out.` });
  } catch (error) {
    if (error.kind) throw error;
    throw { kind: "readiness", phase: `${service}-readiness`, code: 1, detail: error.message };
  }
}

function printEvidence(primary, cleanup, services, secrets) {
  process.stderr.write(`TB122 evidence primary=${primary ? JSON.stringify(primary) : "success"}\n`);
  for (const [name, state] of Object.entries(services)) {
    process.stderr.write(`TB122 service resource=${name} state=${state}\n`);
  }
  for (const result of cleanup) process.stderr.write(`TB122 cleanup ${JSON.stringify(result)}\n`);
  if (primary || cleanup.some((result) => result.status !== "succeeded")) {
    for (const [name, logPath] of Object.entries(SERVICE_LOGS)) {
      const evidence = captureAllowedLog(logPath, secrets);
      process.stderr.write(`TB122 diagnostic resource=${name} path=${logPath} status=${evidence.status} lines<=${LOG_LIMITS.maxLines} bytes<=${LOG_LIMITS.maxBytes}\n`);
      if (evidence.content) process.stderr.write(`${evidence.content}\n`);
    }
  }
}

function captureAllowedLog(logPath, secrets) {
  try {
    return readBoundedLog(logPath, { allowedPaths: Object.values(SERVICE_LOGS), ...LOG_LIMITS, secrets });
  } catch (error) {
    return { path: logPath, status: `unavailable:${error.message}`, content: "" };
  }
}

async function main() {
  const readinessSecret = process.env.READINESS_SECRET;
  if (!readinessSecret) throw new Error("READINESS_SECRET is required.");

  const cleanupRegistry = new CleanupRegistry();
  const services = { strapi: "not-started", next: "not-started" };
  const signalState = { signal: null, active: null };
  const signalHandlers = installSignalHandlers(signalState);

  let primary = null;
  const sharedEnvironment = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_CLIENT: "postgres",
    DATABASE_PORT: "5432",
    DATABASE_SSL: "false",
    APP_KEYS: `${readinessSecret}-app-1,${readinessSecret}-app-2`,
    API_TOKEN_SALT: `${readinessSecret}-api`,
    ADMIN_JWT_SECRET: `${readinessSecret}-admin`,
    TRANSFER_TOKEN_SALT: `${readinessSecret}-transfer`,
    JWT_SECRET: `${readinessSecret}-jwt`,
  };

  try {
    await runCommand("cms-install", "npm", ["ci"], { cwd: "/workspace/teleferico-cms", env: process.env, logPath: SERVICE_LOGS.strapi }, signalState);
    await runCommand("cms-build", "npm", ["run", "build"], { cwd: "/workspace/teleferico-cms", env: sharedEnvironment, logPath: SERVICE_LOGS.strapi }, signalState);
    const strapi = ManagedProcess.start({ name: "strapi", command: "npm", args: ["run", "start"], cwd: "/workspace/teleferico-cms", env: sharedEnvironment, logPath: SERVICE_LOGS.strapi });
    services.strapi = "started";
    cleanupRegistry.register("process", "strapi", async () => strapi.stop({ graceMs: 5_000, killMs: 5_000, intervalMs: 100 }));
    await waitForHttp("strapi", "http://127.0.0.1:1337/admin/init", strapi, signalState);
    services.strapi = "ready";

    await runCommand("app-corepack", "corepack", ["enable"], { cwd: "/workspace/teleferico-app", env: process.env, logPath: SERVICE_LOGS.next }, signalState, [strapi]);
    await runCommand("app-pnpm-version", "bash", ["-c", 'test "$(corepack pnpm --version)" = "10.33.0"'], { cwd: "/workspace/teleferico-app", env: process.env, logPath: SERVICE_LOGS.next }, signalState, [strapi]);
    await runCommand("app-install", "pnpm", ["install", "--frozen-lockfile"], { cwd: "/workspace/teleferico-app", env: process.env, logPath: SERVICE_LOGS.next }, signalState, [strapi]);
    const appEnvironment = {
      ...process.env,
      APP_INTERNAL_BASE_URL: "http://127.0.0.1:3000",
      AUTH_SECRET: `${readinessSecret}-auth`,
      AUTH_TRUST_HOST: "true",
      BUILD_STRAPI_BASE_URL: "http://127.0.0.1:1337",
      BUILD_STRAPI_BUCKET_HOSTNAME: "127.0.0.1",
      BUILD_STRAPI_BUCKET_PATHNAME: "/uploads/**",
      NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3000",
    };
    const next = ManagedProcess.start({
      name: "next",
      command: "pnpm",
      args: ["exec", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"],
      cwd: "/workspace/teleferico-app",
      env: appEnvironment,
      logPath: SERVICE_LOGS.next,
    });
    services.next = "started";
    cleanupRegistry.register("process", "next", async () => next.stop({ graceMs: 5_000, killMs: 5_000, intervalMs: 100 }));
    await waitForHttp("next", "http://127.0.0.1:3000/api/auth/providers", next, signalState);
    services.next = "ready";
    await verifyFinalReadiness({
      strapi,
      next,
      signalState,
      postgresHost: process.env.DATABASE_HOST,
      postgresPort: Number(process.env.DATABASE_PORT ?? 5432),
    });
    services.strapi = "final-ready";
    services.next = "final-ready";
    process.stdout.write("Real PostgreSQL, Strapi, and Next.js readiness passed.\n");
  } catch (error) {
    primary = error && error.kind ? error : { kind: "command", phase: "lifecycle", code: 1, detail: error.message ?? String(error) };
  }

  const cleanup = await cleanupRegistry.cleanup();
  const effectivePrimary = primary ?? (signalState.signal ? {
    kind: "signal",
    phase: "cleanup",
    signal: signalState.signal,
    code: SIGNAL_CODES[signalState.signal],
  } : null);
  printEvidence(effectivePrimary, cleanup, services, [readinessSecret]);
  const final = selectFinalResult({ primary: effectivePrimary, signal: signalState.signal, cleanup });
  process.stderr.write(`TB122 evidence final=${JSON.stringify({ outcome: final.outcome, exitCode: final.exitCode })}\n`);
  signalHandlers.dispose();
  process.exitCode = final.exitCode;
}

module.exports = {
  CleanupRegistry,
  LOG_LIMITS,
  ManagedProcess,
  installSignalHandlers,
  readBoundedLog,
  selectFinalResult,
  validateResourceName,
  verifyFinalReadiness,
  waitFor,
  waitForHttp,
};

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`TB122 evidence primary=${JSON.stringify({ kind: "command", phase: "bootstrap", code: 1, detail: error.message })}\n`);
    process.stderr.write('TB122 evidence final={"outcome":"primary-failure","exitCode":1}\n');
    process.exitCode = 1;
  });
}
