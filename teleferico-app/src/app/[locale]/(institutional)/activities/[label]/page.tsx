import { BlocksRenderer } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import { getPageContent } from "@/lib/services";
import { Locales } from "@/types";
import { notFound } from "next/navigation";

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ locale: Locales; label: string }>;
}) {
  const { label, locale } = await params;

  const res = await getPageContent(
    locale,
    `${PUBLIC_ROUTES.ACTIVITIES}/${label}`,
  );

  if (!res.ok || res.data.data.length === 0) {
    console.log(
      `get content for activity '${label}' failed: `,
      JSON.stringify(res.data, null, 2),
    );
    return notFound();
  }

  const blocks = res.data.data[0].blocks;

  return <BlocksRenderer blocks={blocks} locale={locale} />;
}
