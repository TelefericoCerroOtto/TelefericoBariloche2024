import { BlocksRenderer, NoContent } from "@/components";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { PUBLIC_ROUTES } from "@/utils";
import { Spacer } from "@heroui/react";

export default async function FAQSPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const res = await getPageContent(locale, PUBLIC_ROUTES.FAQS);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for faqs page",
    );

  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col">
        <BlocksRenderer blocks={blocks} locale={locale} />
      </div>
    </>
  );
}
