import { isAllowedExploreSlug } from "@/lib/helpers/explore-routes";
// import { i18n } from "@/i18n";
import { notFound } from "next/navigation";

// export async function generateStaticParams() {
//   return i18n.locales.flatMap((locale) =>
//     PAGES_ROUTES.map((slug) => ({ locale, slug })),
//   );
// }

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}>) {
  const { slug } = await params;

  if (!isAllowedExploreSlug(slug)) {
    notFound();
  }

  return <>{children}</>;
}
