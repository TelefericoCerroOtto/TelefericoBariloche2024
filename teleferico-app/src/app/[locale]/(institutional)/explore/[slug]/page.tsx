import { BlocksRenderer } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getPageContent } from "@/lib/services";
import { Locales } from "@/types";
import { notFound } from "next/navigation";

export default async function ExploreDetailPage({
  params,
}: {
  params: Promise<{ locale: Locales; slug: string }>;
}) {
  const { slug, locale } = await params;

  const res = await getPageContent(locale, `${PUBLIC_ROUTES.EXPLORE}/${slug}`);

  if (!res.ok || res.data.data.length === 0) {
    console.log(
      `get content for '${locale}/explore/${slug}' failed: `,
      JSON.stringify(res.data, null, 2),
    );
    return notFound();
  }

  const blocks = res.data.data[0].blocks;

  return <BlocksRenderer blocks={blocks} locale={locale} />;
}
