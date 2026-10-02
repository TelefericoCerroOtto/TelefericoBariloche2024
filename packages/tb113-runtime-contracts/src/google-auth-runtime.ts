export function assertKeylessCloudRunEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (
    typeof env.K_SERVICE !== "string" || env.K_SERVICE.length === 0 ||
    typeof env.K_REVISION !== "string" || env.K_REVISION.length === 0 ||
    Boolean(env.GOOGLE_APPLICATION_CREDENTIALS)
  )
    throw new TypeError("Google workload identity configuration is unavailable");
}
