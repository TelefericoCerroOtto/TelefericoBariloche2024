import { BlocksRenderer, NoContent } from "@/components";
import { getPageContent } from "@/lib/services/pages";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils/routes.const";
import { Spacer } from "@nextui-org/react";
import { Form } from "./_components";
import { getSectors } from "@/lib/services/sectors";

export default async function JobsPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  const res = await getPageContent(locale, ROUTES.JOBS);
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
