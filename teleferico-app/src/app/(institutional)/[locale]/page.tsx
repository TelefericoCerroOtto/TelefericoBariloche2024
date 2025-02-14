import { BlocksRenderer, ServiceButton } from "@/components";
import { getPageContent } from "@/lib/services/pages";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";
import { FaqSection, PosterSection } from "./_components";

export default async function Home({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const res = await getPageContent(locale, ROUTES.HOME);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok) return <div>Fallback data</div>;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <BlocksRenderer
        blocks={blocks}
        locale={locale}
        customBlocks={[
          { position: 5, component: PosterSection },
          { position: 6, component: FaqSection },
        ]}
      />
      <ServiceButton />
    </>
  );
}
