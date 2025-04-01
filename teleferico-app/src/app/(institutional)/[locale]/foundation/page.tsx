import { BlocksRenderer } from "@/components";
import { getPageContent } from "@/lib/services/pages";
import { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";

export default async function FoundationPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const res = await getPageContent(locale, ROUTES.FOUNDATION);

  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for foundation page",
    );

  if (res.data.data.length === 0)
    throw new Error("No content was found for foundation Page");

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <BlocksRenderer locale={locale} blocks={blocks} />
    </>
  );
}
