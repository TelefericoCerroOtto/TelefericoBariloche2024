import { BlocksRenderer, NoContent } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { Spacer } from "@heroui/react";
import Form from "./_components/Form";

export default async function ContactPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const res = await getPageContent(locale, PUBLIC_ROUTES.CONTACT);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok)
    throw new Error(
      "Internal server error while trying to get content for Contact page",
    );
  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col gap-12 px-10 lg:px-28">
        <BlocksRenderer blocks={blocks[0]} locale={locale} />
        <div className="flex flex-col gap-8 lg:flex-row">
          <Form />
          <BlocksRenderer blocks={blocks[1]} locale={locale} />
        </div>
      </div>
    </>
  );
}
