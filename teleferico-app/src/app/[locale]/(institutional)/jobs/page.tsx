import { BlocksRenderer, NoContent } from "@/components";
import { getPageContent, getSectors } from "@/lib/services";
import type { Locales } from "@/types";
import { PUBLIC_ROUTES } from "@/utils";
import { Spacer } from "@heroui/react";
import { Form } from "./_components";

export default async function JobsPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const res = await getPageContent(locale, PUBLIC_ROUTES.JOBS);
  const { ok, data } = await getSectors(locale);
  // TODO: COMPLETE FALLBACK DATA FROM GETTING CONTENT PAGES
  if (!res.ok || !ok)
    throw new Error(
      "Internal server error while trying to get content for jobs page",
    );

  if (res.data.data.length === 0) return <NoContent locale={locale} />;

  const blocks = res.data.data[0].blocks;

  return (
    <>
      <Spacer y={28} />
      <div className="flex w-full flex-col gap-12 px-10 lg:px-28">
        <BlocksRenderer blocks={blocks[0]} locale={locale} />
        <div className="flex flex-col-reverse gap-8 lg:flex-row">
          <Form sectors={data.data} />
          <BlocksRenderer blocks={blocks[1]} locale={locale} />
        </div>
      </div>
    </>
  );
}
