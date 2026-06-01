import { NoContent, StrapiComponentRenderer } from "@/components";
import { PUBLIC_ROUTES } from "@/lib/constants/routes.const";
import {
  getPageContent,
  getPricingScheduleActivities,
  getServiceState,
  getTickets,
  getVisibleBusTrips,
  getZones,
} from "@/lib/services";
import type {
  GetActivitiesResponse,
  GetBusTripsResponse,
  GetServiceStateResponse,
  GetTicketsResponse,
  GetZonesResponse,
  Locales,
} from "@/types";
import { Spacer } from "@heroui/react";
import {
  ActivitiesTable,
  BusesTable,
  TicketsTable,
  ZonesTable,
} from "./_components";

const TABLE_SECTION_IDS = {
  tickets: "tickets",
  activities: "activities",
  zones: "zones",
  buses: "buses",
} as const;

export default async function PricingSchedulesPage({
  params,
}: Readonly<{
  params: Promise<{ locale: Locales }>;
}>) {
  const { locale } = await params;
  const [
    pageContentResponse,
    ticketsResponse,
    activitiesResponse,
    zonesResponse,
    busesResponse,
    serviceStateResponse,
  ] = await Promise.all([
    getPageContent(locale, PUBLIC_ROUTES.PRICINGSCHEDULES),
    getTickets(locale, { cache: "no-store" }),
    getPricingScheduleActivities(locale, { cache: "no-store" }),
    getZones(locale, { cache: "no-store" }),
    getVisibleBusTrips(locale, { cache: "no-store" }),
    getServiceState({ cache: "no-store" }),
  ]);

  const { ok, data } = pageContentResponse;
  if (!ok)
    throw new Error(
      "Internal server error while trying to get content for pricing schedules page",
    );

  if (data.data.length === 0) return <NoContent locale={locale} />;

  const initialTicketsData = ticketsResponse.ok
    ? (ticketsResponse.data as GetTicketsResponse)
    : undefined;
  const initialActivitiesData = activitiesResponse.ok
    ? (activitiesResponse.data as GetActivitiesResponse)
    : undefined;
  const initialZonesData = zonesResponse.ok
    ? (zonesResponse.data as GetZonesResponse)
    : undefined;
  const initialBusesData = busesResponse.ok
    ? (busesResponse.data as GetBusTripsResponse)
    : undefined;
  const initialServiceState = serviceStateResponse.ok
    ? (serviceStateResponse.data as GetServiceStateResponse)
    : undefined;

  const { blocks } = data.data[0];

  return (
    <>
      <StrapiComponentRenderer block={blocks[0]} locale={locale} />
      <div className="flex w-full flex-col px-4 sm:px-10 md:px-20 lg:px-40">
        <section id={TABLE_SECTION_IDS.tickets} className="scroll-mt-32">
          <StrapiComponentRenderer block={blocks[1]} locale={locale} />
          <TicketsTable initialData={initialTicketsData} />
        </section>
        <Spacer y={16} />
        <section id={TABLE_SECTION_IDS.activities} className="scroll-mt-32">
          <StrapiComponentRenderer block={blocks[2]} locale={locale} />
          <ActivitiesTable initialData={initialActivitiesData} />
        </section>
        <Spacer y={16} />
        <section id={TABLE_SECTION_IDS.zones} className="scroll-mt-32">
          <StrapiComponentRenderer block={blocks[3]} locale={locale} />
          <ZonesTable
            initialData={initialZonesData}
            initialServiceState={initialServiceState}
          />
        </section>
        <Spacer y={16} />
        <section id={TABLE_SECTION_IDS.buses} className="scroll-mt-32">
          <StrapiComponentRenderer block={blocks[4]} locale={locale} />
          <BusesTable initialData={initialBusesData} />
        </section>
        <Spacer y={28} />
      </div>
    </>
  );
}
