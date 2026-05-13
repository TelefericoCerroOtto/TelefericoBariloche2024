import { ENV_KEYS } from "@/lib/constants/env.const";
import { i18n } from "@/i18n";
import type { MetadataRoute } from "next";

const SITE_ORIGIN =
  process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL] || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  const localeDisallows = i18n.locales.flatMap((locale) => [
    `/${locale}/dashboard`,
    `/${locale}/dashboard/`,
    `/${locale}/login`,
    `/${locale}/logout`,
  ]);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", ...localeDisallows],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
