import type { ImageFormats, StrapiImage } from "@/types";

const CMS_BUCKET_HOSTNAME = "storage.googleapis.com";
const CMS_IMAGE_PROXY_PREFIX = "/api/media";
const STRAPI_UPLOADS_PREFIX = "/uploads/";

export type CmsImageLike = Pick<StrapiImage, "url" | "formats">;

function parseUrl(value: string) {
  if (value.startsWith("//")) return new URL(`https:${value}`);

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function normalizeCmsBucketPathPrefix(pathname: string) {
  const trimmed = pathname.trim();
  if (!trimmed) return "/";

  const withoutWildcard = trimmed.replace(/\/\*+$/, "").replace(/\*+$/, "");
  return withoutWildcard.endsWith("/")
    ? withoutWildcard
    : `${withoutWildcard}/`;
}

export function toCmsImageProxyUrl(source?: string | null) {
  if (!source) return source ?? undefined;

  if (
    source.startsWith(CMS_IMAGE_PROXY_PREFIX) ||
    source.startsWith("data:") ||
    source.startsWith("blob:")
  ) {
    return source;
  }

  if (source.startsWith(STRAPI_UPLOADS_PREFIX)) {
    return `${CMS_IMAGE_PROXY_PREFIX}${source}`;
  }

  const parsed = parseUrl(source);
  if (!parsed) return source;

  if (parsed.hostname === CMS_BUCKET_HOSTNAME) {
    return `${CMS_IMAGE_PROXY_PREFIX}${parsed.pathname}${parsed.search}`;
  }

  return source;
}

export function isStrapiUploadsPath(source?: string | null) {
  return typeof source === "string" && source.startsWith(STRAPI_UPLOADS_PREFIX);
}

export function selectCmsImageUrl(
  image?: CmsImageLike | null,
  preferredFormats: Array<keyof ImageFormats> = [
    "large",
    "medium",
    "small",
    "thumbnail",
  ],
) {
  if (!image) return undefined;

  for (const formatName of preferredFormats) {
    const candidate = image.formats?.[formatName];
    if (candidate?.url) {
      return toCmsImageProxyUrl(candidate.url) ?? candidate.url;
    }
  }

  return toCmsImageProxyUrl(image.url) ?? image.url;
}

export function selectOriginalCmsImageUrl(image?: CmsImageLike | null) {
  if (!image) return undefined;

  return toCmsImageProxyUrl(image.url) ?? image.url;
}
