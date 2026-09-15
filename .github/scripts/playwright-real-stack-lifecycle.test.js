const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const childProcess = require("node:child_process");
const test = require("node:test");

const root = path.join(__dirname, "..", "..");
const lifecycle = require("../../scripts/playwright-real-stack-lifecycle.js");
const realAuthLifecycle = require("../../scripts/playwright-real-auth-lifecycle.js");
const harnessPath = path.join(root, "scripts", "run-playwright-real-stack-readiness.sh");
const realAuthHarnessPath = path.join(root, "scripts", "run-playwright-real-auth.sh");

function createDockerStub() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-docker-"));
  const dockerPath = path.join(directory, "docker");
  const callsPath = path.join(directory, "calls.log");
  const stub = `#!/usr/bin/env bash
set -u
printf '%s\\n' "$*" >> "$STUB_CALLS"
command="$1"; shift
postgres_id="$(printf 'a%.0s' {1..64})"
runner_id="$(printf 'b%.0s' {1..64})"
case "$command" in
  version)
    [[ -n "\${STUB_DOCKER_VERSION_EXIT:-}" ]] && exit "$STUB_DOCKER_VERSION_EXIT"
    printf 'stub docker version\n'
    ;;
  create)
    name=""; label=""
    while (( "$#" )); do
      case "$1" in
        --name) shift; name="$1" ;;
        --label) shift; label="$1" ;;
      esac
      shift
    done
    if [[ "$name" == *postgres* ]]; then
      [[ -n "\${STUB_POSTGRES_CREATE_EXIT:-}" ]] && exit "$STUB_POSTGRES_CREATE_EXIT"
      id="$postgres_id"
    else
      [[ -n "\${STUB_RUNNER_CREATE_EXIT:-}" ]] && exit "$STUB_RUNNER_CREATE_EXIT"
      id="$runner_id"
    fi
    printf '%s' "$name" > "$STUB_STATE/name-$id"
    printf '%s' "\${label#*=}" > "$STUB_STATE/label-$id"
    printf '%s\\n' "$id"
    ;;
  start)
    if [[ "$*" == *--attach* ]]; then
      exit "\${STUB_RUNNER_EXIT:-0}"
    fi
    [[ -n "\${STUB_POSTGRES_START_EXIT:-}" ]] && exit "$STUB_POSTGRES_START_EXIT"
    exit 0
    ;;
  exec)
    exec_count=0
    [[ -f "$STUB_STATE/exec-count" ]] && exec_count="$(cat "$STUB_STATE/exec-count")"
    exec_count=$((exec_count + 1))
    printf '%s' "$exec_count" > "$STUB_STATE/exec-count"
    if [[ -n "\${STUB_POSTGRES_EXEC_ALWAYS_FAIL:-}" ]]; then
      exit "$STUB_POSTGRES_EXEC_ALWAYS_FAIL"
    fi
    if [[ "$exec_count" -gt 1 && -n "\${STUB_POSTGRES_FINAL_EXIT:-}" ]]; then
      exit "$STUB_POSTGRES_FINAL_EXIT"
    fi
    exit 0
    ;;
  inspect)
    id="\${!#}"
    if [[ -f "$STUB_STATE/removed-$id" ]]; then
      if [[ "\${STUB_VERIFY_INSPECT_FAIL_ID:-}" == "$id" ]]; then
        printf 'permission denied while contacting Docker daemon\n' >&2
        exit 125
      fi
      printf 'Error: No such object: %s\n' "$id" >&2
      exit 1
    fi
    if [[ "$*" == *Config.Labels* ]]; then
      name="$(cat "$STUB_STATE/name-$id")"
      label="$(cat "$STUB_STATE/label-$id")"
      printf '%s %s /%s\\n' "$id" "\${STUB_OWNERSHIP_LABEL:-$label}" "$name"
    elif [[ "$*" == *State.Running* ]]; then
      [[ -f "$STUB_STATE/stopped-$id" ]] && printf 'false\\n' || printf 'true\\n'
    else
      printf 'state=running running=true exit=0\\n'
    fi
    ;;
  stop)
    id="\${!#}"
    if [[ -n "\${STUB_CLEANUP_MARKER:-}" && ! -e "$STUB_CLEANUP_MARKER" ]]; then
      touch "$STUB_CLEANUP_MARKER"
      sleep 0.3
    fi
    touch "$STUB_STATE/stopped-$id"
    [[ "\${STUB_FAIL_STOP_ID:-}" == "$id" ]] && exit 20
    exit 0
    ;;
  rm)
    id="\${!#}"
    [[ "\${STUB_FAIL_REMOVE_ID:-}" == "$id" ]] && exit 21
    touch "$STUB_STATE/removed-$id"
    exit 0
    ;;
  logs)
    if [[ -n "\${STUB_DOCKER_LOGS:-}" ]]; then
      printf '%s\\n' "$STUB_DOCKER_LOGS"
    else
      printf 'Authorization: Bearer abc.def.ghi\\nDATABASE_PASSWORD=in-build-testbuild\\nservice diagnostic\\n'
    fi
    ;;
  *) exit 22 ;;
esac
`;
  fs.writeFileSync(dockerPath, stub, { mode: 0o755 });
  return { directory, callsPath };
}

function installReadinessTimingStubs(directory) {
  const timingCallsPath = path.join(directory, "timing-calls.log");
  fs.writeFileSync(path.join(directory, "date"), `#!/usr/bin/env bash
set -u
count=0
[[ -f "$STUB_STATE/date-count" ]] && count="$(cat "$STUB_STATE/date-count")"
count=$((count + 1))
printf '%s' "$count" > "$STUB_STATE/date-count"
case "$count" in
  1) now=10 ;;
  2) now=20 ;;
  3) now=30 ;;
  4) now=40 ;;
  5) now=50 ;;
  6) now=60 ;;
  7) now=64 ;;
  *) now=70 ;;
esac
printf '%s\\n' "$now"
`, { mode: 0o755 });
  fs.writeFileSync(path.join(directory, "timeout"), `#!/usr/bin/env bash
set -u
printf '%s\\n' "$*" >> "$STUB_TIMING_CALLS"
while [[ "$1" == --* ]]; do shift; done
shift
exec "$@"
`, { mode: 0o755 });
  fs.writeFileSync(path.join(directory, "sleep"), `#!/usr/bin/env bash
set -u
printf 'sleep %s\\n' "$*" >> "$STUB_TIMING_CALLS"
`, { mode: 0o755 });
  return timingCallsPath;
}

function harnessEnvironment(directory, callsPath, environment) {
  return {
    ...process.env,
    BUILD_ID: "test-build",
    PATH: `${directory}:${process.env.PATH}`,
    STUB_CALLS: callsPath,
    STUB_STATE: directory,
    ...environment,
  };
}

function runHarnessWithDockerStub(environment = {}, selectedHarness = harnessPath, args = []) {
  const { directory, callsPath } = createDockerStub();
  if (environment.STUB_NODE_PREFLIGHT_EXIT) {
    fs.writeFileSync(path.join(directory, "node"), `#!/usr/bin/env bash\nexit ${environment.STUB_NODE_PREFLIGHT_EXIT}\n`, { mode: 0o755 });
  }
  const result = childProcess.spawnSync("bash", [selectedHarness, ...args], {
    cwd: root,
    encoding: "utf8",
    env: harnessEnvironment(directory, callsPath, environment),
    timeout: 10_000,
  });
  const calls = fs.existsSync(callsPath) ? fs.readFileSync(callsPath, "utf8") : "";
  fs.rmSync(directory, { recursive: true, force: true });
  return { ...result, calls };
}

async function runHarnessWithSignalDuringCleanup(signal) {
  const { directory, callsPath } = createDockerStub();
  const marker = path.join(directory, "cleanup-started");
  const child = childProcess.spawn("bash", [harnessPath], {
    env: harnessEnvironment(directory, callsPath, { STUB_CLEANUP_MARKER: marker }),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  try {
    await lifecycle.waitFor(() => fs.existsSync(marker), { timeoutMs: 2_000, intervalMs: 10 });
    process.kill(child.pid, signal);
    const result = await Promise.race([
      new Promise((resolve) => child.once("close", (status, closeSignal) => resolve({ status, signal: closeSignal }))),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Harness did not finish after cleanup signal.")), 5_000)),
    ]);
    return {
      ...result,
      stdout,
      stderr,
      calls: fs.readFileSync(callsPath, "utf8"),
    };
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function expectedNamespace(buildId) {
  return crypto.createHash("sha256").update(buildId).digest("hex").slice(0, 24);
}

function realAuthEnvironment(overrides = {}) {
  const namespace = "a".repeat(24);
  return {
    NODE_ENV: "test",
    PLAYWRIGHT_REAL_AUTH_OPT_IN: "provision",
    PLAYWRIGHT_REAL_AUTH_RUN_ID: namespace,
    PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_HOST: `tb122-real-auth-postgres-${namespace}`,
    PLAYWRIGHT_REAL_AUTH_EXPECTED_DATABASE_NAME: `tb122_real_auth_${namespace}`,
    PLAYWRIGHT_REAL_AUTH_MANIFEST_PATH: `/tmp/tb122-real-auth-${namespace}/manifest.json`,
    DATABASE_CLIENT: "postgres",
    DATABASE_HOST: `tb122-real-auth-postgres-${namespace}`,
    DATABASE_NAME: `tb122_real_auth_${namespace}`,
    ...overrides,
  };
}

test("preserves primary identity and cleanup precedence", () => {
  const cases = [
    [{ primary: null, cleanup: [] }, 0, "success"],
    [{ primary: { kind: "command", code: 23 }, cleanup: [] }, 23, "primary-failure"],
    [{ primary: null, cleanup: [{ status: "failed" }] }, 1, "cleanup-failure"],
    [{ primary: { kind: "readiness", code: 17 }, cleanup: [{ status: "failed" }] }, 17, "primary-and-cleanup-failure"],
  ];
  for (const [input, exitCode, outcome] of cases) {
    const result = lifecycle.selectFinalResult(input);
    assert.equal(result.exitCode, exitCode);
    assert.equal(result.outcome, outcome);
  }
});

test("preserves signal exits unless an earlier primary failure governs", () => {
  assert.equal(lifecycle.selectFinalResult({ signal: "SIGINT", cleanup: [] }).exitCode, 130);
  assert.equal(lifecycle.selectFinalResult({ signal: "SIGTERM", cleanup: [] }).exitCode, 143);
  assert.equal(lifecycle.selectFinalResult({ primary: { code: 17 }, signal: "SIGTERM", cleanup: [] }).exitCode, 17);
});

test("cleanup registry is reverse-ordered, exhaustive, and idempotent", async () => {
  const attempts = [];
  const registry = new lifecycle.CleanupRegistry();
  registry.register("process", "strapi", async () => { attempts.push("strapi"); throw new Error("failed"); });
  registry.register("process", "next", async () => attempts.push("next"));
  const [first, second] = await Promise.all([registry.cleanup(), registry.cleanup()]);
  assert.deepEqual(attempts, ["next", "strapi"]);
  assert.deepEqual(second, first);
  assert.deepEqual(first.map(({ status }) => status), ["succeeded", "failed"]);
});

test("bounded log evidence redacts secrets and login query values", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-log-"));
  const logPath = path.join(directory, "service.log");
  try {
    fs.writeFileSync(logPath, "identifier=user&password=secret-value\nAuthorization: Bearer abc.def.ghi\n");
    const evidence = lifecycle.readBoundedLog(logPath, {
      allowedPaths: [logPath],
      maxBytes: 96,
      maxLines: 2,
      secrets: ["secret-value"],
    });
    assert.ok(Buffer.byteLength(evidence.content) <= 96);
    assert.doesNotMatch(evidence.content, /secret-value|abc\.def\.ghi|identifier=user/);
    assert.match(evidence.content, /\[REDACTED\]/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("bounded log evidence redacts a configured secret before the final byte crop", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-split-log-"));
  const logPath = path.join(directory, "service.log");
  const marker = "synthetic-boundary-marker";
  try {
    fs.writeFileSync(logPath, `${"p".repeat(80)}\nvalue=${marker}\n${"z".repeat(18)}\n`);
    const evidence = lifecycle.readBoundedLog(logPath, {
      allowedPaths: [logPath],
      maxBytes: 32,
      maxLines: 4,
      secrets: [marker],
    });
    assert.ok(Buffer.byteLength(evidence.content) <= 32);
    assert.doesNotMatch(evidence.content, new RegExp(marker));
    assert.doesNotMatch(evidence.content, /boundary-marker/);
    assert.match(evidence.content, /\[REDACTED\]/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("line-leading login fields survive line limiting with redacted values", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-leading-fields-"));
  const logPath = path.join(directory, "service.log");
  try {
    fs.writeFileSync(logPath, [
      "discarded line",
      "identifier=synthetic-user",
      "password=synthetic-password",
      "useful line",
    ].join("\n"));
    const evidence = lifecycle.readBoundedLog(logPath, {
      allowedPaths: [logPath],
      maxBytes: 256,
      maxLines: 3,
    });
    assert.deepEqual(evidence.content.split("\n"), [
      "identifier=[REDACTED]",
      "password=[REDACTED]",
      "useful line",
    ]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("real-auth preflight rejects exact identity mismatches before provisioning commands", async () => {
  const commands = [];
  await assert.rejects(
    realAuthLifecycle.runValidatedRealAuthPhases(
      realAuthEnvironment({ DATABASE_NAME: "wrong_database" }),
      { provision: async () => commands.push("cms-install") },
    ),
    /Database identity does not match/,
  );
  assert.deepEqual(commands, []);
});

test("real-auth preflight validates namespace, manifest binding, and prohibited environment keys", () => {
  assert.equal(realAuthLifecycle.validateRealAuthPreflight(realAuthEnvironment()).namespace, "a".repeat(24));
  assert.throws(
    () => realAuthLifecycle.validateRealAuthPreflight(realAuthEnvironment({ PLAYWRIGHT_REAL_AUTH_RUN_ID: "invalid" })),
    /exactly 24 lowercase hexadecimal/,
  );
  assert.throws(
    () => realAuthLifecycle.validateRealAuthPreflight(realAuthEnvironment({ PLAYWRIGHT_REAL_AUTH_MANIFEST_PATH: "/tmp/other/manifest.json" })),
    /outside the run-scoped temporary directory/,
  );
  assert.throws(
    () => realAuthLifecycle.validateRealAuthPreflight(realAuthEnvironment({ DATABASE_URL: "synthetic-prohibited-value" })),
    /DATABASE_URL is prohibited/,
  );
});

test("runRealAuthPhases preserves verification, synthetic cleanup, and service cleanup precedence", async () => {
  const calls = [];
  const primary = new Error("synthetic verification failure");
  const result = await realAuthLifecycle.runRealAuthPhases({
    provision: async (markAttempted) => { calls.push("provision"); markAttempted(); return "a".repeat(256); },
    startStrapi: async () => { calls.push("start-strapi"); },
    startNext: async () => { calls.push("start-next"); },
    runPlaywright: async () => { calls.push("playwright"); },
    verifySyntheticState: async () => { calls.push("verify"); throw primary; },
    cleanupSyntheticState: async () => { calls.push("cleanup-synthetic"); throw new Error("synthetic cleanup failure"); },
    stopServices: async () => {
      calls.push("stop-services");
      return [
        { resource: "next", operation: "cleanup", status: "failed", detail: "next stop failure" },
        { resource: "strapi", operation: "cleanup", status: "succeeded" },
      ];
    },
  });
  assert.equal(result.primary, primary);
  assert.deepEqual(calls, ["provision", "start-strapi", "start-next", "playwright", "verify", "cleanup-synthetic", "stop-services"]);
  assert.deepEqual(result.cleanup.map(({ name, resource, status }) => ({ name, resource, status })), [
    { name: "synthetic-cleanup", resource: undefined, status: "failed" },
    { name: undefined, resource: "next", status: "failed" },
    { name: undefined, resource: "strapi", status: "succeeded" },
  ]);
});

test("printDiagnostics emits bounded useful context without sensitive values", async () => {
  const marker = "synthetic-boundary-marker";
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-diagnostics-"));
  const logPath = path.join(directory, "diagnostic.log");
  const sourceContent = [
    ...Array.from({ length: 76 }, (_, index) => `metadata-${index}=${"p".repeat(512)}`),
    `value=${marker}`,
    "identifier=synthetic-user",
    "password=synthetic-password",
    "phase=playwright failure=synthetic",
  ].join("\n");
  fs.writeFileSync(logPath, sourceContent);
  const reads = [];
  let output = "";
  const originalReadBoundedLog = lifecycle.readBoundedLog;
  const originalWrite = process.stderr.write;
  lifecycle.readBoundedLog = (requestedLogPath, options) => {
    const evidence = originalReadBoundedLog(logPath, {
      ...options,
      allowedPaths: [logPath],
    });
    reads.push({ logPath: requestedLogPath, options, evidence });
    return evidence;
  };
  process.stderr.write = (chunk) => {
    output += String(chunk);
    return true;
  };

  try {
    realAuthLifecycle.printDiagnostics(
      { kind: "command", phase: "playwright-real-auth", code: 23, detail: marker },
      [{ name: "synthetic-cleanup", status: "failed", detail: marker }],
      { strapi: "ready", next: "failed", syntheticData: "cleanup-started" },
      [marker],
    );
  } finally {
    lifecycle.readBoundedLog = originalReadBoundedLog;
    process.stderr.write = originalWrite;
    fs.rmSync(directory, { recursive: true, force: true });
  }

  assert.equal(reads.length, 4);
  assert.ok(Buffer.byteLength(sourceContent) > lifecycle.LOG_LIMITS.maxBytes);
  for (const { options, evidence } of reads) {
    assert.equal(options.maxBytes, lifecycle.LOG_LIMITS.maxBytes);
    assert.equal(options.maxLines, lifecycle.LOG_LIMITS.maxLines);
    assert.deepEqual(options.secrets, [marker]);
    assert.equal(evidence.status, "captured");
    assert.ok(Buffer.byteLength(evidence.content) <= lifecycle.LOG_LIMITS.maxBytes);
  }
  const outputCeiling = reads.length * lifecycle.LOG_LIMITS.maxBytes + 4_096;
  assert.ok(Buffer.byteLength(output) <= outputCeiling);
  assert.doesNotMatch(output, /synthetic-boundary-marker|boundary-marker|synthetic-user|synthetic-password/);
  assert.match(output, /value=\[REDACTED\]/);
  assert.match(output, /identifier=\[REDACTED\]/);
  assert.match(output, /password=\[REDACTED\]/);
  assert.match(output, /primary=.*"phase":"playwright-real-auth".*"code":23/);
  assert.match(output, /cleanup=.*"name":"synthetic-cleanup".*"status":"failed"/);
  assert.match(output, /resource=strapi state=ready/);
  assert.match(output, /resource=next state=failed/);
  assert.match(output, /phase=playwright failure=synthetic/);
  assert.match(output, /diagnostic resource=playwright status=captured lines<=80 bytes<=32768/);
});

test("real-auth token and Playwright argument contracts remain exact", () => {
  const token = "a".repeat(256);
  assert.equal(realAuthLifecycle.validateContentToken(token), token);
  for (const value of ["", "a".repeat(255), "g".repeat(256), undefined]) {
    assert.throws(() => realAuthLifecycle.validateContentToken(value), /missing or invalid/);
  }
  assert.deepEqual(realAuthLifecycle.buildPlaywrightArguments(), [
    "exec",
    "playwright",
    "test",
    "--config=playwright.real-auth.config.ts",
  ]);
});

test("readiness harness uses bounded redaction for line-leading login fields", () => {
  const result = runHarnessWithDockerStub({
    STUB_RUNNER_EXIT: "23",
    STUB_DOCKER_LOGS: "identifier=synthetic-user\npassword=synthetic-password\nservice diagnostic",
  });
  assert.equal(result.status, 23, result.stderr);
  assert.doesNotMatch(result.stderr, /synthetic-user|synthetic-password/);
  assert.match(result.stderr, /identifier=\[REDACTED\]/);
  assert.match(result.stderr, /password=\[REDACTED\]/);
});

test("readiness harness fails runtime preflight before creating resources", () => {
  const dockerFailure = runHarnessWithDockerStub({ STUB_DOCKER_VERSION_EXIT: "17" });
  assert.equal(dockerFailure.status, 1, dockerFailure.stderr);
  assert.equal(dockerFailure.calls, "version\n");
  assert.match(dockerFailure.stderr, /Docker CLI cannot reach the build Docker daemon; no harness resources were created/);

  const nodeFailure = runHarnessWithDockerStub({ STUB_NODE_PREFLIGHT_EXIT: "18" });
  assert.equal(nodeFailure.status, 1, nodeFailure.stderr);
  assert.equal(nodeFailure.calls, "version\n");
  assert.match(nodeFailure.stderr, /Node\.js cannot load the bounded diagnostic redaction implementation; no harness resources were created/);
});

test("anonymous descriptor capture is bounded", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-fd-"));
  const logPath = path.join(directory, "command.log");
  try {
    const output = await lifecycle.runCommand(
      "fd-capture",
      process.execPath,
      ["-e", 'require("node:fs").writeSync(3, "a".repeat(32))'],
      { logPath, captureFd3MaxBytes: 32 },
      { signal: null, active: null },
    );
    assert.equal(output, "a".repeat(32));
    await assert.rejects(
      lifecycle.runCommand(
        "fd-overflow",
        process.execPath,
        ["-e", 'require("node:fs").writeSync(3, "a".repeat(33))'],
        { logPath, captureFd3MaxBytes: 32 },
        { signal: null, active: null },
      ),
      /exceeded its byte limit/,
    );
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("readiness harness keeps owned cleanup in reverse order", () => {
  const result = runHarnessWithDockerStub();
  const runnerRemove = result.calls.indexOf(`rm --force ${"b".repeat(64)}`);
  const postgresRemove = result.calls.indexOf(`rm --force ${"a".repeat(64)}`);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(runnerRemove >= 0 && postgresRemove > runnerRemove);
  assert.match(result.stderr, /final=outcome:success exit:0/);
});

test("readiness harness preserves failure identity while attempting all cleanup", () => {
  const result = runHarnessWithDockerStub({
    STUB_RUNNER_EXIT: "23",
    STUB_FAIL_STOP_ID: "b".repeat(64),
    STUB_FAIL_REMOVE_ID: "a".repeat(64),
  });
  assert.equal(result.status, 23, result.stderr);
  assert.match(result.stderr, /primary=failed kind=command phase=runner code=23/);
  assert.match(result.stderr, /final=outcome:primary-and-cleanup-failure exit:23/);
  assert.doesNotMatch(result.stderr, /abc\.def\.ghi|in-build-testbuild/);
});

test("readiness harness refuses cleanup without exact ownership", () => {
  const result = runHarnessWithDockerStub({ STUB_OWNERSHIP_LABEL: "anotherbuild" });
  assert.equal(result.status, 1, result.stderr);
  assert.doesNotMatch(result.calls, /^rm /m);
  assert.match(result.stderr, /ownership-not-proven/);
});

test("real-auth entrypoint selects its isolated database and lifecycle", () => {
  const result = runHarnessWithDockerStub({}, realAuthHarnessPath);
  const namespace = expectedNamespace("test-build");
  const creates = result.calls.match(/^create .*$/gm);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(creates.length, 2);
  assert.match(creates[0], new RegExp(`--name tb122-real-auth-postgres-${namespace}`));
  assert.match(creates[0], new RegExp(`POSTGRES_DB=tb122_real_auth_${namespace}`));
  assert.match(creates[1], /--network cloudbuild/);
  assert.match(creates[1], /--volume \/workspace:\/workspace/);
  assert.match(creates[1], /node scripts\/playwright-real-auth-lifecycle\.js$/);
});

test("real-auth wrapper rejects every argument before Docker access", () => {
  const result = runHarnessWithDockerStub({}, realAuthHarnessPath, ["--unknown"]);
  assert.equal(result.status, 2, result.stderr);
  assert.equal(result.calls, "");
  assert.equal(result.stderr, "The real-auth harness accepts no arguments.\n");
});

test("build namespaces remain deterministic and distinct", () => {
  const ids = ["A-b", "ab", `${"a".repeat(80)}-one`, `${"a".repeat(80)}-two`];
  const names = ids.map((buildId) => {
    const result = runHarnessWithDockerStub({ BUILD_ID: buildId });
    const name = result.calls.match(/create --name (tb122-readiness-postgres-[a-z0-9-]+)/)?.[1];
    assert.equal(name, `tb122-readiness-postgres-${expectedNamespace(buildId)}`);
    return name;
  });
  assert.equal(new Set(names).size, ids.length);
});

test("final readiness checks both services and PostgreSQL", async () => {
  const calls = [];
  await lifecycle.verifyFinalReadiness({
    strapi: { name: "strapi", exit: null, child: { pid: 101 } },
    next: { name: "next", exit: null, child: { pid: 102 } },
    signalState: { signal: null },
    postgresHost: "postgres-build",
    postgresPort: 5432,
  }, {
    processGroupExists: (pid) => { calls.push(`process:${pid}`); return true; },
    fetch: async (url) => { calls.push(`http:${url}`); return { ok: true }; },
    probeTcp: async (host, port) => { calls.push(`postgres:${host}:${port}`); return true; },
  });
  assert.deepEqual(calls, [
    "process:101",
    "process:102",
    "http:http://127.0.0.1:1337/admin/init",
    "http:http://127.0.0.1:3000/api/auth/providers",
    "postgres:postgres-build:5432",
    "process:101",
    "process:102",
  ]);
});

test("preserves primary identity while cleanup contributes only secondary failures", () => {
  const cases = [
    [{ primary: null, cleanup: [] }, 0, "success"],
    [{ primary: { kind: "command", code: 23, phase: "cms-build" }, cleanup: [] }, 23, "primary-failure"],
    [{ primary: null, cleanup: [{ resource: "next", operation: "terminate", detail: "denied" }] }, 1, "cleanup-failure"],
    [{ primary: { kind: "readiness", code: 1, phase: "next-readiness" }, cleanup: [{ resource: "strapi", operation: "kill", detail: "timeout" }] }, 1, "primary-and-cleanup-failure"],
  ];

  for (const [input, exitCode, outcome] of cases) {
    const result = lifecycle.selectFinalResult(input);
    assert.equal(result.exitCode, exitCode);
    assert.equal(result.outcome, outcome);
    assert.deepEqual(result.primary, input.primary);
    assert.deepEqual(result.cleanup, input.cleanup);
  }
});

test("preserves signal exits unless a pre-existing non-signal primary failure is stronger", () => {
  assert.equal(lifecycle.selectFinalResult({ primary: { kind: "signal", signal: "SIGINT", code: 130 }, cleanup: [] }).exitCode, 130);
  assert.equal(lifecycle.selectFinalResult({ primary: { kind: "signal", signal: "SIGTERM", code: 143 }, cleanup: [] }).exitCode, 143);
  assert.equal(lifecycle.selectFinalResult({ primary: { kind: "command", phase: "cms-build", code: 17 }, signal: "SIGTERM", cleanup: [] }).exitCode, 17);
});

test("cleanup is reverse-ordered, exhaustive, partial-startup tolerant, and idempotent", async () => {
  const attempts = [];
  const registry = new lifecycle.CleanupRegistry();
  registry.register("process", "strapi", async () => {
    attempts.push("strapi");
    throw new Error("term failed");
  });
  registry.register("process", "next", async () => attempts.push("next"));

  const [first, second] = await Promise.all([registry.cleanup(), registry.cleanup()]);
  const third = await registry.cleanup();

  assert.deepEqual(attempts, ["next", "strapi"]);
  assert.equal(first.length, 2);
  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
  assert.deepEqual(first.map(({ resource, operation, status }) => ({ resource, operation, status })), [
    { resource: "next", operation: "cleanup", status: "succeeded" },
    { resource: "strapi", operation: "cleanup", status: "failed" },
  ]);
});

test("resource validation accepts only the current build namespace", () => {
  assert.equal(lifecycle.validateResourceName("tb122-readiness-runner-build123", "tb122-readiness-runner-build123"), true);
  for (const value of ["", "tb122-readiness-runner-", "tb122-readiness-runner-build123-extra", "other-build", "*"]) {
    assert.throws(() => lifecycle.validateResourceName(value, "tb122-readiness-runner-build123"));
  }
});

test("bounded log evidence limits bytes and lines and redacts secrets", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-log-"));
  const logPath = path.join(directory, "service.log");
  try {
    fs.writeFileSync(logPath, [
      "old line",
      "Authorization: Bearer abc.def.ghi",
      "DATABASE_PASSWORD=super-secret",
      "useful line one",
      "useful line two",
      "useful line three",
    ].join("\n"));
    const evidence = lifecycle.readBoundedLog(logPath, {
      allowedPaths: [logPath],
      maxBytes: 96,
      maxLines: 4,
      secrets: ["super-secret"],
    });

    assert.ok(Buffer.byteLength(evidence.content) <= 96);
    assert.ok(evidence.content.split("\n").length <= 4);
    assert.doesNotMatch(evidence.content, /abc\.def\.ghi|super-secret/);
    assert.match(evidence.content, /\[REDACTED\]/);
    assert.equal(evidence.status, "captured");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("bounded log evidence distinguishes missing and rejected paths", () => {
  const allowed = path.join(os.tmpdir(), "tb122-missing.log");
  assert.equal(lifecycle.readBoundedLog(allowed, { allowedPaths: [allowed], maxBytes: 64, maxLines: 2 }).status, "missing");
  assert.throws(() => lifecycle.readBoundedLog("/etc/passwd", { allowedPaths: [allowed], maxBytes: 64, maxLines: 2 }));
});

test("managed process cleanup reaches descendants and escalates within bounds", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-process-"));
  const childPidPath = path.join(directory, "child.pid");
  const logPath = path.join(directory, "process.log");
  const parentSource = [
    'const { spawn } = require("node:child_process");',
    'const fs = require("node:fs");',
    'process.on("SIGTERM", () => {});',
    'const child = spawn(process.execPath, ["-e", "process.on(\\"SIGTERM\\",()=>{});setInterval(()=>{},1000)"], { stdio: "ignore" });',
    'fs.writeFileSync(process.argv[1], String(child.pid));',
    'setInterval(() => {}, 1000);',
  ].join("");

  try {
    const managed = lifecycle.ManagedProcess.start({
      name: "descendant-test",
      command: process.execPath,
      args: ["-e", parentSource, childPidPath],
      logPath,
    });
    await lifecycle.waitFor(() => fs.existsSync(childPidPath), { timeoutMs: 2_000, intervalMs: 20 });
    const childPid = Number(fs.readFileSync(childPidPath, "utf8"));
    const result = await managed.stop({ graceMs: 100, killMs: 1_000, intervalMs: 20 });

    assert.equal(result.status, "succeeded");
    assert.ok(result.attempts.some((attempt) => attempt.operation === "signal-term"));
    assert.ok(result.attempts.some((attempt) => attempt.operation === "signal-kill"));
    assert.ok(result.attempts.some((attempt) => attempt.operation === "reap"));
    assert.throws(() => process.kill(childPid, 0), { code: "ESRCH" });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("HTTP readiness fails immediately when its supervised process exits", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-readiness-death-"));
  const logPath = path.join(directory, "service.log");
  try {
    const managed = lifecycle.ManagedProcess.start({
      name: "early-exit",
      command: process.execPath,
      args: ["-e", "process.exit(7)"],
      logPath,
    });
    await managed.exitPromise;
    const startedAt = Date.now();
    await assert.rejects(
      lifecycle.waitForHttp("early-exit", "http://127.0.0.1:1/never", managed, { signal: null, active: null }),
      (error) => error.kind === "readiness" && error.detail === "process-exited-before-ready",
    );
    assert.ok(Date.now() - startedAt < 500);
    await managed.stop({ graceMs: 50, killMs: 100, intervalMs: 10 });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("container harness registers owned resources and cleans them in reverse order", () => {
  const result = runHarnessWithDockerStub();
  assert.equal(result.status, 0, result.stderr);
  const runnerRemove = result.calls.indexOf(`rm --force ${"b".repeat(64)}`);
  const postgresRemove = result.calls.indexOf(`rm --force ${"a".repeat(64)}`);
  assert.ok(runnerRemove >= 0 && postgresRemove > runnerRemove);
  assert.match(result.stderr, /primary=success/);
  assert.match(result.stderr, /resource=runner operation=remove status=succeeded/);
  assert.match(result.stderr, /resource=postgres operation=remove status=succeeded/);
  assert.match(result.stderr, /resource=runner operation=verify-removed status=succeeded detail=absent/);
  assert.match(result.stderr, /resource=postgres operation=verify-removed status=succeeded detail=absent/);
  assert.match(result.stderr, /final=outcome:success exit:0/);
});

test("runner container uses an init process without changing PostgreSQL creation", () => {
  const result = runHarnessWithDockerStub();
  assert.equal(result.status, 0, result.stderr);
  const createCalls = result.calls.match(/^create .*$/gm);

  assert.equal(createCalls.length, 2, result.calls);
  assert.doesNotMatch(createCalls[0], /(?:^|\s)--init(?:\s|$)/);
  assert.match(createCalls[1], /(?:^|\s)--init(?:\s|$)/);
});

test("container removal treats operational inspect failure as cleanup failure and continues", () => {
  const runnerId = "b".repeat(64);
  const postgresId = "a".repeat(64);
  const result = runHarnessWithDockerStub({ STUB_VERIFY_INSPECT_FAIL_ID: runnerId });

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /resource=runner operation=verify-removed status=failed detail=inspect-exit-125/);
  assert.doesNotMatch(result.stderr, /resource=runner operation=verify-removed status=succeeded detail=absent/);
  assert.match(result.stderr, /permission denied while contacting Docker daemon/);
  assert.match(result.calls, new RegExp(`rm --force ${runnerId}[\\s\\S]*rm --force ${postgresId}`));
  assert.match(result.stderr, /resource=postgres operation=verify-removed status=succeeded detail=absent/);
  assert.match(result.stderr, /final=outcome:cleanup-failure exit:1/);
});

test("container harness retains primary failure and attempts every bounded cleanup", () => {
  const result = runHarnessWithDockerStub({
    STUB_RUNNER_EXIT: "23",
    STUB_FAIL_STOP_ID: "b".repeat(64),
    STUB_FAIL_REMOVE_ID: "a".repeat(64),
  });
  assert.equal(result.status, 23, result.stderr);
  assert.match(result.stderr, /primary=failed kind=command phase=runner code=23/);
  assert.match(result.stderr, /resource=runner operation=stop status=failed/);
  assert.match(result.stderr, /resource=postgres operation=remove status=failed/);
  assert.match(result.stderr, /final=outcome:primary-and-cleanup-failure exit:23/);
  assert.doesNotMatch(result.stderr, /abc\.def\.ghi|in-build-testbuild/);
  assert.match(result.stderr, /\[REDACTED\]/);
  assert.match(result.calls, new RegExp(`rm --force ${"b".repeat(64)}`));
  assert.match(result.calls, new RegExp(`rm --force ${"a".repeat(64)}`));
});

test("container harness does not remove a resource whose creation failed", () => {
  const result = runHarnessWithDockerStub({ STUB_POSTGRES_CREATE_EXIT: "19" });
  assert.equal(result.status, 19, result.stderr);
  assert.doesNotMatch(result.calls, /^rm /m);
  assert.match(result.stderr, new RegExp(`resource=postgres name=tb122-readiness-postgres-${expectedNamespace("test-build")} state=not-created`));
  assert.match(result.stderr, /resource=postgres operation=cleanup status=succeeded detail=not-created/);
});

test("container harness turns cleanup-only failure into a nonzero final result", () => {
  const result = runHarnessWithDockerStub({ STUB_FAIL_REMOVE_ID: "a".repeat(64) });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /primary=success/);
  assert.match(result.stderr, /resource=postgres operation=remove status=failed/);
  assert.match(result.stderr, /final=outcome:cleanup-failure exit:1/);
});

test("container harness refuses cleanup when exact ownership cannot be proven", () => {
  const result = runHarnessWithDockerStub({ STUB_OWNERSHIP_LABEL: "anotherbuild" });
  assert.equal(result.status, 1, result.stderr);
  assert.doesNotMatch(result.calls, /^rm /m);
  assert.match(result.stderr, /operation=verify-ownership status=failed detail=identity-mismatch/);
  assert.match(result.stderr, /operation=remove status=failed detail=ownership-not-proven/);
});

test("container harness preserves SIGINT and SIGTERM delivered during cleanup", async () => {
  for (const [status, signal] of [[130, "SIGINT"], [143, "SIGTERM"]]) {
    const result = await runHarnessWithSignalDuringCleanup(signal);
    assert.equal(result.status, status, result.stderr);
    assert.equal(result.signal, null);
    assert.match(result.stderr, new RegExp(`primary=failed kind=signal phase=signal code=${status} detail=${signal}`));
    assert.match(result.stderr, new RegExp(`final=outcome:primary-failure exit:${status}`));
    assert.match(result.calls, new RegExp(`rm --force ${"b".repeat(64)}`));
    assert.match(result.calls, new RegExp(`rm --force ${"a".repeat(64)}`));
  }
});

test("inner lifecycle preserves real signals delivered during cleanup and does not reenter", async () => {
  for (const [status, signal] of [[130, "SIGINT"], [143, "SIGTERM"]]) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "tb122-inner-signal-"));
    const marker = path.join(directory, "cleanup-started");
    const resultPath = path.join(directory, "result.json");
    const source = `
      const fs = require("node:fs");
      const lifecycle = require(${JSON.stringify(path.join(__dirname, "..", "..", "scripts", "playwright-real-stack-lifecycle.js"))});
      const state = { signal: null, active: null };
      const handlers = lifecycle.installSignalHandlers(state);
      const attempts = [];
      const registry = new lifecycle.CleanupRegistry();
      registry.register("process", "first", async () => { attempts.push("first"); });
      registry.register("process", "second", async () => {
        attempts.push("second");
        fs.writeFileSync(${JSON.stringify(marker)}, "started");
        await new Promise((resolve) => setTimeout(resolve, 250));
      });
      registry.cleanup().then(async (cleanup) => {
        const repeated = await registry.cleanup();
        const final = lifecycle.selectFinalResult({ signal: state.signal, cleanup });
        handlers.dispose();
        fs.writeFileSync(${JSON.stringify(resultPath)}, JSON.stringify({ attempts, repeated, signal: state.signal, final }));
        process.exitCode = final.exitCode;
      });
    `;
    const child = childProcess.spawn(process.execPath, ["-e", source], { stdio: "ignore" });
    try {
      await lifecycle.waitFor(() => fs.existsSync(marker), { timeoutMs: 2_000, intervalMs: 10 });
      process.kill(child.pid, signal);
      await new Promise((resolve) => setTimeout(resolve, 20));
      process.kill(child.pid, signal === "SIGINT" ? "SIGTERM" : "SIGINT");
      const close = await new Promise((resolve) => child.once("close", (code, closeSignal) => resolve({ code, signal: closeSignal })));
      const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
      assert.deepEqual(close, { code: status, signal: null });
      assert.deepEqual(result.attempts, ["second", "first"]);
      assert.equal(result.repeated.length, 2);
      assert.equal(result.signal, signal);
      assert.equal(result.final.exitCode, status);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      fs.rmSync(directory, { recursive: true, force: true });
    }
  }
});

test("outer command failures retain their exact status, including cleanup failure", () => {
  const create = runHarnessWithDockerStub({ STUB_POSTGRES_CREATE_EXIT: "19" });
  assert.equal(create.status, 19, create.stderr);
  assert.match(create.stderr, /phase=postgres-create code=19/);

  const start = runHarnessWithDockerStub({ STUB_POSTGRES_START_EXIT: "18" });
  assert.equal(start.status, 18, start.stderr);
  assert.match(start.stderr, /phase=postgres-start code=18/);

  const status19WithCleanup = runHarnessWithDockerStub({
    STUB_POSTGRES_START_EXIT: "19",
    STUB_FAIL_REMOVE_ID: "a".repeat(64),
  });
  assert.equal(status19WithCleanup.status, 19, status19WithCleanup.stderr);
  assert.match(status19WithCleanup.stderr, /phase=postgres-start code=19/);
  assert.match(status19WithCleanup.stderr, /resource=postgres operation=remove status=failed/);
  assert.match(status19WithCleanup.stderr, /final=outcome:primary-and-cleanup-failure exit:19/);

  const runnerCreate = runHarnessWithDockerStub({
    STUB_RUNNER_CREATE_EXIT: "17",
    STUB_FAIL_REMOVE_ID: "a".repeat(64),
  });
  assert.equal(runnerCreate.status, 17, runnerCreate.stderr);
  assert.match(runnerCreate.stderr, /phase=runner-create code=17/);
  assert.match(runnerCreate.stderr, /resource=postgres operation=remove status=failed/);
  assert.match(runnerCreate.stderr, /final=outcome:primary-and-cleanup-failure exit:17/);
});

test("PostgreSQL readiness caps attempts and sleeps to one wall-clock deadline", () => {
  const { directory, callsPath } = createDockerStub();
  const timingCallsPath = installReadinessTimingStubs(directory);
  try {
    const result = childProcess.spawnSync("bash", [harnessPath], {
      encoding: "utf8",
      env: harnessEnvironment(directory, callsPath, {
        STUB_POSTGRES_EXEC_ALWAYS_FAIL: "1",
        STUB_TIMING_CALLS: timingCallsPath,
      }),
      timeout: 10_000,
    });
    const timingCalls = fs.readFileSync(timingCallsPath, "utf8");

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /phase=postgres-readiness code=1 detail=timeout-after-55s/);
    assert.equal((timingCalls.match(/docker exec/g) ?? []).length, 2, timingCalls);
    assert.match(timingCalls, /--signal=KILL 5s \S*\/docker inspect/);
    assert.deepEqual(timingCalls.match(/^sleep .*$/gm), ["sleep 2", "sleep 1"]);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("build namespaces remain distinct after normalization and prefix truncation", () => {
  const buildIds = ["A-b", "ab", `${"a".repeat(80)}-one`, `${"a".repeat(80)}-two`];
  const names = buildIds.map((buildId) => {
    const result = runHarnessWithDockerStub({ BUILD_ID: buildId });
    assert.equal(result.status, 0, result.stderr);
    const match = result.calls.match(/create --name (tb122-readiness-postgres-[a-z0-9-]+)/);
    assert.ok(match);
    assert.ok(match[1].length <= 63);
    assert.equal(match[1], `tb122-readiness-postgres-${expectedNamespace(buildId)}`);
    return match[1];
  });
  assert.equal(new Set(names).size, buildIds.length);
});

test("final readiness proves both process groups, both HTTP endpoints, and PostgreSQL", async () => {
  const calls = [];
  const services = {
    strapi: { name: "strapi", exit: null, child: { pid: 101 } },
    next: { name: "next", exit: null, child: { pid: 102 } },
  };
  await lifecycle.verifyFinalReadiness({
    ...services,
    signalState: { signal: null },
    postgresHost: "postgres-build",
    postgresPort: 5432,
  }, {
    processGroupExists: (pid) => { calls.push(`process:${pid}`); return true; },
    fetch: async (url) => { calls.push(`http:${url}`); return { ok: true, status: 200 }; },
    probeTcp: async (host, port) => { calls.push(`postgres:${host}:${port}`); return true; },
  });
  assert.deepEqual(calls, [
    "process:101",
    "process:102",
    "http:http://127.0.0.1:1337/admin/init",
    "http:http://127.0.0.1:3000/api/auth/providers",
    "postgres:postgres-build:5432",
    "process:101",
    "process:102",
  ]);
});

test("final readiness fails with the dependency-specific readiness phase", async () => {
  const base = {
    strapi: { name: "strapi", exit: null, child: { pid: 101 } },
    next: { name: "next", exit: null, child: { pid: 102 } },
    signalState: { signal: null },
    postgresHost: "postgres-build",
    postgresPort: 5432,
  };
  await assert.rejects(
    lifecycle.verifyFinalReadiness(base, { processGroupExists: (pid) => pid !== 101, fetch: async () => ({ ok: true }), probeTcp: async () => true }),
    (error) => error.kind === "readiness" && error.phase === "strapi-final-process",
  );
  await assert.rejects(
    lifecycle.verifyFinalReadiness(base, { processGroupExists: (pid) => pid !== 102, fetch: async () => ({ ok: true }), probeTcp: async () => true }),
    (error) => error.kind === "readiness" && error.phase === "next-final-process",
  );
  await assert.rejects(
    lifecycle.verifyFinalReadiness(base, {
      processGroupExists: () => true,
      fetch: async (url) => ({ ok: !url.includes(":1337"), status: 503 }),
      probeTcp: async () => true,
    }),
    (error) => error.kind === "readiness" && error.phase === "strapi-final-readiness",
  );
  await assert.rejects(
    lifecycle.verifyFinalReadiness(base, {
      processGroupExists: () => true,
      fetch: async (url) => ({ ok: !url.includes(":3000"), status: 503 }),
      probeTcp: async () => true,
    }),
    (error) => error.kind === "readiness" && error.phase === "next-final-readiness",
  );
  await assert.rejects(
    lifecycle.verifyFinalReadiness(base, { processGroupExists: () => true, fetch: async () => ({ ok: true }), probeTcp: async () => false }),
    (error) => error.kind === "readiness" && error.phase === "postgres-final-readiness",
  );
});

test("outer final PostgreSQL readiness failure prevents success", () => {
  const result = runHarnessWithDockerStub({ STUB_POSTGRES_FINAL_EXIT: "7" });
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /kind=readiness phase=postgres-final-readiness code=1/);
  assert.doesNotMatch(result.stderr, /primary=success/);
});
