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

/** Validates the explicit destination and exact public-origin allowlist. */
export function validateTrustedCmsOrigin(
  baseUrl: unknown,
  allowedOrigins: unknown,
): URL {
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0)
    throw new TypeError("Invalid CMS origin");
  const origins = allowedOrigins.map((origin) => canonicalPublicHttpsOrigin(origin).origin);
  if (new Set(origins).size !== origins.length)
    throw new TypeError("Invalid CMS origin");
  const target = canonicalPublicHttpsOrigin(baseUrl);
  if (!origins.includes(target.origin)) throw new TypeError("Invalid CMS origin");
  return target;
}
