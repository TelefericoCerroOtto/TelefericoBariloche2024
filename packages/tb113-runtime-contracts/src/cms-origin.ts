import { isIP } from "node:net";

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".localdomain",
  ".internal",
  ".lan",
  ".home",
  ".home.arpa",
  ".corp",
  ".intranet",
  ".private",
  ".test",
  ".example",
  ".invalid",
  ".onion",
  ".nip.io",
  ".sslip.io",
  ".xip.io",
  ".localtest.me",
  ".lvh.me",
] as const;
const BLOCKED_HOST_LABEL = /metadata|meta.?data|instance.?data|^localhost$|^localdomain$/i;
const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
export type CmsRuntimeMode = "development" | "production";

function canonicalPublicHttpsOrigin(value: unknown): URL {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value)
    throw new TypeError("Invalid CMS origin");
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const labels = hostname.split(".");
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    value !== url.origin ||
    hostname.endsWith(".") ||
    !hostname.includes(".") ||
    isIP(hostname) !== 0 ||
    labels.some(
      (label) =>
        !DNS_LABEL_PATTERN.test(label) ||
        label.startsWith("xn--") ||
        BLOCKED_HOST_LABEL.test(label),
    ) ||
    BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
  )
    throw new TypeError("Invalid CMS origin");
  return url;
}

function canonicalDevelopmentLoopbackOrigin(value: unknown): URL {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value)
    throw new TypeError("Invalid CMS origin");
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    !/^[1-9][0-9]{0,4}$/.test(url.port) ||
    Number(url.port) > 65_535 ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== "" ||
    value !== url.origin
  )
    throw new TypeError("Invalid CMS origin");
  return url;
}

/** Validates the explicit destination and exact public-origin allowlist. */
export function validateTrustedCmsOrigin(
  baseUrl: unknown,
  allowedOrigins: unknown,
  runtimeMode: CmsRuntimeMode = "production",
): URL {
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0)
    throw new TypeError("Invalid CMS origin");
  const canonicalize = runtimeMode === "development"
    ? canonicalDevelopmentLoopbackOrigin
    : canonicalPublicHttpsOrigin;
  const origins = allowedOrigins.map((origin) => canonicalize(origin).origin);
  if (new Set(origins).size !== origins.length)
    throw new TypeError("Invalid CMS origin");
  const target = canonicalize(baseUrl);
  if (!origins.includes(target.origin)) throw new TypeError("Invalid CMS origin");
  return target;
}
