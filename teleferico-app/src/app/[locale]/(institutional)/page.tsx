import { BlocksRenderer, NoContent, ServiceButton } from "@/components";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { ROUTES } from "@/utils";
import { Skeleton } from "@heroui/react";
import { Suspense } from "react";

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
      <BlocksRenderer blocks={blocks} locale={locale} />
      <Suspense fallback={<Skeleton className="h-8 w-[400px]" />}>
        <ServiceButton locale={locale} />
      </Suspense>
    </>
  );
}
