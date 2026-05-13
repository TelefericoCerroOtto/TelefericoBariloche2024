import { i18n } from "@/i18n";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import {
  EXPLORE_ALLOWED_SLUGS,
  isAllowedExploreSlug,
} from "@/lib/helpers/explore-routes";
import { getActivitiesForSitemap, getNewsForSitemap } from "@/lib/services";
import { getPagesForSitemap } from "@/lib/services/cms/collections/pages";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const SITE_ORIGIN =
  process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL] || "http://localhost:3000";

const STATIC_ROUTES = Object.values(PUBLIC_ROUTES);

type SitemapEntry = MetadataRoute.Sitemap[number];

function toUrl(locale: string, route: string) {
  return new URL(`/${locale}${route}`, SITE_ORIGIN).toString();
}

function toDate(value?: string) {
  if (!value) return undefined;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function addEntry(entries: Map<string, SitemapEntry>, entry: SitemapEntry) {
  const current = entries.get(entry.url);

  if (!current) {
    entries.set(entry.url, entry);
    return;
  }

  const currentTimestamp = current.lastModified
    ? new Date(current.lastModified).getTime()
    : 0;
  const incomingTimestamp = entry.lastModified
    ? new Date(entry.lastModified).getTime()
    : 0;

  if (incomingTimestamp >= currentTimestamp) {
    entries.set(entry.url, entry);
  }
}

function staticEntry(locale: string, route: string, updatedAt?: string) {
  const lastModified = toDate(updatedAt);
  const entry: SitemapEntry = {
    url: toUrl(locale, route),
    changeFrequency: route === PUBLIC_ROUTES.HOME ? "weekly" : "monthly",
    priority: route === PUBLIC_ROUTES.HOME ? 1 : 0.7,
  };

  if (lastModified) {
    entry.lastModified = lastModified;
  }

  return entry;
}

function detailEntry(
  locale: string,
  route: string,
  updatedAt?: string,
  priority = 0.6,
) {
  const lastModified = toDate(updatedAt);
  const entry: SitemapEntry = {
    url: toUrl(locale, route),
    changeFrequency: "monthly",
    priority,
  };

  if (lastModified) {
    entry.lastModified = lastModified;
  }

  return entry;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [activitiesRes, perLocale] = await Promise.all([
    getActivitiesForSitemap(),
    Promise.all(
      i18n.locales.map(async (locale) => {
        const [pagesRes, newsRes] = await Promise.all([
          getPagesForSitemap(locale),
          getNewsForSitemap(locale),
        ]);

        return { locale, pagesRes, newsRes };
      }),
    ),
  ]);

  const entries = new Map<string, SitemapEntry>();

  for (const { locale, pagesRes, newsRes } of perLocale) {
    const pages = pagesRes.ok ? pagesRes.data.data : [];
    const pageByRoute = new Map(pages.map((page) => [page.route, page]));
    const activeLabels = new Set(
      activitiesRes.ok
        ? activitiesRes.data.data
            .filter((activity) => activity.isActive)
            .map((activity) => activity.label)
        : [],
    );

    for (const route of STATIC_ROUTES) {
      const page = pageByRoute.get(route);
      addEntry(entries, staticEntry(locale, route, page?.updatedAt));
    }

    for (const page of pages) {
      if (page.route.startsWith("/activities/")) {
        const label = page.route.slice("/activities/".length);

        if (activeLabels.has(label)) {
          addEntry(entries, detailEntry(locale, page.route, page.updatedAt));
        }
      }

      if (page.route.startsWith("/explore/")) {
        const slug = page.route.slice("/explore/".length);

        if (isAllowedExploreSlug(slug)) {
          addEntry(entries, detailEntry(locale, page.route, page.updatedAt));
        }
      }
    }

    if (activitiesRes.ok) {
      for (const activity of activitiesRes.data.data) {
        if (!activity.isActive) continue;

        const route = `${PUBLIC_ROUTES.ACTIVITIES}/${activity.label}`;
        const page = pageByRoute.get(route);

        addEntry(
          entries,
          detailEntry(locale, route, page?.updatedAt ?? activity.updatedAt),
        );
      }
    }

    for (const slug of EXPLORE_ALLOWED_SLUGS) {
      const route = `${PUBLIC_ROUTES.EXPLORE}/${slug}`;
      const page = pageByRoute.get(route);

      addEntry(entries, detailEntry(locale, route, page?.updatedAt));
    }

    if (newsRes.ok) {
      for (const news of newsRes.data.data) {
        if (!news.documentId) continue;

        addEntry(
          entries,
          detailEntry(
            locale,
            `/news/${news.documentId}`,
            news.updatedAt ?? news.date,
            0.5,
          ),
        );
      }
    }
  }

  return [...entries.values()].filter((entry) => entry.url.trim().length > 0);
}
