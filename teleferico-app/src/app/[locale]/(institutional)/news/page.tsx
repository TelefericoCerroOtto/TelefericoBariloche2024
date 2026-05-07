import type { Locales } from "@/types";
import { Suspense } from "react";
import { FeaturedNew, News } from "./_components";
import { CardLoader, FeaturedNewLoader } from "./_components/Loaders";

export default async function NewsPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;

  return (
    <>
      <Suspense fallback={<FeaturedNewLoader />}>
        <FeaturedNew locale={locale} />
      </Suspense>
      <Suspense fallback={<CardLoader />}>
        <News locale={locale} />
      </Suspense>
    </>
  );
}
