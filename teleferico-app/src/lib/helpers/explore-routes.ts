export const EXPLORE_ALLOWED_SLUGS = ["alternative-access"] as const;

export type ExploreSlug = (typeof EXPLORE_ALLOWED_SLUGS)[number];

export const isAllowedExploreSlug = (
  slug: string,
): slug is ExploreSlug =>
  (EXPLORE_ALLOWED_SLUGS as readonly string[]).includes(slug);
