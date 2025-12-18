import { NoContent, StrapiComponentRenderer } from "@/components";
import { getPageContent } from "@/lib/services";
import type { Locales } from "@/types";
import { PUBLIC_ROUTES } from "@/utils";
import { Spacer } from "@heroui/react";
import {
  ActivitiesTable,
  BusesTable,
  TicketsTable,
  ZonesTable,
} from "./_components";

export default async function PricingSchedulesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const { ok, data } = await getPageContent(
    locale,
    PUBLIC_ROUTES.PRICINGSCHEDULES,
  );
  if (!ok)
    throw new Error(
      "Internal server error while trying to get content for pricing schedules page",
    );

  if (data.data.length === 0) return <NoContent locale={locale} />;

  const { blocks } = data.data[0];

  return (
    <>
      <StrapiComponentRenderer block={blocks[0]} locale={locale} />
      <div className="flex w-full flex-col px-10 sm:px-20 lg:px-40">
        <StrapiComponentRenderer block={blocks[1]} locale={locale} />
        <TicketsTable />
        <Spacer y={10} />
        <ActivitiesTable />
        <Spacer y={16} />
        <StrapiComponentRenderer block={blocks[2]} locale={locale} />
        <ZonesTable />
        <Spacer y={10} />
        <BusesTable />
      </div>
    </>
  );
}
