import { Providers } from "@/app/[locale]/providers";
import "@/app/globals.css";
import { i18n } from "@/i18n";
import type { Locales } from "@/types";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";

type Params = { params: Promise<{ locale: Locales }> };

// export const dynamicParams = false;

export async function generateStaticParams() {
  return i18n.locales.map((locale) => ({ locale }));
}

const SITE_ORIGIN = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

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
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  return (
    <html lang={locale ?? i18n.defaultLocale}>
      <body className={`antialiased ${outfit.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
