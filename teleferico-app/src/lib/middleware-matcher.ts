/**
 * Pure path-classification helpers for the middleware skip/pass decision.
 *
 * Extracted from middleware.ts so they can be unit-tested without any
 * Next.js runtime dependency. The middleware calls these at the top of its
 * hot path to decide whether to return early (skip) or continue processing.
 *
 * Why a separate module instead of inline regex in the matcher config?
 *
 * The Next.js matcher regex runs before the middleware function and cannot
 * distinguish between a static asset path and an admin path that happens to
 * end in a file-like extension (e.g. /es-AR/dashboard/news/foo.js).  Putting
 * the classification logic here lets the matcher stay broad (only excluding
 * _next/ internals) while the middleware itself decides in O(1) whether a
 * specific path needs full processing or can short-circuit.
 */

/**
 * File extensions that belong to real static assets and should never be
 * locale-redirected, auth-gated, or maintenance-blocked.
 */
const STATIC_ASSET_EXTENSIONS = new Set([
  "css",
  "gif",
  "ico",
  "jpg",
  "jpeg",
  "js",
  "map",
  "otf",
  "png",
  "svg",
  "ttf",
  "webp",
  "woff",
  "woff2",
]);

/**
 * Root-level metadata paths that Next.js handles as file-based metadata
 * routes (via app/robots.ts or app/sitemap.ts).  They must not be
 * intercepted by locale logic or auth middleware.
 */
const ROOT_METADATA_PATHS = new Set(["/robots.txt", "/sitemap.xml"]);

/**
 * Path prefixes that identify admin/dashboard routes.  Even if such a path
 * ends in a recognized static extension (e.g. a dynamic segment named
 * "foo.js"), it must still go through middleware so maintenance mode and
 * locale normalization apply.
 *
 * These are locale-agnostic path segments that appear *after* the optional
 * locale prefix, so the check is applied against the full pathname.
 */
const ADMIN_PATH_SEGMENTS = ["/dashboard", "/login", "/logout"] as const;

/**
 * Returns true when the pathname is for a real Next.js internal or static
 * asset that middleware should never touch.
 *
 * Decision order (first match wins):
 * 1. _next/ internals → always skip.
 * 2. Root metadata files (robots.txt, sitemap.xml) → always skip.
 * 3. Paths containing an admin segment → never skip, regardless of extension.
 * 4. Extension-bearing paths → skip (treated as static assets).
 * 5. Everything else → do not skip (let middleware run).
 */
export function shouldSkipMiddleware(pathname: string): boolean {
  // 1. Next.js internals — _next/static, _next/image, etc.
  if (pathname.startsWith("/_next/")) return true;

  // 2. Root metadata files served by Next.js file-based metadata routes.
  if (ROOT_METADATA_PATHS.has(pathname)) return true;

  // 3. Admin/dashboard paths must always pass through, even if the final
  //    segment looks like a file (dotted dynamic params such as "foo.js").
  //
  //    Strategy: split the pathname into segments and check whether any
  //    segment is an admin root keyword — this naturally handles both bare
  //    (/dashboard) and locale-prefixed (/es-AR/dashboard) forms without
  //    building a regex at runtime.
  const segments = pathname.split("/");
  const hasAdminSegment = ADMIN_PATH_SEGMENTS.some((seg) => {
    const keyword = seg.slice(1); // strip leading /
    return segments.includes(keyword);
  });
  if (hasAdminSegment) return false;

  // 4. Extension-bearing paths that are not admin paths → static asset.
  const lastSegment = pathname.split("/").pop() ?? "";
  const dotIndex = lastSegment.lastIndexOf(".");
  if (dotIndex > 0) {
    const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
    if (STATIC_ASSET_EXTENSIONS.has(ext)) return true;
  }

  // 5. Everything else passes through.
  return false;
}
