import { i18n } from "@/i18n";
import { Locales } from "@/types";

export function isHttpUrl(href: string): boolean {
  return (
    /^https?:\/\//i.test(href) || href.startsWith("//") || /^www\./i.test(href)
  );
}

export function isExternalHref(href: string): boolean {
  // - Internos típicos: "/algo" o "#anchor"
  // - Externos: "https://", "mailto:", "tel:", "www.", "//..."
  if (href.startsWith("/") || href.startsWith("#")) return false;
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(href) ||
    href.startsWith("//") ||
    /^www\./i.test(href)
  );
}

export function hasLocalePrefix(path: string): boolean {
  const match = path.match(/^\/([^/]+)(\/|$)/);
  const firstSegment = match?.[1];
  return !!firstSegment && i18n.locales.includes(firstSegment as Locales);
}

export function withLocalePrefix(path: string, locale: string): string {
  if (!path) return path;
  if (path.startsWith("#")) return path;

  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (hasLocalePrefix(normalized)) return normalized;

  return `/${locale}${normalized}`;
}
