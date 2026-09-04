const assert = require("node:assert/strict");
const { generateKeyPairSync, verify } = require("node:crypto");
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

test("posts explicit status payloads with environment, log, and target URLs", () => {
  assert.deepEqual(deployment.deploymentStatusPayload(config, "success"), {
    state: "success",
    environment: "production",
    environment_url: "https://telefericobariloche.com.ar/",
    log_url: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
    target_url: "https://console.cloud.google.com/cloud-build/builds/build-1?project=project-1",
    auto_inactive: false,
    description: "Cloud Build deployment succeeded.",
  });
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
