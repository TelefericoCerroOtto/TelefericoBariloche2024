import { BlocksRenderer } from "@/components";
import { getPageContent } from "@/lib/services/pages";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";
import { Spacer } from "@nextui-org/react";

export default async function FAQSPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const res = await getPageContent(locale, ROUTES.FAQS);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for faqs page",
    );

  if (res.data.data.length === 0)
    throw new Error("No content was found for faqs Page");

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col px-10 lg:px-28">
        <BlocksRenderer blocks={blocks} locale={locale} />
      </div>
    </>
  );
}
