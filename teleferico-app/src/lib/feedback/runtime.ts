import "server-only";
import { randomUUID } from "node:crypto";
import { verifyCaptchaToken } from "@/lib/google/captcha";
import { getFormProtectionRedisConfig } from "@/lib/http/guards/form-protection-policy";
import { createFeedbackBrowserGuard, createRedisBrowserGuardStore } from "./browser-guard";
import { createFeedbackCmsTransport } from "./cms-transport";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

export function createFeedbackRuntime() {
  const transport = createFeedbackCmsTransport({
    baseUrl: required("BUILD_STRAPI_BASE_URL"),
    token: required("FEEDBACK_STRAPI_TOKEN"),
  });
  const redis = getFormProtectionRedisConfig();
  const store = redis.url
    ? createRedisBrowserGuardStore({ url: redis.url, namespace: redis.namespace, connectTimeoutMs: redis.connectTimeoutMs })
    : { isActive: async () => { throw new Error("Redis unavailable"); }, persist: async () => { throw new Error("Redis unavailable"); } };

  return {
    resolveSurvey: transport.resolveSurvey,
    signingKey: required("FEEDBACK_SESSION_SIGNING_KEY"),
    verifyCaptcha: verifyCaptchaToken,
    store: transport.acceptanceStore,
    browserGuard: createFeedbackBrowserGuard({ store }),
    now: () => new Date(),
    createReceipt: randomUUID,
  };
}
