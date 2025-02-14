import { BlocksRenderer } from "@/components";
import { getPageContent } from "@/lib/services/pages";
import { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";

export default async function ExplorePage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const res = await getPageContent(locale, ROUTES.EXPLORE);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok) return <div>Fallback data</div>;

  if (res.data.data.length === 0)
    throw new Error("No content was found for Explore Page");

  const blocks = res.data.data[0].blocks;

  return <BlocksRenderer blocks={blocks} locale={locale} />;
}
