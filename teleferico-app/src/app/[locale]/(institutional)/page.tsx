import { BlocksRenderer, NoContent, ServiceButton } from "@/components";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils";

export default async function Home({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const res = await getPageContent(locale, ROUTES.HOME);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for home page",
    );
  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <BlocksRenderer
        blocks={blocks}
        locale={locale}
        customBlocks={[
          {
            position: 0,
            component: ServiceButton,
          },
        ]}
      />
    </>
  );
}
