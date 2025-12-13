import { ENV_KEYS } from "@/lib/constants/env.const";
import { assertEnv } from "@/utils/env";

export function getStrapiURL(endpoint: string, qp?: string) {
  assertEnv([ENV_KEYS.BUILD_STRAPI_BASE_URL]);
  return `${process.env[ENV_KEYS.BUILD_STRAPI_BASE_URL] ?? "http://localhost:1337"}${endpoint}${qp ? `?${qp}` : ""}`;
}
