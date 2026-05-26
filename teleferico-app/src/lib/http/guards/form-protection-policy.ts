import { ENV_KEYS } from "@/lib/constants/env.const";
import type {
  FormProtectionBusinessConfig,
  FormProtectionBusinessPolicy,
  FormProtectionRateLimitConfig,
  FormProtectionRateLimitPolicy,
  FormProtectionRedisConfig,
  PublicFormName,
} from "@/types";

const LOCAL_REDIS_URL = "redis://127.0.0.1:6379";

const FORM_PROTECTION_DEFAULTS: FormProtectionRateLimitPolicy = {
  contact: {
    enabled: true,
    maxHits: 10,
    windowMs: 60 * 60 * 1000,
  },
  postulation: {
    enabled: true,
    maxHits: 5,
    windowMs: 15 * 60 * 1000,
  },
};

const FORM_BUSINESS_DEFAULTS: FormProtectionBusinessPolicy = {
  contact: {
    enabled: true,
    maxHits: 5,
    windowMs: 24 * 60 * 60 * 1000,
  },
  postulation: {
    enabled: true,
    maxHits: 2,
    windowMs: 30 * 24 * 60 * 60 * 1000,
  },
};

const FORM_RATE_LIMIT_ENV_KEYS = {
  contact: {
    enabled: ENV_KEYS.CONTACT_RATE_LIMIT_ENABLED,
    maxHits: ENV_KEYS.CONTACT_RATE_LIMIT_MAX,
    windowMs: ENV_KEYS.CONTACT_RATE_LIMIT_WINDOW_MS,
  },
  postulation: {
    enabled: ENV_KEYS.POSTULATION_RATE_LIMIT_ENABLED,
    maxHits: ENV_KEYS.POSTULATION_RATE_LIMIT_MAX,
    windowMs: ENV_KEYS.POSTULATION_RATE_LIMIT_WINDOW_MS,
  },
} as const satisfies Record<
  PublicFormName,
  {
    enabled: string;
    maxHits: string;
    windowMs: string;
  }
>;

const FORM_BUSINESS_ENV_KEYS = {
  contact: {
    enabled: ENV_KEYS.CONTACT_EMAIL_LIMIT_ENABLED,
    maxHits: ENV_KEYS.CONTACT_EMAIL_LIMIT_MAX,
    windowMs: ENV_KEYS.CONTACT_EMAIL_LIMIT_WINDOW_MS,
  },
  postulation: {
    enabled: ENV_KEYS.POSTULATION_EMAIL_LIMIT_ENABLED,
    maxHits: ENV_KEYS.POSTULATION_EMAIL_LIMIT_MAX,
    windowMs: ENV_KEYS.POSTULATION_EMAIL_LIMIT_WINDOW_MS,
  },
} as const satisfies Record<
  PublicFormName,
  {
    enabled: string;
    maxHits: string;
    windowMs: string;
  }
>;

function parseBooleanEnv(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue) return fallback;

  switch (rawValue.trim().toLowerCase()) {
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    default:
      return fallback;
  }
}

function parsePositiveIntEnv(rawValue: string | undefined, fallback: number): number {
  if (!rawValue) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseFormRateLimitPolicy(
  formName: PublicFormName,
  env: NodeJS.ProcessEnv,
): FormProtectionRateLimitConfig {
  const defaults = FORM_PROTECTION_DEFAULTS[formName];
  const envKeys = FORM_RATE_LIMIT_ENV_KEYS[formName];

  return {
    enabled: parseBooleanEnv(env[envKeys.enabled], defaults.enabled),
    maxHits: parsePositiveIntEnv(env[envKeys.maxHits], defaults.maxHits),
    windowMs: parsePositiveIntEnv(env[envKeys.windowMs], defaults.windowMs),
  };
}

function parseFormBusinessPolicy(
  formName: PublicFormName,
  env: NodeJS.ProcessEnv,
): FormProtectionBusinessConfig {
  const defaults = FORM_BUSINESS_DEFAULTS[formName];
  const envKeys = FORM_BUSINESS_ENV_KEYS[formName];

  return {
    enabled: parseBooleanEnv(env[envKeys.enabled], defaults.enabled),
    maxHits: parsePositiveIntEnv(env[envKeys.maxHits], defaults.maxHits),
    windowMs: parsePositiveIntEnv(env[envKeys.windowMs], defaults.windowMs),
  };
}

export function getFormProtectionRedisConfig(
  env: NodeJS.ProcessEnv = process.env,
): FormProtectionRedisConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  const configuredUrl = env[ENV_KEYS.FORM_PROTECTION_REDIS_URL]?.trim() || null;

  return {
    url:
      configuredUrl ??
      (nodeEnv === "development" ? LOCAL_REDIS_URL : null),
    namespace:
      env[ENV_KEYS.FORM_PROTECTION_REDIS_NAMESPACE]?.trim() ||
      (nodeEnv === "development" ? "local" : "production"),
    connectTimeoutMs: parsePositiveIntEnv(
      env[ENV_KEYS.FORM_PROTECTION_REDIS_CONNECT_TIMEOUT_MS],
      500,
    ),
    localDevelopmentUrl: LOCAL_REDIS_URL,
  };
}

export function getFormProtectionPolicy(
  env: NodeJS.ProcessEnv = process.env,
) {
  return {
    redis: getFormProtectionRedisConfig(env),
    ip: {
      contact: parseFormRateLimitPolicy("contact", env),
      postulation: parseFormRateLimitPolicy("postulation", env),
    },
    email: {
      contact: parseFormBusinessPolicy("contact", env),
      postulation: parseFormBusinessPolicy("postulation", env),
    },
  };
}

export function getFormRateLimitPolicy(
  formName: PublicFormName,
  env: NodeJS.ProcessEnv = process.env,
): FormProtectionRateLimitPolicy[PublicFormName] {
  return parseFormRateLimitPolicy(formName, env);
}

export function getFormBusinessPolicy(
  formName: PublicFormName,
  env: NodeJS.ProcessEnv = process.env,
): FormProtectionBusinessConfig {
  return parseFormBusinessPolicy(formName, env);
}

export {
  FORM_BUSINESS_DEFAULTS,
  FORM_BUSINESS_ENV_KEYS,
  FORM_PROTECTION_DEFAULTS,
  FORM_RATE_LIMIT_ENV_KEYS,
  LOCAL_REDIS_URL,
};
