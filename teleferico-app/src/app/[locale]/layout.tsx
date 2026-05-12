import { Providers } from "@/app/[locale]/providers";
import "@/app/globals.css";
import { i18n } from "@/i18n";
import { ENV_KEYS } from "@/lib/constants/env.const";
import { isLocales } from "@/lib/helpers/i18n-guards";
import type { Locales } from "@/types";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { notFound } from "next/navigation";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "@/app/swiper-overrides.css";

type Params = { params: Promise<{ locale: Locales }> };

// const ENABLE_STATIC_LOCALE_PARAMS =
//   process.env[ENV_KEYS.ENABLE_STATIC_LOCALE_PARAMS] === "true";

// export const dynamicParams = true;

export function generateStaticParams() {
  // if (!ENABLE_STATIC_LOCALE_PARAMS) {
  //   return [];
  // }

  return i18n.locales.map((locale) => ({ locale }));
}

const SITE_ORIGIN =
  process.env[ENV_KEYS.NEXT_PUBLIC_SITE_URL] || "http://localhost:3000";

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const langs = Object.fromEntries(
    i18n.locales.map((l) => [l, `${SITE_ORIGIN}/${l}`]),
  );

  return {
    icons: {
      icon: "/favicon.ico?v=2",
      shortcut: "/favicon.ico?v=2",
    },
    alternates: {
      canonical: `${SITE_ORIGIN}/${locale}`,
      languages: langs,
    },
  };
}

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
});

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocales(locale)) {
    notFound();
  }

  return (
    <html lang={locale ?? i18n.defaultLocale}>
      <body className={`antialiased ${outfit.className} text-2xl`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
