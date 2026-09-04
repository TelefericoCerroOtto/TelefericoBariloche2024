#!/usr/bin/env node

const { createPrivateKey, createSign } = require("node:crypto");
const { chmod, readFile, writeFile } = require("node:fs/promises");

const DEFAULTS = {
  apiUrl: "https://api.github.com",
  jwtClockSkewSeconds: 60,
  jwtLifetimeSeconds: 540,
  metadataPath: "/workspace/github-deployment-metadata.json",
};

async function main() {
  const operation = process.argv[2];
  const config = getConfig(process.env);

  if (operation === "start") return startDeployment(config);
  if (operation === "finish") return finishDeployment(config);

  throw new Error("Missing or unsupported operation. Use: start | finish");
}

function getConfig(env) {
  const repository = parseRepository(requiredEnv(env, "GITHUB_DEPLOYMENTS_REPOSITORY"));
  const environment = requiredEnv(env, "GITHUB_DEPLOYMENTS_ENVIRONMENT");
  const commitSha = validateFullSha(requiredEnv(env, "GITHUB_DEPLOYMENTS_COMMIT_SHA"));

  return {
    apiUrl: env.GITHUB_API_URL || DEFAULTS.apiUrl,
    appId: requiredEnv(env, "GITHUB_DEPLOYMENTS_APP_ID"),
    installationId: requiredEnv(env, "GITHUB_DEPLOYMENTS_INSTALLATION_ID"),
    privateKey: requiredEnv(env, "GITHUB_DEPLOYMENTS_APP_PRIVATE_KEY"),
    repository,
    environment,
    environmentUrl: requiredUrl(env, "GITHUB_DEPLOYMENTS_ENVIRONMENT_URL"),
    logUrl: requiredUrl(env, "GITHUB_DEPLOYMENTS_LOG_URL"),
    targetUrl: requiredUrl(env, "GITHUB_DEPLOYMENTS_TARGET_URL"),
    commitSha,
    buildId: requiredEnv(env, "BUILD_ID"),
    metadataPath: env.GITHUB_DEPLOYMENTS_METADATA_PATH || DEFAULTS.metadataPath,
    nowSeconds: () => Math.floor(Date.now() / 1000),
    fetch: global.fetch,
  };
}

async function startDeployment(config) {
  const appJwt = createAppJwt({
    appId: config.appId,
    privateKey: config.privateKey,
    nowSeconds: config.nowSeconds(),
  });
  const installationToken = await createInstallationToken(config, appJwt);
  const deployment = await createDeployment(config, installationToken);

  validateDeployment(deployment, config.commitSha);
  await createDeploymentStatus(config, installationToken, deployment.id, "in_progress");
  await writeMetadata(config.metadataPath, deploymentMetadata(config, deployment));
  console.log(`GitHub deployment ${deployment.id} is in progress for ${config.commitSha}.`);
}

async function finishDeployment(config) {
  const metadata = await readMetadata(config.metadataPath);
  validateMetadata(metadata, config);

  const appJwt = createAppJwt({
    appId: config.appId,
    privateKey: config.privateKey,
    nowSeconds: config.nowSeconds(),
  });
  const installationToken = await createInstallationToken(config, appJwt);
  const state = requiredFinishState(process.env.GITHUB_DEPLOYMENTS_STATE);

  await createDeploymentStatus(config, installationToken, metadata.deploymentId, state);
  console.log(`GitHub deployment ${metadata.deploymentId} finished with ${state}.`);
}

function createAppJwt({ appId, privateKey, nowSeconds }) {
  const header = base64urlJson({ alg: "RS256", typ: "JWT" });
  const payload = base64urlJson({
    iat: nowSeconds - DEFAULTS.jwtClockSkewSeconds,
    exp: nowSeconds + DEFAULTS.jwtLifetimeSeconds,
    iss: String(appId),
  });
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(createPrivateKey(privateKey)).toString("base64url");
  return `${signingInput}.${signature}`;
}

async function createInstallationToken(config, appJwt) {
  const response = await githubRequest(config, {
    method: "POST",
    path: `/app/installations/${encodeURIComponent(config.installationId)}/access_tokens`,
    token: appJwt,
    body: installationTokenPayload(config.repository.repo),
  });

  if (!response || typeof response.token !== "string" || !response.token) {
    throw new Error("GitHub installation-token response did not include a token.");
  }
  return response.token;
}

async function createDeployment(config, token) {
  return githubRequest(config, {
    method: "POST",
    path: repositoryPath(config.repository, "/deployments"),
    token,
    body: deploymentPayload(config),
  });
}

async function createDeploymentStatus(config, token, deploymentId, state) {
  return githubRequest(config, {
    method: "POST",
    path: repositoryPath(config.repository, `/deployments/${encodeURIComponent(String(deploymentId))}/statuses`),
    token,
    body: deploymentStatusPayload(config, state),
  });
}

async function githubRequest(config, { method, path: requestPath, token, body }) {
  const response = await config.fetch(`${config.apiUrl}${requestPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) throw new Error(`GitHub ${method} ${requestPath} failed with status ${response.status}.`);
  return response.status === 204 ? null : response.json();
}

function installationTokenPayload(repository) {
  return {
    repositories: [repository],
    permissions: { deployments: "write" },
  };
}

function deploymentPayload(config) {
  return {
    ref: config.commitSha,
    task: "deploy",
    auto_merge: false,
    required_contexts: [],
    environment: config.environment,
    environment_url: config.environmentUrl,
    production_environment: config.environment === "production",
    transient_environment: false,
    description: `Cloud Build ${config.buildId}`,
  };
}

function deploymentStatusPayload(config, state) {
  return {
    state,
    environment: config.environment,
    environment_url: config.environmentUrl,
    log_url: config.logUrl,
    target_url: config.targetUrl,
    auto_inactive: false,
    description: state === "success" ? "Cloud Build deployment succeeded." : "Cloud Build deployment failed.",
  };
}

function deploymentMetadata(config, deployment) {
  return {
    version: 1,
    deploymentId: deployment.id,
    repository: config.repository.slug,
    environment: config.environment,
    commitSha: config.commitSha,
    environmentUrl: config.environmentUrl,
    logUrl: config.logUrl,
    targetUrl: config.targetUrl,
  };
}

function validateDeployment(deployment, expectedSha) {
  if (!deployment || !Number.isInteger(deployment.id) || deployment.id <= 0) {
    throw new Error("GitHub deployment response did not include a valid deployment ID.");
  }
  if (typeof deployment.sha !== "string" || deployment.sha.toLowerCase() !== expectedSha.toLowerCase()) {
    throw new Error("GitHub deployment response SHA does not match the requested commit SHA.");
  }
}

function validateMetadata(metadata, config) {
  if (!metadata || !Number.isInteger(metadata.deploymentId) || metadata.deploymentId <= 0) {
    throw new Error("Deployment metadata did not include a valid deployment ID.");
  }
  if (metadata.repository !== config.repository.slug || metadata.environment !== config.environment || metadata.commitSha !== config.commitSha) {
    throw new Error("Deployment metadata does not match this Cloud Build execution.");
  }
}

async function writeMetadata(metadataPath, metadata) {
  await writeFile(metadataPath, `${JSON.stringify(metadata)}\n`, { encoding: "utf8", mode: 0o600 });
  await chmod(metadataPath, 0o600);
}

async function readMetadata(metadataPath) {
  try {
    return JSON.parse(await readFile(metadataPath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read deployment metadata: ${redactSensitiveText(error.message)}.`);
  }
}

function parseRepository(value) {
  const match = value.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (!match) throw new Error("GITHUB_DEPLOYMENTS_REPOSITORY must be an owner/repository slug.");
  return { owner: match[1], repo: match[2], slug: value };
}

function repositoryPath(repository, suffix) {
  return `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}${suffix}`;
}

function validateFullSha(value) {
  if (!/^[a-f0-9]{40}$/i.test(value)) throw new Error("GITHUB_DEPLOYMENTS_COMMIT_SHA must be a full 40-character Git SHA.");
  return value.toLowerCase();
}

function requiredFinishState(value) {
  if (value === "success" || value === "failure") return value;
  throw new Error("GITHUB_DEPLOYMENTS_STATE must be success or failure.");
}

function requiredEnv(env, name) {
  if (!env[name]) throw new Error(`Missing required environment variable: ${name}`);
  return env[name];
}

function requiredUrl(env, name) {
  const value = requiredEnv(env, name);
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function redactSensitiveText(value, secrets = []) {
  let redacted = String(value || "");
  for (const secret of secrets.filter(Boolean)) redacted = redacted.replaceAll(secret, "[REDACTED]");
  return redacted
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:access_token|token|jwt)=)[^&\s]+/gi, "$1[REDACTED]");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(redactSensitiveText(error?.stack || error?.message || error));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULTS,
  base64urlJson,
  createAppJwt,
  deploymentPayload,
  deploymentStatusPayload,
  githubRequest,
  installationTokenPayload,
  redactSensitiveText,
  validateDeployment,
  validateFullSha,
};
