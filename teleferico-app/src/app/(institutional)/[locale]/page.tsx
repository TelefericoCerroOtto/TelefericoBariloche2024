import { getHomePageContent } from "@/lib/services/pages";
import type { Locales } from "@/types";
import { FaqSection, PosterSection } from "./_components";
import BlocksRenderer from "./BlocksRenderer";
import { ServiceButton } from "@/components";

export default async function Home({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const res = await getHomePageContent(locale);
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
