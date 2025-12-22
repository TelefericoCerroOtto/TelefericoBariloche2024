import { BlocksRenderer, NoContent } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";

export default async function FoundationPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const res = await getPageContent(locale, PUBLIC_ROUTES.FOUNDATION);

  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for foundation page",
    );

  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <BlocksRenderer locale={locale} blocks={blocks} />
    </>
  );
}
