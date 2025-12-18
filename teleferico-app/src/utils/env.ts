import { ENV_KEYS } from "@/lib/constants/env.const";

export function assertEnv(required: string[] = Object.values(ENV_KEYS)) {
  const missing = required.filter(
    (k) => !process.env[k] || process.env[k] === "",
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required env variables: ${missing.join(", ")}. Check your .env configuration.`,
    );
  }
}
