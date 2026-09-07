const assert = require("node:assert/strict");
const { generateKeyPairSync, verify } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const deployment = require("./github-deployment.js");

const sha = "a".repeat(40);
const config = {
  repository: { owner: "TelefericoCerroOtto", repo: "TelefericoBariloche2024", slug: "TelefericoCerroOtto/TelefericoBariloche2024" },
  environment: "production",
  environmentUrl: "https://telefericobariloche.com.ar/",
  logUrl: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
  targetUrl: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
  commitSha: sha,
  buildId: "build-1",
};

const cloudBuildSnapshots = [
  ["staging", path.join(__dirname, "..", "..", "docs", "infra", "cloud-build", "app-staging.yaml")],
  ["production", path.join(__dirname, "..", "..", "docs", "infra", "cloud-build", "app-production.yaml")],
];
const requiredReporterEnv = [
  "GITHUB_DEPLOYMENTS_APP_ID=${_GITHUB_DEPLOYMENTS_APP_ID}",
  "GITHUB_DEPLOYMENTS_INSTALLATION_ID=${_GITHUB_DEPLOYMENTS_INSTALLATION_ID}",
  "GITHUB_DEPLOYMENTS_REPOSITORY=${_GITHUB_DEPLOYMENTS_REPOSITORY}",
  "GITHUB_DEPLOYMENTS_ENVIRONMENT=${_GITHUB_DEPLOYMENTS_ENVIRONMENT}",
  "GITHUB_DEPLOYMENTS_ENVIRONMENT_URL=${_GITHUB_DEPLOYMENTS_ENVIRONMENT_URL}",
  "GITHUB_DEPLOYMENTS_LOG_URL=https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=$PROJECT_ID",
  "GITHUB_DEPLOYMENTS_TARGET_URL=https://console.cloud.google.com/cloud-build/builds/$BUILD_ID?project=$PROJECT_ID",
  "BUILD_ID=$BUILD_ID",
  "GITHUB_DEPLOYMENTS_COMMIT_SHA=$COMMIT_SHA",
  "GITHUB_DEPLOYMENTS_METADATA_PATH=/workspace/github-deployment-metadata.json",
];

function reporterStep(snapshot, id) {
  const start = snapshot.indexOf(`    id: ${id}\n`);
  const nextStep = snapshot.indexOf("\n  - ", start + 1);
  const options = snapshot.indexOf("\noptions:", start + 1);
  const end = [nextStep, options].filter((index) => index >= 0).sort((left, right) => left - right)[0];

  assert.ok(start >= 0, `Missing ${id} step.`);
  return snapshot.slice(start, end);
}

test("Cloud Build snapshots provide the required GitHub deployment reporter environment contract", () => {
  for (const [environment, snapshotPath] of cloudBuildSnapshots) {
    const snapshot = fs.readFileSync(snapshotPath, "utf8");
    for (const id of ["GitHub deployment start", "GitHub deployment finish"]) {
      const step = reporterStep(snapshot, id);
      for (const env of requiredReporterEnv) {
        assert.match(step, new RegExp(`^      - ${env.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"), `${environment} ${id} must expose ${env}.`);
      }
      assert.match(step, /    secretEnv:\n      - GITHUB_DEPLOYMENTS_APP_PRIVATE_KEY/);
    }
  }
});

test("creates a short-lived RS256 GitHub App JWT with the expected claims", () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: "pkcs8", format: "pem" });
  const jwt = deployment.createAppJwt({ appId: "4831348", privateKey, nowSeconds: 1_700_000_000 });
  const [header, payload, signature] = jwt.split(".");

  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64url")), { iat: 1_699_999_940, exp: 1_700_000_540, iss: "4831348" });
  assert.equal(verify("RSA-SHA256", Buffer.from(`${header}.${payload}`), keys.publicKey, Buffer.from(signature, "base64url")), true);
});

test("restricts the installation token to the deployment repository and permission", () => {
  assert.deepEqual(deployment.installationTokenPayload("TelefericoBariloche2024"), {
    repositories: ["TelefericoBariloche2024"],
    permissions: { deployments: "write" },
  });
});

test("creates deployments against the exact SHA with auto-merge and required contexts disabled", () => {
  assert.deepEqual(deployment.deploymentPayload(config), {
    ref: sha,
    task: "deploy",
    auto_merge: false,
    required_contexts: [],
    environment: "production",
    environment_url: "https://telefericobariloche.com.ar/",
    production_environment: true,
    transient_environment: false,
    description: "Cloud Build build-1",
  });
  assert.throws(() => deployment.validateFullSha("abc"), /full 40-character Git SHA/);
  assert.throws(() => deployment.validateDeployment({ id: 1, sha: "b".repeat(40) }, sha), /does not match/);
});

test("posts explicit status payloads with accurate descriptions for supported states", () => {
  const expectedDescriptions = {
    in_progress: "Cloud Build deployment started.",
    success: "Cloud Build deployment succeeded.",
    failure: "Cloud Build deployment failed.",
  };

  for (const [state, description] of Object.entries(expectedDescriptions)) {
    assert.deepEqual(deployment.deploymentStatusPayload(config, state), {
      state,
      environment: "production",
      environment_url: "https://telefericobariloche.com.ar/",
      log_url: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
      target_url: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
      auto_inactive: false,
      description,
    });
  }
});

test("starts deployments with an in_progress status payload", async () => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "github-deployment-"));
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const requests = [];

  try {
    await deployment.startDeployment({
      ...config,
      appId: "4831348",
      installationId: "12345",
      privateKey: privateKey.export({ type: "pkcs8", format: "pem" }),
      metadataPath: path.join(temporaryDirectory, "deployment-metadata.json"),
      nowSeconds: () => 1_700_000_000,
      fetch: async (url, options) => {
        requests.push({ url, options });
        const response = [
          { token: "installation-token" },
          { id: 42, sha },
          {},
        ][requests.length - 1];
        return { ok: true, status: 201, json: async () => response };
      },
    });

    assert.deepEqual(JSON.parse(requests[2].options.body), {
      state: "in_progress",
      environment: "production",
      environment_url: "https://telefericobariloche.com.ar/",
      log_url: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
      target_url: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
      auto_inactive: false,
      description: "Cloud Build deployment started.",
    });
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("sends authenticated GitHub requests without logging or retaining the credential", async () => {
  let request;
  const result = await deployment.githubRequest({
    apiUrl: "https://api.github.test",
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201, json: async () => ({ id: 42 }) };
    },
  }, {
    method: "POST",
    path: "/repos/acme/example/deployments",
    token: "test-credential",
    body: { ref: sha },
  });

  assert.deepEqual(result, { id: 42 });
  assert.equal(request.url, "https://api.github.test/repos/acme/example/deployments");
  assert.deepEqual(request.options.headers, {
    Authorization: "Bearer test-credential",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  });
  assert.equal(request.options.body, JSON.stringify({ ref: sha }));
});

test("redacts credentials and never includes response bodies in GitHub request errors", async () => {
  const secret = "sensitive-material";
  assert.equal(deployment.redactSensitiveText(`Bearer ${secret}?token=${secret}`, [secret]), "Bearer [REDACTED]");

  await assert.rejects(
    deployment.githubRequest({ apiUrl: "https://api.github.test", fetch: async () => ({ ok: false, status: 401 }) }, {
      method: "POST",
      path: "/repos/acme/example/deployments",
      token: secret,
      body: { ref: sha },
    }),
    (error) => error.message === "GitHub POST /repos/acme/example/deployments failed with status 401.",
  );
});
